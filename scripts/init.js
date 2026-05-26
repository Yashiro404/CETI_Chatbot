#!/usr/bin/env node

/**
 * Script de inicialización del Chatbot CETI.
 * Ejecutar con: node scripts/init.js
 *
 * Verifica que la base de conocimiento carga correctamente
 * e inicializa la base de datos SQLite.
 */

const config = require('../config');
const { loadKnowledgeBase } = require('../modules/kbLoader');
const { initDB, closeDB } = require('../modules/chatLogger');
const { log } = require('../modules/logger');

function main() {
  log('info', '=== Inicialización del Chatbot CETI ===');

  // 1. Cargar y verificar la base de conocimiento
  log('info', `Cargando base de conocimiento desde: ${config.kbPath}`);
  let entries;
  try {
    entries = loadKnowledgeBase(config.kbPath);
  } catch (err) {
    log('error', `Error al cargar la base de conocimiento: ${err.message}`);
    process.exit(1);
  }

  log('info', `Base de conocimiento cargada exitosamente: ${entries.length} entradas`);

  // List the KB files found
  const fs = require('fs');
  const path = require('path');
  const resolvedKbPath = path.resolve(config.kbPath);
  const files = fs.readdirSync(resolvedKbPath).filter((f) => f.endsWith('.json'));
  log('info', `Archivos encontrados: ${files.join(', ')}`);

  // 2. Inicializar la base de datos SQLite
  log('info', 'Inicializando base de datos SQLite...');
  initDB();
  log('info', 'Base de datos inicializada correctamente');

  // 3. Cerrar la conexión a la base de datos
  closeDB();
  log('info', 'Conexión a la base de datos cerrada');

  log('info', '=== Inicialización completada con éxito ===');
}

main();
