const express = require('express');
const { getStats } = require('../modules/chatLogger');
const { log } = require('../modules/logger');

/**
 * Creates an Express router for the stats endpoint.
 * GET / returns statistics from chat_logs.
 * @returns {import('express').Router}
 */
function createStatsRouter() {
  const router = express.Router();

  router.get('/', (req, res) => {
    try {
      const stats = getStats();

      if (stats === null) {
        log('warn', 'GET /stats - estadísticas no disponibles');
        return res.status(503).json({ error: 'Estadísticas no disponibles' });
      }

      log('info', 'GET /stats procesado');
      return res.json(stats);
    } catch (err) {
      log('error', `Error interno en GET /stats: ${err.message}`);
      return res.status(500).json({ error: 'Error interno del servidor' });
    }
  });

  return router;
}

module.exports = createStatsRouter;
