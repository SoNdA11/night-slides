import { io, Socket } from 'socket.io-client';

// ─── Server URL ────────────────────────────────────────────
function getServerUrl(): string {
  if (import.meta.env.VITE_SERVER_URL && import.meta.env.VITE_SERVER_URL.trim() !== '') {
    return import.meta.env.VITE_SERVER_URL;
  }
  const host = window.location.hostname;
  const isLocal = host === 'localhost' || host === '127.0.0.1';
  if (isLocal) {
    return `http://${host}:3001`;
  }
  return window.location.origin;
}

// ─── Singleton ─────────────────────────────────────────────
let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    const url = getServerUrl();
    console.log('[socket] Server URL:', url);
    socket = io(url, {
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 20,
      transports: ['polling', 'websocket'],
    });

    socket.on('connect', () => {
      console.log('[socket] Connected successfully:', socket?.id);
    });

    socket.on('disconnect', (reason) => {
      console.log('[socket] Disconnected:', reason);
    });

    socket.on('connect_error', (err) => {
      console.error('[socket] Connection error:', err.message);
    });
  }
  return socket;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
