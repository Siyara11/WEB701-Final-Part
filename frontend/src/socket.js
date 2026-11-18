// socket.js
// Single Socket.IO (WebSocket) connection shared by the whole app.
// The server pushes events such as 'stock_update' and 'token_accepted'.
import { io } from 'socket.io-client';
import { API_URL } from './api';

const socket = io(API_URL, { autoConnect: true });
export default socket;
