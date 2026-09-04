import crypto from 'crypto';

export interface SessionData {
  sessionToken: string;
  roomCode: string;
  playerId: string;
  playerName: string;
  playerAvatar: string;
  createdAt: number;
}

const sessions = new Map<string, SessionData>();

export function createSession(roomCode: string, playerId: string, playerName: string, playerAvatar: string): string {
  const sessionToken = crypto.randomBytes(16).toString('hex');
  sessions.set(sessionToken, {
    sessionToken,
    roomCode,
    playerId,
    playerName,
    playerAvatar,
    createdAt: Date.now(),
  });
  return sessionToken;
}

export function getSession(sessionToken: string): SessionData | undefined {
  return sessions.get(sessionToken);
}

export function deleteSession(sessionToken: string): void {
  sessions.delete(sessionToken);
}

export function cleanExpiredSessions(maxAgeMs: number = 24 * 60 * 60 * 1000): void {
  const now = Date.now();
  for (const [token, session] of sessions.entries()) {
    if (now - session.createdAt > maxAgeMs) {
      sessions.delete(token);
    }
  }
}
