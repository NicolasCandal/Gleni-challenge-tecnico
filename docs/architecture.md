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
| Mappers         | `backend/mappers/`           | Transformación entre capas (raw → dominio → DTO)    |
| Schemas         | `backend/schemas/`           | Validación Zod de entradas y salidas                |
| Middlewares     | `backend/middlewares/`       | Validación, rate limiting, manejo de errores        |
| Prompts         | `backend/prompts/`           | System prompt del agente con few-shots              |

## Endpoints disponibles

```
GET  /api/health                     → healthcheck
POST /api/chat                       → chat SSE (rate limited)
POST /api/messages/:id/feedback      → guardar feedback de un mensaje
GET  /api/sessions/:id/messages      → historial de mensajes
GET  /api/sessions/:id/executions    → ejecuciones de herramientas
```
