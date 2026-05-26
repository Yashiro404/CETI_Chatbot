const express = require('express');
const request = require('supertest');
const createChatRouter = require('../../routes/chat');

// Minimal knowledge base for testing
const testKB = [
  {
    palabras_clave: ['inscripcion', 'registro', 'como inscribirse'],
    respuesta: 'Para inscribirte en el CETI debes presentar tu documentación completa.'
  },
  {
    palabras_clave: ['carreras', 'ingenierias', 'que carreras hay'],
    respuesta: 'El CETI ofrece diversas ingenierías.'
  }
];

const testConfig = {
  fallbackMessage: 'Lo siento, no encontré información sobre eso.',
  aiEnabled: false
};

function createApp(kb, config) {
  const app = express();
  app.use(express.json());
  app.use('/chat', createChatRouter(kb || testKB, config || testConfig));
  return app;
}

describe('POST /chat', () => {
  let app;

  beforeEach(() => {
    app = createApp();
  });

  // --- Validation: missing/empty message ---

  test('returns 400 when mensaje field is missing', async () => {
    const res = await request(app)
      .post('/chat')
      .send({})
      .expect(400);

    expect(res.body).toEqual({ error: 'El campo mensaje es requerido' });
  });

  test('returns 400 when mensaje is empty string', async () => {
    const res = await request(app)
      .post('/chat')
      .send({ mensaje: '' })
      .expect(400);

    expect(res.body).toEqual({ error: 'El campo mensaje es requerido' });
  });

  test('returns 400 when mensaje is whitespace only', async () => {
    const res = await request(app)
      .post('/chat')
      .send({ mensaje: '   ' })
      .expect(400);

    expect(res.body).toEqual({ error: 'El campo mensaje es requerido' });
  });

  test('returns 400 when mensaje is null', async () => {
    const res = await request(app)
      .post('/chat')
      .send({ mensaje: null })
      .expect(400);

    expect(res.body).toEqual({ error: 'El campo mensaje es requerido' });
  });

  // --- Validation: message too long ---

  test('returns 400 when mensaje exceeds 500 characters', async () => {
    const longMessage = 'a'.repeat(501);
    const res = await request(app)
      .post('/chat')
      .send({ mensaje: longMessage })
      .expect(400);

    expect(res.body).toEqual({ error: 'El mensaje no puede exceder 500 caracteres' });
  });

  test('accepts mensaje of exactly 500 characters', async () => {
    const exactMessage = 'a'.repeat(500);
    const res = await request(app)
      .post('/chat')
      .send({ mensaje: exactMessage })
      .expect(200);

    expect(res.body).toHaveProperty('respuesta');
  });

  // --- Successful search ---

  test('returns matching response for a known query', async () => {
    const res = await request(app)
      .post('/chat')
      .send({ mensaje: 'inscripcion' })
      .expect(200);

    expect(res.body).toEqual({
      respuesta: 'Para inscribirte en el CETI debes presentar tu documentación completa.'
    });
  });

  // --- Fallback ---

  test('returns fallback message when no match is found', async () => {
    const res = await request(app)
      .post('/chat')
      .send({ mensaje: 'clima en guadalajara' })
      .expect(200);

    expect(res.body).toEqual({
      respuesta: 'Lo siento, no encontré información sobre eso.'
    });
  });

  // --- 500 error handling ---

  test('returns 500 when an internal error occurs', async () => {
    // Pass a broken knowledgeBase that will cause search to throw
    const brokenApp = express();
    brokenApp.use(express.json());
    // Passing null as knowledgeBase — search handles it, but we can force an error
    // by providing a config that causes fallback to throw
    const brokenConfig = {
      get aiEnabled() { throw new Error('config explosion'); }
    };
    brokenApp.use('/chat', createChatRouter([], brokenConfig));

    const res = await request(brokenApp)
      .post('/chat')
      .send({ mensaje: 'hola' })
      .expect(500);

    expect(res.body).toEqual({ error: 'Error interno del servidor' });
  });

  // --- Response format ---

  test('response always contains respuesta field as string', async () => {
    const res = await request(app)
      .post('/chat')
      .send({ mensaje: 'carreras' })
      .expect(200);

    expect(typeof res.body.respuesta).toBe('string');
    expect(res.body.respuesta.length).toBeGreaterThan(0);
  });
});
