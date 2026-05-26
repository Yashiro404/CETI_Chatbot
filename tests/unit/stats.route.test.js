const path = require('path');
const fs = require('fs');
const request = require('supertest');
const express = require('express');
const { initDB, logInteraction, closeDB, getStats } = require('../../modules/chatLogger');
const createStatsRouter = require('../../routes/stats');

const TEST_DB_DIR = path.join(__dirname, '..', 'tmp');
const TEST_DB_PATH = path.join(TEST_DB_DIR, 'test_stats.db');

describe('GET /stats endpoint', () => {
  let app;

  beforeEach(() => {
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }
    initDB(TEST_DB_PATH);

    app = express();
    app.use('/stats', createStatsRouter());
  });

  afterEach(() => {
    closeDB();
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }
    if (fs.existsSync(TEST_DB_DIR) && fs.readdirSync(TEST_DB_DIR).length === 0) {
      fs.rmdirSync(TEST_DB_DIR);
    }
  });

  test('returns 200 with stats object when DB is initialized', async () => {
    const res = await request(app).get('/stats').expect(200);

    expect(res.body).toHaveProperty('total');
    expect(res.body).toHaveProperty('encontradas');
    expect(res.body).toHaveProperty('noEncontradas');
    expect(res.body).toHaveProperty('preguntasFrecuentes');
    expect(res.body).toHaveProperty('preguntasSinRespuesta');
  });

  test('returns correct counts with no data', async () => {
    const res = await request(app).get('/stats').expect(200);

    expect(res.body.total).toBe(0);
    expect(res.body.encontradas).toBe(0);
    expect(res.body.noEncontradas).toBe(0);
    expect(res.body.preguntasFrecuentes).toEqual([]);
    expect(res.body.preguntasSinRespuesta).toEqual([]);
  });

  test('returns correct counts after logging interactions', async () => {
    logInteraction('¿Cuánto cuesta?', 'La cuota es $5,000', true);
    logInteraction('¿Dónde queda?', 'En Guadalajara', true);
    logInteraction('¿Tienen natación?', 'No encontré información', false);

    const res = await request(app).get('/stats').expect(200);

    expect(res.body.total).toBe(3);
    expect(res.body.encontradas).toBe(2);
    expect(res.body.noEncontradas).toBe(1);
  });

  test('returns top frequent questions ordered by count', async () => {
    logInteraction('inscripcion', 'Respuesta inscripcion', true);
    logInteraction('inscripcion', 'Respuesta inscripcion', true);
    logInteraction('inscripcion', 'Respuesta inscripcion', true);
    logInteraction('carreras', 'Respuesta carreras', true);
    logInteraction('carreras', 'Respuesta carreras', true);
    logInteraction('costos', 'Respuesta costos', true);

    const res = await request(app).get('/stats').expect(200);

    expect(res.body.preguntasFrecuentes.length).toBe(3);
    expect(res.body.preguntasFrecuentes[0].pregunta).toBe('inscripcion');
    expect(res.body.preguntasFrecuentes[0].count).toBe(3);
    expect(res.body.preguntasFrecuentes[1].pregunta).toBe('carreras');
    expect(res.body.preguntasFrecuentes[1].count).toBe(2);
  });

  test('returns top unanswered questions', async () => {
    logInteraction('tema desconocido', 'Fallback', false);
    logInteraction('tema desconocido', 'Fallback', false);
    logInteraction('otro tema', 'Fallback', false);
    logInteraction('inscripcion', 'Respuesta real', true);

    const res = await request(app).get('/stats').expect(200);

    expect(res.body.preguntasSinRespuesta.length).toBe(2);
    expect(res.body.preguntasSinRespuesta[0].pregunta).toBe('tema desconocido');
    expect(res.body.preguntasSinRespuesta[0].count).toBe(2);
  });

  test('returns 503 when DB is not initialized', async () => {
    closeDB();

    const res = await request(app).get('/stats').expect(503);

    expect(res.body).toHaveProperty('error');
    expect(res.body.error).toBe('Estadísticas no disponibles');
  });
});

describe('getStats function', () => {
  beforeEach(() => {
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }
    initDB(TEST_DB_PATH);
  });

  afterEach(() => {
    closeDB();
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }
    if (fs.existsSync(TEST_DB_DIR) && fs.readdirSync(TEST_DB_DIR).length === 0) {
      fs.rmdirSync(TEST_DB_DIR);
    }
  });

  test('returns null when DB is not initialized', () => {
    closeDB();
    const stats = getStats();
    expect(stats).toBeNull();
  });

  test('returns stats object with correct structure', () => {
    const stats = getStats();
    expect(stats).not.toBeNull();
    expect(typeof stats.total).toBe('number');
    expect(typeof stats.encontradas).toBe('number');
    expect(typeof stats.noEncontradas).toBe('number');
    expect(Array.isArray(stats.preguntasFrecuentes)).toBe(true);
    expect(Array.isArray(stats.preguntasSinRespuesta)).toBe(true);
  });

  test('limits frequent questions to 10', () => {
    for (let i = 0; i < 15; i++) {
      logInteraction(`pregunta ${i}`, 'respuesta', true);
    }
    const stats = getStats();
    expect(stats.preguntasFrecuentes.length).toBeLessThanOrEqual(10);
  });

  test('limits unanswered questions to 10', () => {
    for (let i = 0; i < 15; i++) {
      logInteraction(`pregunta sin respuesta ${i}`, 'fallback', false);
    }
    const stats = getStats();
    expect(stats.preguntasSinRespuesta.length).toBeLessThanOrEqual(10);
  });
});
