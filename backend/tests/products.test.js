// tests/products.test.js - Requirements 2 and 5: members register products stored in MongoDB
const { app, request, connect, clear, disconnect, createUser } = require('./setup');

beforeAll(connect);
afterEach(clear);
afterAll(disconnect);

describe('Products and services', () => {
  test('member creates a product that is stored and listed', async () => {
    const { token } = await createUser('member', 'm@test.com');
    const res = await request(app).post('/api/products').set('Authorization', `Bearer ${token}`)
      .send({ name: 'Bread', quantity: 5, tokensRequired: 2 });
    expect(res.status).toBe(201);

    const list = await request(app).get('/api/products');
    expect(list.body).toHaveLength(1);
    expect(list.body[0].member.name).toBe('member user');   // populated from Users collection
  });

  test('beneficiary cannot create products (403)', async () => {
    const { token } = await createUser('beneficiary', 'b@test.com');
    const res = await request(app).post('/api/products').set('Authorization', `Bearer ${token}`)
      .send({ name: 'Milk', quantity: 1 });
    expect(res.status).toBe(403);
  });

  test('search filters products by name', async () => {
    const { token } = await createUser('member', 'm@test.com');
    const h = { Authorization: `Bearer ${token}` };
    await request(app).post('/api/products').set(h).send({ name: 'Bread', quantity: 1 });
    await request(app).post('/api/products').set(h).send({ name: 'Apples', quantity: 1 });
    const res = await request(app).get('/api/products?search=app');
    expect(res.body.map(p => p.name)).toEqual(['Apples']);
  });

  test('only the owner can edit or delete a product', async () => {
    const owner = await createUser('member', 'owner@test.com');
    const other = await createUser('member', 'other@test.com');
    const p = await request(app).post('/api/products').set('Authorization', `Bearer ${owner.token}`)
      .send({ name: 'Soup', quantity: 3 });

    const hack = await request(app).put(`/api/products/${p.body._id}`)
      .set('Authorization', `Bearer ${other.token}`).send({ quantity: 99 });
    expect(hack.status).toBe(404);

    const edit = await request(app).put(`/api/products/${p.body._id}`)
      .set('Authorization', `Bearer ${owner.token}`).send({ quantity: 10 });
    expect(edit.body.quantity).toBe(10);

    const del = await request(app).delete(`/api/products/${p.body._id}`)
      .set('Authorization', `Bearer ${owner.token}`);
    expect(del.status).toBe(200);
  });
});
