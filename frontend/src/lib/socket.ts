import { io, Socket } from 'socket.io-client';
import { getToken } from './auth';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

// The NestJS socket.io gateway attaches to the same HTTP server but at the
// server root (/socket.io), NOT under /api/v1. Strip the API prefix so the
// client connects to the right endpoint in both dev and prod.
const SOCKET_URL = API_BASE_URL.replace(/\/api\/v1\/?$/, '');

let socket: Socket | null = null;

/**
 * Returns a lazily-created, single shared socket.io connection for the app.
 * Authenticates with the stored JWT via the `auth.token` handshake field —
 * the same token apiFetch sends as a Bearer header.
 */
export function getSocket(): Socket | null {
  if (typeof window === 'undefined') return null;
  if (socket) return socket;

  const token = getToken();
  if (!token) return null;

  socket = io(SOCKET_URL, {
    auth: { token },
    transports: ['websocket'],
    reconnectionAttempts: 10,
    reconnectionDelay: 2000,
  });

  // Swallow connection errors silently — realtime is an enhancement on top of
  // polling/refresh; a failed socket must never crash the dashboard.
  socket.on('connect_error', () => {
    /* no-op */
  });

  return socket;
}

export function disconnectSocket(): void {
  socket?.disconnect();
  socket = null;
}
