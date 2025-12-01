import { getJoinableRooms } from '../services/lobby.service.js';

export function setupLobbyHandlers(io) {
  io.on('connection', (socket) => {
    console.log('Lobby connection', { socketId: socket.id });
    socket.join('lobby');
    io.in('lobby').emit('updateLobby', getJoinableRooms());
  });
}
