import { io, Socket } from 'socket.io-client';

// In production the client is served by the same Express server,
// so we connect to the same origin. In dev we point to localhost:3001.
const SERVER_URL = import.meta.env.VITE_SERVER_URL ||
  (import.meta.env.PROD ? window.location.origin : 'http://localhost:3001');

export const socket: Socket = io(SERVER_URL, {
  autoConnect: false,
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionAttempts: 10,
});

export default socket;
