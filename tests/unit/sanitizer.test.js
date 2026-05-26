const { sanitize } = require('../../modules/sanitizer');

describe('sanitizer', () => {
  test('removes script tags and preserves content', () => {
    expect(sanitize('<script>alert("xss")</script>')).toBe('alert("xss")');
  });

  test('removes img tags', () => {
    expect(sanitize('<img src="x" onerror="alert(1)">')).toBe('');
  });

  test('removes div tags and preserves inner text', () => {
    expect(sanitize('<div>Hola mundo</div>')).toBe('Hola mundo');
  });

  test('removes self-closing tags', () => {
    expect(sanitize('Texto<br/>más texto')).toBe('Textomás texto');
  });

  test('removes nested HTML tags', () => {
    expect(sanitize('<div><p><b>Hola</b></p></div>')).toBe('Hola');
  });

  test('removes control characters', () => {
    expect(sanitize('Hola\x00\x01\x02mundo')).toBe('Holamundo');
  });

  test('preserves newlines and tabs', () => {
    expect(sanitize('Hola\nmundo\taquí')).toBe('Hola\nmundo\taquí');
  });

  test('preserves normal text with letters, numbers, spaces', () => {
    expect(sanitize('Hola mundo 123')).toBe('Hola mundo 123');
  });

  test('preserves basic punctuation', () => {
    expect(sanitize('¿Cómo estás? ¡Bien! Sí, claro.')).toBe('¿Cómo estás? ¡Bien! Sí, claro.');
  });

  test('returns empty string for null input', () => {
    expect(sanitize(null)).toBe('');
  });

  test('returns empty string for undefined input', () => {
    expect(sanitize(undefined)).toBe('');
  });

  test('returns empty string for empty string input', () => {
    expect(sanitize('')).toBe('');
  });

  test('handles mixed HTML and normal text', () => {
    expect(sanitize('Hola <b>mundo</b>, ¿cómo estás?')).toBe('Hola mundo, ¿cómo estás?');
  });
});
