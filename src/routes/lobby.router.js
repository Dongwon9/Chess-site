import express from 'express';
import {
  createRoom,
  getJoinableRooms,
  getRoomById,
} from '../services/lobby.service.js';
import { getIO } from '../ws/server.js';

const router = express.Router();
const server = getIO();
router.post('/create-room', (req, res) => {
  const { roomName } = req.body;
  if (roomName && getRoomById(roomName)) {
    return res.json({
      success: false,
      message: '같은 이름의 방이 이미 존재합니다.',
    });
  }
  const room = createRoom(roomName);
  server.in('lobby').emit('updateLobby', getJoinableRooms());
  res.json({ success: true, roomId: room.id });
});

export default router;
