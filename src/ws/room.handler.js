import { getRoomById } from '../services/lobby.service.js';
import logger from '../utils/logger.js';

export function setupRoomHandlers(socket, io) {
    socket.on('playerReady', ({ roomId, nickname }) => {
        const room = getRoomById(roomId);
        if (!room) {
            logger.error({ roomId, nickname }, '존재하지 않는 방에서 준비 상태 변경 시도');
            socket.emit('error', { message: '방을 찾을 수 없습니다' });
            return;
        }
        const player = room.players.find((p) => p.nickname === nickname);
        if (!player) {
            logger.error({ roomId, nickname }, '방에 없는 플레이어가 준비 상태 변경 시도');
            socket.emit('error', { message: '플레이어를 찾을 수 없습니다' });
            return;
        }

        try {
            room.setPlayerReady(nickname, !player.isReady);
            logger.debug({ roomId, nickname, isReady: player.isReady }, '플레이어 준비 상태 변경');
            io.in(roomId).emit('updateRoom', room.getRoomInfo());

            // 모든 플레이어가 준비되면 게임 시작
            if (room.players.length === 2 && room.players.every((p) => p.isReady)) {
                room.startGame();
                logger.info({ roomId }, '게임 시작');
                io.in(roomId).emit('gameStarted', room.getRoomInfo());
            }
        } catch (error) {
            logger.error({ roomId, nickname, error: error.message }, '준비 상태 변경 실패');
            socket.emit('error', { message: error.message });
        }
    });

    socket.on('makeMove', ({ roomId, nickname, move }) => {
        const room = getRoomById(roomId);
        if (!room) {
            logger.error({ roomId, nickname }, '존재하지 않는 방에서 이동 시도');
            socket.emit('error', { message: '방을 찾을 수 없습니다' });
            return;
        }
        if (!room.isPlaying) {
            logger.warn({ roomId, nickname }, '게임이 시작되지 않았는데 이동 시도');
            socket.emit('error', { message: '게임이 시작되지 않았습니다' });
            return;
        }

        try {
            const result = room.makeMove(move, nickname);
            if (result.error) {
                socket.emit('moveError', { message: result.error });
                return;
            }

            io.in(roomId).emit('boardUpdate', {
                move,
                newFen: result.fen,
                turn: result.turn,
            });

            // 게임 종료 확인
            if (result.gameOver) {
                const endResult = room.endGame(result.winner);
                logger.info({ roomId, winner: result.winner, reason: endResult.reason }, '게임 종료');
                io.in(roomId).emit('gameOver', endResult);
            }
        } catch (error) {
            logger.error({ roomId, nickname, move, error: error.message }, '이동 처리 실패');
            socket.emit('error', { message: '잘못된 이동입니다' });
        }
    });
}
