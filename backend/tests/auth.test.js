// tests/auth.test.js - Requirement 1: register, log in and administer accounts
const { app, request, connect, clear, disconnect, createUser } = require('./setup');

beforeAll(connect);
afterEach(clear);
afterAll(disconnect);

describe('Authentication and account administration', () => {
  test('registers a beneficiary with 10 starting tokens', async () => {
    const res = await request(app).post('/api/auth/register')
      .send({ name: 'Ana', email: 'ana@test.com', password: 'secret123', role: 'beneficiary' });
    expect(res.status).toBe(201);
    expect(res.body.user.tokens).toBe(10);
    expect(res.body.user.password).toBeUndefined();   // hash must never be returned
  });

  test('rejects duplicate email and short password', async () => {
    await createUser('member', 'dup@test.com');
    const dup = await request(app).post('/api/auth/register')
      .send({ name: 'X', email: 'dup@test.com', password: 'secret123' });
    expect(dup.status).toBe(409);
    const short = await request(app).post('/api/auth/register')
      .send({ name: 'X', email: 'new@test.com', password: '123' });
    expect(short.status).toBe(400);
  });

  test('logs in and returns a JWT; wrong password is refused', async () => {
    const { token } = await createUser('member', 'm@test.com');
    expect(token.split('.')).toHaveLength(3);          // header.payload.signature
    const bad = await request(app).post('/api/auth/login').send({ email: 'm@test.com', password: 'wrong' });
    expect(bad.status).toBe(401);
  });

  test('protected route needs a valid token', async () => {
    expect((await request(app).get('/api/auth/me')).status).toBe(401);
    const bad = await request(app).get('/api/auth/me').set('Authorization', 'Bearer abc.def.ghi');
    expect(bad.status).toBe(401);
  });

  test('user can update name, change password and delete account', async () => {
    const { token } = await createUser('beneficiary', 'b@test.com');
    const auth = { Authorization: `Bearer ${token}` };

    const upd = await request(app).put('/api/auth/me').set(auth)
      .send({ name: 'New Name', currentPassword: 'secret123', newPassword: 'newpass1' });
    expect(upd.body.user.name).toBe('New Name');

    const login = await request(app).post('/api/auth/login').send({ email: 'b@test.com', password: 'newpass1' });
    expect(login.status).toBe(200);

    expect((await request(app).delete('/api/auth/me').set(auth)).status).toBe(200);
    expect((await request(app).get('/api/auth/me').set(auth)).status).toBe(404);
  });
});
