# Documento de Requisitos — Chatbot Web CETI

## Introducción

Este documento define los requisitos para un chatbot web destinado al Centro de Enseñanza Técnica Industrial (CETI). El sistema orientará a estudiantes actuales y prospectos respondiendo preguntas frecuentes sobre inscripciones, carreras, costos, requisitos y ubicación. La solución debe funcionar en un entorno local (Raspberry Pi), ser modular, escalable hacia integración con inteligencia artificial, y registrar todas las interacciones para análisis posterior.

## Glosario

- **Chatbot**: Aplicación web conversacional que recibe mensajes del usuario y devuelve respuestas relevantes.
- **Frontend**: Interfaz de usuario tipo chat construida con HTML, CSS y JavaScript.
- **Backend**: Servidor Node.js con Express que expone una API REST para el procesamiento de mensajes.
- **Base_de_Conocimiento**: Conjunto de archivos JSON estructurados por categorías (inscripciones, carreras, costos, requisitos, ubicación) que contienen las respuestas del chatbot.
- **Registro_de_Interacciones**: Tabla `chat_logs` en SQLite que almacena cada interacción (id, pregunta, respuesta, fecha).
- **Normalizador**: Módulo del Backend que transforma el texto del usuario a una forma canónica (minúsculas, sin acentos, sin caracteres especiales) para facilitar la búsqueda.
- **Motor_de_Búsqueda**: Módulo del Backend que busca coincidencias entre el texto normalizado del usuario y las palabras clave definidas en la Base_de_Conocimiento.
- **Fallback**: Respuesta genérica que el Chatbot devuelve cuando el Motor_de_Búsqueda no encuentra coincidencias y no hay servicio de IA disponible.
- **Módulo_IA**: Componente opcional del Backend que envía contexto relevante a una API externa de inteligencia artificial (Groq, OpenAI) para generar respuestas dinámicas.
- **RAG_Simplificado**: Estrategia donde el Módulo_IA selecciona fragmentos relevantes de la Base_de_Conocimiento y los envía como contexto a la API de IA, en lugar de enviar todo el contenido.

## Requisitos

### Requisito 1: Interfaz de Chat

**Historia de Usuario:** Como estudiante o prospecto del CETI, quiero una interfaz de chat intuitiva y responsiva, para poder hacer preguntas desde cualquier dispositivo.

#### Criterios de Aceptación

1. THE Frontend SHALL presentar una interfaz tipo chat con un área de mensajes, un campo de entrada de texto y un botón de envío.
2. THE Frontend SHALL mostrar los mensajes del usuario y las respuestas del Chatbot en orden cronológico dentro del área de mensajes.
3. THE Frontend SHALL mantener un historial visual de la conversación durante la sesión activa del usuario.
4. THE Frontend SHALL adaptar su diseño a pantallas de escritorio (ancho mayor a 768px) y pantallas móviles (ancho igual o menor a 768px).
5. WHEN el usuario presiona el botón de envío o la tecla Enter, THE Frontend SHALL enviar el contenido del campo de entrada al Backend mediante una petición HTTP POST al endpoint `/chat`.
6. WHEN el campo de entrada está vacío, THE Frontend SHALL deshabilitar el envío del mensaje.

### Requisito 2: API REST de Mensajes

**Historia de Usuario:** Como desarrollador del sistema, quiero una API REST clara y bien definida, para que el Frontend pueda comunicarse con el Backend de forma estructurada.

#### Criterios de Aceptación

1. THE Backend SHALL exponer un endpoint POST `/chat` que acepte un cuerpo JSON con el campo `mensaje` (tipo string).
2. WHEN el endpoint `/chat` recibe una petición válida, THE Backend SHALL responder con un objeto JSON que contenga el campo `respuesta` (tipo string).
3. IF el campo `mensaje` está ausente o vacío en la petición, THEN THE Backend SHALL responder con un código HTTP 400 y un mensaje de error descriptivo.
4. IF ocurre un error interno durante el procesamiento, THEN THE Backend SHALL responder con un código HTTP 500 y un mensaje de error genérico sin exponer detalles internos del sistema.

