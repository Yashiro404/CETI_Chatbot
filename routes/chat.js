const express = require('express');
const { sanitize } = require('../modules/sanitizer');
const { normalize } = require('../modules/normalizer');
const { search } = require('../modules/searchEngine');
const { handleFallback } = require('../modules/fallback');
const { logInteraction } = require('../modules/chatLogger');
const { log } = require('../modules/logger');

/**
 * Creates an Express router for the chat endpoint.
 * @param {Array<{palabras_clave: string[], respuesta: string}>} knowledgeBase - Loaded KB entries
 * @param {object} config - System configuration
 * @returns {import('express').Router}
 */
function createChatRouter(knowledgeBase, config) {
  const router = express.Router();

  router.post('/', async (req, res) => {
    try {
      const { mensaje } = req.body;

      // Validate presence: missing, null, undefined, or non-string
      if (mensaje == null || typeof mensaje !== 'string' || mensaje.trim().length === 0) {
        log('warn', 'Mensaje ausente o vacío en petición POST /chat');
        return res.status(400).json({ error: 'El campo mensaje es requerido' });
      }

      // Validate length
      if (mensaje.length > 500) {
        log('warn', `Mensaje excede 500 caracteres (${mensaje.length}) en petición POST /chat`);
        return res.status(400).json({ error: 'El mensaje no puede exceder 500 caracteres' });
      }

      // Pipeline depends on whether AI is enabled
      const sanitized = sanitize(mensaje);
      let respuesta;
      let found;

      if (config.aiEnabled) {
        // AI-first pipeline: always delegate to AI with full KB context
        // The AI decides which KB entry is relevant and responds with personality
        try {
          const { generateResponse } = require('../modules/aiModule');
          respuesta = await generateResponse(mensaje, knowledgeBase, config);
          found = true;
        } catch (aiError) {
          log('warn', `AI failed, falling back to local search: ${aiError.message}`);
          // Fallback to local keyword search if AI fails
          const normalized = normalize(sanitized);
          const result = search(normalized, knowledgeBase);
          if (result.found) {
            respuesta = result.respuesta;
            found = true;
          } else {
            respuesta = config.fallbackMessage;
            found = false;
          }
        }
      } else {
        // Local-only pipeline: keyword search → fallback message
        const normalized = normalize(sanitized);
        const result = search(normalized, knowledgeBase);
        if (result.found) {
          respuesta = result.respuesta;
          found = true;
        } else {
          respuesta = await handleFallback(mensaje, config, knowledgeBase);
          found = false;
        }
      }

      // Log interaction (errors here don't interrupt the response)
      logInteraction(mensaje, respuesta, found);

      log('info', `POST /chat procesado - encontrada: ${found}`);
      return res.json({ respuesta });
    } catch (err) {
      log('error', `Error interno en POST /chat: ${err.message}`);
      return res.status(500).json({ error: 'Error interno del servidor' });
    }
  });

  return router;
}

module.exports = createChatRouter;
