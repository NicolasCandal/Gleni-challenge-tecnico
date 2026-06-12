# Arquitectura del Sistema

## Flujo completo de una solicitud de chat

```
Cliente (React + Vite)
        │
        │  POST /api/chat { mensaje, conversationId? }
        ▼
┌─────────────────────────────────────────────────────────────┐
│                         Express App                         │
│                                                             │
│  rateLimitMiddleware (10 req/min por IP)                    │
│        │                                                    │
│  validar(EsquemaChat) — Zod middleware                      │
│        │                                                    │
│  chatController.chat()                                      │
│        │  establece SSE (Content-Type: text/event-stream)   │
│        │  crea conversationId si no viene en el body        │
└────────┼────────────────────────────────────────────────────┘
         │
         ▼
┌────────────────────────────────────────────────────────────────┐
│                       agentService.chat()                      │
│                                                                │
│  1. sessionService.addMessage(conversationId, 'user', texto)   │
│  2. sessionService.getHistory(conversationId)                  │
│  3. llamarOpenAI(historial, tools, onChunk)                    │
│       │                                                        │
│       │  ← stream SSE: chunks de texto llegan al cliente       │
│       │                                                        │
│  4. ¿tool_calls en la respuesta?                               │
│       ├── SÍ → ejecutarHerramienta(toolCall)                   │
│       │         │                                              │
│       │         │  mide latencia, captura tokens               │
│       │         │                                              │
│       │         ├── get_exchange_rates.manejador(input)        │
│       │         │       └── dolarapiClient.fetchExchangeRates()│
│       │         │               └── fetch dolarapi.com         │
│       │         │                   (fallback: bluelytics.com) │
│       │         │                                              │
│       │         └── generateReport.manejador(input)            │
│       │                 └── messageRepository                  │
│       │                 └── toolExecutionRepository            │
│       │                                                        │
│       │         persistir en tool_executions (Supabase)        │
│       │         segunda llamada OpenAI con resultado tool      │
│       │                                                        │
│       └── NO → continuar                                       │
│                                                                │
│  5. sessionService.addMessage(conversationId, 'assistant', …)  │
│  6. emitir evento SSE { tipo: 'fin', conversationId }          │
└────────────────────────────────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────────────────┐
│                    Supabase (PostgreSQL)              │
│                                                      │
│  conversations   messages   tool_executions   feedback│
│  ─────────────   ────────   ────────────────   ───────│
│  id (uuid)       id         id                id      │
│  created_at      conv_id    conv_id           message_id│
│                  role       tool_name         feedback │
│                  content    input (jsonb)     created_at│
│                  created_at output (jsonb)            │
│                             latency_ms               │
│                             tokens_used              │
│                             error                    │
│                             created_at               │
└──────────────────────────────────────────────────────┘
```

## Flujo de feedback de mensajes

```
Cliente (React + Vite)
        │
        │  POST /api/messages/:id/feedback { feedback: 'up' | 'down' }
        ▼
┌─────────────────────────────────────────────────────────────┐
│                         Express App                         │
│                                                             │
│  validar(EsquemaFeedback) — Zod middleware                  │
│        │                                                    │
│  messageController.registrarFeedback()                      │
└────────┼────────────────────────────────────────────────────┘
         │
         ▼
┌────────────────────────────────────────────────────────────────┐
│                    messageFeedbackRepository                   │
│                                                                │
│  upsert feedback by messageId                                  │
│  join/hydrate feedback when listing messages                   │
└────────┼──────────────────────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────────────────┐
│                    Supabase (PostgreSQL)              │
│                                                      │
│  feedback                                             │
│  ────────                                             │
│  id (uuid)                                             │
│  message_id (uuid)                                     │
│  feedback ('up' | 'down')                              │
│  created_at                                            │
└──────────────────────────────────────────────────────┘
```

## Capas y responsabilidades

| Capa            | Carpeta                  | Responsabilidad                                     |
|-----------------|--------------------------|-----------------------------------------------------|
| Rutas           | `backend/routes/`            | Mapeo de endpoints HTTP a controllers               |
| Controllers     | `backend/controllers/`       | Manejo de req/res, SSE, delegación al service       |
| Services        | `backend/services/`          | Lógica de negocio, orquestación del agente          |
| Tools           | `backend/tools/`             | Implementación de las herramientas del agente       |
| Repositories    | `backend/repositories/`      | Acceso a datos vía Supabase                         |
| Infrastructure  | `backend/infrastructure/`    | Clientes externos (OpenAI, dolarapi)                |
| DTOs            | `backend/dtos/`              | Forma de las respuestas (cliente/LLM) sin exponer columnas de DB |
| Mappers         | `backend/mappers/`           | Transformación entre capas (raw → dominio → DTO)    |
| Schemas         | `backend/schemas/`           | Validación Zod de entradas y salidas                |
| Middlewares     | `backend/middlewares/`       | Validación, rate limiting, manejo de errores        |
| Prompts         | `backend/prompts/`           | System prompt del agente con few-shots              |

## DTOs: contrato de salida

Las respuestas nunca devuelven la fila cruda de Supabase. Cada salida hacia el cliente (o hacia el LLM como resultado de una tool) se arma con una factory de `backend/dtos/`, que hace whitelist de campos y traduce el snake_case de la base a camelCase del dominio.

| DTO                     | Producido por                          | Consumido por         | Forma pública |
|-------------------------|----------------------------------------|-----------------------|---------------|
| `ChatDTO`               | `chatController` (stream SSE)          | Cliente (EventSource) | `{ tipo, ... }` por evento: `chunk`, `usage`, `tool_start`, `error`, `fin` |
| `MessageDTO`            | `sessionController.obtenerMensajes`    | Cliente               | `{ id, role, content, creadoEn, feedback }` |
| `MessageDTO` (feedback) | `messageController.registrarFeedback`  | Cliente               | `{ idMensaje, feedback }` |
| `ToolExecutionDTO`      | `sessionController.obtenerEjecuciones` | Cliente (ToolPanel)   | `{ id, herramienta, input, output, latenciaMs, tokensUsados, error, creadoEn }` |
| `ExchangeDTO`           | `get_exchange_rates`                   | Agente LLM / cliente  | cotizaciones + `conversion` (`referencia` / `operacion`) |
| `ReportDTO`             | `generate_session_report`              | Agente LLM            | métricas de la sesión |

Reglas que sigue la capa:

- **Whitelist explícito:** `MessageDTO` recibe la fila completa (`select('*')`) y devuelve solo 5 campos; una columna nueva en la DB no se filtra sola.
- **Sin estructura interna:** se omiten columnas que el cliente no necesita (ej. `conversation_id` en `ToolExecutionDTO`, ya presente en la URL) y se normalizan entidades crudas (la fila de `feedback` no expone `id` ni `created_at`).
- **camelCase en español** como convención única de los campos de salida, independiente del snake_case de Postgres.
- **Mappers** (`backend/mappers/`) traducen el dato crudo (fila de DB o respuesta de dolarapi) al DTO, separando esa transformación de la definición del DTO.

## Endpoints disponibles

```
GET  /api/health                     → healthcheck
POST /api/chat                       → chat SSE (rate limited)
POST /api/messages/:id/feedback      → guardar feedback de un mensaje
GET  /api/sessions/:id/messages      → historial de mensajes
GET  /api/sessions/:id/executions    → ejecuciones de herramientas
```
