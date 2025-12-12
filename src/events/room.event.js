import { EventEmitter } from 'events';
const roomEventEmitter = new EventEmitter();

export const CALL_DRAW = 'call_draw';

export function registerRoomListener(event, listener) {
  roomEventEmitter.on(event, listener);
}

export function emitRoomEvent(event, ...args) {
  roomEventEmitter.emit(event, ...args);
}
