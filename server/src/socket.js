import { Server } from 'socket.io';
import { config } from './config.js';
import { User } from './models/User.js';
import { verifyAccess } from './utils/tokens.js';
import { getGame, publicState } from './utils/game.js';
import { leaderboardPayload } from './utils/ranking.js';

let io;

export function initSocket(server) {
  io = new Server(server, { cors: { origin: config.clientOrigin, credentials: true } });

  io.use(async (socket, next) => {
    try {
      const p = verifyAccess(socket.handshake.auth?.token);
      const u = await User.findById(p.sub);
      if (!u || u.tokenVersion !== p.tv || u.banned || !u.verified) throw new Error('bad');
      socket.data.user = { id: String(u._id), role: u.role };
      next();
    } catch {
      next(new Error('unauthorized'));
    }
  });

  io.on('connection', async (socket) => {
    const { id, role } = socket.data.user;
    socket.join(`user:${id}`);
    socket.join(role === 'admin' ? 'admin' : 'players');
    socket.emit('game:state', publicState(await getGame()));
    emitPresence();
    if (role === 'admin') scheduleLeaderboard();
    socket.on('disconnect', emitPresence);
  });
  return io;
}

const online = () => io?.sockets.adapter.rooms.get('players')?.size || 0;
function emitPresence() {
  io?.to('admin').emit('presence', { online: online() });
}
export const onlineCount = online;

export async function broadcastState() {
  if (io) io.emit('game:state', publicState(await getGame()));
}

let pending = false;
export function scheduleLeaderboard() {
  if (pending || !io) return;
  pending = true;
  setTimeout(async () => {
    pending = false;
    try {
      io.to('admin').emit('leaderboard:update', await leaderboardPayload());
    } catch (e) {
      console.error('leaderboard emit failed', e.message);
    }
  }, 800); // throttle: at most ~1 update/sec however many players solve at once
}

export function kickUser(id) {
  io?.to(`user:${id}`).emit('banned');
  io?.in(`user:${id}`).disconnectSockets(true);
}
