const path = require('path');
const fs = require('fs');
const { initDB, logInteraction, closeDB } = require('../../modules/chatLogger');

const TEST_DB_DIR = path.join(__dirname, '..', 'tmp');
const TEST_DB_PATH = path.join(TEST_DB_DIR, 'test_chat_logs.db');

beforeEach(() => {
  // Clean up any previous test DB
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
  // Clean up tmp dir if empty
  if (fs.existsSync(TEST_DB_DIR) && fs.readdirSync(TEST_DB_DIR).length === 0) {
    fs.rmdirSync(TEST_DB_DIR);
  }
});

describe('chatLogger', () => {
  test('initDB creates the chat_logs table', () => {
    const Database = require('better-sqlite3');
    const db = new Database(TEST_DB_PATH, { readonly: true });
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='chat_logs'").all();
    db.close();
    expect(tables).toHaveLength(1);
    expect(tables[0].name).toBe('chat_logs');
  });

  test('logInteraction inserts a row with correct data', () => {
    logInteraction('¿Cuánto cuesta?', 'La cuota semestral es de $5,000');

    const Database = require('better-sqlite3');
    const db = new Database(TEST_DB_PATH, { readonly: true });
    const rows = db.prepare('SELECT * FROM chat_logs').all();
    db.close();

    expect(rows).toHaveLength(1);
    expect(rows[0].pregunta).toBe('¿Cuánto cuesta?');
    expect(rows[0].respuesta).toBe('La cuota semestral es de $5,000');
    expect(rows[0].fecha).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    expect(rows[0].encontrada).toBe(1);
  });

  test('logInteraction stores fecha in ISO 8601 format', () => {
    logInteraction('test', 'response');

    const Database = require('better-sqlite3');
    const db = new Database(TEST_DB_PATH, { readonly: true });
    const row = db.prepare('SELECT fecha FROM chat_logs').get();
    db.close();

    // Verify it's a valid ISO 8601 date
    const parsed = new Date(row.fecha);
    expect(parsed.toISOString()).toBe(row.fecha);
  });

  test('logInteraction does not throw when DB is not initialized', () => {
    closeDB(); // Close the DB first
    // This should NOT throw
    expect(() => logInteraction('test', 'response')).not.toThrow();
  });

  test('logInteraction does not throw on DB write error', () => {
    closeDB();
    // Remove the DB file to cause an error on next write attempt
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }
    // logInteraction should log the error but not throw
    expect(() => logInteraction('test', 'response')).not.toThrow();
  });

  test('logInteraction stores encontrada=true by default', () => {
    logInteraction('pregunta', 'respuesta');

    const Database = require('better-sqlite3');
    const db = new Database(TEST_DB_PATH, { readonly: true });
    const row = db.prepare('SELECT encontrada FROM chat_logs').get();
    db.close();

    expect(row.encontrada).toBe(1);
  });

  test('logInteraction stores encontrada=false for fallback responses', () => {
    logInteraction('pregunta sin respuesta', 'mensaje fallback', false);

    const Database = require('better-sqlite3');
    const db = new Database(TEST_DB_PATH, { readonly: true });
    const row = db.prepare('SELECT encontrada FROM chat_logs').get();
    db.close();

    expect(row.encontrada).toBe(0);
  });

  test('multiple interactions are stored in order', () => {
    logInteraction('pregunta 1', 'respuesta 1');
    logInteraction('pregunta 2', 'respuesta 2');
    logInteraction('pregunta 3', 'respuesta 3');

    const Database = require('better-sqlite3');
    const db = new Database(TEST_DB_PATH, { readonly: true });
    const rows = db.prepare('SELECT * FROM chat_logs ORDER BY id').all();
    db.close();

    expect(rows).toHaveLength(3);
    expect(rows[0].pregunta).toBe('pregunta 1');
    expect(rows[1].pregunta).toBe('pregunta 2');
    expect(rows[2].pregunta).toBe('pregunta 3');
  });

  test('closeDB can be called multiple times without error', () => {
    expect(() => {
      closeDB();
      closeDB();
    }).not.toThrow();
  });
});
