const path = require('path');
const fs = require('fs');
const { log } = require('./logger');

let db = null;

const DB_DIR = path.join(__dirname, '..', 'data');
const DB_PATH = path.join(DB_DIR, 'chat_logs.db');

/**
 * Initializes the SQLite database connection and creates the chat_logs table if it doesn't exist.
 * @param {string} [dbPath] - Optional custom path for the database file (useful for testing)
 */
function initDB(dbPath) {
  const resolvedPath = dbPath || DB_PATH;
  const dir = path.dirname(resolvedPath);

  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const Database = require('better-sqlite3');
    db = new Database(resolvedPath);

    db.exec(`
      CREATE TABLE IF NOT EXISTS chat_logs (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        pregunta   TEXT    NOT NULL,
        respuesta  TEXT    NOT NULL,
        fecha      TEXT    NOT NULL,
        encontrada INTEGER NOT NULL DEFAULT 1
      )
    `);

    log('info', `Base de datos inicializada en ${resolvedPath}`);
  } catch (err) {
    log('error', `Error al inicializar la base de datos: ${err.message}`);
  }
}

/**
 * Logs a chat interaction to the chat_logs table using parameterized queries.
 * If the write fails, the error is logged but NOT thrown — the user must still get their response.
 * @param {string} pregunta - The user's question
 * @param {string} respuesta - The chatbot's response
 * @param {boolean} [encontrada=true] - Whether the response was found locally (true) or is a fallback (false)
 */
function logInteraction(pregunta, respuesta, encontrada = true) {
  try {
    if (!db) {
      log('error', 'No se puede registrar interacción: base de datos no inicializada');
      return;
    }

    const fecha = new Date().toISOString();
    const stmt = db.prepare('INSERT INTO chat_logs (pregunta, respuesta, fecha, encontrada) VALUES (?, ?, ?, ?)');
    stmt.run(pregunta, respuesta, fecha, encontrada ? 1 : 0);
  } catch (err) {
    log('error', `Error al registrar interacción: ${err.message}`);
  }
}

/**
 * Returns statistics from the chat_logs table.
 * - total: total number of interactions
 * - encontradas: count where encontrada = 1
 * - noEncontradas: count where encontrada = 0
 * - preguntasFrecuentes: top 10 most asked questions
 * - preguntasSinRespuesta: top 10 unanswered questions (encontrada = 0)
 * @returns {object|null} Stats object or null if DB is not initialized or query fails
 */
function getStats() {
  try {
    if (!db) {
      log('error', 'No se pueden obtener estadísticas: base de datos no inicializada');
      return null;
    }

    const total = db.prepare('SELECT COUNT(*) AS count FROM chat_logs').get().count;
    const encontradas = db.prepare('SELECT COUNT(*) AS count FROM chat_logs WHERE encontrada = 1').get().count;
    const noEncontradas = db.prepare('SELECT COUNT(*) AS count FROM chat_logs WHERE encontrada = 0').get().count;

    const preguntasFrecuentes = db.prepare(
      'SELECT pregunta, COUNT(*) AS count FROM chat_logs GROUP BY pregunta ORDER BY count DESC LIMIT 10'
    ).all();

    const preguntasSinRespuesta = db.prepare(
      'SELECT pregunta, COUNT(*) AS count FROM chat_logs WHERE encontrada = 0 GROUP BY pregunta ORDER BY count DESC LIMIT 10'
    ).all();

    return {
      total,
      encontradas,
      noEncontradas,
      preguntasFrecuentes,
      preguntasSinRespuesta
    };
  } catch (err) {
    log('error', `Error al obtener estadísticas: ${err.message}`);
    return null;
  }
}

/**
 * Closes the database connection. Useful for testing cleanup.
 */
function closeDB() {
  try {
    if (db) {
      db.close();
      db = null;
    }
  } catch (err) {
    log('error', `Error al cerrar la base de datos: ${err.message}`);
  }
}

module.exports = { initDB, logInteraction, closeDB, getStats };
