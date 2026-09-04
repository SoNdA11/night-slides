import type { AppState, RoomState, RoundConfig, GamePhase, ScoreChange, RankingEntry, RoundAnswer } from '../types';

// ─── Game Store ────────────────────────────────────────────
interface GameStore extends AppState {
  room: RoomState | null;
  currentRound: RoundConfig | null;
  timeRemaining: number;
  countdown: number;
  myAnswer: string | null;
  myAnswerCorrect: boolean | null;
  answerRegistered: boolean;
  scoreChanges: ScoreChange[];
  ranking: RankingEntry[];
  answers: RoundAnswer[];
  champion: { name: string; avatar: string; score: number } | null;
  roundAnswers: Array<{ playerId: string; answer: string; correct: boolean }>;

  // Actions
  setViewMode: (mode: AppState['viewMode']) => void;
  setRoomCode: (code: string | null) => void;
  setPlayerId: (id: string | null) => void;
  setPlayerInfo: (name: string, avatar: string) => void;
  setIsHost: (isHost: boolean) => void;
  setRoom: (room: RoomState | null) => void;
  setCurrentRound: (round: RoundConfig | null) => void;
  setTimeRemaining: (time: number) => void;
  setCountdown: (count: number) => void;
  setMyAnswer: (answer: string | null) => void;
  setMyAnswerCorrect: (correct: boolean | null) => void;
  setAnswerRegistered: (registered: boolean) => void;
  setScoreChanges: (changes: ScoreChange[]) => void;
  setRanking: (ranking: RankingEntry[]) => void;
  setChampion: (champion: { name: string; avatar: string; score: number } | null) => void;
  setRoundAnswers: (answers: Array<{ playerId: string; answer: string; correct: boolean }>) => void;
  setPhase: (phase: GamePhase) => void;
  reset: () => void;
}

const initialState: AppState & {
  room: RoomState | null;
  currentRound: RoundConfig | null;
  timeRemaining: number;
  countdown: number;
  myAnswer: string | null;
  myAnswerCorrect: boolean | null;
  answerRegistered: boolean;
  scoreChanges: ScoreChange[];
  ranking: RankingEntry[];
  answers: RoundAnswer[];
  champion: { name: string; avatar: string; score: number } | null;
  roundAnswers: Array<{ playerId: string; answer: string; correct: boolean }>;
} = {
  viewMode: 'landing',
  roomCode: null,
  playerId: null,
  playerName: null,
  playerAvatar: null,
  isHost: false,
  currentPhase: 'waiting',
  room: null,
  currentRound: null,
  timeRemaining: 0,
  countdown: 3,
  myAnswer: null,
  myAnswerCorrect: null,
  answerRegistered: false,
  scoreChanges: [],
  ranking: [],
  answers: [],
  champion: null,
  roundAnswers: [],
};

// Simple state management using React context pattern
// We'll use a simpler approach with useState in the App component
export type { GameStore };
export { initialState };
