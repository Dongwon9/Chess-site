import express from 'express';
import {
  createRoom,
  getJoinableRooms,
  getRoomById,
  getAllRooms,
} from '../services/lobby.service.js';
import logger from '../utils/logger.js';

const router = express.Router();

/**
 * 새 방 생성 엔드포인트
 * POST /lobby/create-room
 * Body: { roomName?: string }
 */
router.post('/create-room', (req, res, next) => {
  try {
    const { roomName } = req.body;

    // Validate room name if provided
    if (roomName && (typeof roomName !== 'string' || !roomName.trim())) {
      return res.status(400).json({
        success: false,
        message: '유효하지 않은 방 이름입니다',
      });
    }

    // Check for duplicate room name
    if (roomName && getRoomById(roomName)) {
      return res.status(409).json({
        success: false,
        message: '같은 이름의 방이 이미 존재합니다',
      });
    }

    const room = createRoom(roomName || undefined);
    // Notification is already called in createRoom

    res.status(201).json({
      success: true,
      roomId: room.id,
    });
  } catch (error) {
    logger.error({ error: error.message }, '방 생성 중 에러');
    next(error);
  }
});

/**
 * 참여 가능한 방 목록 조회 엔드포인트
 * GET /lobby/rooms
 */
router.get('/rooms', (req, res, next) => {
  try {
    const rooms = getJoinableRooms();
    res.json({
      success: true,
      rooms,
      count: rooms.length,
    });
  } catch (error) {
    logger.error({ error: error.message }, '방 목록 조회 중 에러');
    next(error);
  }
});

/**
 * 특정 방 정보 조회 엔드포인트
 * GET /lobby/rooms/:roomId
 */
router.get('/rooms/:roomId', (req, res, next) => {
  try {
    const { roomId } = req.params;

    if (!roomId || typeof roomId !== 'string') {
      return res.status(400).json({
        success: false,
        message: '유효한 방 ID가 필요합니다',
      });
    }

    const room = getRoomById(roomId);

    if (!room) {
      return res.status(404).json({
        success: false,
        message: '방을 찾을 수 없습니다',
      });
    }

    res.json({
      success: true,
      roomInfo: room.getRoomInfo(),
    });
  } catch (error) {
    logger.error(
      { roomId: req.params.roomId, error: error.message },
      '방 정보 조회 중 에러',
    );
    next(error);
  }
});

/**
 * 모든 방 조회 (관리용)
 * GET /lobby/all-rooms
 */
router.get('/all-rooms', (req, res, next) => {
  try {
    const rooms = getAllRooms();
    res.json({
      success: true,
      rooms,
      count: rooms.length,
    });
  } catch (error) {
    logger.error({ error: error.message }, '모든 방 조회 중 에러');
    next(error);
  }
});

export default router;
