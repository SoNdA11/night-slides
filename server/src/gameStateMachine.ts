import { GamePhase } from './types';

export const VALID_TRANSITIONS: Record<GamePhase, GamePhase[]> = {
  waiting: ['roundIntro', 'countdown'],
  roundIntro: ['countdown', 'waiting'],
  countdown: ['playing', 'prank', 'waiting', 'roundIntro'],
  playing: ['reveal', 'scoring', 'prank', 'waiting'],
  reveal: ['scoring', 'ranking', 'waiting'],
  scoring: ['ranking', 'waiting'],
  ranking: ['roundIntro', 'countdown', 'gameOver', 'prank', 'waiting'],
  prank: ['roundIntro', 'countdown', 'gameOver', 'waiting'],
  gameOver: ['waiting'],
};

export function canTransition(currentPhase: GamePhase, nextPhase: GamePhase): boolean {
  if (currentPhase === nextPhase) return true;
  const allowed = VALID_TRANSITIONS[currentPhase];
  return allowed ? allowed.includes(nextPhase) : false;
}
