const fs = require('fs');
const path = require('path');
const { log } = require('./logger');

/**
 * Carga todos los archivos JSON de la base de conocimiento.
 * @param {string} kbPath - Ruta al directorio de la base de conocimiento
 * @returns {Array<{palabras_clave: string[], respuesta: string}>} Entradas validadas
 * @throws {Error} Si el directorio no existe, algún archivo tiene JSON inválido,
 *                  o alguna entrada no cumple el esquema requerido
 */
function loadKnowledgeBase(kbPath) {
  const resolvedPath = path.resolve(kbPath);

  if (!fs.existsSync(resolvedPath)) {
    throw new Error(
      `Directorio de base de conocimiento no encontrado: ${resolvedPath}`
    );
  }

  const stat = fs.statSync(resolvedPath);
  if (!stat.isDirectory()) {
    throw new Error(
      `La ruta especificada no es un directorio: ${resolvedPath}`
    );
  }

  const files = fs.readdirSync(resolvedPath).filter((f) => f.endsWith('.json'));

  if (files.length === 0) {
    log('warn', `No se encontraron archivos JSON en: ${resolvedPath}`);
    return [];
  }

  const allEntries = [];

  for (const file of files) {
    const filePath = path.join(resolvedPath, file);
    let rawContent;

    try {
      rawContent = fs.readFileSync(filePath, 'utf-8');
    } catch (err) {
      throw new Error(
        `Error al leer el archivo "${file}": ${err.message}`
      );
    }

    let parsed;
    try {
      parsed = JSON.parse(rawContent);
    } catch (err) {
      throw new Error(
        `JSON inválido en archivo "${file}": ${err.message}`
      );
    }

    if (!Array.isArray(parsed)) {
      throw new Error(
        `El archivo "${file}" debe contener un arreglo JSON, pero se encontró: ${typeof parsed}`
      );
    }

    for (let i = 0; i < parsed.length; i++) {
      const entry = parsed[i];
      validateEntry(entry, file, i);
      allEntries.push(entry);
    }

    log('info', `Cargado archivo KB: ${file} (${parsed.length} entradas)`);
  }

  log('info', `Base de conocimiento cargada: ${allEntries.length} entradas de ${files.length} archivos`);
  return allEntries;
}

/**
 * Valida que una entrada de la base de conocimiento tenga el esquema correcto.
 * @param {*} entry - Entrada a validar
 * @param {string} fileName - Nombre del archivo (para mensajes de error)
 * @param {number} index - Posición de la entrada en el arreglo (para mensajes de error)
 * @throws {Error} Si la entrada no cumple el esquema
 */
function validateEntry(entry, fileName, index) {
  if (entry === null || typeof entry !== 'object' || Array.isArray(entry)) {
    throw new Error(
      `Entrada inválida en "${fileName}", posición ${index}: se esperaba un objeto`
    );
  }

  // Validar palabras_clave
  if (!Array.isArray(entry.palabras_clave)) {
    throw new Error(
      `Entrada inválida en "${fileName}", posición ${index}: "palabras_clave" debe ser un arreglo`
    );
  }

  if (entry.palabras_clave.length === 0) {
    throw new Error(
      `Entrada inválida en "${fileName}", posición ${index}: "palabras_clave" no puede estar vacío`
    );
  }

  for (let j = 0; j < entry.palabras_clave.length; j++) {
    const kw = entry.palabras_clave[j];
    if (typeof kw !== 'string') {
      throw new Error(
        `Entrada inválida en "${fileName}", posición ${index}: "palabras_clave[${j}]" debe ser un string, se encontró: ${typeof kw}`
      );
    }
    if (kw.trim() === '') {
      throw new Error(
        `Entrada inválida en "${fileName}", posición ${index}: "palabras_clave[${j}]" no puede ser un string vacío`
      );
    }
  }

  // Validar respuesta
  if (typeof entry.respuesta !== 'string') {
    throw new Error(
      `Entrada inválida en "${fileName}", posición ${index}: "respuesta" debe ser un string, se encontró: ${typeof entry.respuesta}`
    );
  }

  if (entry.respuesta.trim() === '') {
    throw new Error(
      `Entrada inválida en "${fileName}", posición ${index}: "respuesta" no puede ser un string vacío`
    );
  }
}

module.exports = { loadKnowledgeBase };
