const { search } = require('../../modules/searchEngine');

describe('searchEngine', () => {
  const knowledgeBase = [
    {
      palabras_clave: ['inscripcion', 'registro', 'como inscribirse'],
      respuesta: 'Para inscribirte en el CETI debes...'
    },
    {
      palabras_clave: ['fecha', 'plazo', 'cuando', 'periodo'],
      respuesta: 'Las fechas de inscripción son...'
    },
    {
      palabras_clave: ['carrera', 'ingenieria', 'que carreras'],
      respuesta: 'El CETI ofrece las siguientes carreras...'
    }
  ];

  test('returns best match when user words match keywords', () => {
    const result = search('inscripcion registro', knowledgeBase);
    expect(result.found).toBe(true);
    expect(result.respuesta).toBe('Para inscribirte en el CETI debes...');
    expect(result.score).toBe(2);
  });

  test('returns partial match with score 1', () => {
    const result = search('cuando es el plazo', knowledgeBase);
    expect(result.found).toBe(true);
    expect(result.respuesta).toBe('Las fechas de inscripción son...');
    expect(result.score).toBe(2);
  });

  test('returns { found: false } when no words match', () => {
    const result = search('xyz abc 123', knowledgeBase);
    expect(result).toEqual({ found: false });
  });

  test('returns the entry with the highest score', () => {
    // "inscripcion" matches entry 0, "como inscribirse" splits into "como" and "inscribirse" which also match entry 0
    const result = search('como inscribirse registro', knowledgeBase);
    expect(result.found).toBe(true);
    expect(result.respuesta).toBe('Para inscribirte en el CETI debes...');
    expect(result.score).toBeGreaterThanOrEqual(2);
  });

  test('on tie, returns the first entry found', () => {
    // Each entry has exactly 1 match
    const tiedKB = [
      { palabras_clave: ['alfa'], respuesta: 'Primera respuesta' },
      { palabras_clave: ['alfa'], respuesta: 'Segunda respuesta' }
    ];
    const result = search('alfa', tiedKB);
    expect(result.found).toBe(true);
    expect(result.respuesta).toBe('Primera respuesta');
    expect(result.score).toBe(1);
  });

  test('normalizes keywords before matching', () => {
    const kbWithAccents = [
      {
        palabras_clave: ['Inscripción', 'REGISTRO'],
        respuesta: 'Respuesta con acentos normalizados'
      }
    ];
    const result = search('inscripcion', kbWithAccents);
    expect(result.found).toBe(true);
    expect(result.respuesta).toBe('Respuesta con acentos normalizados');
  });

  test('returns { found: false } for empty text', () => {
    expect(search('', knowledgeBase)).toEqual({ found: false });
  });

  test('returns { found: false } for null/undefined text', () => {
    expect(search(null, knowledgeBase)).toEqual({ found: false });
    expect(search(undefined, knowledgeBase)).toEqual({ found: false });
  });

  test('returns { found: false } for empty knowledge base', () => {
    expect(search('inscripcion', [])).toEqual({ found: false });
  });

  test('skips entries with missing or invalid palabras_clave', () => {
    const badKB = [
      { respuesta: 'No keywords' },
      { palabras_clave: 'not an array', respuesta: 'String keywords' },
      { palabras_clave: ['valido'], respuesta: 'Entry valida' }
    ];
    const result = search('valido', badKB);
    expect(result.found).toBe(true);
    expect(result.respuesta).toBe('Entry valida');
  });
});
