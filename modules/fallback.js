const { log } = require('./logger');
const { generateResponse } = require('./aiModule');

/**
 * Genera respuesta de fallback cuando no hay coincidencia local.
 * Si config.aiEnabled es true, delega al Módulo IA.
 * Si config.aiEnabled es false, retorna el mensaje de fallback configurado.
 *
 * @param {string} userMessage - Mensaje original del usuario
 * @param {object} config - Configuración del sistema
 * @param {Array<{palabras_clave: string[], respuesta: string}>} knowledgeBase - Base de conocimiento
 * @returns {Promise<string>} Respuesta fallback o respuesta IA
 */
async function handleFallback(userMessage, config, knowledgeBase) {
  if (config.aiEnabled) {
    try {
      log('info', `AI enabled, delegating to AI module for: "${userMessage}"`);
      const aiResponse = await generateResponse(userMessage, knowledgeBase, config);
      return aiResponse;
    } catch (error) {
      log('error', `AI module failed: ${error.message}. Returning fallback message.`);
      return config.fallbackMessage;
    }
  }

  log('info', `No match found, returning fallback message for: "${userMessage}"`);
  return config.fallbackMessage;
}

module.exports = { handleFallback };
