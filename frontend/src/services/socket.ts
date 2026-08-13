import { io } from 'socket.io-client';
import { baseURL } from './api';

// Derive base server URL (without /api suffix)
const socketURL = baseURL.endsWith('/api') ? baseURL.slice(0, -4) : baseURL;

export const socket = io(socketURL, {
    transports: ['websocket', 'polling'],
    autoConnect: true
});
