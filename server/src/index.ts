import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import os from 'os';
import {
  createRoom,
  getRoom,
  deleteRoom,
  joinRoom,
  removePlayer,
  startGame,
  startRound,
  submitAnswer,
  endRound,
  advanceRound,
  restartGame,
  disconnectPlayer,
  reconnectPlayerBySessionToken,
  cleanInactiveRooms,
  touchRoom,
} from './rooms';
import { ServerToClientEvents, ClientToServerEvents, RoundConfig, RoomState } from './types';
import { sanitizeRoomState } from './roomSanitizer';
import { canTransition } from './gameStateMachine';

const app = express();
const httpServer = createServer(app);
const PORT = parseInt(process.env.PORT || '3001', 10);

const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || '*',
    methods: ['GET', 'POST'],
  },
  pingInterval: 10000,
  pingTimeout: 5000,
});

app.use(cors());
app.use(express.json());

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../../client/dist')));
}

app.get('/api/health', (_req, res) => res.json({ status: 'ok', uptime: process.uptime() }));

function getLocalIps(): string[] {
  const nets = os.networkInterfaces();
  const ips: string[] = [];
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      if (net.family === 'IPv4' && !net.internal) ips.push(net.address);
    }
  }
  return ips;
}

app.get('/api/network', (_req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ error: 'Network inspection disabled in production' });
  }
  res.json({ ips: getLocalIps(), port: PORT });
});

// Serve frontend SPA fallback in production
if (process.env.NODE_ENV === 'production') {
  app.get('*', (_req, res) => {
    res.sendFile(path.join(__dirname, '../../client/dist/index.html'));
  });
}

// Periodic cleanup of inactive rooms
setInterval(() => {
  cleanInactiveRooms();
}, 5 * 60 * 1000);

// ─── Timer Management ──────────────────────────────────────
const activeTimers = new Map<string, NodeJS.Timeout>();
const phaseVersions = new Map<string, number>();

function getPhaseVersion(roomCode: string): number {
  return phaseVersions.get(roomCode) || 0;
}

function bumpPhaseVersion(roomCode: string): number {
  const v = getPhaseVersion(roomCode) + 1;
  phaseVersions.set(roomCode, v);
  return v;
}

function clearRoundTimer(roomCode: string) {
  const timer = activeTimers.get(roomCode);
  if (timer) {
    clearInterval(timer);
    activeTimers.delete(roomCode);
  }
}

function emitRoomState(roomCode: string) {
  const room = getRoom(roomCode);
  if (!room) return;

  const sockets = io.sockets.adapter.rooms.get(roomCode);
  if (!sockets) return;

  for (const socketId of sockets) {
    const s = io.sockets.sockets.get(socketId);
    if (s) {
      const isHost = (s as any).isHost === true;
      const playerId = (s as any).playerId;
      const sanitized = sanitizeRoomState(room, playerId, isHost);
      s.emit('room:state', sanitized);
    }
  }
}

function schedulePhaseTransition(
  roomCode: string,
  delayMs: number,
  expectedVersion: number,
  action: () => void,
) {
  setTimeout(() => {
    if (getPhaseVersion(roomCode) !== expectedVersion) return;
    action();
  }, delayMs);
}

// ─── Host Authorization Helper ──────────────────────────────
function getHostRoom(socket: any, targetCode?: string): RoomState | null {
  const code = (targetCode || socket.playerRoomCode || socket.roomCode || Array.from(socket.rooms as Set<string>).find(r => r !== socket.id))?.toUpperCase();
  if (!code) return null;
  const room = getRoom(code);
  if (!room) return null;
  if (socket.isHost || socket.rooms?.has(code) || room.hostId === socket.id) {
    return room;
  }
  return null;
}

// ─── Round Timer ───────────────────────────────────────────
function startRoundTimer(roomCode: string) {
  clearRoundTimer(roomCode);
  const version = bumpPhaseVersion(roomCode);

  const timer = setInterval(() => {
    const room = getRoom(roomCode);
    if (!room || room.phase !== 'playing' || getPhaseVersion(roomCode) !== version) {
      clearRoundTimer(roomCode);
      return;
    }
    room.timeRemaining--;
    if (room.timeRemaining <= 0) {
      clearRoundTimer(roomCode);
      const round = room.rounds[room.currentRound];
      if (round?.type === 'consensus') {
        // For consensus: stop timer, reveal votes, wait for host
        const voteCounts = new Map<string, number>();
        if (room._consensusVotes) {
          room._consensusVotes.forEach((ans) => {
            voteCounts.set(ans, (voteCounts.get(ans) || 0) + 1);
          });
        }
        const total = room.players.length;
        const votes = (round.consensusOptions || []).map(opt => ({
          option: opt.label,
          count: voteCounts.get(opt.label) || 0,
          percentage: Math.round(((voteCounts.get(opt.label) || 0) / total) * 100),
        }));
        room._consensusPhase = 'reveal';
        io.to(roomCode).emit('game:consensusPhase', 'reveal');
        io.to(roomCode).emit('game:consensusReveal', votes);
        emitRoomState(roomCode);
      } else if (round?.type === 'trust') {
        // For trust: stop timer, move to confirm phase
        room._trustPhase = 'confirm';
        io.to(roomCode).emit('game:trustPhase', 'confirm');
        emitRoomState(roomCode);
      } else {
        handleRoundEnd(roomCode, version);
      }
    } else {
      io.to(roomCode).emit('game:timer', room.timeRemaining);
      // Flash expired check
      const elapsedRound = room.rounds[room.currentRound];
      if (elapsedRound?.flashDuration) {
        const elapsed = elapsedRound.timeLimit - room.timeRemaining;
        if (elapsed === elapsedRound.flashDuration) {
          io.to(roomCode).emit('game:flashExpired');
        }
      }
    }
  }, 1000);
  activeTimers.set(roomCode, timer);
}

