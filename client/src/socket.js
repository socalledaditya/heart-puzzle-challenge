import { io } from 'socket.io-client';
import { getToken, refreshToken } from './api';

let socket;
export function getSocket() {
  if (!socket) {
    socket = io({ auth: (cb) => cb({ token: getToken() }), transports: ['websocket', 'polling'] });
    // Expired token on (re)connect -> refresh silently, then reconnect.
    socket.on('connect_error', async (e) => {
      if (e.message === 'unauthorized') {
        try {
          await refreshToken();
          setTimeout(() => socket?.connect(), 300);
        } catch { /* logged out */ }
      }
    });
  }
  return socket;
}
export function closeSocket() {
  socket?.disconnect();
  socket = null;
}
