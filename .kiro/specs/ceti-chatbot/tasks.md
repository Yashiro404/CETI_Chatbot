# Plan de Implementación: Chatbot Web CETI

## Visión General

Implementación en dos fases. **Fase 1** entrega un chatbot funcional sin IA: backend modular, búsqueda por palabras clave, SQLite, y frontend con buena UX. **Fase 2** agrega IA (Groq/OpenAI) y mejoras progresivas.

---

## FASE 1 — MVP Funcional

- [x] 1. Configuración del proyecto e infraestructura base
  - [x] 1.1 Crear `package.json` con dependencias (express, better-sqlite3, dotenv) y devDependencies (jest), scripts `start` y `test`
    - _Requisitos: 10.1_
  - [x] 1.2 Crear `config.js` que cargue variables de entorno desde `.env` y exporte el objeto Config
    - Incluir: port, kbPath, fallbackMessage (aiEnabled en false por defecto)
    - _Requisitos: 7.3_
  - [x] 1.3 Crear `.env` y `.env.example` con valores por defecto funcionales para Raspberry Pi
    - _Requisitos: 7.3, 10.2_
  - [x] 1.4 Crear `modules/logger.js` con función `log(level, message)` que imprima `[ISO_TIMESTAMP] [LEVEL] message`
    - Soportar niveles: info, warn, error
    - _Requisitos: 11.1, 11.2, 11.3_

- [x] 2. Módulos de procesamiento de texto
  - [x] 2.1 Implementar `modules/sanitizer.js` con función `sanitize(input)` que elimine etiquetas HTML y caracteres de control
    - Preservar letras, números, espacios y puntuación básica
    - _Requisitos: 9.1_
  - [x] 2.2 Implementar `modules/normalizer.js` con función `normalize(input)`
    - Transformaciones en orden: minúsculas → eliminar acentos (NFD) → solo letras/números/espacios → colapsar espacios
    - _Requisitos: 3.1, 3.2, 3.3_
  - [x] 2.3 Escribir tests básicos para `sanitizer.js` y `normalizer.js`
    - sanitizer: `<script>alert</script>` → `alert`, texto normal preservado
    - normalizer: "Inscripción" → "inscripcion", "¿Cómo?" → "como"
    - _Requisitos: 3.1, 3.2, 9.1_

- [x] 3. Base de conocimiento
  - [x] 3.1 Implementar `modules/kbLoader.js` con función `loadKnowledgeBase(kbPath)` que cargue archivos JSON del directorio
    - Validación mínima: que el JSON sea válido y que cada entrada tenga `palabras_clave` y `respuesta`
    - Reportar error descriptivo si un archivo falla
    - _Requisitos: 5.1, 5.2, 5.3, 5.4_
  - [x] 3.2 Crear archivos JSON en `knowledge-base/` con contenido real del CETI
    - `inscripciones.json` — fechas, proceso, convocatoria
    - `carreras.json` — ingenierías disponibles, duración, perfil
    - `costos.json` — cuotas, becas, formas de pago
    - `requisitos.json` — documentos, examen de admisión
    - `ubicacion.json` — campus, horarios, contacto
    - Mínimo 3–4 entradas por archivo con `palabras_clave` y `respuesta`
    - _Requisitos: 5.1, 5.2_

- [x] 4. Motor de búsqueda
  - [x] 4.1 Implementar `modules/searchEngine.js` con función `search(normalizedText, knowledgeBase)`
    - Dividir texto en palabras, contar coincidencias con `palabras_clave` de cada entrada (también normalizadas)
    - Retornar entrada con mayor score; si score es 0, retornar `{ found: false }`
    - _Requisitos: 4.1, 4.2, 4.3_
  - [x] 4.2 Escribir tests básicos para `searchEngine.js`
    - Casos: coincidencia exacta, coincidencia parcial, sin coincidencia
    - _Requisitos: 4.1, 4.2, 4.3_

- [x] 5. Registro de interacciones y métricas
  - [x] 5.1 Implementar `modules/chatLogger.js` con better-sqlite3
    - Crear tabla `chat_logs` automáticamente si no existe
    - Función `logInteraction(pregunta, respuesta)` con consultas parametrizadas
    - Si falla la escritura, registrar error en log pero NO interrumpir la respuesta al usuario
    - _Requisitos: 6.1, 6.2, 6.3, 6.4, 9.2_
  - [x] 5.2 Agregar columna `encontrada` (boolean) a `chat_logs` para registrar si la respuesta fue local o fallback
    - Permite identificar preguntas sin respuesta para mejorar la KB
    - _Requisitos: 6.1_
  - [x] 5.3 Escribir tests básicos para `chatLogger.js`
    - Casos: inserción exitosa guarda los datos correctos, error de DB no interrumpe el flujo
    - _Requisitos: 6.1, 6.3_

