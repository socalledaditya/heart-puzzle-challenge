import http from 'http';
import mongoose from 'mongoose';
import { config } from './config.js';
import { app } from './app.js';
import { initSocket, broadcastState } from './socket.js';
import { seed } from './utils/seed.js';
import { getGame, elapsedMs, transition } from './utils/game.js';

await mongoose.connect(config.mongoUri);
console.log('MongoDB connected');
await seed();

const server = http.createServer(app);
initSocket(server);

// Auto-end the game when the timer runs out.
setInterval(async () => {
  try {
    const g = await getGame();
    if (g.status === 'running' && elapsedMs(g) >= g.durationSec * 1000) {
      await transition('end');
      await broadcastState();
      console.log('Game ended automatically (time up)');
    }
  } catch (e) {
    if (e.status !== 409) console.error('ticker', e.message);
  }
}, 1000);

server.listen(config.port, () => console.log(`API + sockets on http://localhost:${config.port}`));

for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, async () => { await mongoose.disconnect(); process.exit(0); });
