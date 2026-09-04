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
  sessionToken?: string;
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
  hint?: string; // hint shown in trust round after confirm phase
  multiQuestions?: MultiQuestionItem[];
  currentMultiIndex?: number;
  timeLimit: number;
  flashDuration?: number; // seconds the image is visible before going black
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
  hostSessionToken: string;
  players: Player[];
  rounds: RoundConfig[];
  currentRound: number;
  phase: GamePhase;
  timeRemaining: number;
  startedAt: number | null;
  roundStartedAt: number | null;
  lastActivityAt: number;
  _challengeContext?: { challengerId: string; targetId: string; prevRound: number; originalRounds: RoundConfig[] };
  _pendingChallenge?: { challengerId: string; targetId: string };
  _consensusVotes?: Map<string, string>;  // playerId -> answer
  _consensusPhase?: 'vote' | 'reveal' | 'revote';
  _trustPhase?: 'answer' | 'confirm' | 'hint' | 'revote';
  _trustConfirmed?: Set<string>;  // playerIds who confirmed (locked)
  _trustSwitched?: Set<string>;   // playerIds who chose to switch
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

// ─── Socket Events ───────────────────────────────────────
export interface ServerToClientEvents {
  'room:state': (state: RoomState) => void;
  'room:playerJoined': (player: Player) => void;
  'room:playerLeft': (playerId: string) => void;
  'game:phaseChange': (phase: GamePhase) => void;
  'game:countdown': (count: number) => void;
  'game:roundIntro': (round: RoundConfig, roundIndex: number) => void;
  'game:roundStart': (round: RoundConfig, timeLimit: number) => void;
  'game:timer': (timeRemaining: number) => void;
  'game:roundEnd': (answers: Array<{ playerId: string; answer: string; correct: boolean }>) => void;
  'game:reveal': (correctAnswer: string, correctFlag: string) => void;
  'game:scoring': (scores: Array<{ playerId: string; name: string; avatar: string; delta: number; total: number }>) => void;
  'game:ranking': (ranking: Array<{ position: number; playerId: string; name: string; avatar: string; score: number }>) => void;
  'game:gameOver': (champion: { name: string; avatar: string; score: number }, ranking: Array<{ position: number; name: string; avatar: string; score: number }>) => void;
  'game:challengeRequest': (fromId: string, fromName: string, fromAvatar: string, targetId: string) => void;
  'game:challengeAccepted': (opponentName: string) => void;
  'game:challengeDeclined': (targetId: string, challengerId: string) => void;
  'game:challengeResult': (won: boolean, stolenPoints: number) => void;
  'player:answerRegistered': (correct: boolean) => void;
  'player:scoreUpdate': (score: number, delta: number) => void;
  'player:reconnected': (data: { roomCode: string; playerId: string; name: string; avatar: string; isHost: boolean }) => void;
  'game:powerUpUsed': (powerUpType: string, fromName: string, effect: string) => void;
  'game:streakUpdate': (streak: number) => void;
  'game:flashExpired': () => void;
  'game:consensusReveal': (votes: Array<{ option: string; count: number; percentage: number }>) => void;
  'game:consensusPhase': (phase: 'vote' | 'reveal' | 'revote') => void;
  'game:trustPhase': (phase: 'answer' | 'confirm' | 'hint' | 'revote') => void;
  'game:trustHint': (hint: string) => void;
  'error': (message: string) => void;
}

export interface ClientToServerEvents {
  'room:create': (callback: (response: { roomCode: string; hostSessionToken: string }) => void) => void;
  'room:join': (roomCode: string, player: { name: string; avatar: string }, callback: (result: { success: boolean; playerId?: string; sessionToken?: string; error?: string }) => void) => void;
  'room:observe': (roomCode: string, callback: (result: { success: boolean; error?: string }) => void) => void;
  'room:reconnect': (data: { sessionToken: string }, callback: (result: { success: boolean; roomCode?: string; playerId?: string; name?: string; avatar?: string; isHost?: boolean; error?: string }) => void) => void;
  'room:removePlayer': (playerId: string) => void;
  'game:start': (roomCode?: string) => void;
  'game:nextRound': (roomCode?: string) => void;
  'game:revealAnswer': (roomCode?: string) => void;
  'game:showRanking': (roomCode?: string) => void;
  'game:startRound': (roomCode?: string) => void;
  'game:restart': (roomCode?: string) => void;
  'game:challenge': (targetPlayerId: string) => void;
  'game:acceptChallenge': (fromPlayerId: string) => void;
  'game:declineChallenge': (challengerId: string) => void;
  'game:usePowerUp': (powerUpType: string, targetPlayerId?: string) => void;
  'game:consensusVote': (answer: string) => void;
  'game:consensusFinalAnswer': (answer: string) => void;
  'game:consensusRestart': (roomCode?: string) => void;
  'game:trustAnswer': (answer: string) => void;
  'game:trustConfirm': (confirmed: boolean) => void;
  'game:trustRevote': (answer: string) => void;
  'game:trustAdvance': (roomCode?: string) => void;
  'player:answer': (answer: string) => void;
}
