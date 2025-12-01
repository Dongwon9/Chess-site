import express from 'express';
import { createRoom, getJoinableRooms } from '../services/lobby.service.js';
import { getIO } from '../ws/server.js';

const router = express.Router();
const server = getIO();
router.post('/create-room', (req, res) => {
  const room = createRoom();
  server.in('lobby').emit('updateLobby', getJoinableRooms());
  res.redirect(303, `/room.html?id=${room.id}`);
});

export default router;
