const fs = require('fs');
const path = require('path');
const os = require('os');
const { loadKnowledgeBase } = require('../../modules/kbLoader');

/**
 * Helper: crea un directorio temporal con archivos JSON para testing.
 */
function createTempKBDir(files = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kb-test-'));
  for (const [name, content] of Object.entries(files)) {
    fs.writeFileSync(path.join(dir, name), content, 'utf-8');
  }
  return dir;
}

/**
 * Helper: elimina un directorio temporal y su contenido.
 */
function removeTempDir(dir) {
  const entries = fs.readdirSync(dir);
  for (const entry of entries) {
    fs.unlinkSync(path.join(dir, entry));
  }
  fs.rmdirSync(dir);
}

describe('kbLoader - loadKnowledgeBase', () => {
  let tempDir;

  afterEach(() => {
    if (tempDir && fs.existsSync(tempDir)) {
      removeTempDir(tempDir);
    }
  });

  test('carga correctamente un archivo JSON válido', () => {
    const data = [
      {
        palabras_clave: ['inscripcion', 'registro'],
        respuesta: 'Para inscribirte debes...',
      },
      {
        palabras_clave: ['fecha'],
        respuesta: 'Las fechas son...',
      },
    ];
    tempDir = createTempKBDir({ 'test.json': JSON.stringify(data) });

    const result = loadKnowledgeBase(tempDir);

    expect(result).toHaveLength(2);
    expect(result[0].palabras_clave).toEqual(['inscripcion', 'registro']);
    expect(result[0].respuesta).toBe('Para inscribirte debes...');
    expect(result[1].palabras_clave).toEqual(['fecha']);
    expect(result[1].respuesta).toBe('Las fechas son...');
  });

  test('carga y combina múltiples archivos JSON', () => {
    const file1 = [
      { palabras_clave: ['carrera'], respuesta: 'Ingeniería en...' },
    ];
    const file2 = [
      { palabras_clave: ['costo'], respuesta: 'La cuota es...' },
      { palabras_clave: ['beca'], respuesta: 'Las becas disponibles...' },
    ];
    tempDir = createTempKBDir({
      'carreras.json': JSON.stringify(file1),
      'costos.json': JSON.stringify(file2),
    });

    const result = loadKnowledgeBase(tempDir);

    expect(result).toHaveLength(3);
  });

  test('ignora archivos que no son .json', () => {
    const data = [
      { palabras_clave: ['test'], respuesta: 'Respuesta test' },
    ];
    tempDir = createTempKBDir({
      'valid.json': JSON.stringify(data),
      'readme.txt': 'Este archivo no es JSON',
      'notes.md': '# Notas',
    });

    const result = loadKnowledgeBase(tempDir);

    expect(result).toHaveLength(1);
    expect(result[0].respuesta).toBe('Respuesta test');
  });

  test('retorna arreglo vacío si no hay archivos JSON', () => {
    tempDir = createTempKBDir({ 'readme.txt': 'No hay JSON aquí' });

    const result = loadKnowledgeBase(tempDir);

    expect(result).toEqual([]);
  });

  test('lanza error si el directorio no existe', () => {
    const fakePath = path.join(os.tmpdir(), 'directorio-inexistente-xyz');

    expect(() => loadKnowledgeBase(fakePath)).toThrow(
      /Directorio de base de conocimiento no encontrado/
    );
  });

  test('lanza error si el JSON es inválido', () => {
    tempDir = createTempKBDir({
      'broken.json': '{ invalid json content',
    });

    expect(() => loadKnowledgeBase(tempDir)).toThrow(
      /JSON inválido en archivo "broken\.json"/
    );
  });

  test('lanza error si el archivo no contiene un arreglo', () => {
    tempDir = createTempKBDir({
      'object.json': JSON.stringify({ palabras_clave: ['test'], respuesta: 'test' }),
    });

    expect(() => loadKnowledgeBase(tempDir)).toThrow(
      /debe contener un arreglo JSON/
    );
  });

  test('lanza error si falta palabras_clave', () => {
    tempDir = createTempKBDir({
      'missing.json': JSON.stringify([{ respuesta: 'Sin palabras clave' }]),
    });

    expect(() => loadKnowledgeBase(tempDir)).toThrow(
      /posición 0.*"palabras_clave" debe ser un arreglo/
    );
  });

  test('lanza error si palabras_clave está vacío', () => {
    tempDir = createTempKBDir({
      'empty_kw.json': JSON.stringify([
        { palabras_clave: [], respuesta: 'Respuesta' },
      ]),
    });

    expect(() => loadKnowledgeBase(tempDir)).toThrow(
      /posición 0.*"palabras_clave" no puede estar vacío/
    );
  });

  test('lanza error si palabras_clave contiene un string vacío', () => {
    tempDir = createTempKBDir({
      'empty_str.json': JSON.stringify([
        { palabras_clave: ['valido', ''], respuesta: 'Respuesta' },
      ]),
    });

    expect(() => loadKnowledgeBase(tempDir)).toThrow(
      /posición 0.*"palabras_clave\[1\]" no puede ser un string vacío/
    );
  });

  test('lanza error si palabras_clave contiene un no-string', () => {
    tempDir = createTempKBDir({
      'bad_type.json': JSON.stringify([
        { palabras_clave: ['valido', 123], respuesta: 'Respuesta' },
      ]),
    });

    expect(() => loadKnowledgeBase(tempDir)).toThrow(
      /posición 0.*"palabras_clave\[1\]" debe ser un string/
    );
  });

  test('lanza error si falta respuesta', () => {
    tempDir = createTempKBDir({
      'no_resp.json': JSON.stringify([
        { palabras_clave: ['test'] },
      ]),
    });

    expect(() => loadKnowledgeBase(tempDir)).toThrow(
      /posición 0.*"respuesta" debe ser un string/
    );
  });

  test('lanza error si respuesta es un string vacío', () => {
    tempDir = createTempKBDir({
      'empty_resp.json': JSON.stringify([
        { palabras_clave: ['test'], respuesta: '' },
      ]),
    });

    expect(() => loadKnowledgeBase(tempDir)).toThrow(
      /posición 0.*"respuesta" no puede ser un string vacío/
    );
  });

  test('lanza error si respuesta no es string', () => {
    tempDir = createTempKBDir({
      'num_resp.json': JSON.stringify([
        { palabras_clave: ['test'], respuesta: 42 },
      ]),
    });

    expect(() => loadKnowledgeBase(tempDir)).toThrow(
      /posición 0.*"respuesta" debe ser un string/
    );
  });

  test('lanza error si una entrada no es un objeto', () => {
    tempDir = createTempKBDir({
      'not_obj.json': JSON.stringify(['string en vez de objeto']),
    });

    expect(() => loadKnowledgeBase(tempDir)).toThrow(
      /posición 0.*se esperaba un objeto/
    );
  });

  test('indica la posición correcta de la entrada inválida', () => {
    const data = [
      { palabras_clave: ['valido'], respuesta: 'OK' },
      { palabras_clave: ['valido2'], respuesta: 'OK2' },
      { palabras_clave: [], respuesta: 'Falla aquí' },
    ];
    tempDir = createTempKBDir({ 'pos.json': JSON.stringify(data) });

    expect(() => loadKnowledgeBase(tempDir)).toThrow(
      /posición 2/
    );
  });

  test('indica el nombre del archivo en el error', () => {
    tempDir = createTempKBDir({
      'mi_archivo.json': JSON.stringify([{ respuesta: 'sin keywords' }]),
    });

    expect(() => loadKnowledgeBase(tempDir)).toThrow(
      /mi_archivo\.json/
    );
  });

  test('permite campos adicionales en las entradas', () => {
    const data = [
      {
        palabras_clave: ['test'],
        respuesta: 'Respuesta',
        categoria: 'general',
        prioridad: 1,
      },
    ];
    tempDir = createTempKBDir({ 'extra.json': JSON.stringify(data) });

    const result = loadKnowledgeBase(tempDir);

    expect(result).toHaveLength(1);
    expect(result[0].categoria).toBe('general');
    expect(result[0].prioridad).toBe(1);
  });

  test('lanza error si palabras_clave contiene solo whitespace strings', () => {
    tempDir = createTempKBDir({
      'ws.json': JSON.stringify([
        { palabras_clave: ['   '], respuesta: 'Respuesta' },
      ]),
    });

    expect(() => loadKnowledgeBase(tempDir)).toThrow(
      /no puede ser un string vacío/
    );
  });

  test('lanza error si respuesta es solo whitespace', () => {
    tempDir = createTempKBDir({
      'ws_resp.json': JSON.stringify([
        { palabras_clave: ['test'], respuesta: '   ' },
      ]),
    });

    expect(() => loadKnowledgeBase(tempDir)).toThrow(
      /no puede ser un string vacío/
    );
  });
});
