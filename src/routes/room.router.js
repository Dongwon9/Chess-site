import express from 'express';
import { createRoom, getRoomById } from '../services/lobby.service.js';
const router = express.Router();

router.get('/get-room', (req, res) => {
  const { id } = req.query;
  let join = false;
  let room = getRoomById(id);
  if (!room) {
    room = createRoom();
    join = true;
  }
  const { board, players } = room;
  res.json({ board, players, join });
});
export default router;
