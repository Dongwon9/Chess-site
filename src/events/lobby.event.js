import { EventEmitter } from 'events';
export const UPDATE_LOBBY = 'update_lobby';
export const DELETE_ROOM = 'delete_room';
const lobbyEventEmitter = new EventEmitter();

export function registerListener(event, listener) {
  lobbyEventEmitter.on(event, listener);
}

export function emitEvent(event, ...args) {
  lobbyEventEmitter.emit(event, ...args);
}
