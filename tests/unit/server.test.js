const request = require('supertest');
const path = require('path');

describe('server.js', () => {
  let app;
  const originalExit = process.exit;

  beforeAll(() => {
    // Prevent process.exit from killing the test runner
    process.exit = jest.fn();

    // Ensure KB_PATH resolves correctly regardless of cwd
    process.env.KB_PATH = path.join(__dirname, '..', '..', 'knowledge-base');

    // Clear any cached modules so server.js picks up the new env
    jest.resetModules();

    app = require('../../server');
  });

  afterAll(() => {
    process.exit = originalExit;
  });

  test('exports an Express app', () => {
    expect(app).toBeDefined();
    expect(typeof app.listen).toBe('function');
  });

  test('POST /chat with valid message returns 200 with respuesta', async () => {
    const res = await request(app)
      .post('/chat')
      .send({ mensaje: 'inscripcion' })
      .expect(200);

    expect(res.body).toHaveProperty('respuesta');
    expect(typeof res.body.respuesta).toBe('string');
  });

  test('POST /chat with missing message returns 400', async () => {
    const res = await request(app)
      .post('/chat')
      .send({})
      .expect(400);

    expect(res.body).toHaveProperty('error');
  });

  test('serves static files from public/ directory (returns 404 when no index.html)', async () => {
    const res = await request(app).get('/nonexistent-file.html');
    expect(res.status).toBe(404);
  });

  test('parses JSON request bodies', async () => {
    const res = await request(app)
      .post('/chat')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({ mensaje: 'carreras' }))
      .expect(200);

    expect(res.body).toHaveProperty('respuesta');
  });
});
