const { normalize } = require('./normalizer');

/**
 * Busca la mejor coincidencia en la base de conocimiento.
 * @param {string} normalizedText - Texto normalizado del usuario
 * @param {Array<{palabras_clave: string[], respuesta: string}>} knowledgeBase - Entradas cargadas en memoria
 * @returns {{ found: boolean, respuesta?: string, score?: number }}
 */
function search(normalizedText, knowledgeBase) {
  if (!normalizedText || !Array.isArray(knowledgeBase) || knowledgeBase.length === 0) {
    return { found: false };
  }

  const userWords = normalizedText.split(/\s+/).filter(word => word.length > 0);

  if (userWords.length === 0) {
    return { found: false };
  }

  let bestEntry = null;
  let bestScore = 0;

  for (const entry of knowledgeBase) {
    if (!entry.palabras_clave || !Array.isArray(entry.palabras_clave)) {
      continue;
    }

    // Normalize each keyword and split multi-word keywords into individual words
    const normalizedKeywords = entry.palabras_clave
      .map(kw => normalize(kw))
      .flatMap(kw => kw.split(/\s+/))
      .filter(word => word.length > 0);

    // Count how many user words match any keyword
    let score = 0;
    for (const userWord of userWords) {
      if (normalizedKeywords.includes(userWord)) {
        score++;
      }
    }

    // Keep the first entry with the highest score (handles ties)
    if (score > bestScore) {
      bestScore = score;
      bestEntry = entry;
    }
  }

  if (bestScore === 0) {
    return { found: false };
  }

  return {
    found: true,
    respuesta: bestEntry.respuesta,
    score: bestScore
  };
}

module.exports = { search };
