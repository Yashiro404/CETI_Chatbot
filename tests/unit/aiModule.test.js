const { generateResponse, selectRelevantEntries } = require('../../modules/aiModule');

// --- Sample knowledge base for tests ---
const sampleKB = [
  {
    palabras_clave: ['inscripcion', 'registro', 'como inscribirse'],
    respuesta: 'Para inscribirte en el CETI debes presentar tu documentación completa.',
  },
  {
    palabras_clave: ['carreras', 'ingenieria', 'programas'],
    respuesta: 'El CETI ofrece ingenierías en Sistemas, Electrónica y Mecatrónica.',
  },
  {
    palabras_clave: ['costos', 'cuota', 'precio', 'pago'],
    respuesta: 'La cuota semestral es de $2,500 MXN.',
  },
  {
    palabras_clave: ['ubicacion', 'direccion', 'campus'],
    respuesta: 'El CETI se encuentra en Guadalajara, Jalisco.',
  },
  {
    palabras_clave: ['beca', 'apoyo', 'descuento'],
    respuesta: 'El CETI ofrece becas del 50% para estudiantes destacados.',
  },
];

const baseConfig = {
  aiEnabled: true,
  fallbackMessage: 'No encontré información.',
  ai: {
    provider: 'groq',
    apiKey: 'test-api-key-123',
    model: 'llama3-8b-8192',
    timeoutMs: 10000,
    contextEntries: 3,
  },
};

// ============================================================
// Tests for selectRelevantEntries
// ============================================================
describe('selectRelevantEntries', () => {
  test('returns top N entries sorted by relevance score', () => {
    const results = selectRelevantEntries('inscripcion carreras costos', sampleKB, 2);

    expect(results).toHaveLength(2);
    // Each result should have a score > 0
    expect(results[0].score).toBeGreaterThan(0);
    expect(results[1].score).toBeGreaterThan(0);
    // Results should be sorted descending by score
    expect(results[0].score).toBeGreaterThanOrEqual(results[1].score);
  });

  test('returns fewer entries when fewer match', () => {
    const results = selectRelevantEntries('inscripcion', sampleKB, 3);

    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0].respuesta).toContain('inscribirte');
  });

  test('returns empty array when no keywords match', () => {
    const results = selectRelevantEntries('xyznonexistent', sampleKB, 3);

    expect(results).toEqual([]);
  });

  test('returns empty array for empty message', () => {
    expect(selectRelevantEntries('', sampleKB, 3)).toEqual([]);
  });

  test('returns empty array for empty knowledge base', () => {
    expect(selectRelevantEntries('inscripcion', [], 3)).toEqual([]);
  });

  test('returns empty array for null/undefined inputs', () => {
    expect(selectRelevantEntries(null, sampleKB, 3)).toEqual([]);
    expect(selectRelevantEntries('inscripcion', null, 3)).toEqual([]);
  });

  test('respects the topN limit', () => {
    const results = selectRelevantEntries('inscripcion carreras costos beca ubicacion', sampleKB, 2);

    expect(results.length).toBeLessThanOrEqual(2);
  });

  test('handles entries with missing palabras_clave gracefully', () => {
    const kbWithBadEntry = [
      ...sampleKB,
      { respuesta: 'Entry without keywords' },
    ];
    const results = selectRelevantEntries('inscripcion', kbWithBadEntry, 3);

    // Should still work, ignoring the bad entry
    expect(results.length).toBeGreaterThanOrEqual(1);
  });
});

