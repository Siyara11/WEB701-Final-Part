// server.js
// Entry point: connects to MongoDB, attaches Socket.IO (WebSockets) to the HTTP server
// and starts listening for requests.
require('dotenv').config();
const http = require('http');
const mongoose = require('mongoose');
const { Server } = require('socket.io');
const app = require('./app');

const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

// Socket.IO shares the same HTTP server/port as the REST API.
// It pushes real-time events (stock changes, accepted tokens) to every open browser.
const io = new Server(server, {
  cors: { origin: process.env.CLIENT_URL || 'http://localhost:3000', methods: ['GET', 'POST'] }
});

// Store io on the app so route handlers can emit events with req.app.get('socketio')
app.set('socketio', io);

io.on('connection', (socket) => {
  console.log('Client connected via WebSocket:', socket.id);
  socket.on('disconnect', () => console.log('Client disconnected:', socket.id));
});

// Connect to the database first, then start the server
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('MongoDB connected');
    server.listen(PORT, () => console.log(`Backend running on port ${PORT}`));
  })
  .catch(err => console.error('MongoDB connection error:', err.message));
