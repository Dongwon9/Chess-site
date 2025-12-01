import express from 'express';
import { createRoom, getRoomById } from '../services/lobby.service.js';
const router = express.Router();

router.get('/get-room', (req, res) => {
  const { id } = req.query;
  const room = getRoomById(id);
  if (room) {
    res.json(room);
  } else {
    res.json(createRoom(id));
  }
});
export default router;
