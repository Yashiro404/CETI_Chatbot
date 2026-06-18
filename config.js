require('dotenv').config();

/**
 * @type {{
 *   port: number,
 *   kbPath: string,
 *   fallbackMessage: string,
 *   aiEnabled: boolean,
 *   ai?: {
 *     provider: 'groq' | 'openai',
 *     apiKey: string,
 *     model: string,
 *     timeoutMs: number,
 *     contextEntries: number
 *   },
 *   firebase: {
 *     apiKey: string,
 *     authDomain: string,
 *     projectId: string,
 *     storageBucket: string,
 *     messagingSenderId: string,
 *     appId: string
 *   }
 * }}
 */
const config = {
  port: parseInt(process.env.PORT, 10) || 3000,
  kbPath: process.env.KB_PATH || './knowledge-base',
  fallbackMessage:
    process.env.FALLBACK_MESSAGE ||
    'Lo siento, no encontré información sobre eso. Te recomiendo reformular tu pregunta o contactar directamente al CETI.',
  aiEnabled: process.env.AI_ENABLED === 'true',
  ai: {
    provider: process.env.AI_PROVIDER || 'groq',
    apiKey: process.env.AI_API_KEY || '',
    model: process.env.AI_MODEL || 'llama-3.1-8b-instant',
    timeoutMs: parseInt(process.env.AI_TIMEOUT_MS, 10) || 10000,
    contextEntries: parseInt(process.env.AI_CONTEXT_ENTRIES, 10) || 3,
  },
  // Configuración de Firebase para el SDK Web (cliente). Estas claves son
  // públicas por diseño; la seguridad real la imponen las reglas de Firestore.
  // Se leen desde el .env y se sirven al navegador vía GET /firebase-config.js.
  firebase: {
    apiKey: process.env.FIREBASE_API_KEY || '',
    authDomain: process.env.FIREBASE_AUTH_DOMAIN || '',
    projectId: process.env.FIREBASE_PROJECT_ID || '',
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET || '',
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || '',
    appId: process.env.FIREBASE_APP_ID || '',
  },
};

module.exports = config;