// ─── Round End → Reveal → Scoring → Ranking ───────────────
function handleRoundEnd(roomCode: string, version: number) {
  const result = endRound(roomCode);
  if (!result) return;

  const room = result.room;
  const isPrank = room.rounds[room.currentRound]?.type === 'prank';

  if (isPrank) {
    room.phase = 'prank';
    io.to(roomCode).emit('game:phaseChange', 'prank');
    emitRoomState(roomCode);

    schedulePhaseTransition(roomCode, 6000, version, () => {
      const r = getRoom(roomCode);
      if (!r || r.phase !== 'prank') return;
      const adv = advanceRound(roomCode);
      if (!adv) return;
      if (adv.room.phase === 'gameOver') {
        emitGameOver(roomCode, adv.room);
        return;
      }
      doRoundIntro(roomCode);
    });
    return;
  }

  room.phase = 'reveal';
  io.to(roomCode).emit('game:phaseChange', 'reveal');
  io.to(roomCode).emit('game:roundEnd', result.answers);
  const round = room.rounds[room.currentRound];
  io.to(roomCode).emit('game:reveal', round.correctAnswer || '', round.correctFlag || '');
  emitRoomState(roomCode);

  // Challenge execution results: Challenged player MUST get answer correct!
  if (room._challengeContext) {
    const { challengerId, targetId } = room._challengeContext;
    const challenger = room.players.find(p => p.id === challengerId);
    const target = room.players.find(p => p.id === targetId);

    if (challenger && target) {
      const targetAns = result.answers.find(a => a.playerId === targetId);
      const targetCorrect = targetAns?.correct === true;

      const stolenPoints = 300;
      if (targetCorrect) {
        // Target defended! Target gains 300 bonus pts, Challenger loses 200 pts
        target.score += 300;
        challenger.score = Math.max(0, challenger.score - 200);
        io.to(roomCode).emit('game:challengeResult', false, 300);
      } else {
        // Target failed! Challenger wins and steals 300 pts
        const pointsToSteal = Math.min(target.score, stolenPoints);
        target.score = Math.max(0, target.score - pointsToSteal);
        challenger.score += pointsToSteal;
        io.to(roomCode).emit('game:challengeResult', true, pointsToSteal);
      }
    }
  }

  schedulePhaseTransition(roomCode, 3000, version, () => {
    const r = getRoom(roomCode);
    if (!r || r.phase !== 'reveal') return;
    r.phase = 'scoring';
    io.to(roomCode).emit('game:phaseChange', 'scoring');
    io.to(roomCode).emit('game:scoring', result.scoring);
    emitRoomState(roomCode);
  });

  schedulePhaseTransition(roomCode, 6000, version, () => {
    const r = getRoom(roomCode);
    if (!r || r.phase !== 'scoring') return;
    r.phase = 'ranking';
    io.to(roomCode).emit('game:phaseChange', 'ranking');
    io.to(roomCode).emit('game:ranking', result.ranking);
    emitRoomState(roomCode);
  });
}

// ─── Manual Reveal (host clicks 🔍 Revelar) ───────────────
function doReveal(roomCode: string) {
  clearRoundTimer(roomCode);
  const version = bumpPhaseVersion(roomCode);
  handleRoundEnd(roomCode, version);
}

// ─── Round Intro ───────────────────────────────────────────
function doRoundIntro(roomCode: string) {
  const room = getRoom(roomCode);
  if (!room) return;
  if (!canTransition(room.phase, 'roundIntro')) return;

  room.phase = 'roundIntro';
  clearRoundTimer(roomCode);
  bumpPhaseVersion(roomCode);
  io.to(roomCode).emit('game:phaseChange', 'roundIntro');

  const currentRound = room.rounds[room.currentRound];
  const { correctAnswer, correctFlag, ...safeRoundIntro } = currentRound;
  io.to(roomCode).emit('game:roundIntro', safeRoundIntro as RoundConfig, room.currentRound);
  emitRoomState(roomCode);
}

