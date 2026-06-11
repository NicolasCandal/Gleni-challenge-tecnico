# Asesor de Cambio de Divisas

**Demo:** [https://gleniproject.vercel.app/](https://gleniproject.vercel.app/)

Agente conversacional que consulta cotizaciones del dólar en Argentina en tiempo real y brinda recomendaciones sobre cuándo y dónde operar.

## El problema

El mercado cambiario argentino tiene múltiples tipos de dólar (oficial, blue, MEP, CCL, cripto) con precios que varían a lo largo del día. Comparar opciones, entender la brecha y decidir si conviene operar requiere cruzar varias fuentes de información manualmente. No existe un asistente que explique en lenguaje natural qué está pasando y qué conviene hacer.

## Público objetivo

Personas que necesitan comprar o vender dólares en Argentina y quieren entender el contexto del mercado sin ser expertos en economía ni seguir cuentas especializadas todo el día.

## Propuesta de valor

- Consulta cotizaciones en tiempo real de dolarapi.com (con fallback automático a bluelytics).
- Calcula spread, brecha contra el oficial y emite una señal de recomendación (comprar / esperar / neutral).
- Explica el resultado en lenguaje natural a través de un chat con streaming.
- Persiste el historial completo de la sesión y expone métricas de uso (latencia, tokens, herramientas invocadas).

## User stories

1. **Como usuario que quiere comprar dólares**, quiero preguntarle al asistente "¿cuál es el mejor tipo de cambio para comprar hoy?" y recibir una respuesta clara con los valores actuales y una recomendación, para no tener que buscar en múltiples sitios.

    - [ ] El asistente responde con al menos una cotización actualizada.
    - [ ] La respuesta incluye una recomendación clara entre comprar, esperar o neutral.
    - [ ] La consulta queda persistida en el historial de la sesión.

2. **Como usuario que sigue el mercado**, quiero poder preguntar "¿cómo está la brecha hoy comparada con la semana pasada?" y recibir un análisis en lenguaje natural, para entender el contexto sin interpretar números crudos.

    - [ ] El asistente explica la brecha en lenguaje natural.
    - [ ] La respuesta compara el valor actual con el tipo oficial.
    - [ ] El resultado conserva el contexto de la conversación.

3. **Como usuario que usa el chat con frecuencia**, quiero que el asistente recuerde la conversación de la sesión actual y pueda generarme un resumen de lo que consulté, para tener un registro de mis interacciones sin tener que repetir contexto.

    - [ ] El chat conserva los mensajes de la sesión actual.
    - [ ] El asistente puede resumir lo conversado sin perder el contexto.
    - [ ] El resumen se genera sin que el usuario repita información previa.

## Features bonus implementados

- Streaming SSE en el chat para mostrar la respuesta del asistente de forma incremental.
- Testing unitario y E2E para validar la lógica de negocio y el flujo de la API.
- Rate limiting en `/api/chat` para evitar abuso y proteger el backend.
- Observabilidad con logging de tools, incluyendo latencia y tokens por ejecución.
- Panel lateral de invocaciones para inspeccionar herramientas, payloads y resultados de cada turno.

## ¿Por qué estas tools/APIs?

- `dolarapi` porque es gratuita, no requiere API key y ofrece datos orientados al mercado argentino.
- `bluelytics` como fallback para mantener disponibilidad cuando `dolarapi` no responde o falla.
- `get_exchange_rates` porque encapsula la lógica de consulta, normalización y cálculo para que el agente no tenga que reconstruirla.
- `generate_session_report` porque permite resumir la sesión y persistir una salida útil sin acoplar esa tarea al flujo principal del chat.

## Diseño del prompt

- Contexto de dominio: define qué significa cada tipo de cambio, cómo leer la brecha y cómo interpretar una consulta de compra, venta o comparación.
- 7 ejemplos few-shot: cubren consulta simple, comparación de tipos, cálculo con monto, solicitud de reporte, explicación de brecha, recomendación y consulta ambigua.
- Regla anti-invención de cifras: el modelo no puede inventar valores; debe usar únicamente los números devueltos por la tool o pedir una nueva consulta si faltan datos.
- Política de decisión de tools: el agente debe llamar la tool correcta según la intención antes de responder, en lugar de resolver los cálculos por inferencia propia.
- Citado de fuente obligatorio: toda respuesta con cotizaciones debe citar `dolarapi.com` como fuente primaria y mencionar el fallback solo si fue necesario.

## Validación de outputs

- Zod en la entrada para validar `EsquemaRateTypes` y `EsquemaChat` antes de llegar a la lógica de negocio.
- Zod en la salida de la tool para validar `EsquemaSalidaCotizaciones` antes de exponer resultados al agente y al cliente.

## Decisiones técnicas y trade-offs

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

Los precios de compra y venta se definen desde la perspectiva de la casa de cambio: "compra" es lo que la casa paga cuando el usuario vende dólares; "venta" es lo que la casa cobra cuando el usuario compra dólares. Una sola cifra resulta ambigua dependiendo de la dirección de la operación.

Por eso `get_exchange_rates` devuelve dos valores cuando se pasa un monto: `referencia.resultado` (calculado siempre al precio de venta, que es el que citan medios y cotizaciones) y `operacion.resultado` (el neto real: precio de compra si el usuario vende USD, precio de venta si compra USD). Para ARS_A_USD ambos coinciden. El LLM tiene instrucción explícita en el system prompt de citar siempre los números que devuelve la tool, sin recalcular.

**Trade-off:** la respuesta es más compleja, pero elimina la ambigüedad y habilita al agente a diferenciar entre una consulta informativa y una operacional.

### Rate limiting en el endpoint de chat

Se aplica `express-rate-limit` con un límite de 10 requests/minuto por IP directamente en la ruta `/api/chat`. El mensaje de error es legible por el usuario.

**Trade-off:** el límite es fijo y no configurable por usuario. En producción convendría usar un store compartido (Redis) para que el límite funcione en múltiples instancias.

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
├── api/              → entrypoint para Vercel (importa src/app.js)
├── client/           → frontend React + TypeScript
├── docs/             → architecture.md, .env.example
├── src/
│   ├── app.js
│   ├── controllers/
│   ├── infrastructure/   → clientes externos (OpenAI, dolarapi)
│   ├── mappers/
│   ├── middlewares/
│   ├── prompts/
│   ├── repositories/
│   ├── routes/
│   ├── schemas/
│   ├── services/
│   └── tools/            → get_exchange_rates, generate_session_report
└── tests/
    ├── e2e/              → api.test.js, rateLimit.test.js
    ├── exchangeService.test.js
    ├── getExchangeRates.test.js
    └── generateReport.test.js
```

## Limitaciones conocidas y mejoras futuras

- **Tokens duplicados o inconsistentes**: hoy OpenAI reporta el consumo de tokens a nivel de turno completo, no por tool call individual. Se persiste una fila `_turno` con el total real y las filas de tools quedan con `tokens_used: null`. Mejora futura: normalizar métricas en una tabla separada (`turn_metrics`) para evitar duplicación y facilitar auditoría.
- **Rate limit en memoria**: el límite actual vive en proceso y no se comparte entre instancias. Mejora futura: moverlo a Redis para que el control de cuota sea consistente en múltiples despliegues.
- **Mensajes huérfanos**: si OpenAI falla después de persistir el mensaje del usuario, la conversación puede quedar incompleta. Mejora futura: agregar una estrategia de compensación/reconciliación para cerrar el turno o marcarlo explícitamente como fallido.
- **RLS de Supabase**: la seguridad depende de la configuración del proyecto y de las credenciales del servidor. Mejora futura: reforzar políticas de Row Level Security para separar mejor acceso público, servicio y administración.

## Configuración local

1. Clonar el repositorio.
2. Copiar `.env.example` a `src/.env` y completar las variables.
3. Instalar dependencias del backend: `npm install`
4. Instalar dependencias del frontend: `cd client && npm install`
5. Iniciar el backend: `npm run dev`
6. Iniciar el frontend: `cd client && npm run dev`

## Deploy en Vercel

1. Crear o abrir el proyecto en Vercel y vincular el repositorio.
2. Ir a `Settings` → `Environment Variables`.
3. Tomar como referencia el archivo `.env.example` del proyecto.
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
