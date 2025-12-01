import { Server } from 'socket.io';
import { getJoinableRooms, getRoomById } from '../services/lobby.service.js';
let io;

function initSocket(server) {
  io = new Server(server, {
    cors: {
      origin: 'http://localhost:3000',
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket) => {
    console.log('새 클라이언트 연결:', socket.id);
    const query = socket.handshake.query;
    const toRoom = query.toRoom;
    if (toRoom) {
      socket.join(toRoom);
      console.log(`클라이언트 ${socket.id}님이 방 ${toRoom}에 입장했습니다.`);
      if (toRoom === 'lobby') {
        io.in('lobby').emit('updateLobby', getJoinableRooms());
      } else {
        io.in(toRoom).emit('updateRoom', getRoomById(toRoom).getRoomInfo());
      }
    }

    socket.on('message', (msg) => {
      console.log('메시지 받음:', msg);
    });
  });

  return io;
}

function getIO() {
  if (!io) {
    initSocket();
  }
  return io;
}

export { initSocket, getIO };