// ─── Countdown → Start Round ───────────────────────────────
function doCountdownAndStart(roomCode: string) {
  const room = getRoom(roomCode);
  if (!room) return;
  if (!canTransition(room.phase, 'countdown')) return;

  const version = bumpPhaseVersion(roomCode);
  room.phase = 'countdown';
  io.to(roomCode).emit('game:phaseChange', 'countdown');
  emitRoomState(roomCode);
  let count = 3;

  const countdownInterval = setInterval(() => {
    if (getPhaseVersion(roomCode) !== version) {
      clearInterval(countdownInterval);
      return;
    }
    io.to(roomCode).emit('game:countdown', count);
    count--;
    if (count < 0) {
      clearInterval(countdownInterval);
      const result = startRound(roomCode);
      if (result) {
        io.to(roomCode).emit('game:phaseChange', 'playing');
        const { correctAnswer, correctFlag, ...safeRound } = result.round;
        io.to(roomCode).emit('game:roundStart', safeRound as RoundConfig, result.round.timeLimit);
        emitRoomState(roomCode);
        startRoundTimer(roomCode);
      }
    }
  }, 1000);
}

// ─── Game Over ─────────────────────────────────────────────
function emitGameOver(roomCode: string, room: any) {
  room.phase = 'gameOver';
  const champion = room.players
    .slice()
    .sort((a: any, b: any) => b.score - a.score)[0] || { name: 'Ninguém', avatar: '🎮', score: 0 };

  const ranking = room.players
    .slice()
    .sort((a: any, b: any) => b.score - a.score)
    .map((p: any, i: number) => ({
      position: i + 1,
      name: p.name,
      avatar: p.avatar,
      score: p.score,
    }));

  io.to(roomCode).emit('game:phaseChange', 'gameOver');
  io.to(roomCode).emit('game:gameOver', champion, ranking);
  emitRoomState(roomCode);
}

// ─── Socket Handlers ───────────────────────────────────────
const usedChallenges = new Map<string, Set<string>>(); // roomCode -> Set of challengerIds who used challenge

