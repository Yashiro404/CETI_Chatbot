const express = require('express');
const path = require('path');
const config = require('./config');
const { log } = require('./modules/logger');
const { loadKnowledgeBase } = require('./modules/kbLoader');
const { initDB } = require('./modules/chatLogger');
const createChatRouter = require('./routes/chat');
const createStatsRouter = require('./routes/stats');

// Load knowledge base into memory at startup
let knowledgeBase;
try {
  knowledgeBase = loadKnowledgeBase(config.kbPath);
} catch (err) {
  log('error', `Error al cargar la base de conocimiento: ${err.message}`);
  process.exit(1);
}

// Initialize SQLite database
initDB();

// Create Express app
const app = express();

// Parse JSON request bodies
app.use(express.json());

// Serve static files from public/ directory
app.use(express.static(path.join(__dirname, 'public')));

// Mount chat router at /chat
app.use('/chat', createChatRouter(knowledgeBase, config));

// Mount stats router at /stats
app.use('/stats', createStatsRouter());

// Log startup info
log('info', `Puerto de escucha: ${config.port}`);
log('info', `Base de conocimiento: ${knowledgeBase.length} entradas cargadas`);
log('info', `Módulo IA: ${config.aiEnabled ? 'habilitado' : 'deshabilitado'}`);

// Start listening only if this file is run directly (not required as a module)
if (require.main === module) {
  app.listen(config.port, () => {
    log('info', `Servidor CETI Chatbot iniciado en http://localhost:${config.port}`);
  });
}

module.exports = app;
