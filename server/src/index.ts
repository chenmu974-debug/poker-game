import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { setupGameManager } from './gameManager';

const app = express();
const httpServer = createServer(app);

const PORT = process.env.PORT || 3001;
const isProduction = process.env.NODE_ENV === 'production';

// In production serve frontend static files from client/dist
if (isProduction) {
  const clientDist = path.join(__dirname, '../../client/dist');
  app.use(express.static(clientDist));
}

app.use(cors({ origin: '*' }));
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

const io = new Server(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
  pingTimeout: 60000,
  pingInterval: 25000,
});

setupGameManager(io);

// SPA fallback — must come after static middleware and API routes
if (isProduction) {
  const clientDist = path.join(__dirname, '../../client/dist');
  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

httpServer.listen(PORT, () => {
  console.log(`\n🃏 Poker Server running on port ${PORT} (${isProduction ? 'production' : 'development'})`);
});
