/**
 * Registra un mensaje en el log del servidor.
 * @param {'info' | 'warn' | 'error'} level - Nivel de severidad
 * @param {string} message - Mensaje descriptivo
 */
function log(level, message) {
  const timestamp = new Date().toISOString();
  const upperLevel = level.toUpperCase();
  const formatted = `[${timestamp}] [${upperLevel}] ${message}`;

  switch (level) {
    case 'warn':
      console.warn(formatted);
      break;
    case 'error':
      console.error(formatted);
      break;
    case 'info':
    default:
      console.log(formatted);
      break;
  }
}

module.exports = { log };
