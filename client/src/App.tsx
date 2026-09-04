import { useState, useEffect, useCallback, createContext, useContext, useRef } from 'react';
import { AnimatePresence } from 'framer-motion';
import { getSocket } from './services/socket';
import type { AppState, RoomState, RoundConfig, ScoreChange, RankingEntry } from './types';
import LandingPage from './pages/LandingPage';
import JoinPage from './pages/JoinPage';
import PlayerPage from './pages/PlayerPage';
import HostPage from './pages/HostPage';
import TVPage from './pages/TVPage';

// ─── Context ───────────────────────────────────────────────
interface GameContextType {
  state: AppState;
  room: RoomState | null;
  currentRound: RoundConfig | null;
  timeRemaining: number;
  countdown: number;
  myAnswer: string | null;
  myAnswerCorrect: boolean | null;
  answerRegistered: boolean;
  scoreChanges: ScoreChange[];
  ranking: RankingEntry[];
  roundAnswers: Array<{ playerId: string; answer: string; correct: boolean }>;
  champion: { name: string; avatar: string; score: number } | null;
  roundIntroIndex: number;
  myStreak: number;
  powerUpNotification: { type: string; from: string; effect: string } | null;
  consensusPhase: 'vote' | 'reveal' | 'revote';
  consensusVotes: Array<{ option: string; count: number; percentage: number }>;
  flashExpired: boolean;
  trustPhase: 'answer' | 'confirm' | 'hint' | 'revote';
  trustHint: string;
  setViewMode: (mode: AppState['viewMode']) => void;
  setRoomCode: (code: string | null) => void;
  setPlayerInfo: (name: string, avatar: string) => void;
  setIsHost: (isHost: boolean) => void;
  setMyAnswer: (answer: string | null) => void;
  submitAnswer: (answer: string) => void;
  setAnswerRegistered: (registered: boolean) => void;
  createRoom: () => void;
  joinRoom: (code: string, name: string, avatar: string) => void;
  observeRoom: (code: string) => void;
  startGame: () => void;
  startRoundNow: () => void;
  nextRound: () => void;
  revealAnswer: () => void;
  showRanking: () => void;
  restartGame: () => void;
  challengePlayer: (targetPlayerId: string) => void;
  acceptChallenge: (fromPlayerId: string) => void;
  usePowerUp: (powerUpType: string, targetPlayerId?: string) => void;
  consensusRestart: () => void;
  trustAnswer: (answer: string) => void;
  trustConfirm: (confirmed: boolean) => void;
  trustRevote: (answer: string) => void;
  trustAdvance: () => void;
  pendingChallenge: { fromId: string; fromName: string; fromAvatar: string } | null;
  setPendingChallenge: (challenge: { fromId: string; fromName: string; fromAvatar: string } | null) => void;
}

export const GameContext = createContext<GameContextType | null>(null);

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used within GameContext');
  return ctx;
}

