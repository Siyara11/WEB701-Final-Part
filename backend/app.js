// app.js
// Builds and configures the Express application.
// The app is kept separate from server.js so that the automated tests (Jest + Supertest)
// can import the app without opening a network port or a WebSocket server.
const express = require('express');
const cors = require('cors');

const app = express();

// Allow the React front end (http://localhost:3000) to call this API
app.use(cors());
// Parse JSON request bodies into req.body
app.use(express.json());

// REST API routes - each file handles one resource
app.use('/api/auth', require('./routes/auth'));               // register, login, account admin
app.use('/api/products', require('./routes/products'));       // donated products / services
app.use('/api/transactions', require('./routes/transactions')); // token acquire / accept

// Simple health-check route used to confirm the API is running
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// Fallback for unknown routes
app.use((req, res) => res.status(404).json({ error: 'Route not found' }));

module.exports = app;
