# Asesor de Cambio de Divisas

![Tests](https://github.com/NicolasCandal/Gleni-challenge-tecnico/actions/workflows/test.yml/badge.svg)

**Demo:** [https://gleniproject.vercel.app/](https://gleniproject.vercel.app/)

Agente conversacional que consulta cotizaciones del dólar y monedas de América Latina en tiempo real, brinda recomendaciones sobre cuándo y dónde operar, y permite gestionar múltiples conversaciones independientes.

## El problema

El mercado cambiario argentino tiene múltiples tipos de dólar (oficial, blue, MEP, CCL, cripto) con precios que varían a lo largo del día. Comparar opciones, entender la brecha y decidir si conviene operar requiere cruzar varias fuentes de información manualmente. No existe un asistente que explique en lenguaje natural qué está pasando y qué conviene hacer.

## Público objetivo

Personas que necesitan comprar o vender dólares (o monedas regionales) en Argentina y quieren entender el contexto del mercado sin ser expertos en economía ni seguir cuentas especializadas todo el día.

## Propuesta de valor

- Consulta cotizaciones en tiempo real de dolarapi.com (con fallback automático a bluelytics).
- Calcula spread, brecha contra el oficial y emite una señal de recomendación (comprar / esperar / neutral) para los 7 tipos de dólar.
- Cotizaciones de 15 monedas: EUR, BRL, CLP, UYU con compra/venta reales (dolarapi.com); MXN, COP, PEN, PYG, BOB, VES, GTQ, HNL, NIO, CRC, DOP con tasa de referencia interbancaria (fawazahmed0/exchange-api).
- Conversiones en ambas direcciones (moneda extranjera → pesos y pesos → moneda extranjera) con precio de referencia y precio operacional diferenciados.
- Explica el resultado en lenguaje natural a través de un chat con streaming.
- Gestión de múltiples conversaciones con sidebar, títulos auto-generados por el LLM, renombrado inline y eliminación.
- Persiste el historial completo de la sesión y expone métricas de uso (latencia, tokens, herramientas invocadas).

## User stories

1. **Como usuario que quiere comprar dólares**, quiero preguntarle al asistente "¿cuál es el mejor tipo de cambio para comprar hoy?" y recibir una respuesta clara con los valores actuales y una recomendación, para no tener que buscar en múltiples sitios.

    - [ ] El asistente responde con al menos una cotización actualizada.
    - [ ] La respuesta incluye una recomendación clara entre comprar, esperar o neutral.
    - [ ] La consulta queda persistida en el historial de la sesión.

2. **Como usuario que sigue el mercado**, quiero poder preguntar "¿cómo está la brecha hoy y qué tipo de cambio conviene?" y recibir un análisis en lenguaje natural, para entender el contexto sin interpretar números crudos.

    - [ ] El asistente explica la brecha contra el dólar oficial en lenguaje natural.
    - [ ] La respuesta compara los distintos tipos de cambio disponibles.
    - [ ] El resultado conserva el contexto de la conversación.

3. **Como usuario que usa el chat con frecuencia**, quiero que el asistente recuerde la conversación de la sesión actual y pueda generarme un resumen de lo que consulté, para tener un registro de mis interacciones sin tener que repetir contexto.

    - [ ] El chat conserva los mensajes de la sesión actual.
    - [ ] El asistente puede resumir lo conversado sin perder el contexto.
    - [ ] El resumen se genera sin que el usuario repita información previa.

## Features implementados

- Streaming SSE en el chat para mostrar la respuesta del asistente de forma incremental.
- Testing unitario y E2E para validar la lógica de negocio y el flujo de la API.
- Rate limiting en `/api/chat` para evitar abuso y proteger el backend.
- Sistema de feedback para calificar respuestas con pulgar arriba/abajo y persistir la señal en Supabase.
- Observabilidad con logging de tools, incluyendo latencia y tokens por ejecución.
- Panel lateral de invocaciones para inspeccionar herramientas, payloads y resultados de cada turno.
- Multi-step reasoning: el agente encadena múltiples llamadas a tools en un mismo turno cuando la consulta lo requiere, resolviendo la intención completa sin intervención adicional del usuario.
- **Múltiples conversaciones**: sidebar con lista de sesiones, títulos auto-generados por el LLM en el primer intercambio, persistidos en Supabase. Eliminación con actualización optimista del estado.
- **Renombrado de conversaciones**: doble-click o ícono de edición en el sidebar activa un input inline; Enter/blur guarda, Escape cancela. Persiste vía `PATCH /api/conversations/:id`.
- **Indicador de escritura**: animación de tres puntos rebotando mientras el modelo procesa antes del primer chunk de respuesta.
- **Soporte multi-moneda**: 7 tipos de dólar + 4 monedas con cotización oficial argentina (EUR/BRL/CLP/UYU) + 11 monedas con tasa de referencia interbancaria (MXN/COP/PEN/PYG/BOB/VES/GTQ/HNL/NIO/CRC/DOP).

## Capturas de pantalla

<div align="center">
  <table>
    <tr>
      <th>Tool A – Cotizaciones</th>
      <th>Tool B – Reporte de sesión</th>
      <th>Modo oscuro</th>
    </tr>
    <tr>
      <td align="center"><img src="docs/screenshots/Tool%20A.png" width="280"/></td>
      <td align="center"><img src="docs/screenshots/Tool%20B.png" width="280"/></td>
      <td align="center"><img src="docs/screenshots/Modo%20oscuro.png" width="280"/></td>
    </tr>
  </table>
</div>

## Mapeo de capacidades LLM del enunciado

- **Capacidad b:** responder consultas sobre cotizaciones y comparaciones del mercado, usando `get_exchange_rates` para dólar y `get_latam_rate` para monedas regionales. Ambas tools normalizan datos, calculan spread y devuelven una respuesta clara. `get_exchange_rates` agrega brecha y señal de recomendación.
- **Capacidad c:** generar un resumen o reporte de la sesión, usando `generate_session_report` para condensar el historial conversacional y persistir una salida útil.

## ¿Por qué estas tools/APIs?

- `dolarapi` porque es gratuita, no requiere API key y ofrece datos orientados al mercado argentino con compra y venta reales.
- `bluelytics` como fallback para mantener disponibilidad cuando `dolarapi` no responde o falla.
- `fawazahmed0/exchange-api` para las monedas LATAM que `dolarapi` no cubre (MXN, COP, PEN, etc.): es gratuita, sin API key, actualiza diariamente y tiene su propio fallback CDN. Devuelve tasa de referencia interbancaria (sin compra/venta diferenciados), lo que se informa al usuario en la respuesta.
- `get_exchange_rates` porque encapsula la lógica de consulta, normalización y cálculo para el dólar de modo que el agente no tenga que reconstruirla.
- `get_latam_rate` porque unifica en una sola interfaz las 15 monedas regionales/europeas, independientemente de si vienen de dolarapi o fawazahmed0. El agente no necesita conocer la fuente: siempre llama a la misma tool con el parámetro `currency`.
- `generate_session_report` porque permite resumir la sesión y persistir una salida útil sin acoplar esa tarea al flujo principal del chat.

## Diseño del prompt

- Contexto de dominio: define qué significa cada tipo de cambio, las dos fuentes de monedas regionales y sus diferencias, cómo leer brecha/spread y cómo interpretar una consulta de compra, venta o comparación.
- 9 ejemplos few-shot: cubren cotización de dólar, conversión USD/ARS, cotización EUR, conversión MXN→ARS, conversión ARS→COP, cotización PEN, rechazo de moneda no soportada, recomendación y tema fuera de dominio.
- Regla anti-invención de cifras: el modelo no puede inventar valores; debe usar únicamente los números devueltos por las tools.
- Política de decisión de tools: el agente llama la tool correcta (`get_exchange_rates` para USD, `get_latam_rate` con el `currency` correcto para el resto) antes de responder, en lugar de resolver los cálculos por inferencia propia.
- Distinción de fuente obligatoria: para monedas del grupo fawazahmed0, el agente siempre aclara que es tasa de referencia interbancaria, no cotización de casa de cambio argentina.
- Citado de fuente y timestamp obligatorio en toda respuesta con datos de mercado.

## Validación de outputs

- Zod en la entrada para validar `EsquemaRateTypes` y `EsquemaChat` antes de llegar a la lógica de negocio.
- Zod en la salida de `get_exchange_rates` (`EsquemaSalidaCotizaciones`) y `get_latam_rate` (`EsquemaSalidaLatam`) antes de exponer resultados al agente y al cliente.

## Decisiones técnicas y trade-offs

### DTOs para la salida de la API

Toda respuesta que sale del backend hacia el cliente (o hacia el LLM como resultado de una tool) se construye con una factory en `backend/dtos/`, en lugar de devolver la fila cruda de Supabase. El objetivo es transportar datos entre capas sin filtrar la estructura interna de la base.

- **`MessageDTO`**: `crearMensajeDTO` hace whitelist de `id`, `role`, `content`, `creadoEn` y `feedback` sobre el `select('*')` del repositorio, descartando cualquier otra columna. `crearFeedbackDTO` normaliza la fila de `feedback` a `{ idMensaje, feedback }` para no exponer `id` ni `created_at`.
- **`ToolExecutionDTO`**: expone solo los campos que consume el panel del cliente y omite `conversation_id` (ya viaja en la URL del endpoint).
- **`ChatDTO`**: factories de los eventos SSE (`chunk`, `usage`, `tool_start`, `error`, `fin`); desacoplan el formato de wire del controller.
- **`ExchangeDTO`** y **`ReportDTO`**: forma de salida de las tools `get_exchange_rates` y `generate_session_report` antes de devolverla al agente.
- **`ConversationDTO`**: forma de salida del endpoint `GET /api/conversations` con `id`, `titulo` y `creadoEn`.

Los **mappers** (`backend/mappers/`) son el puente entre el dato crudo (fila de DB o respuesta de dolarapi) y el DTO: `messageMapper` y `exchangeMapper` aíslan esa traducción de la definición del DTO.

**Convención:** los campos de salida usan camelCase en español (`creadoEn`, `latenciaMs`, `tokensUsados`, `idMensaje`), nunca el snake_case de las columnas de Postgres.

**Trade-off:** una capa extra de indirección y factories por mantener; a cambio, el cliente nunca ve columnas internas y el renombrado de un campo de salida queda en un solo lugar.

### CommonJS en lugar de ESM

El proyecto usa `@babel/preset-env` con Jest. ESM nativo hubiera requerido configuración adicional de Jest (`--experimental-vm-modules`) o un transpilador extra. CommonJS (`require`/`module.exports`) funciona sin fricción con el toolchain existente.

**Trade-off:** no se puede usar `import` nativo sin un paso de build.

### Streaming SSE: callback desde el service, no desde el controller

El controller establece el stream SSE y pasa un callback `onChunk(texto)` al `agentService`. El service llama al callback por cada fragmento de texto sin saber nada de HTTP.

**Trade-off:** el service recibe un parámetro extra, pero la separación de responsabilidades se mantiene limpia. La alternativa (stream directo desde el controller) viola SRP.

### Persistencia antes de responder al cliente

Los mensajes se persisten en Supabase antes de enviarle la respuesta al usuario. La inserción en `tool_executions` está en un bloque `try/catch` que solo loguea en consola para que un fallo de persistencia no interrumpa la respuesta.

**Trade-off:** si OpenAI falla después de persistir el mensaje del usuario, ese mensaje queda huérfano en la conversación; se prioriza no perder la entrada del usuario ni bloquear el flujo, aunque el historial pueda quedar incompleto hasta que se implemente una compensación/reconciliación posterior.

### Tests con guards de Supabase

Los tests E2E verifican al inicio si Supabase está disponible. Si no lo está (ej. entorno sin red o con proxy corporativo), los tests dependientes de DB se omiten con `console.warn` en lugar de fallar.

**Trade-off:** cobertura reducida en entornos aislados, pero el test suite no bloquea el pipeline por razones de infraestructura.

### Conversión dual: referencia vs. operación

Los precios de compra y venta se definen desde la perspectiva de la casa de cambio: "compra" es lo que la casa paga cuando el usuario vende; "venta" es lo que la casa cobra cuando el usuario compra. Una sola cifra resulta ambigua dependiendo de la dirección de la operación.

Por eso `get_exchange_rates` y `get_latam_rate` (para monedas con compra/venta reales) devuelven dos valores cuando se pasa un monto: `referencia.resultado` (al precio de venta, el que citan medios) y `operacion.resultado` (el neto real según la dirección). Para las monedas de fawazahmed0 (compra == venta), ambos coinciden y se informa uno solo.

**Trade-off:** la respuesta es más compleja, pero elimina la ambigüedad y habilita al agente a diferenciar entre una consulta informativa y una operacional.

### Dos fuentes para monedas regionales

`latamCurrencyClient` rutea entre dos fuentes según el código de moneda: dolarapi (EUR/BRL/CLP/UYU, cache 45 s, con compra/venta) y fawazahmed0 (resto de LATAM, cache 6 h, tasa única). Desde el punto de vista del tool `get_latam_rate`, la interfaz es uniforme: siempre recibe `{ datos: { moneda, nombre, compra, venta, fechaActualizacion }, fuente, esTasaReferencia }`. La distinción solo impacta en el campo `nota` y en el `spread` (0 para fawaz).

**Trade-off:** el agente necesita comunicar la diferencia al usuario (tasa de referencia vs. cotización oficial), lo que se resuelve con la regla explícita en el prompt y el campo `nota` en la respuesta.

### Triple sistema de theming en el frontend

El frontend combina tres capas de estilo: **MUI ThemeProvider** (paleta `dark`/`light` para componentes MUI), **clases `dark:` de Tailwind** (activadas por la clase `dark` en `<html>`) y **prop `sx`** para overrides puntuales. Ambos sistemas se sincronizan a través del hook `useDarkMode` en `App.tsx`.

**Trade-off:** depurar un problema visual requiere revisar tres lugares. El triple sistema surgió de agregar MUI sobre una base Tailwind existente; una reescritura a un único sistema eliminaría la ambigüedad pero implicaría refactorizar todos los componentes.

### Rate limiting en el endpoint de chat

Se aplica `express-rate-limit` con un límite de 10 requests/minuto por IP directamente en la ruta `/api/chat`. El mensaje de error es legible por el usuario.

**Trade-off:** el límite es fijo y no configurable por usuario. En producción convendría usar un store compartido (Redis) para que el límite funcione en múltiples instancias.

### Restricción de origen en CORS

El origen permitido se resuelve en tiempo de arranque desde la variable de entorno `CORS_ORIGIN`. Si no está definida, en desarrollo se permite `http://localhost:5173` (Vite) y en producción se bloquea cualquier origen (`false`), forzando a configurar la variable explícitamente antes de desplegar.

**Trade-off:** requiere setear `CORS_ORIGIN` en Vercel para que el frontend pueda comunicarse con el backend; a cambio, se evita dejar `*` en producción.

### Registro centralizado de tools con inyección de contexto

Las tools se registran en `backend/tools/index.js`, que exporta un único array del cual se derivan tanto el mapa de manejadores como las definiciones para OpenAI. Todos los manejadores reciben la firma `manejador(entrada, contexto)`. Agregar una tool nueva es crear su archivo y sumarla al índice, sin tocar `agentService` (principio Open/Closed).

### Eventos SSE como DTOs desde el service

`agentService` emite siempre eventos tipados creados por `ChatDTO` en lugar de strings y objetos ad-hoc. El controller quedó como un pipe que escribe al stream sin hacer dispatch por tipo. El contrato de eventos vive en un solo lugar.

**Trade-off:** un nivel más de indirección, a cambio de un contrato explícito y un controller sin lógica.

### Cache TTL en memoria para cotizaciones

`dolarapiClient` y `latamCurrencyClient` cachean las respuestas de las APIs externas (45 s para dolarapi, 6 h para fawazahmed0). Reduce latencia percibida, protege contra rate limits de la fuente y baja la dependencia de su disponibilidad.

**Trade-off:** las cotizaciones pueden estar desfasadas hasta el TTL elegido; el cache vive en proceso y no se comparte entre instancias.

### Timeout en la llamada a OpenAI

La llamada de streaming usa `AbortSignal.timeout(30000)` para que un stream colgado no deje la función serverless bloqueada hasta el timeout de plataforma.

### Monolito modular (por qué no microservicios)

Se eligió deliberadamente un monolito modular por la escala del proyecto. La separación en capas deja costuras de servicio claras: el módulo de cotizaciones podría extraerse como servicio independiente sin tocar el agente. El backend es stateless salvo el rate limiter y la configuración está externalizada por env vars.

### Streaming de OpenAI extraído a infrastructure

El parseo del protocolo de streaming vive en `backend/infrastructure/openaiStreamClient.js`. `agentService` quedó como puro orquestador del loop conversacional: no conoce el protocolo del proveedor, solo consume eventos tipados.

**Trade-off:** un módulo más de infraestructura, a cambio de poder cambiar de proveedor de LLM o testear el protocolo de streaming de forma aislada sin tocar la lógica del agente.

### Nota de seguridad

- **Estado de RLS en Supabase:** todas las tablas del proyecto están con RLS deshabilitado en este momento. Eso significa que no hay policies activas que limiten el acceso a nivel de fila dentro de Supabase.
- **Anon key solo server-side:** la `SUPABASE_ANON_KEY` se usa únicamente en el backend, dentro de `backend/infrastructure/supabaseClient.js`, para que el navegador nunca vea credenciales de acceso directo a la base. El frontend habla solo con nuestra API.
- **Implicación práctica:** si más adelante se habilita RLS, habrá que definir policies explícitas en Supabase antes de cualquier acceso desde el cliente.

## Stack

| Capa       | Tecnología                         |
|------------|------------------------------------|
| Backend    | Node.js + Express                  |
| Frontend   | React + TypeScript + Vite + Tailwind CSS |
| Base de datos | Supabase (PostgreSQL)           |
| LLM        | OpenAI API (gpt-4o-mini)           |
| Validación | Zod                                |
| Tests      | Jest + Supertest                   |
| Deploy     | Vercel                             |

## Estructura del proyecto

```
├── api/              → entrypoint para Vercel (importa backend/app.js)
├── client/           → frontend React + TypeScript
├── docs/             → architecture.md
├── .env.example      → variables de entorno de referencia
├── backend/
│   ├── app.js
│   ├── controllers/
│   ├── dtos/             → objetos de transferencia (salida a cliente/LLM)
│   ├── infrastructure/   → clientes externos (OpenAI, dolarapi, fawazahmed0, Supabase)
│   ├── mappers/
│   ├── middlewares/
│   ├── prompts/
│   ├── repositories/
│   ├── routes/
│   ├── schemas/
│   ├── services/
│   └── tools/            → get_exchange_rates, get_latam_rate, generate_session_report
└── tests/
    ├── e2e/              → api.test.js, rateLimit.test.js
    ├── agentService.test.js
    ├── exchangeService.test.js
    ├── generateReport.test.js
    ├── getExchangeRates.test.js
    └── getLatamRate.test.js
```

## Limitaciones conocidas y mejoras futuras

- **Tokens duplicados o inconsistentes**: hoy OpenAI reporta el consumo de tokens a nivel de turno completo, no por tool call individual. Se persiste una fila `_turno` con el total real y las filas de tools quedan con `tokens_used: null`. Mejora futura: normalizar métricas en una tabla separada (`turn_metrics`) para evitar duplicación y facilitar auditoría.
- **Rate limit en memoria**: el límite actual vive en proceso y no se comparte entre instancias. Mejora futura: moverlo a Redis para que el control de cuota sea consistente en múltiples despliegues.
- **Mensajes huérfanos**: si OpenAI falla después de persistir el mensaje del usuario, la conversación puede quedar incompleta. Mejora futura: agregar una estrategia de compensación/reconciliación para cerrar el turno o marcarlo explícitamente como fallido.
- **RLS de Supabase**: hoy todas las tablas están con RLS deshabilitado. Mejora futura: habilitar RLS y versionar policies para separar mejor acceso público, servicio y administración antes de exponer acceso directo desde el cliente.
- **Historial sin límite de crecimiento**: cada turno carga la conversación completa como contexto. En sesiones muy largas esto encarece cada request y puede superar el límite de contexto del modelo. Mejora futura: cap a los últimos N mensajes o resumen incremental del historial.
- **Acceso a conversaciones por posesión del UUID**: los endpoints de sesión no tienen autenticación; quien tenga el UUID de una conversación puede leerla. Los UUID v4 son impredecibles, lo cual es aceptable para una demo. Mejora futura: autenticación de usuarios y ownership de conversaciones.
- **Duplicación manual de tipos entre backend y frontend**: los DTOs del backend y las interfaces TypeScript del client se mantienen a mano y pueden divergir silenciosamente. Mejora futura: paquete de tipos compartidos o contrato OpenAPI generado.
- **Migración del backend a TypeScript (en progreso)**: se inició la migración del backend de JavaScript a TypeScript en la rama [`TypeScript`](https://github.com/NicolasCandal/Gleni-challenge-tecnico/tree/TypeScript). La migración quedó incompleta por la ventana de tiempo del challenge; se priorizó entregar la rama `main` estable, testeada y deployada. Mejora futura: completar la migración módulo a módulo empezando por schemas y DTOs.
- **Cache en memoria para fawazahmed0**: la tasa de referencia interbancaria se cachea 6 h en proceso. En producción con múltiples instancias, el cache no se comparte. Mejora futura: Redis compartido o un endpoint propio que hidrate el cache al arranque.

## Configuración local

1. Clonar el repositorio.
2. Copiar `.env.example` de la raíz del repo a `backend/.env` y completar las variables.
3. Instalar dependencias del backend: `npm install`
4. Instalar dependencias del frontend: `cd client && npm install`
5. Iniciar el backend: `npm run dev`
6. Iniciar el frontend: `cd client && npm run dev`

## Deploy en Vercel

1. Crear o abrir el proyecto en Vercel y vincular el repositorio.
2. Ir a `Settings` → `Environment Variables`.
3. Tomar como referencia el archivo `.env.example` ubicado en la raíz del proyecto.
4. Crear una variable por cada clave del ejemplo y pegar su valor correspondiente.
5. Guardar los cambios y volver a desplegar el proyecto para que Vercel aplique las nuevas env vars.
6. Verificar el deploy público y probar el chat con una consulta simple.

## Tests

```bash
npm test                    # todos los tests
npm test -- --testPathPattern=exchangeService   # solo un archivo
```

## Arquitectura

Ver [docs/architecture.md](docs/architecture.md) para el diagrama completo del flujo de una solicitud.