- [x] 6. Módulo Fallback
  - [x] 6.1 Implementar `modules/fallback.js` con función `handleFallback(userMessage, config)`
    - Si `config.aiEnabled` es false → retornar `config.fallbackMessage` directamente
    - Si `config.aiEnabled` es true → delegar al Módulo IA (Fase 2)
    - _Requisitos: 7.1, 7.2, 7.3_

- [x] 7. API REST y servidor
  - [x] 7.1 Implementar `routes/chat.js` con endpoint POST `/chat` que orqueste el pipeline completo
    - Validar presencia y longitud de `mensaje` (máx. 500 chars)
    - Pipeline: sanitizar → normalizar → buscar → fallback si no hay resultado → registrar → responder
    - Errores: 400 para mensaje ausente/vacío/largo, 500 para errores internos (sin exponer detalles)
    - _Requisitos: 2.1, 2.2, 2.3, 2.4, 9.3_
  - [x] 7.2 Implementar `server.js` que configure Express, sirva `public/` como estáticos, monte `/chat`, cargue KB en memoria al inicio y registre en log el estado de arranque
    - _Requisitos: 10.1, 10.4, 11.3_
  - [x] 7.3 Escribir tests básicos para `routes/chat.js` usando supertest
    - Casos: mensaje válido → 200 con campo `respuesta`, mensaje vacío → 400, mensaje de 501 chars → 400
    - _Requisitos: 2.1, 2.2, 2.3, 9.3_

- [x] 8. Frontend
  - [x] 8.1 Crear `public/index.html` con estructura semántica del chat
    - Área de mensajes, campo de entrada, botón de envío
    - _Requisitos: 1.1_
  - [x] 8.2 Crear `public/styles.css` con diseño responsivo (breakpoint 768px)
    - Distinción visual clara entre mensajes de usuario y bot
    - _Requisitos: 1.4_
  - [x] 8.3 Crear `public/app.js` con lógica completa del chat
    - Envío con Enter o clic en botón; deshabilitar envío con campo vacío
    - Renderizar mensajes en orden cronológico
    - Mostrar indicador "Escribiendo..." mientras espera respuesta del backend
    - _Requisitos: 1.1, 1.2, 1.3, 1.5, 1.6_

- [x] 9. Script de inicialización y verificación final
  - [x] 9.1 Crear script `scripts/init.js` que inicialice la DB y verifique que la KB carga correctamente
    - Ejecutable con `node scripts/init.js` antes del primer arranque
    - _Requisitos: 6.4, 5.4_
  - [x] 9.2 Verificar flujo completo end-to-end: usuario escribe → backend responde → se guarda en DB → aparece en chat
    - Ejecutar `npm test` y confirmar que todos los tests pasan
    - _Requisitos: 1.5, 2.1, 2.2_

---

## FASE 2 — IA y Mejoras (después del MVP)

- [x]* 10. Módulo IA con RAG simplificado
  - [x]* 10.1 Implementar `modules/aiModule.js` con función `generateResponse(userMessage, knowledgeBase, config)`
    - Seleccionar las N entradas más relevantes de la KB como contexto (RAG simplificado)
    - Enviar contexto + mensaje a API externa (Groq o OpenAI) con timeout de 10s
    - Si timeout o error → lanzar error para que fallback maneje
    - _Requisitos: 8.1, 8.2, 8.3, 8.4_
  - [x]* 10.2 Actualizar `fallback.js` para delegar a `aiModule` cuando `AI_ENABLED=true`
    - _Requisitos: 7.2, 8.5_
  - [x]* 10.3 Agregar `AI_ENABLED`, `AI_PROVIDER`, `AI_API_KEY`, `AI_MODEL` a `.env.example`
    - _Requisitos: 8.5_

- [x]* 11. Mejoras de UX y métricas
  - [x]* 11.1 Agregar endpoint GET `/stats` que retorne conteo de preguntas frecuentes y preguntas sin respuesta desde `chat_logs`
  - [x]* 11.2 Mejorar frontend con timestamps en mensajes y scroll automático al último mensaje
  - [x]* 11.3 Agregar sugerencias de preguntas frecuentes en el mensaje de bienvenida del chatbot

---

## Notas

- Las tareas marcadas con `*` son opcionales (Fase 2)
- Fase 1 es suficiente para una demo funcional y académica
- Los tests son básicos (2–3 casos por módulo), sin property-based testing
- Property-based testing y tests de rendimiento quedan como mejora futura documentada en el diseño
