import express from 'express';
import { createRoom } from '../services/lobby.service.js';
import { getServer } from '../ws/server.js';

const router = express.Router();
const server = getServer();
router.post('/create-room', (req, res) => {
  const { roomName } = req.body;
  createRoom(roomName);
  server.in('lobby').emit('updateLobby');
});

export default router;
