import { RoomState, Player, RoundConfig } from './types';

/**
 * Sanitizes the RoomState before sending it to clients.
 * - Filters out host from the players array.
 * - Strips `correctAnswer` and `correctFlag` during hidden phases (playing, countdown, roundIntro, waiting).
 * - Masks answers of other players during playing phase so nobody can see what others chose before round end.
 */
export function sanitizeRoomState(room: RoomState, recipientId?: string, isHost: boolean = false): RoomState {
  const sanitizedPlayers: Player[] = room.players
    .filter(p => !p.id.startsWith('host_'))
    .map(p => {
      // If phase is active playing and recipient is another player, mask p.answer
      const isSelf = recipientId && p.id === recipientId;
      const maskAnswer = !isHost && !isSelf && (room.phase === 'playing' || room.phase === 'countdown' || room.phase === 'roundIntro');
      
      return {
        ...p,
        answer: maskAnswer ? (p.answer !== null ? '___SUBMITTED___' : null) : p.answer,
      };
    });

  const hideSecrets = !isHost && (room.phase === 'waiting' || room.phase === 'countdown' || room.phase === 'roundIntro' || room.phase === 'playing');

  const sanitizedRounds: RoundConfig[] = room.rounds.map((round, idx) => {
    if (hideSecrets && idx === room.currentRound) {
      const { correctAnswer, correctFlag, ...safeRound } = round;
      return safeRound as RoundConfig;
    }
    if (hideSecrets && idx > room.currentRound) {
      const { correctAnswer, correctFlag, ...safeRound } = round;
      return safeRound as RoundConfig;
    }
    return round;
  });

  return {
    ...room,
    players: sanitizedPlayers,
    rounds: sanitizedRounds,
  };
}
