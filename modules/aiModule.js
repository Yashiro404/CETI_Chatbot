const { normalize } = require('./normalizer');
const { log } = require('./logger');

/**
 * Selecciona las N entradas más relevantes de la base de conocimiento
 * basándose en coincidencia de palabras clave con el mensaje del usuario.
 *
 * @param {string} userMessage - Mensaje del usuario (sin normalizar)
 * @param {Array<{palabras_clave: string[], respuesta: string}>} knowledgeBase - Base de conocimiento completa
 * @param {number} topN - Número máximo de entradas a retornar
 * @returns {Array<{palabras_clave: string[], respuesta: string, score: number}>} Entradas ordenadas por relevancia
 */
function selectRelevantEntries(userMessage, knowledgeBase, topN) {
  if (!userMessage || !Array.isArray(knowledgeBase) || knowledgeBase.length === 0) {
    return [];
  }

  const normalizedMessage = normalize(userMessage);
  const userWords = normalizedMessage.split(/\s+/).filter(w => w.length > 0);

  if (userWords.length === 0) {
    return [];
  }

  const scored = knowledgeBase.map(entry => {
    if (!entry.palabras_clave || !Array.isArray(entry.palabras_clave)) {
      return { entry, score: 0 };
    }

    const normalizedKeywords = entry.palabras_clave
      .map(kw => normalize(kw))
      .flatMap(kw => kw.split(/\s+/))
      .filter(w => w.length > 0);

    let score = 0;
    for (const word of userWords) {
      if (normalizedKeywords.includes(word)) {
        score++;
      }
    }

    return { entry, score };
  });

  return scored
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topN)
    .map(item => ({ ...item.entry, score: item.score }));
}

/**
 * Construye el prompt del sistema para la API de IA.
 * @returns {string} Prompt del sistema
 */
function buildSystemPrompt() {
  return (
    'Eres "CETI Bot", el asistente virtual del CETI (Centro de Enseñanza Técnica Industrial) en Guadalajara, Jalisco. ' +
    'Tu personalidad es amigable, cercana y directa — como un compañero del CETI que te echa la mano.\n\n' +
    'ESTILO DE RESPUESTA (MUY IMPORTANTE):\n' +
    '- Respuestas CORTAS y al grano. Máximo 3-4 oraciones por idea.\n' +
    '- Usa párrafos cortos separados por saltos de línea. NUNCA escribas un bloque largo de texto.\n' +
    '- Un emoji por respuesta máximo, al final o donde quede natural.\n' +
    '- Cuando no tengas la info, sé breve: di que no la tienes, sugiere dónde buscar, y ofrece ayudar con otra cosa.\n' +
    '- Cuando la base de conocimiento tenga links o redes sociales, INCLÚYELOS en tu respuesta.\n' +
    '- Tutea al usuario siempre.\n\n' +
    'FILTRO DE TEMAS (MUY IMPORTANTE):\n' +
    '- SOLO respondes preguntas relacionadas con el CETI: carreras, inscripciones, costos, becas, ubicación, horarios, requisitos, trámites, contacto, vida estudiantil.\n' +
    '- Si el usuario pregunta algo que NO tiene relación con el CETI (matemáticas, clima, chistes, tareas, otros temas), NO respondas la pregunta.\n' +
    '- En su lugar, responde algo breve como: "Eso está fuera de mi área 😅 Yo solo manejo info del CETI. ¿Te puedo ayudar con algo sobre carreras, inscripciones o trámites?"\n' +
    '- NUNCA intentes responder preguntas fuera de tema, ni siquiera parcialmente. Redirige siempre al CETI.\n' +
    '- Los saludos y despedidas SÍ están permitidos, responde amable y breve.\n\n' +
    'REGLAS:\n' +
    '1. Responde SIEMPRE en español.\n' +
    '2. Analiza la pregunta y ELIGE la información más relevante de la base de conocimiento.\n' +
    '3. NO copies las respuestas textualmente. Reformúlalas con tu estilo.\n' +
    '4. Si es un saludo, responde breve y amable.\n' +
    '5. Si la info NO está en la base de conocimiento pero SÍ es sobre el CETI, dilo honestamente y sugiere dónde buscar.'
  );
}