### Requisito 3: Normalización de Texto

**Historia de Usuario:** Como desarrollador del sistema, quiero que el texto del usuario sea normalizado antes de la búsqueda, para mejorar la precisión de las coincidencias.

#### Criterios de Aceptación

1. WHEN el Backend recibe un mensaje del usuario, THE Normalizador SHALL convertir el texto a minúsculas.
2. WHEN el Backend recibe un mensaje del usuario, THE Normalizador SHALL eliminar acentos y caracteres diacríticos del texto.
3. WHEN el Backend recibe un mensaje del usuario, THE Normalizador SHALL eliminar caracteres especiales conservando únicamente letras, números y espacios.
4. FOR ALL cadenas de texto válidas, normalizar y luego comparar con la cadena original normalizada SHALL producir un resultado idéntico (propiedad de idempotencia).

### Requisito 4: Búsqueda en Base de Conocimiento

**Historia de Usuario:** Como estudiante, quiero que el chatbot encuentre respuestas relevantes a mis preguntas, para obtener información precisa sobre el CETI.

#### Criterios de Aceptación

1. THE Motor_de_Búsqueda SHALL buscar coincidencias entre las palabras del texto normalizado del usuario y las palabras clave definidas en la Base_de_Conocimiento.
2. WHEN el Motor_de_Búsqueda encuentra una o más coincidencias, THE Motor_de_Búsqueda SHALL devolver la respuesta con mayor número de coincidencias de palabras clave.
3. WHEN el Motor_de_Búsqueda no encuentra coincidencias, THE Motor_de_Búsqueda SHALL indicar al Backend que no se encontró respuesta local.
4. THE Motor_de_Búsqueda SHALL completar la búsqueda en la Base_de_Conocimiento en menos de 1 segundo.

### Requisito 5: Estructura de la Base de Conocimiento

**Historia de Usuario:** Como administrador del sistema, quiero que el contenido del chatbot esté organizado en archivos JSON por categoría, para poder actualizar la información fácilmente.

#### Criterios de Aceptación

1. THE Base_de_Conocimiento SHALL organizar su contenido en archivos JSON separados por categoría: inscripciones, carreras, costos, requisitos y ubicación.
2. THE Base_de_Conocimiento SHALL definir cada entrada con los campos `palabras_clave` (arreglo de strings) y `respuesta` (string).
3. WHEN se agrega o modifica un archivo JSON en la Base_de_Conocimiento, THE Backend SHALL cargar los cambios sin requerir modificaciones en el código fuente.
4. THE Backend SHALL validar la estructura de los archivos JSON de la Base_de_Conocimiento al iniciar el servidor y reportar errores descriptivos en caso de formato inválido.
5. FOR ALL entradas válidas de la Base_de_Conocimiento, serializar a JSON y luego deserializar SHALL producir un objeto equivalente al original (propiedad de ida y vuelta).

### Requisito 6: Registro de Interacciones

**Historia de Usuario:** Como administrador del sistema, quiero que todas las interacciones se registren en una base de datos, para poder analizar las consultas más frecuentes.

#### Criterios de Aceptación

1. THE Registro_de_Interacciones SHALL almacenar cada interacción en la tabla `chat_logs` de SQLite con los campos: `id` (entero autoincremental), `pregunta` (texto del usuario), `respuesta` (texto del Chatbot) y `fecha` (marca de tiempo ISO 8601).
2. WHEN el Backend genera una respuesta para el usuario, THE Registro_de_Interacciones SHALL guardar la interacción antes de enviar la respuesta al Frontend.
3. IF ocurre un error al escribir en la base de datos SQLite, THEN THE Backend SHALL registrar el error en el log del servidor y continuar enviando la respuesta al usuario.
4. THE Registro_de_Interacciones SHALL crear la tabla `chat_logs` automáticamente al iniciar el servidor si la tabla no existe.

### Requisito 7: Mecanismo de Fallback

**Historia de Usuario:** Como estudiante, quiero recibir una respuesta útil incluso cuando el chatbot no encuentra información exacta, para no quedarme sin orientación.

#### Criterios de Aceptación

