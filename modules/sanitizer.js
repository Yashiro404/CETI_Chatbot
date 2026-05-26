/**
 * Elimina etiquetas HTML y caracteres peligrosos del texto.
 * @param {string} input - Texto crudo del usuario
 * @returns {string} Texto sanitizado
 */
function sanitize(input) {
  if (input == null) {
    return '';
  }

  let text = String(input);

  // Eliminar todas las etiquetas HTML (incluyendo self-closing y con atributos)
  text = text.replace(/<[^>]*>/g, '');

  // Eliminar caracteres de control (código < 32) excepto newline (10) y tab (9)
  text = text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');

  return text;
}

module.exports = { sanitize };