/**
 * Construye el mensaje de usuario con contexto RAG.
 * @param {string} userMessage - Mensaje original del usuario
 * @param {Array<{palabras_clave: string[], respuesta: string}>} contextEntries - Entradas de contexto
 * @returns {string} Mensaje con contexto
 */
function buildUserPrompt(userMessage, contextEntries) {
  const contextText = contextEntries
    .map((entry, i) => {
      const keywords = entry.palabras_clave ? entry.palabras_clave.join(', ') : '';
      return `${i + 1}. [Tema: ${keywords}] ${entry.respuesta}`;
    })
    .join('\n');

  return (
    `BASE DE CONOCIMIENTO DEL CETI:\n${contextText}\n\n` +
    `MENSAJE DEL USUARIO: ${userMessage}\n\n` +
    'Analiza el mensaje del usuario, elige la información más relevante de la base de conocimiento, y responde con tu personalidad amigable.'
  );
}

/**
 * Determina la URL de la API según el proveedor.
 * @param {string} provider - 'groq' o 'openai'
 * @returns {string} URL del endpoint
 */
function getApiUrl(provider) {
  if (provider === 'openai') {
    return 'https://api.openai.com/v1/chat/completions';
  }
  // Default to Groq
  return 'https://api.groq.com/openai/v1/chat/completions';
}

/**
 * Genera respuesta usando IA externa con contexto relevante (RAG simplificado).
 *
 * @param {string} userMessage - Mensaje del usuario
 * @param {Array<{palabras_clave: string[], respuesta: string}>} knowledgeBase - Base de conocimiento completa
 * @param {object} config - Configuración del sistema
 * @returns {Promise<string>} Respuesta generada por IA
 * @throws {Error} Si timeout (10s) o error de API
 */
async function generateResponse(userMessage, knowledgeBase, config) {
  const aiConfig = config.ai || {};
  const provider = aiConfig.provider || 'groq';
  const apiKey = aiConfig.apiKey || '';
  const model = aiConfig.model || 'llama-3.1-8b-instant';
  const timeoutMs = aiConfig.timeoutMs || 10000;

  if (!apiKey) {
    throw new Error('AI API key is not configured');
  }

  // 1. Send ALL knowledge base entries as context so the AI can choose the best answer
  log('info', `AI: Sending all ${knowledgeBase.length} KB entries as context for query`);

  // 2. Build prompts
  const systemPrompt = buildSystemPrompt();
  const userPrompt = buildUserPrompt(userMessage, knowledgeBase);

  // 3. Prepare API request
  const apiUrl = getApiUrl(provider);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    log('info', `AI: Sending request to ${provider} (model: ${model})`);

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 500,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      log('error', `AI API error (${response.status}): ${errorText}`);
      throw new Error(`AI API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      log('error', 'AI API returned unexpected response format');
      throw new Error('AI API returned unexpected response format');
    }

    const generatedText = data.choices[0].message.content.trim();
    log('info', `AI: Response generated successfully (${generatedText.length} chars)`);

    return generatedText;
  } catch (error) {
    clearTimeout(timeoutId);

    if (error.name === 'AbortError') {
      log('error', `AI API timeout after ${timeoutMs}ms`);
      throw new Error(`AI API timeout: request exceeded ${timeoutMs}ms`);
    }

    // Re-throw if it's already our error
    if (error.message.startsWith('AI API')) {
      throw error;
    }

    log('error', `AI API request failed: ${error.message}`);
    throw new Error(`AI API request failed: ${error.message}`);
  }
}

module.exports = { generateResponse, selectRelevantEntries };
