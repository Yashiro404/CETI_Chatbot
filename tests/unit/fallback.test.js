const { handleFallback } = require('../../modules/fallback');

jest.mock('../../modules/aiModule', () => ({
  generateResponse: jest.fn(),
}));

const { generateResponse } = require('../../modules/aiModule');

describe('fallback', () => {
  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    generateResponse.mockReset();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const knowledgeBase = [
    { palabras_clave: ['inscripcion'], respuesta: 'Info de inscripción' },
  ];

  test('AI disabled returns fallback message directly', async () => {
    const config = {
      aiEnabled: false,
      fallbackMessage: 'No encontré información sobre eso.',
    };

    const result = await handleFallback('pregunta desconocida', config, knowledgeBase);
    expect(result).toBe(config.fallbackMessage);
    expect(generateResponse).not.toHaveBeenCalled();
  });

  test('AI enabled delegates to generateResponse and returns AI response', async () => {
    const config = {
      aiEnabled: true,
      fallbackMessage: 'Mensaje de fallback configurado.',
      ai: { provider: 'groq', apiKey: 'test-key', model: 'llama3-8b-8192', timeoutMs: 10000, contextEntries: 3 },
    };

    generateResponse.mockResolvedValue('Respuesta generada por IA');

    const result = await handleFallback('otra pregunta', config, knowledgeBase);
    expect(result).toBe('Respuesta generada por IA');
    expect(generateResponse).toHaveBeenCalledWith('otra pregunta', knowledgeBase, config);
  });

  test('AI enabled falls back to fallbackMessage when generateResponse throws', async () => {
    const config = {
      aiEnabled: true,
      fallbackMessage: 'Mensaje de fallback configurado.',
      ai: { provider: 'groq', apiKey: 'test-key', model: 'llama3-8b-8192', timeoutMs: 10000, contextEntries: 3 },
    };

    generateResponse.mockRejectedValue(new Error('AI API timeout: request exceeded 10000ms'));

    const result = await handleFallback('pregunta con error', config, knowledgeBase);
    expect(result).toBe(config.fallbackMessage);
    expect(generateResponse).toHaveBeenCalledWith('pregunta con error', knowledgeBase, config);
  });

  test('handleFallback returns a promise', () => {
    const config = {
      aiEnabled: false,
      fallbackMessage: 'Fallback.',
    };

    const result = handleFallback('test', config, knowledgeBase);
    expect(result).toBeInstanceOf(Promise);
  });
});
