const { normalize } = require('../../modules/normalizer');

describe('normalizer', () => {
  test('converts text to lowercase', () => {
    expect(normalize('HOLA MUNDO')).toBe('hola mundo');
  });

  test('removes accents from vowels', () => {
    expect(normalize('Inscripción')).toBe('inscripcion');
  });

  test('removes special characters keeping letters, numbers, spaces', () => {
    expect(normalize('¿Cómo?')).toBe('como');
  });

  test('collapses multiple spaces into single space', () => {
    expect(normalize('hola    mundo   aqui')).toBe('hola mundo aqui');
  });

  test('trims leading and trailing whitespace', () => {
    expect(normalize('  hola mundo  ')).toBe('hola mundo');
  });

  test('handles combined transformations', () => {
    expect(normalize('  ¿Cuánto CUESTA la Inscripción?  ')).toBe('cuanto cuesta la inscripcion');
  });

  test('preserves numbers', () => {
    expect(normalize('Campus 2 CETI')).toBe('campus 2 ceti');
  });

  test('removes punctuation', () => {
    expect(normalize('Hola, ¿cómo estás? ¡Bien!')).toBe('hola como estas bien');
  });

  test('handles text with ñ character', () => {
    expect(normalize('Año de ingreso')).toBe('ano de ingreso');
  });

  test('returns empty string for null input', () => {
    expect(normalize(null)).toBe('');
  });

  test('returns empty string for undefined input', () => {
    expect(normalize(undefined)).toBe('');
  });

  test('returns empty string for empty string input', () => {
    expect(normalize('')).toBe('');
  });

  test('returns empty string for whitespace-only input', () => {
    expect(normalize('   ')).toBe('');
  });

  test('normalization is idempotent', () => {
    const input = '¿Cuánto CUESTA la Inscripción?';
    const once = normalize(input);
    const twice = normalize(once);
    expect(twice).toBe(once);
  });

  test('handles string with only special characters', () => {
    expect(normalize('!@#$%^&*()')).toBe('');
  });

  test('handles mixed accented characters', () => {
    expect(normalize('àáâãäåèéêëìíîïòóôõöùúûüýÿ')).toBe('aaaaaaeeeeiiiiooooouuuuyy');
  });
});
