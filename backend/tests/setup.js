// tests/setup.js
// Shared helpers for the Jest tests. Tests use a separate database so real data is never touched.
const mongoose = require('mongoose');
const request = require('supertest');
const app = require('../app');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_secret';
const TEST_DB = process.env.MONGO_URI_TEST || 'mongodb://127.0.0.1:27017/harvest_test';

async function connect() { await mongoose.connect(TEST_DB); }
async function clear() { await mongoose.connection.db.dropDatabase(); }
async function disconnect() { await mongoose.connection.close(); }

// Registers a user and logs them in, returning the JWT and user object
async function createUser(role, email) {
  await request(app).post('/api/auth/register')
    .send({ name: role + ' user', email, password: 'secret123', role });
  const res = await request(app).post('/api/auth/login').send({ email, password: 'secret123' });
  return { token: res.body.token, user: res.body.user };
}

module.exports = { app, request, connect, clear, disconnect, createUser };
