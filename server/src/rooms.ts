import { RoomState, Player, RoundConfig } from './types';
import { GAME_ROUNDS } from './rounds';
import { calculateSpeedScore } from './scoring';
import { createSession, getSession } from './sessionManager';

const rooms = new Map<string, RoomState>();

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function generatePlayerId(): string {
  return 'p_' + Math.random().toString(36).substring(2, 10);
}

export function touchRoom(code: string): void {
  const room = rooms.get(code);
  if (room) {
    room.lastActivityAt = Date.now();
  }
}

export function createRoom(hostId: string): RoomState {
  let code = generateRoomCode();
  while (rooms.has(code)) {
    code = generateRoomCode();
  }

  const hostSessionToken = createSession(code, 'host_' + hostId, 'Host', '🎮');

  const room: RoomState = {
    code,
    hostId,
    hostSessionToken,
    players: [],
    rounds: [...GAME_ROUNDS],
    currentRound: -1,
    phase: 'waiting',
    timeRemaining: 0,
    startedAt: null,
    roundStartedAt: null,
    lastActivityAt: Date.now(),
  };

  rooms.set(code, room);
  return room;
}

export function getRoom(code: string): RoomState | undefined {
  return rooms.get(code);
}

export function deleteRoom(code: string): void {
  rooms.delete(code);
}

export function cleanInactiveRooms(maxInactiveMs: number = 2 * 60 * 60 * 1000): string[] {
  const now = Date.now();
  const deletedCodes: string[] = [];
  for (const [code, room] of rooms.entries()) {
    if (now - room.lastActivityAt > maxInactiveMs || (room.players.length === 0 && now - room.lastActivityAt > 30 * 60 * 1000)) {
      rooms.delete(code);
      deletedCodes.push(code);
    }
  }
  return deletedCodes;
}

export function joinRoom(
  code: string,
  name: string,
  avatar: string
): { player: Player; room: RoomState; sessionToken: string } | { error: string } {
  const room = rooms.get(code);
  if (!room) return { error: 'Sala não encontrada' };
  if (room.phase !== 'waiting') return { error: 'Jogo já começou' };
  if (room.players.length >= 16) return { error: 'Sala cheia (máx. 16 jogadores)' };

  const existingName = room.players.find(p => p.name.trim().toLowerCase() === name.trim().toLowerCase());
  if (existingName) return { error: 'Nome já está em uso nesta sala' };

  const playerId = generatePlayerId();
  const sessionToken = createSession(code, playerId, name, avatar);

  const player: Player = {
    id: playerId,
    name: name.trim(),
    avatar,
    score: 0,
    answer: null,
    answerTime: null,
    connected: true,
    streak: 0,
    hasShield: false,
    sessionToken,
  };

  room.players.push(player);
  touchRoom(code);
  return { player, room, sessionToken };
}

export function reconnectPlayerBySessionToken(sessionToken: string): {
  room: RoomState;
  player?: Player;
  isHost: boolean;
} | null {
  const session = getSession(sessionToken);
  if (!session) return null;

  const room = rooms.get(session.roomCode);
  if (!room) return null;

  if (session.playerId === 'host_' + room.hostId || sessionToken === room.hostSessionToken) {
    touchRoom(room.code);
    return { room, isHost: true };
  }

  const player = room.players.find(p => p.id === session.playerId);
  if (player) {
    player.connected = true;
    touchRoom(room.code);
    return { room, player, isHost: false };
  }

  return null;
}

export function removePlayer(code: string, playerId: string): void {
  const room = rooms.get(code);
  if (!room) return;
  room.players = room.players.filter(p => p.id !== playerId);
  touchRoom(code);
}

export function disconnectPlayer(code: string, playerId: string): void {
  const room = rooms.get(code);
  if (!room) return;
  const player = room.players.find(p => p.id === playerId);
  if (player) player.connected = false;
  touchRoom(code);
}

export function startGame(code: string): RoomState | null {
  const room = rooms.get(code);
  if (!room) return null;

  room.phase = 'roundIntro';
  room.currentRound = 0;
  room.startedAt = Date.now();
  room.roundStartedAt = null;
  touchRoom(code);

  room.players.forEach(p => {
    p.score = 0;
    p.answer = null;
    p.answerTime = null;
    p.streak = 0;
    p.hasShield = false;
  });

  return room;
}

export function startRound(code: string): { room: RoomState; round: RoundConfig } | null {
  const room = rooms.get(code);
  if (!room) return null;
  if (room.currentRound >= room.rounds.length) return null;
  const round = room.rounds[room.currentRound];
  room.phase = 'playing';
  room.roundStartedAt = Date.now();
  room.timeRemaining = round.timeLimit;
  touchRoom(code);

  room.players.forEach(p => {
    p.answer = null;
    p.answerTime = null;
  });

  room._consensusVotes = new Map();
  room._consensusPhase = 'vote';
  room._trustPhase = 'answer';
  room._trustConfirmed = new Set();
  room._trustSwitched = new Set();

  return { room, round };
}

