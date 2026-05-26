/**
 * Normaliza texto: minúsculas, sin acentos, sin caracteres especiales.
 * @param {string} input - Texto sanitizado
 * @returns {string} Texto normalizado (solo letras, números, espacios)
 */
function normalize(input) {
  if (input == null) {
    return '';
  }

  let text = String(input);

  if (text.length === 0) {
    return '';
  }

  // 1. Convertir a minúsculas
  text = text.toLowerCase();

  // 2. Eliminar acentos/diacríticos usando NFD decomposition + regex
  text = text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  // 3. Eliminar todo excepto letras, números y espacios
  text = text.replace(/[^a-z0-9\s]/g, '');

  // 4. Colapsar espacios múltiples en un solo espacio
  text = text.replace(/\s+/g, ' ');

  // 5. Eliminar espacios al inicio y al final
  text = text.trim();

  return text;
}

module.exports = { normalize };