1. WHEN el Motor_de_Búsqueda no encuentra coincidencias y el Módulo_IA no está disponible, THE Chatbot SHALL responder con un mensaje de Fallback predefinido que sugiera al usuario reformular su pregunta o contactar directamente al CETI.
2. WHEN el Motor_de_Búsqueda no encuentra coincidencias y el Módulo_IA está disponible, THE Chatbot SHALL delegar la generación de respuesta al Módulo_IA.
3. THE Backend SHALL permitir configurar el mensaje de Fallback sin modificar el código fuente.

### Requisito 8: Integración con IA (Opcional)

**Historia de Usuario:** Como administrador del sistema, quiero que el chatbot pueda escalar a un servicio de IA externo, para ofrecer respuestas más naturales y contextuales cuando la base de conocimiento local no sea suficiente.

#### Criterios de Aceptación

1. WHERE el Módulo_IA está habilitado, THE Módulo_IA SHALL seleccionar fragmentos relevantes de la Base_de_Conocimiento usando la estrategia RAG_Simplificado antes de enviar la consulta a la API externa.
2. WHERE el Módulo_IA está habilitado, WHEN recibe una consulta, THE Módulo_IA SHALL enviar al servicio de IA externo únicamente el contexto relevante seleccionado y el mensaje del usuario.
3. WHERE el Módulo_IA está habilitado, IF la API externa no responde en un plazo de 10 segundos, THEN THE Módulo_IA SHALL cancelar la petición y devolver el mensaje de Fallback.
4. WHERE el Módulo_IA está habilitado, IF la API externa devuelve un error, THEN THE Módulo_IA SHALL registrar el error en el log del servidor y devolver el mensaje de Fallback.
5. THE Backend SHALL permitir habilitar o deshabilitar el Módulo_IA mediante una variable de configuración sin modificar el código fuente.

### Requisito 9: Sanitización de Entrada

**Historia de Usuario:** Como desarrollador del sistema, quiero que todas las entradas del usuario sean sanitizadas, para prevenir inyecciones de código y proteger la integridad del sistema.

#### Criterios de Aceptación

1. WHEN el Backend recibe un mensaje del usuario, THE Backend SHALL sanitizar la entrada eliminando etiquetas HTML y caracteres potencialmente peligrosos antes de cualquier procesamiento.
2. WHEN el Backend construye consultas a la base de datos SQLite, THE Backend SHALL utilizar consultas parametrizadas para prevenir inyección SQL.
3. THE Backend SHALL rechazar mensajes que excedan los 500 caracteres de longitud, respondiendo con un código HTTP 400 y un mensaje de error descriptivo.

### Requisito 10: Optimización para Raspberry Pi

**Historia de Usuario:** Como administrador del sistema, quiero que la aplicación funcione eficientemente en una Raspberry Pi, para desplegar el chatbot en un entorno local de bajo costo.

#### Criterios de Aceptación

1. THE Backend SHALL servir los archivos estáticos del Frontend desde el mismo servidor Express, eliminando la necesidad de un servidor web adicional.
2. THE Backend SHALL funcionar sin conexión a internet para las búsquedas locales en la Base_de_Conocimiento.
3. THE Backend SHALL mantener un consumo de memoria inferior a 100 MB durante operación normal.
4. WHEN el servidor inicia, THE Backend SHALL cargar la Base_de_Conocimiento en memoria para minimizar operaciones de lectura en disco.

### Requisito 11: Logging del Servidor

**Historia de Usuario:** Como desarrollador del sistema, quiero un sistema de logging básico, para poder diagnosticar problemas y monitorear el comportamiento del chatbot.

#### Criterios de Aceptación

1. THE Backend SHALL registrar en el log del servidor cada petición recibida con la marca de tiempo, el método HTTP y la ruta solicitada.
2. THE Backend SHALL registrar en el log del servidor los errores con nivel de severidad (info, warn, error) y un mensaje descriptivo.
3. WHEN el servidor inicia, THE Backend SHALL registrar en el log la versión del sistema, el puerto de escucha y el estado de carga de la Base_de_Conocimiento.