// ============================================================
// Tests for generateResponse
// ============================================================
describe('generateResponse', () => {
  // Save and restore global fetch
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  test('returns AI-generated response on successful API call', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: 'El CETI ofrece varias carreras de ingeniería.',
            },
          },
        ],
      }),
    });

    const result = await generateResponse('¿Qué carreras hay?', sampleKB, baseConfig);

    expect(result).toBe('El CETI ofrece varias carreras de ingeniería.');
    expect(global.fetch).toHaveBeenCalledTimes(1);

    // Verify the fetch was called with correct URL and structure
    const [url, options] = global.fetch.mock.calls[0];
    expect(url).toBe('https://api.groq.com/openai/v1/chat/completions');
    expect(options.method).toBe('POST');
    expect(options.headers['Authorization']).toBe('Bearer test-api-key-123');

    const body = JSON.parse(options.body);
    expect(body.model).toBe('llama3-8b-8192');
    expect(body.messages).toHaveLength(2);
    expect(body.messages[0].role).toBe('system');
    expect(body.messages[1].role).toBe('user');
  });

  test('uses OpenAI URL when provider is openai', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: 'Respuesta de OpenAI.' } }],
      }),
    });

    const openaiConfig = {
      ...baseConfig,
      ai: { ...baseConfig.ai, provider: 'openai' },
    };

    await generateResponse('¿Qué carreras hay?', sampleKB, openaiConfig);

    const [url] = global.fetch.mock.calls[0];
    expect(url).toBe('https://api.openai.com/v1/chat/completions');
  });

  test('throws error when API key is not configured', async () => {
    const noKeyConfig = {
      ...baseConfig,
      ai: { ...baseConfig.ai, apiKey: '' },
    };

    await expect(
      generateResponse('test', sampleKB, noKeyConfig)
    ).rejects.toThrow('AI API key is not configured');
  });

  test('throws error on API HTTP error response', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      text: async () => 'Invalid API key',
    });

    await expect(
      generateResponse('test', sampleKB, baseConfig)
    ).rejects.toThrow('AI API error: 401 Unauthorized');
  });

  test('throws error on timeout', async () => {
    const shortTimeoutConfig = {
      ...baseConfig,
      ai: { ...baseConfig.ai, timeoutMs: 50 },
    };

    // Simulate a slow response that will be aborted
    global.fetch = jest.fn().mockImplementation((_url, options) => {
      return new Promise((resolve, reject) => {
        const onAbort = () => {
          const abortError = new Error('The operation was aborted');
          abortError.name = 'AbortError';
          reject(abortError);
        };

        if (options.signal.aborted) {
          onAbort();
          return;
        }

        options.signal.addEventListener('abort', onAbort);
      });
    });

    await expect(
      generateResponse('test', sampleKB, shortTimeoutConfig)
    ).rejects.toThrow(/AI API timeout/);
  });

  test('throws error on network failure', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

    await expect(
      generateResponse('test', sampleKB, baseConfig)
    ).rejects.toThrow('AI API request failed: Network error');
  });

  test('throws error on unexpected response format', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ unexpected: 'format' }),
    });

    await expect(
      generateResponse('test', sampleKB, baseConfig)
    ).rejects.toThrow('AI API returned unexpected response format');
  });

  test('includes context from knowledge base in the request body', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: 'Respuesta con contexto.' } }],
      }),
    });

    await generateResponse('inscripcion registro', sampleKB, baseConfig);

    const [, options] = global.fetch.mock.calls[0];
    const body = JSON.parse(options.body);
    const userMessage = body.messages[1].content;

    // The user prompt should contain context and the user's question
    expect(userMessage).toContain('BASE DE CONOCIMIENTO DEL CETI:');
    expect(userMessage).toContain('inscripcion registro');
  });

  test('uses default config values when ai config is sparse', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: 'OK' } }],
      }),
    });

    const sparseConfig = {
      ai: { apiKey: 'key-123' },
    };

    const result = await generateResponse('test', sampleKB, sparseConfig);
    expect(result).toBe('OK');

    const [url, options] = global.fetch.mock.calls[0];
    expect(url).toBe('https://api.groq.com/openai/v1/chat/completions');
    const body = JSON.parse(options.body);
    expect(body.model).toBe('llama-3.1-8b-instant');
  });
});