export function advanceRound(code: string): { room: RoomState; round?: RoundConfig } | null {
  const room = rooms.get(code);
  if (!room) return null;

  room.currentRound++;
  touchRoom(code);

  if (room.currentRound >= room.rounds.length) {
    room.phase = 'gameOver';
    return { room };
  }

  const round = room.rounds[room.currentRound];
  room.phase = 'countdown';
  return { room, round };
}

export function submitAnswer(code: string, playerId: string, answer: string): { correct: boolean } | { error: string } {
  const room = rooms.get(code);
  if (!room) return { error: 'Sala não encontrada' };
  if (room.phase !== 'playing') return { error: 'Rodada não está ativa' };

  const player = room.players.find(p => p.id === playerId);
  if (!player) return { error: 'Jogador não encontrado' };
  if (player.answer !== null) return { error: 'Já respondeu nesta rodada' };

  const round = room.rounds[room.currentRound];

  if (round.type === 'consensus') {
    if (!room._consensusVotes) room._consensusVotes = new Map();
    room._consensusVotes.set(playerId, answer);
    player.answer = answer;
    player.answerTime = Date.now();
    touchRoom(code);
    return { correct: answer === round.correctAnswer };
  }

  if (round.type === 'trust') {
    player.answer = answer;
    player.answerTime = Date.now();
    touchRoom(code);
    return { correct: answer === round.correctAnswer };
  }

  if (round.type === 'prank') {
    player.answer = answer;
    player.answerTime = Date.now();
    touchRoom(code);
    return { correct: false };
  }

  player.answer = answer;
  player.answerTime = Date.now();
  touchRoom(code);

  const correct = answer === round.correctAnswer;
  if (correct) {
    player.streak++;
  } else {
    player.streak = 0;
  }

  return { correct };
}

export function endRound(code: string): {
  room: RoomState;
  answers: Array<{ playerId: string; answer: string; correct: boolean; name: string; avatar: string }>;
  scoring: Array<{ playerId: string; name: string; avatar: string; delta: number; total: number }>;
  ranking: Array<{ position: number; playerId: string; name: string; avatar: string; score: number }>;
} | null {
  const room = rooms.get(code);
  if (!room) return null;

  const round = room.rounds[room.currentRound];
  const isPrank = round.type === 'prank';

  room.phase = isPrank ? 'countdown' : 'reveal';
  touchRoom(code);

  const answers = room.players.map(p => {
    const correct = p.answer === round.correctAnswer;
    return {
      playerId: p.id,
      answer: p.answer ?? 'Não respondeu',
      correct,
      name: p.name,
      avatar: p.avatar,
    };
  });

  const previousScores = new Map<string, number>();
  room.players.forEach(p => previousScores.set(p.id, p.score));

  if (!isPrank) {
    const multiplier = round.multiplier || 1;

    if (round.type === 'trust') {
      // Trust scoring: keep+correct=bonus, change+correct=normal, keep+wrong=0, change+wrong=already deducted
      room.players.forEach(p => {
        const correct = p.answer === round.correctAnswer;
        const wasConfirmed = room._trustConfirmed?.has(p.id) ?? false;
        const wasSwitched = room._trustSwitched?.has(p.id) ?? false;

        if (wasConfirmed && correct) {
          // Kept + Correct: bonus (1.5x speed score)
          const base = calculateSpeedScore(true, p.answerTime, room.roundStartedAt!, multiplier, p.streak);
          p.score += Math.floor(base * 1.5);
        } else if (wasSwitched && correct) {
          // Changed + Correct: normal score (1x)
          const base = calculateSpeedScore(true, p.answerTime, room.roundStartedAt!, multiplier, p.streak);
          p.score += base;
        } else if (wasSwitched && !correct) {
          // Changed + Wrong: -100 already deducted during switch
          // No additional penalty
        }
        // Kept + Wrong: 0 points (no change)
      });
    } else {
      room.players.forEach(p => {
        const correct = p.answer === round.correctAnswer;
        const delta = calculateSpeedScore(correct, p.answerTime, room.roundStartedAt!, multiplier, p.streak);
        p.score += delta;
      });
    }
  }

  const scoring = room.players.map(p => {
    const previous = previousScores.get(p.id) || 0;
    const delta = p.score - previous;
    return {
      playerId: p.id,
      name: p.name,
      avatar: p.avatar,
      delta,
      total: p.score,
    };
  });

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

  return { room, answers, scoring, ranking };
}

export function restartGame(code: string): RoomState | null {
  const room = rooms.get(code);
  if (!room) return null;

  room.phase = 'waiting';
  room.currentRound = -1;
  room.timeRemaining = 0;
  room.startedAt = null;
  room.roundStartedAt = null;
  touchRoom(code);

  room.players.forEach(p => {
    p.score = 0;
    p.answer = null;
    p.answerTime = null;
    p.streak = 0;
    p.hasShield = false;
  });

  return room;
}