io.on('connection', (socket) => {
  let playerRoomCode: string | null = null;
  let playerId: string | null = null;
  let isHost = false;

  socket.on('room:create', (callback) => {
    try {
      const room = createRoom(socket.id);
      isHost = true;
      (socket as any).isHost = true;
      (socket as any).playerId = 'host_' + socket.id;
      (socket as any).playerRoomCode = room.code;
      playerRoomCode = room.code;
      playerId = 'host_' + socket.id;
      socket.join(room.code);

      const sanitized = sanitizeRoomState(room, playerId, true);
      socket.emit('room:state', sanitized);

      if (typeof callback === 'function') {
        callback({ roomCode: room.code, hostSessionToken: room.hostSessionToken });
      }
    } catch (err) {
      console.error('[room] Error creating room:', err);
    }
  });

  socket.on('room:join', (roomCode, player, callback) => {
    try {
      const cleanCode = (roomCode || '').toUpperCase().trim();
      const result = joinRoom(cleanCode, player.name, player.avatar);
      if ('error' in result) {
        if (typeof callback === 'function') callback({ success: false, error: result.error });
        return;
      }
      playerRoomCode = cleanCode;
      playerId = result.player.id;
      isHost = false;
      (socket as any).isHost = false;
      (socket as any).playerId = result.player.id;
      (socket as any).playerRoomCode = cleanCode;

      socket.join(cleanCode);
      io.to(cleanCode).emit('room:playerJoined', result.player);
      emitRoomState(cleanCode);

      if (typeof callback === 'function') {
        callback({ success: true, playerId: result.player.id, sessionToken: result.sessionToken });
      }
    } catch (err) {
      if (typeof callback === 'function') callback({ success: false, error: 'Erro interno ao entrar na sala' });
    }
  });

  socket.on('room:observe', (roomCode, callback) => {
    try {
      const cleanCode = (roomCode || '').toUpperCase().trim();
      const room = getRoom(cleanCode);
      if (!room) {
        if (typeof callback === 'function') callback({ success: false, error: 'Sala não encontrada' });
        return;
      }
      playerRoomCode = cleanCode;
      isHost = false;
      (socket as any).isHost = false;
      (socket as any).isObserver = true;
      (socket as any).playerRoomCode = cleanCode;

      socket.join(cleanCode);
      const sanitized = sanitizeRoomState(room, undefined, false);
      socket.emit('room:state', sanitized);

      if (typeof callback === 'function') callback({ success: true });
    } catch (err) {
      if (typeof callback === 'function') callback({ success: false, error: 'Erro interno ao conectar TV' });
    }
  });

  socket.on('room:reconnect', (data, callback) => {
    try {
      if (!data?.sessionToken) {
        if (typeof callback === 'function') callback({ success: false, error: 'Token de sessão inválido' });
        return;
      }
      const rec = reconnectPlayerBySessionToken(data.sessionToken);
      if (!rec) {
        if (typeof callback === 'function') callback({ success: false, error: 'Sessão expirada ou não encontrada' });
        return;
      }

      playerRoomCode = rec.room.code;
      isHost = rec.isHost;
      playerId = rec.isHost ? 'host_' + rec.room.hostId : rec.player!.id;
      (socket as any).isHost = rec.isHost;
      (socket as any).playerId = playerId;
      (socket as any).playerRoomCode = rec.room.code;

      socket.join(rec.room.code);
      emitRoomState(rec.room.code);

      // If game is in progress, sync timer and round info
      if (rec.room.phase === 'playing' && rec.room.timeRemaining > 0) {
        socket.emit('game:timer', rec.room.timeRemaining);
        const currentRoundConfig = rec.room.rounds[rec.room.currentRound];
        if (currentRoundConfig) {
          const { correctAnswer, correctFlag, ...safeRound } = currentRoundConfig;
          socket.emit('game:roundStart', safeRound as RoundConfig, rec.room.timeRemaining);
        }
      }
      if (rec.room.phase === 'countdown') {
        socket.emit('game:phaseChange', 'countdown');
      }
      if (rec.room.phase === 'prank') {
        socket.emit('game:phaseChange', 'prank');
      }

      if (typeof callback === 'function') {
        callback({
          success: true,
          roomCode: rec.room.code,
          playerId,
          name: rec.isHost ? 'Host' : rec.player!.name,
          avatar: rec.isHost ? '🎮' : rec.player!.avatar,
          isHost: rec.isHost,
        });
      }
    } catch (err) {
      if (typeof callback === 'function') callback({ success: false, error: 'Erro ao reconectar' });
    }
  });

  socket.on('room:removePlayer', (targetPlayerId) => {
    const room = getHostRoom(socket);
    if (!room) return;
    removePlayer(room.code, targetPlayerId);
    io.to(room.code).emit('room:playerLeft', targetPlayerId);
    emitRoomState(room.code);
  });

  socket.on('game:start', (codeFromClient) => {
    const room = getHostRoom(socket, codeFromClient);
    console.log('[game:start] Received game:start for room:', codeFromClient, 'matched room:', room?.code);
    if (!room) return;
    const startedRoom = startGame(room.code);
    if (!startedRoom) return;
    doRoundIntro(room.code);
  });

  socket.on('game:startRound', (codeFromClient) => {
    const room = getHostRoom(socket, codeFromClient);
    console.log('[game:startRound] Received game:startRound for room:', codeFromClient, 'matched room:', room?.code);
    if (!room) return;
    doCountdownAndStart(room.code);
  });

  socket.on('game:nextRound', (codeFromClient) => {
    const room = getHostRoom(socket, codeFromClient);
    console.log('[game:nextRound] Received game:nextRound for room:', codeFromClient, 'matched room:', room?.code);
    if (!room) return;

    if (room.phase !== 'ranking' && room.phase !== 'prank') return;

    // If there's a pending challenge, inject it before advancing
    if (room._pendingChallenge) {
      const { challengerId, targetId } = room._pendingChallenge;
      const challenger = room.players.find(p => p.id === challengerId);
      const target = room.players.find(p => p.id === targetId);
      if (challenger && target) {
        // Pick a round that hasn't been played yet, skipping the immediate next (already introduced)
        const futureRounds = room.rounds.filter((r, i) => i > room.currentRound + 1 && r.type !== 'prank');
        const sourceRound = futureRounds.length > 0
          ? futureRounds[Math.floor(Math.random() * futureRounds.length)]
          : room.rounds[room.currentRound];
        const challengeRound: RoundConfig = {
          id: 999,
          type: 'guess',
          title: '⚔️ DUELO DECISIVO!',
          subtitle: `${challenger.name} vs ${target.name}`,
          rules: `${target.name} (Desafiado) TEM QUE ACERTAR a resposta para se defender!`,
          image: sourceRound.image,
          correctAnswer: sourceRound.correctAnswer,
          correctFlag: sourceRound.correctFlag,
          options: sourceRound.options,
          timeLimit: 15,
          multiplier: 1,
          scoringRule: { type: 'speed' },
        };
        const originalRounds = [...room.rounds];
        const prevRound = room.currentRound;
        room.rounds = [challengeRound];
        room.currentRound = 0;
        room._challengeContext = { challengerId, targetId, prevRound, originalRounds };
        room._pendingChallenge = undefined;
        clearRoundTimer(room.code);
        bumpPhaseVersion(room.code);
        doCountdownAndStart(room.code);
        return;
      }
      room._pendingChallenge = undefined;
    }

    if (room._challengeContext) {
      room.rounds = room._challengeContext.originalRounds;
      room.currentRound = room._challengeContext.prevRound;
      room._challengeContext = undefined;
    }

    clearRoundTimer(room.code);
    bumpPhaseVersion(room.code);

    const advanceResult = advanceRound(room.code);
    if (!advanceResult) return;

    if (advanceResult.room.phase === 'gameOver') {
      emitGameOver(room.code, advanceResult.room);
      return;
    }

    const nextRoundData = advanceResult.room.rounds[advanceResult.room.currentRound];
    if (nextRoundData?.type === 'prank') {
      advanceResult.room.phase = 'prank';
      io.to(room.code).emit('game:phaseChange', 'prank');
      emitRoomState(room.code);

      const v = getPhaseVersion(room.code);
      schedulePhaseTransition(room.code, 6000, v, () => {
        const r = getRoom(room.code);
        if (!r || r.phase !== 'prank') return;
        const adv = advanceRound(room.code);
        if (!adv) return;
        if (adv.room.phase === 'gameOver') {
          emitGameOver(room.code, adv.room);
          return;
        }
        doRoundIntro(room.code);
      });
    } else {
      doRoundIntro(room.code);
    }
  });

  socket.on('game:revealAnswer', (codeFromClient) => {
    const room = getHostRoom(socket, codeFromClient);
    console.log('[game:revealAnswer] Received game:revealAnswer for room:', codeFromClient, 'matched room:', room?.code);
    if (!room || room.phase !== 'playing') return;
    const round = room.rounds[room.currentRound];
    if (round.type === 'consensus') {
      // For consensus: reveal votes, don't end round
      const voteCounts = new Map<string, number>();
      if (room._consensusVotes) {
        room._consensusVotes.forEach((ans) => {
          voteCounts.set(ans, (voteCounts.get(ans) || 0) + 1);
        });
      }
      const total = room.players.length;
      const votes = (round.consensusOptions || []).map(opt => ({
        option: opt.label,
        count: voteCounts.get(opt.label) || 0,
        percentage: Math.round(((voteCounts.get(opt.label) || 0) / total) * 100),
      }));
      room._consensusPhase = 'reveal';
      clearRoundTimer(room.code);
      io.to(room.code).emit('game:consensusPhase', 'reveal');
      io.to(room.code).emit('game:consensusReveal', votes);
      emitRoomState(room.code);
      return;
    }
    if (round.type === 'trust') {
      // For trust: advance phase via trustAdvance
      if (room._trustPhase === 'confirm') {
        if (!room._trustSwitched) room._trustSwitched = new Set();
        const switched = room._trustSwitched;
        room.players.forEach(p => {
          if (!room._trustConfirmed?.has(p.id)) {
            switched.add(p.id);
            p.score = Math.max(0, p.score - 100);
          }
        });
        room._trustPhase = 'hint';
        clearRoundTimer(room.code);
        io.to(room.code).emit('game:trustPhase', 'hint');
        io.to(room.code).emit('game:trustHint', round.hint || 'Sem dica disponível.');
        room.players.forEach(p => {
          if (room._trustSwitched?.has(p.id)) {
            p.answer = null;
            p.answerTime = null;
          }
        });
        emitRoomState(room.code);
      } else if (room._trustPhase === 'hint') {
        const version = bumpPhaseVersion(room.code);
        handleRoundEnd(room.code, version);
      }
      return;
    }
    doReveal(room.code);
  });

  socket.on('game:showRanking', (codeFromClient) => {
    const room = getHostRoom(socket, codeFromClient);
    console.log('[game:showRanking] Received game:showRanking for room:', codeFromClient, 'matched room:', room?.code);
    if (!room) return;
    const ranking = room.players
      .slice()
      .sort((a, b) => b.score - a.score)
      .map((p, i) => ({
        position: i + 1,
        playerId: p.id,
        name: p.name,
        avatar: p.avatar,
        score: p.score,
      }));
    room.phase = 'ranking';
    touchRoom(room.code);
    io.to(room.code).emit('game:phaseChange', 'ranking');
    io.to(room.code).emit('game:ranking', ranking);
    emitRoomState(room.code);
  });

  socket.on('game:restart', (codeFromClient) => {
    const room = getHostRoom(socket, codeFromClient);
    console.log('[game:restart] Received game:restart for room:', codeFromClient, 'matched room:', room?.code);
    if (!room) return;
    clearRoundTimer(room.code);
    bumpPhaseVersion(room.code);
    room._challengeContext = undefined;
    room._pendingChallenge = undefined;
    const restarted = restartGame(room.code);
    if (restarted) {
      io.to(room.code).emit('game:phaseChange', 'waiting');
      emitRoomState(room.code);
    }
  });

  socket.on('player:answer', (answer) => {
    const roomCode = playerRoomCode || (socket as any).playerRoomCode;
    const pid = playerId || (socket as any).playerId;
    if (!roomCode || !pid || isHost) return;
    const result = submitAnswer(roomCode, pid, answer);
    if ('error' in result) {
      socket.emit('error', result.error);
      return;
    }
    socket.emit('player:answerRegistered', result.correct);

    // Emit streak update
    const answerRoom = getRoom(roomCode);
    if (answerRoom) {
      const player = answerRoom.players.find(p => p.id === pid);
      if (player) {
        socket.emit('game:streakUpdate', player.streak);
      }
    }

    const room = getRoom(roomCode);
    if (room && room.phase === 'playing') {
      const allAnswered = room.players.length > 0 && room.players.every(p => p.answer !== null);
      if (allAnswered) {
        doReveal(roomCode);
      } else {
        emitRoomState(roomCode);
      }
    }
  });

  // ── Challenge System ──
  socket.on('game:challenge', (targetPlayerId) => {
    const roomCode = playerRoomCode || (socket as any).playerRoomCode;
    const pid = playerId || (socket as any).playerId;
    if (!roomCode || !pid || isHost) return;
    const room = getRoom(roomCode);
    if (!room || room.phase !== 'ranking') return;

    const challenger = room.players.find(p => p.id === pid);
    const target = room.players.find(p => p.id === targetPlayerId);
    if (!challenger || !target) return;
    if (challenger.score <= 0) return;
    if (pid === targetPlayerId) return;

    // Enforce ONE challenge per challenger per game
    const used = usedChallenges.get(roomCode) || new Set<string>();
    if (used.has(pid)) return;
    used.add(pid);
    usedChallenges.set(roomCode, used);

    // Store pending challenge on room
    room._pendingChallenge = { challengerId: pid, targetId: targetPlayerId };
    io.to(roomCode).emit('game:challengeRequest', pid, challenger.name, challenger.avatar, targetPlayerId);
  });

  socket.on('game:declineChallenge', (challengerId) => {
    const pid = playerId || (socket as any).playerId;
    const roomCode = playerRoomCode || (socket as any).playerRoomCode;
    if (!roomCode || !pid || isHost) return;
    const room = getRoom(roomCode);
    if (!room || !room._pendingChallenge) return;
    if (room._pendingChallenge.targetId !== pid || room._pendingChallenge.challengerId !== challengerId) return;
    room._pendingChallenge = undefined;
    io.to(roomCode).emit('game:challengeDeclined', pid, challengerId);
  });

  socket.on('game:acceptChallenge', (fromPlayerId) => {
    const pid = playerId || (socket as any).playerId;
    const roomCode = playerRoomCode || (socket as any).playerRoomCode;
    if (!roomCode || !pid || isHost) return;
    const room = getRoom(roomCode);
    if (!room) return;

    if (!room._pendingChallenge) return;
    if (room._pendingChallenge.targetId !== pid || room._pendingChallenge.challengerId !== fromPlayerId) return;

    const challenger = room.players.find(p => p.id === fromPlayerId);
    const target = room.players.find(p => p.id === pid);
    if (!challenger || !target) return;

    // Challenge will be injected when advancing to next round
    io.to(roomCode).emit('game:challengeAccepted', target.name);
  });

  // ── Power-Up System ──
  socket.on('game:usePowerUp', (powerUpType, targetPlayerId) => {
    const roomCode = playerRoomCode || (socket as any).playerRoomCode;
    const pid = playerId || (socket as any).playerId;
    if (!roomCode || !pid || isHost) return;
    const room = getRoom(roomCode);
    if (!room || room.phase !== 'ranking') return;

    const player = room.players.find(p => p.id === pid);
    if (!player) return;

    // Check streak-based power-up eligibility
    if (powerUpType === 'steal') {
      if (player.streak < 3) return;
      if (!targetPlayerId || targetPlayerId === pid) return;
      const target = room.players.find(p => p.id === targetPlayerId);
      if (!target) return;
      // Shield blocks steal
      if (target.hasShield) {
        io.to(roomCode).emit('game:powerUpUsed', 'shield_block', player.name, `${target.name} tem escudo! Roubo bloqueado.`);
        player.streak = 0;
        emitRoomState(roomCode);
        return;
      }
      const stolen = Math.min(Math.floor(target.score * 0.3), 150);
      if (stolen <= 0) return;
      target.score = Math.max(0, target.score - stolen);
      player.score += stolen;
      target.score += 50; // consolation bonus
      player.streak = 0;
      io.to(roomCode).emit('game:powerUpUsed', 'steal', player.name, `Roubou ${stolen} pts de ${target.name}! (+50 de consolo)`);
      emitRoomState(roomCode);
    } else if (powerUpType === 'shield') {
      if (player.streak < 5) return;
      player.hasShield = true;
      player.streak = 0;
      io.to(roomCode).emit('game:powerUpUsed', 'shield', player.name, 'Proteção ativada!');
      emitRoomState(roomCode);
    }
  });

  // ── Consensus Mode ──
  socket.on('game:consensusVote', (answer) => {
    const roomCode = playerRoomCode || (socket as any).playerRoomCode;
    const pid = playerId || (socket as any).playerId;
    if (!roomCode || !pid || isHost) return;
    const room = getRoom(roomCode);
    if (!room || room.phase !== 'playing') return;
    const round = room.rounds[room.currentRound];
    if (round.type !== 'consensus') return;

    const result = submitAnswer(roomCode, pid, answer);
    if ('error' in result) {
      socket.emit('error', result.error);
      return;
    }
    socket.emit('player:answerRegistered', result.correct);

    // Check if all voted
    if (room._consensusVotes && room._consensusVotes.size >= room.players.length) {
      // Reveal votes to everyone
      const voteCounts = new Map<string, number>();
      room._consensusVotes.forEach((ans) => {
        voteCounts.set(ans, (voteCounts.get(ans) || 0) + 1);
      });
      const total = room.players.length;
      const votes = (round.consensusOptions || []).map(opt => ({
        option: opt.label,
        count: voteCounts.get(opt.label) || 0,
        percentage: Math.round(((voteCounts.get(opt.label) || 0) / total) * 100),
      }));
      room._consensusPhase = 'reveal';
      io.to(roomCode).emit('game:consensusPhase', 'reveal');
      io.to(roomCode).emit('game:consensusReveal', votes);
    } else {
      emitRoomState(roomCode);
    }
  });

  socket.on('game:consensusRestart', (codeFromClient) => {
    const room = getHostRoom(socket, codeFromClient);
    if (!room || room.phase !== 'playing') return;
    const round = room.rounds[room.currentRound];
    if (round.type !== 'consensus') return;

    // Clear votes and reset players for revote
    room._consensusVotes = new Map();
    room._consensusPhase = 'revote';
    room.players.forEach(p => { p.answer = null; p.answerTime = null; });
    io.to(room.code).emit('game:consensusPhase', 'revote');
    emitRoomState(room.code);
  });

  socket.on('game:consensusFinalAnswer', (answer) => {
    const roomCode = playerRoomCode || (socket as any).playerRoomCode;
    const pid = playerId || (socket as any).playerId;
    if (!roomCode || !pid || isHost) return;
    const room = getRoom(roomCode);
    if (!room || room.phase !== 'playing') return;
    const round = room.rounds[room.currentRound];
    if (round.type !== 'consensus') return;

    const result = submitAnswer(roomCode, pid, answer);
    if ('error' in result) {
      socket.emit('error', result.error);
      return;
    }
    socket.emit('player:answerRegistered', result.correct);

    // Check if all revoted
    if (room._consensusVotes && room._consensusVotes.size >= room.players.length) {
      // End the round
      const version = bumpPhaseVersion(roomCode);
      handleRoundEnd(roomCode, version);
    } else {
      emitRoomState(roomCode);
    }
  });

  // ── Trust Mode (Confie ou Mude) ──
  socket.on('game:trustAnswer', (answer) => {
    const roomCode = playerRoomCode || (socket as any).playerRoomCode;
    const pid = playerId || (socket as any).playerId;
    if (!roomCode || !pid || isHost) return;
    const room = getRoom(roomCode);
    if (!room || room.phase !== 'playing') return;
    const round = room.rounds[room.currentRound];
    if (round.type !== 'trust') return;

    const result = submitAnswer(roomCode, pid, answer);
    if ('error' in result) {
      socket.emit('error', result.error);
      return;
    }
    socket.emit('player:answerRegistered', result.correct);

    // Check if all answered
    const allAnswered = room.players.every(p => p.answer !== null);
    if (allAnswered) {
      // Move to confirm phase - stop timer
      clearRoundTimer(roomCode);
      room._trustPhase = 'confirm';
      io.to(roomCode).emit('game:trustPhase', 'confirm');
    }
    emitRoomState(roomCode);
  });

  socket.on('game:trustConfirm', (confirmed) => {
    const roomCode = playerRoomCode || (socket as any).playerRoomCode;
    const pid = playerId || (socket as any).playerId;
    if (!roomCode || !pid || isHost) return;
    const room = getRoom(roomCode);
    if (!room || room.phase !== 'playing') return;
    const round = room.rounds[room.currentRound];
    if (round.type !== 'trust') return;
    if (room._trustPhase !== 'confirm') return;

    if (!room._trustConfirmed) room._trustConfirmed = new Set();
    if (!room._trustSwitched) room._trustSwitched = new Set();

    if (confirmed) {
      room._trustConfirmed.add(pid);
    } else {
      room._trustSwitched.add(pid);
      // Deduct 100 points for switching
      const player = room.players.find(p => p.id === pid);
      if (player) {
        player.score = Math.max(0, player.score - 100);
      }
    }

    // Check if all confirmed/switched
    if (room._trustConfirmed.size + room._trustSwitched.size >= room.players.length) {
      // If anyone switched, show hint and allow revote
      if (room._trustSwitched.size > 0) {
        room._trustPhase = 'hint';
        io.to(roomCode).emit('game:trustPhase', 'hint');
        io.to(roomCode).emit('game:trustHint', round.hint || 'Sem dica disponível.');
        // Reset answers for players who switched
        room.players.forEach(p => {
          if (room._trustSwitched?.has(p.id)) {
            p.answer = null;
            p.answerTime = null;
          }
        });
      } else {
        // Everyone confirmed - end the round
        const version = bumpPhaseVersion(roomCode);
        handleRoundEnd(roomCode, version);
      }
    }
    emitRoomState(roomCode);
  });

  socket.on('game:trustRevote', (answer) => {
    const roomCode = playerRoomCode || (socket as any).playerRoomCode;
    const pid = playerId || (socket as any).playerId;
    if (!roomCode || !pid || isHost) return;
    const room = getRoom(roomCode);
    if (!room || room.phase !== 'playing') return;
    const round = room.rounds[room.currentRound];
    if (round.type !== 'trust') return;
    if (room._trustPhase !== 'hint') return;
    if (!room._trustSwitched?.has(pid)) return;

    const result = submitAnswer(roomCode, pid, answer);
    if ('error' in result) {
      socket.emit('error', result.error);
      return;
    }
    socket.emit('player:answerRegistered', result.correct);

    // Check if all switchers revoted
    const allSwitchersRevoted = room._trustSwitched ?
      Array.from(room._trustSwitched).every(id => room.players.find(p => p.id === id)?.answer !== null) : true;
    if (allSwitchersRevoted) {
      const version = bumpPhaseVersion(roomCode);
      handleRoundEnd(roomCode, version);
    } else {
      emitRoomState(roomCode);
    }
  });

  socket.on('game:trustAdvance', (codeFromClient) => {
    const room = getHostRoom(socket, codeFromClient);
    if (!room || room.phase !== 'playing') return;
    const round = room.rounds[room.currentRound];
    if (round.type !== 'trust') return;

    if (room._trustPhase === 'confirm') {
      // Host forces advance: treat all non-confirmed as switched
      if (!room._trustSwitched) room._trustSwitched = new Set();
      const switched = room._trustSwitched;
      room.players.forEach(p => {
        if (!room._trustConfirmed?.has(p.id)) {
          switched.add(p.id);
          p.score = Math.max(0, p.score - 100);
        }
      });
      room._trustPhase = 'hint';
      io.to(room.code).emit('game:trustPhase', 'hint');
      io.to(room.code).emit('game:trustHint', round.hint || 'Sem dica disponível.');
      room.players.forEach(p => {
        if (room._trustSwitched?.has(p.id)) {
          p.answer = null;
          p.answerTime = null;
        }
      });
      emitRoomState(room.code);
    } else if (room._trustPhase === 'hint') {
      // Host forces end of revote
      const version = bumpPhaseVersion(room.code);
      handleRoundEnd(room.code, version);
    }
  });

  socket.on('disconnect', () => {
    const rCode = playerRoomCode || (socket as any).playerRoomCode;
    const pId = playerId || (socket as any).playerId;
    const hostFlag = isHost || (socket as any).isHost;

    if (rCode && pId) {
      if (hostFlag) {
        setTimeout(() => {
          const room = getRoom(rCode);
          if (room) {
            const hostSockets = Array.from(io.sockets.adapter.rooms.get(rCode) || []).filter(sid => {
              const s = io.sockets.sockets.get(sid);
              return s && (s as any).isHost;
            });
            if (hostSockets.length === 0) {
              clearRoundTimer(rCode);
              bumpPhaseVersion(rCode);
              deleteRoom(rCode);
              io.to(rCode).emit('game:phaseChange', 'waiting');
              io.to(rCode).emit('error', 'Host desconectado');
            }
          }
        }, 30000);
      } else {
        disconnectPlayer(rCode, pId);
        io.to(rCode).emit('room:playerLeft', pId);
        emitRoomState(rCode);
      }
    }
  });
});

httpServer.listen(PORT, '0.0.0.0', () => {
  const ips = getLocalIps();
  console.log(`\n🎮 Night Slides Server running on port ${PORT}`);
  console.log(`   Health:  http://localhost:${PORT}/api/health`);
  console.log(`   Network: http://${ips[0] || '0.0.0.0'}:${PORT}/api/network`);
  if (ips.length) console.log(`   LAN IPs: ${ips.join(', ')}\n`);
});