// ─── App ───────────────────────────────────────────────────
export default function App() {
  const [state, setState] = useState<AppState>({
    viewMode: 'landing',
    roomCode: null,
    playerId: null,
    playerName: null,
    playerAvatar: null,
    isHost: false,
    currentPhase: 'waiting',
  });

  const [room, setRoom] = useState<RoomState | null>(null);
  const [currentRound, setCurrentRound] = useState<RoundConfig | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [countdown, setCountdown] = useState(3);
  const [myAnswer, setMyAnswer] = useState<string | null>(null);
  const [myAnswerCorrect, setMyAnswerCorrect] = useState<boolean | null>(null);
  const [answerRegistered, setAnswerRegistered] = useState(false);
  const [scoreChanges, setScoreChanges] = useState<ScoreChange[]>([]);
  const [ranking, setRanking] = useState<RankingEntry[]>([]);
  const [roundAnswers, setRoundAnswers] = useState<Array<{ playerId: string; answer: string; correct: boolean }>>([]);
  const [champion, setChampion] = useState<{ name: string; avatar: string; score: number } | null>(null);
  const [roundIntroIndex, setRoundIntroIndex] = useState(0);
  const [pendingChallenge, setPendingChallenge] = useState<{ fromId: string; fromName: string; fromAvatar: string } | null>(null);
  const [myStreak, setMyStreak] = useState(0);
  const [powerUpNotification, setPowerUpNotification] = useState<{ type: string; from: string; effect: string } | null>(null);
  const [consensusPhase, setConsensusPhase] = useState<'vote' | 'reveal' | 'revote'>('vote');
  const [consensusVotes, setConsensusVotes] = useState<Array<{ option: string; count: number; percentage: number }>>([]);
  const [flashExpired, setFlashExpired] = useState(false);
  const [trustPhase, setTrustPhase] = useState<'answer' | 'confirm' | 'hint' | 'revote'>('answer');
  const [trustHint, setTrustHint] = useState('');

  const playerIdRef = useRef<string | null>(null);

  useEffect(() => {
    playerIdRef.current = state.playerId;
  }, [state.playerId]);

  // ── Auto-Reconnect using Saved Session ──
  useEffect(() => {
    const savedToken = localStorage.getItem('night_slides_session_token');
    if (!savedToken) return;

    const socket = getSocket();
    const tryReconnect = () => {
      socket.emit('room:reconnect', { sessionToken: savedToken }, (res: any) => {
        if (res.success) {
          setState(s => ({
            ...s,
            roomCode: res.roomCode,
            playerId: res.playerId,
            playerName: res.name,
            playerAvatar: res.avatar,
            isHost: res.isHost,
            viewMode: res.isHost ? 'host' : 'player',
          }));
        } else {
          localStorage.removeItem('night_slides_session_token');
        }
      });
    };

    if (socket.connected) tryReconnect();
    else socket.once('connect', tryReconnect);
  }, []);

  // ── Socket Setup ──
  useEffect(() => {
    const socket = getSocket();

    socket.on('room:state', (roomState) => {
      setRoom(roomState);
      setState(s => ({ ...s, currentPhase: roomState.phase, roomCode: roomState.code }));
      if (roomState.currentRound >= 0 && roomState.rounds[roomState.currentRound]) {
        setCurrentRound(roomState.rounds[roomState.currentRound]);
      }
    });

    socket.on('game:phaseChange', (phase) => {
      setState(s => ({ ...s, currentPhase: phase }));
      if (phase === 'waiting') {
        setCurrentRound(null);
        setMyAnswer(null);
        setMyAnswerCorrect(null);
        setAnswerRegistered(false);
        setScoreChanges([]);
        setRoundAnswers([]);
        setChampion(null);
        setConsensusPhase('vote');
        setConsensusVotes([]);
        setTrustPhase('answer');
        setTrustHint('');
      }
      if (phase === 'countdown') {
        setCountdown(3);
        setMyAnswer(null);
        setMyAnswerCorrect(null);
        setAnswerRegistered(false);
        setConsensusPhase('vote');
        setConsensusVotes([]);
        setTrustPhase('answer');
        setTrustHint('');
      }
    });

    socket.on('game:countdown', (count) => {
      setCountdown(count);
    });

    socket.on('game:roundIntro', (round, roundIndex) => {
      setCurrentRound(round);
      setRoundIntroIndex(roundIndex);
      setMyAnswer(null);
      setMyAnswerCorrect(null);
      setAnswerRegistered(false);
      setScoreChanges([]);
      setRoundAnswers([]);
      setConsensusPhase('vote');
      setConsensusVotes([]);
    });

    socket.on('game:roundStart', (round, timeLimit) => {
      setCurrentRound(round);
      setTimeRemaining(timeLimit);
      setMyAnswer(null);
      setMyAnswerCorrect(null);
      setAnswerRegistered(false);
      setScoreChanges([]);
      setRoundAnswers([]);
      setFlashExpired(false);
    });

    socket.on('game:timer', (time) => {
      setTimeRemaining(time);
    });

    socket.on('game:roundEnd', (answers) => {
      setRoundAnswers(answers);
    });

    socket.on('game:scoring', (scoring) => {
      setScoreChanges(scoring);
    });

    socket.on('game:ranking', (rank) => {
      setRanking(rank);
    });

    socket.on('game:gameOver', (champ, rank) => {
      setChampion(champ);
      setRanking(rank);
    });

    socket.on('game:challengeRequest', (fromId, fromName, fromAvatar, targetId) => {
      if (playerIdRef.current === targetId) {
        setPendingChallenge({ fromId, fromName, fromAvatar });
      }
    });

    socket.on('game:challengeAccepted', (opponentName) => {
      setPendingChallenge(null);
    });

    socket.on('game:challengeDeclined', (targetId) => {
      if (playerIdRef.current === targetId) {
        setPendingChallenge(null);
      }
    });

    socket.on('player:answerRegistered', (correct) => {
      setMyAnswerCorrect(correct);
      setAnswerRegistered(true);
    });

    socket.on('game:streakUpdate', (streak) => {
      setMyStreak(streak);
    });

    socket.on('game:powerUpUsed', (powerUpType, fromName, effect) => {
      setPowerUpNotification({ type: powerUpType, from: fromName, effect });
      setTimeout(() => setPowerUpNotification(null), 4000);
    });

    socket.on('game:flashExpired', () => {
      setFlashExpired(true);
    });

    socket.on('game:consensusPhase', (phase) => {
      setConsensusPhase(phase);
      if (phase === 'revote') {
        setMyAnswer(null);
        setAnswerRegistered(false);
      }
    });

    socket.on('game:consensusReveal', (votes) => {
      setConsensusVotes(votes);
    });

    socket.on('game:trustPhase', (phase) => {
      setTrustPhase(phase);
      if (phase === 'answer') {
        setMyAnswer(null);
        setAnswerRegistered(false);
      }
    });

    socket.on('game:trustHint', (hint) => {
      setTrustHint(hint);
    });

    socket.on('error', (message) => {
      console.error('Server error:', message);
    });

    return () => {
      socket.off('room:state');
      socket.off('game:phaseChange');
      socket.off('game:countdown');
      socket.off('game:roundIntro');
      socket.off('game:roundStart');
      socket.off('game:timer');
      socket.off('game:roundEnd');
      socket.off('game:scoring');
      socket.off('game:ranking');
      socket.off('game:gameOver');
      socket.off('game:challengeRequest');
      socket.off('game:challengeAccepted');
      socket.off('game:challengeDeclined');
      socket.off('player:answerRegistered');
      socket.off('game:streakUpdate');
      socket.off('game:powerUpUsed');
      socket.off('game:flashExpired');
      socket.off('game:consensusPhase');
      socket.off('game:consensusReveal');
      socket.off('game:trustPhase');
      socket.off('game:trustHint');
      socket.off('error');
    };
  }, []);

  // ── Actions ──
  const setViewMode = useCallback((viewMode: AppState['viewMode']) => {
    setState(s => ({ ...s, viewMode }));
  }, []);

  const setRoomCode = useCallback((code: string | null) => {
    setState(s => ({ ...s, roomCode: code }));
  }, []);

  const setPlayerInfo = useCallback((name: string, avatar: string) => {
    setState(s => ({ ...s, playerName: name, playerAvatar: avatar }));
  }, []);

  const setIsHost = useCallback((isHost: boolean) => {
    setState(s => ({ ...s, isHost }));
  }, []);

  // ── Hash Router ──
  useEffect(() => {
    function handleHash() {
      const hash = window.location.hash;
      if (hash.includes('/join') && hash.includes('room=')) {
        const match = hash.match(/room=([A-Za-z0-9]+)/);
        if (match) {
          setViewMode('join');
        }
      } else if (hash.includes('/tv')) {
        setViewMode('tv');
      }
    }
    handleHash();
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  const setMyAnswerFn = useCallback((answer: string | null) => {
    setMyAnswer(answer);
  }, []);

  const setPendingChallengeFn = useCallback((challenge: { fromId: string; fromName: string; fromAvatar: string } | null) => {
    setPendingChallenge(challenge);
  }, []);

  const createRoom = useCallback(() => {
    const socket = getSocket();
    const emitCreate = () => {
      socket.emit('room:create', (res: { roomCode: string; hostSessionToken: string }) => {
        if (res?.hostSessionToken) {
          localStorage.setItem('night_slides_session_token', res.hostSessionToken);
        }
        setState(s => ({
          ...s,
          roomCode: res.roomCode,
          isHost: true,
          viewMode: 'host',
        }));
      });
    };
    if (socket.connected) {
      emitCreate();
    } else {
      socket.once('connect', emitCreate);
    }
  }, []);

  const joinRoomAction = useCallback((code: string, name: string, avatar: string) => {
    const socket = getSocket();
    const emitJoin = () => {
      socket.emit('room:join', code.toUpperCase(), { name, avatar }, (result: { success: boolean; playerId?: string; sessionToken?: string; error?: string }) => {
        if (result.success && result.playerId) {
          if (result.sessionToken) {
            localStorage.setItem('night_slides_session_token', result.sessionToken);
          }
          setState(s => ({
            ...s,
            roomCode: code.toUpperCase(),
            playerId: result.playerId!,
            playerName: name,
            playerAvatar: avatar,
            isHost: false,
            viewMode: 'player',
          }));
        }
      });
    };
    if (socket.connected) {
      emitJoin();
    } else {
      socket.once('connect', emitJoin);
    }
  }, []);

  const observeRoomAction = useCallback((code: string) => {
    const socket = getSocket();
    const emitObserve = () => {
      socket.emit('room:observe', code.toUpperCase(), (result: { success: boolean; error?: string }) => {
        if (result.success) {
          setState(s => ({
            ...s,
            roomCode: code.toUpperCase(),
            isHost: false,
            viewMode: 'tv',
          }));
        }
      });
    };
    if (socket.connected) {
      emitObserve();
    } else {
      socket.once('connect', emitObserve);
    }
  }, []);

  const startGame = useCallback(() => {
    const socket = getSocket();
    socket.emit('game:start', state.roomCode || undefined);
  }, [state.roomCode]);

  const startRoundNow = useCallback(() => {
    const socket = getSocket();
    socket.emit('game:startRound', state.roomCode || undefined);
  }, [state.roomCode]);

  const nextRound = useCallback(() => {
    const socket = getSocket();
    socket.emit('game:nextRound', state.roomCode || undefined);
  }, [state.roomCode]);

  const revealAnswer = useCallback(() => {
    const socket = getSocket();
    socket.emit('game:revealAnswer', state.roomCode || undefined);
  }, [state.roomCode]);

  const showRanking = useCallback(() => {
    const socket = getSocket();
    socket.emit('game:showRanking', state.roomCode || undefined);
  }, [state.roomCode]);

  const restartGame = useCallback(() => {
    const socket = getSocket();
    socket.emit('game:restart', state.roomCode || undefined);
  }, [state.roomCode]);

  const challengePlayer = useCallback((targetPlayerId: string) => {
    const socket = getSocket();
    socket.emit('game:challenge', targetPlayerId);
  }, []);

  const acceptChallenge = useCallback((fromPlayerId: string) => {
    const socket = getSocket();
    socket.emit('game:acceptChallenge', fromPlayerId);
  }, []);

  const usePowerUp = useCallback((powerUpType: string, targetPlayerId?: string) => {
    const socket = getSocket();
    socket.emit('game:usePowerUp', powerUpType, targetPlayerId);
  }, []);

  const consensusRestart = useCallback(() => {
    const socket = getSocket();
    socket.emit('game:consensusRestart', state.roomCode || undefined);
  }, [state.roomCode]);

  const trustAnswer = useCallback((answer: string) => {
    const socket = getSocket();
    socket.emit('game:trustAnswer', answer);
  }, []);

  const trustConfirm = useCallback((confirmed: boolean) => {
    const socket = getSocket();
    socket.emit('game:trustConfirm', confirmed);
  }, []);

  const trustRevote = useCallback((answer: string) => {
    const socket = getSocket();
    socket.emit('game:trustRevote', answer);
  }, []);

  const trustAdvance = useCallback(() => {
    const socket = getSocket();
    socket.emit('game:trustAdvance', state.roomCode || undefined);
  }, [state.roomCode]);

  const submitAnswerAction = useCallback((answer: string) => {
    const socket = getSocket();
    if (answerRegistered) return;
    setMyAnswer(answer);
    socket.emit('player:answer', answer);
  }, [answerRegistered]);

  const getView = () => {
    switch (state.viewMode) {
      case 'landing':
        return <LandingPage />;
      case 'join':
        return <JoinPage />;
      case 'player':
        return <PlayerPage />;
      case 'host':
        return <HostPage />;
      case 'tv':
        return <TVPage />;
      default:
        return <LandingPage />;
    }
  };

  const ctxValue: GameContextType = {
    state,
    room,
    currentRound,
    timeRemaining,
    countdown,
    myAnswer,
    myAnswerCorrect,
    answerRegistered,
    scoreChanges,
    ranking,
    roundAnswers,
    champion,
    roundIntroIndex,
    myStreak,
    powerUpNotification,
    consensusPhase,
    consensusVotes,
    flashExpired,
    trustPhase,
    trustHint,
    setViewMode,
    setRoomCode,
    setPlayerInfo,
    setIsHost,
    setMyAnswer: setMyAnswerFn,
    submitAnswer: submitAnswerAction,
    setAnswerRegistered,
    createRoom,
    joinRoom: joinRoomAction,
    observeRoom: observeRoomAction,
    startGame,
    startRoundNow,
    nextRound,
    revealAnswer,
    showRanking,
    restartGame,
    challengePlayer,
    acceptChallenge,
    usePowerUp,
    consensusRestart,
    trustAnswer,
    trustConfirm,
    trustRevote,
    trustAdvance,
    pendingChallenge,
    setPendingChallenge: setPendingChallengeFn,
  };

  return (
    <GameContext.Provider value={ctxValue}>
      <div className="w-screen h-screen bg-animated overflow-hidden">
        <AnimatePresence mode="wait">
          {getView()}
        </AnimatePresence>
      </div>
    </GameContext.Provider>
  );
}
