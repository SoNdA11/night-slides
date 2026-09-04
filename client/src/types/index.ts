// ─── Player ────────────────────────────────────────────────
export interface Player {
  id: string;
  name: string;
  avatar: string;
  score: number;
  answer: string | null;
  answerTime: number | null;
  connected: boolean;
  streak: number;
  hasShield: boolean;
}

// ─── Scoring ───────────────────────────────────────────────
export type ScoringRuleType = 'speed' | 'intruder' | 'prank' | 'flash' | 'consensus' | 'betting' | 'king';

export interface ScoringRule {
  type: ScoringRuleType;
}

// ─── Round ─────────────────────────────────────────────────
export type RoundType =
  | 'guess'
  | 'truefalse'
  | 'intruder'
  | 'flash'
  | 'prank'
  | 'consensus'
  | 'trust'
  | 'betting'
  | 'king'
  | 'multiquestion';

export interface MultiQuestionItem {
  question: string;
  options: Array<{ label: string; flag?: string }>;
  correctAnswer: string;
}

export interface RoundConfig {
  id: number;
  type: RoundType;
  title: string;
  subtitle?: string;
  rules?: string;
  image: string;
  correctAnswer?: string;
  correctFlag?: string;
  options?: Array<{ label: string; flag?: string }>;
  intruderImages?: Array<{ country: string; image: string }>;
  consensusOptions?: Array<{ label: string; flag?: string }>;
  hint?: string;
  multiQuestions?: MultiQuestionItem[];
  currentMultiIndex?: number;
  timeLimit: number;
  multiplier?: number;
  scoringRule: ScoringRule;
  isPrank?: boolean;
}

// ─── Game State ────────────────────────────────────────────
export type GamePhase =
  | 'waiting'
  | 'countdown'
  | 'roundIntro'
  | 'playing'
  | 'reveal'
  | 'scoring'
  | 'ranking'
  | 'gameOver'
  | 'prank';

export interface RoomState {
  code: string;
  hostId: string;
  players: Player[];
  rounds: RoundConfig[];
  currentRound: number;
  phase: GamePhase;
  timeRemaining: number;
  startedAt: number | null;
  roundStartedAt: number | null;
}

// ─── Score Display ─────────────────────────────────────────
export interface ScoreChange {
  playerId: string;
  name: string;
  avatar: string;
  delta: number;
  total: number;
}

export interface RankingEntry {
  position: number;
  playerId?: string;
  name: string;
  avatar: string;
  score: number;
}

export interface RoundAnswer {
  playerId: string;
  answer: string;
  correct: boolean;
}

// ─── View Mode ─────────────────────────────────────────────
export type ViewMode = 'landing' | 'join' | 'player' | 'host' | 'tv';

export interface AppState {
  viewMode: ViewMode;
  roomCode: string | null;
  playerId: string | null;
  playerName: string | null;
  playerAvatar: string | null;
  isHost: boolean;
  currentPhase: GamePhase;
}
