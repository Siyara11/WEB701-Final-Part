// tests/transactions.test.js - Requirements 2 and 4: acquire tokens and accept them in a transaction
const { app, request, connect, clear, disconnect, createUser } = require('./setup');

beforeAll(connect);
afterEach(clear);
afterAll(disconnect);

// Creates a member with one product and a beneficiary, ready for a transaction
async function scenario(quantity = 2, tokensRequired = 3) {
  const member = await createUser('member', 'm@test.com');
  const ben = await createUser('beneficiary', 'b@test.com');
  const p = await request(app).post('/api/products').set('Authorization', `Bearer ${member.token}`)
    .send({ name: 'Rice', quantity, tokensRequired });
  return { member, ben, productId: p.body._id };
}

describe('Token transactions', () => {
  test('beneficiary acquires a token: tokens deducted, stock reserved, code issued', async () => {
    const { ben, productId } = await scenario();
    const res = await request(app).post(`/api/transactions/acquire/${productId}`)
      .set('Authorization', `Bearer ${ben.token}`);
    expect(res.status).toBe(201);
    expect(res.body.tokens).toBe(7);                       // 10 - 3
    expect(res.body.transaction.code).toMatch(/^[A-F0-9]{6}$/);
    const list = await request(app).get('/api/products');
    expect(list.body[0].quantity).toBe(1);                 // 2 - 1
  });

  test('cannot acquire when out of stock or without enough tokens', async () => {
    const { ben, productId } = await scenario(1, 6);
    const h = { Authorization: `Bearer ${ben.token}` };
    expect((await request(app).post(`/api/transactions/acquire/${productId}`).set(h)).status).toBe(201);
    const noStock = await request(app).post(`/api/transactions/acquire/${productId}`).set(h);
    expect(noStock.body.error).toBe('Out of stock');
  });

  test('stock is restored when tokens are insufficient', async () => {
    const { ben, productId } = await scenario(5, 11);       // costs more than 10 tokens
    const res = await request(app).post(`/api/transactions/acquire/${productId}`)
      .set('Authorization', `Bearer ${ben.token}`);
    expect(res.body.error).toBe('Not enough tokens');
    const list = await request(app).get('/api/products');
    expect(list.body[0].quantity).toBe(5);                 // rollback worked
  });

  test('member accepts token only with the correct claim code', async () => {
    const { member, ben, productId } = await scenario();
    const acq = await request(app).post(`/api/transactions/acquire/${productId}`)
      .set('Authorization', `Bearer ${ben.token}`);
    const txId = acq.body.transaction._id;
    const h = { Authorization: `Bearer ${member.token}` };

    const wrong = await request(app).post(`/api/transactions/accept/${txId}`).set(h).send({ code: 'ZZZZZZ' });
    expect(wrong.status).toBe(400);

    const ok = await request(app).post(`/api/transactions/accept/${txId}`).set(h)
      .send({ code: acq.body.transaction.code });
    expect(ok.body.transaction.status).toBe('accepted');

    const again = await request(app).post(`/api/transactions/accept/${txId}`).set(h)
      .send({ code: acq.body.transaction.code });
    expect(again.body.error).toBe('Transaction already accepted');
  });

  test('beneficiary cannot accept tokens and can cancel for a refund', async () => {
    const { ben, productId } = await scenario();
    const h = { Authorization: `Bearer ${ben.token}` };
    const acq = await request(app).post(`/api/transactions/acquire/${productId}`).set(h);
    const txId = acq.body.transaction._id;

    expect((await request(app).post(`/api/transactions/accept/${txId}`).set(h)).status).toBe(403);
    expect((await request(app).post(`/api/transactions/cancel/${txId}`).set(h)).status).toBe(200);
    const me = await request(app).get('/api/auth/me').set(h);
    expect(me.body.tokens).toBe(10);                       // refunded
  });
});
