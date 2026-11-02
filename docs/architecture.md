# Architecture

The application is a modular monolith: an Express backend serves a React client through a small HTTP API. An OpenAI-powered agent chooses from three tools, while server-side modules handle market data, calculations, and persistence.

## Chat request flow

```mermaid
sequenceDiagram
    participant User
    participant Client as React client
    participant API as Express API
    participant Agent as Agent service
    participant Model as OpenAI
    participant Tool as Registered tool
    participant Data as Market data provider
    participant DB as Supabase
    User->>Client: Ask a question
    Client->>API: POST /api/chat { message, conversationId? }
    API->>API: Apply request limit and validate input
    API->>Agent: chat(conversationId, message, onEvent)
    Agent->>DB: Create conversation if needed; save user message
    Agent->>DB: Load message history
    loop Up to four model completions
        Agent->>Model: System prompt, history, and tool definitions
        Model-->>Agent: Text deltas, tool calls, and usage
        Agent-->>API: chunk / usage events
        API-->>Client: SSE events
        opt Tools requested
            Agent-->>Client: tool_start event through the API
            Agent->>Tool: handler(input, { conversationId })
            Tool->>Data: Fetch a quote if needed
            Data-->>Tool: Provider response or cached data
            Tool-->>Agent: Validated tool result
            Agent->>DB: Save execution and completion usage
        end
    end
    Agent->>DB: Save assistant message
    opt First exchange
        Agent->>Model: Generate a short English title
        Agent->>DB: Save title
    end
    Agent-->>API: Conversation and assistant message IDs; title
    API-->>Client: done event; close stream
```

A tool failure becomes a tool result with an error for the model to interpret. Execution-log failures are logged without interrupting the response. A failure in the main chat flow becomes an SSE `error` event after streaming has started.

## Responsibilities

| Layer | Location | Responsibility |
| --- | --- | --- |
| Routes | `backend/routes/` | Map endpoints to middleware and controllers |
| Controllers | `backend/controllers/` | Read requests, delegate work, and write HTTP/SSE responses |
| Services | `backend/services/` | Orchestrate conversations and calculate spreads, gaps, signals, and conversions |
| Tools | `backend/tools/` | Define the agent’s three capabilities and validate their results |
| Repositories | `backend/repositories/` | Read and write Supabase data |
| Infrastructure | `backend/infrastructure/` | Wrap OpenAI, Supabase, and market data providers |
| DTOs | `backend/dtos/` | Select fields for public and tool responses |
| Mappers | `backend/mappers/` | Prepare normalized quotes and partial-data metadata |
| Schemas | `backend/schemas/` | Validate configuration, requests, and tool outputs |
| Middleware | `backend/middlewares/` | Handle request limits, validation, and errors |
| Prompts | `backend/prompts/` | Define the assistant’s domain, tool policy, language, and examples |
| Client state | `client/src/hooks/useChat.ts` | Manage messages, streaming, feedback, and conversation actions |
| Client services | `client/src/services/` | Handle HTTP/SSE and browser storage compatibility |

The modules use functions and explicit data objects. Separation of responsibilities, a shared tool registry, and shared calculations provide the useful parts of SOLID and DRY without unnecessary abstractions. Controllers do not coordinate provider calls or query database internals directly.

## Agent tools

The original assignment mapped market-data questions and comparisons to capability **b**, and session summaries or reports to capability **c**. Its three user stories were:

1. As someone buying dollars, I want a current quote and a clear buy/wait/neutral signal without checking several sites. The query must remain in the session history.
2. As someone following the market, I want a plain-English explanation of the gap against the official rate and a comparison of available options, with conversation context preserved.
3. As a frequent user, I want the assistant to remember the current session and summarize it without asking me to repeat earlier information.

| Tool | Input | Output |
| --- | --- | --- |
| `get_exchange_rates` | Optional `rate_types`, `amount`, `direction` | Sorted dollar quotes, optional conversion, omitted quote names, warning, source, timestamp |
| `get_latam_rate` | Required `currency`; optional `amount`, `direction` | One currency quote, optional conversion, source, timestamp, reference-rate note |
| `generate_session_report` | No input fields; conversation ID injected as context | Query count, tool usage, average latency, requested rate types, errors, total executions |

`backend/tools/index.js` is the source for both OpenAI definitions and the handler lookup. The agent invokes each handler with `(input, { conversationId })`. It runs tool calls from the same completion concurrently and adds their results to the next model request.

The system prompt asks the model to use English, obtain market figures from tools, avoid forecasts, cite sources and timestamps, and distinguish exchange bureau quotes from interbank reference rates. Nine examples cover quotes, both conversion directions, unsupported currencies, signals, and unrelated questions.

## API contracts

All public field names are English. Deploy matching frontend and backend versions together when migrating from the original Spanish contract.

| Method and path | Input | Response |
| --- | --- | --- |
| `GET /api/health` | — | `{ status: "ok" }` |
| `POST /api/chat` | `{ message, conversationId? }` | SSE stream |
| `GET /api/conversations?ids=<comma-separated UUIDs>` | Query IDs | `{ conversations: Conversation[] }` |
| `PATCH /api/conversations/:id` | `{ title }` | `{ id, title }` |
| `DELETE /api/conversations/:id` | — | `204` |
| `GET /api/sessions/:id/messages` | — | `{ messages: Message[] }` |
| `GET /api/sessions/:id/executions` | — | `{ executions: ToolExecution[] }` |
| `POST /api/messages/:id/feedback` | `{ feedback: "up" \| "down" }` | `201`, `{ feedback: { messageId, feedback } }` |

Chat messages must contain 1–2,000 characters. Conversation titles are trimmed and limited to 100 characters. Session and conversation routes share UUID parameter validation. Invalid request bodies return `400`; the chat rate limiter returns `429` after ten requests per minute per IP.

### SSE events

The client reads a streamed POST response with `fetch` and a `ReadableStream` reader. Each event is sent as `data: <JSON>` followed by a blank line.

```ts
{ type: 'chunk', text: string }
{ type: 'usage', tokens: number }
{ type: 'tool_start', tool: string }
{ type: 'error', message: string, status: number }
{ type: 'done', conversationId: string, assistantMessageId: string, title: string | null }
```

Usage updates include interim character-based estimates and the actual usage reported at completion. Actual usage is accumulated across model completions in the turn.

### Public DTOs

```ts
Conversation = { id, title, createdAt }
Message = { id, role, content, createdAt, feedback }
ToolExecution = { id, tool, input, output, latencyMs, tokensUsed, error, createdAt }
DollarQuote = { rateType, name, buy, sell, updatedAt, spread, gap, signal }
CurrencyQuote = { currency, name, buy, sell, updatedAt, spread }
ConversionValues = {
  reference: { exchangeRate, result },
  transaction: { side, exchangeRate, result }
}
```

Dollar conversions add `amount`, `direction`, and `rateUsed`; other currency conversions add `amount`, `currency`, and `direction`. DTO factories select public fields explicitly, so new database columns are not exposed automatically.

## Calculation rules

- **Spread:** `(sell - buy) / buy * 100`. Dollar spreads are rounded to two decimals; other currency spreads use four decimals. A reference rate with equal buy and sell prices has a zero spread.
- **Gap:** `(sell - officialSell) / officialSell * 100`, rounded to two decimals. If the official quote is missing, every gap is `null`.
- **Wait signal:** spread exceeds the upper spread threshold, or a known gap exceeds the upper gap threshold.
- **Buy signal:** spread is below the lower spread threshold and a known gap is below the lower gap threshold.
- **Neutral signal:** all other cases. A missing official rate must never produce a buy signal just because JavaScript treats `null` as zero in numeric comparisons.
- **Quote ordering:** ascending sell price. A conversion without explicit rate types chooses the cheapest non-wholesale quote; an explicit wholesale request is honored.
- **Reference conversion:** always uses the sell price, multiplying when converting foreign currency to ARS and dividing in the reverse direction.
- **Transaction conversion:** uses the bureau’s buy price when the user sells foreign currency, and its sell price when the user buys it. Results are rounded to two decimals.

Both tools delegate conversion arithmetic to `conversionService`. They retain their own direction labels: `USD_TO_ARS` / `ARS_TO_USD` for dollars and `TO_ARS` / `FROM_ARS` for other currencies.

## Persistence

The application expects these Supabase tables. All IDs are UUIDs; timestamps are stored in `created_at`.

| Table | Columns used by the application |
| --- | --- |
| `conversations` | `id`, `titulo`, `created_at` |
| `messages` | `id`, `conversation_id`, `role`, `content`, `created_at` |
| `tool_executions` | `id`, `conversation_id`, `tool_name`, `input`, `output`, `latency_ms`, `tokens_used`, `error`, `created_at` |
| `feedback` | `id`, `message_id`, `feedback`, `created_at` |

`messages.conversation_id` and `tool_executions.conversation_id` reference conversations. `feedback.message_id` references messages and needs a unique constraint for upserts. Conversation deletion relies on database foreign-key cascades to remove dependent records. Provision these tables and relationships before running the app; a schema migration is not included in the repository.

Tool `input` and `output` store JSON payloads. Tool execution rows have `tokens_used: null`. Separate `_turn` rows store provider usage for each model completion and are excluded from execution lists and session reports. Historical `_turno` rows are also excluded.

The existing `titulo` column is intentionally retained for database compatibility. The repository selects it as `title` and maps title updates back to that column. This Spanish identifier does not escape the persistence boundary.

The backend uses the Supabase anon key, and the browser talks only to the application API. The original project had row-level security disabled. Current database policies must be checked in the target Supabase project; they cannot be established from source code alone. There is no application authentication or per-user ownership check.

## Compatibility boundaries

- **Market providers:** dolarapi and Bluelytics require Spanish field names and dollar identifiers. Adapters map them into English data before the business logic runs. Currency codes and provider URLs are unchanged.
- **Configuration:** English threshold variables take precedence, with support for the four original Spanish names through `thresholdSettings`.
- **Browser storage:** old conversation keys and `titulo` / `creadoEn` metadata are migrated to English keys and fields. IDs and historical message/title text are preserved. Existing rate-limit cooldowns are also recognized.
- **Database:** the existing title column and historical token marker remain supported; no remote data is rewritten by the translation.

## Operational trade-offs

The backend uses CommonJS, matching its Jest setup. Vercel serves the client and routes API traffic through a serverless entry point. Local development uses Vite’s proxy.

Quote caches and the request limiter live in memory. Dollar and regional buy/sell quotes have a configurable 45-second default TTL; daily interbank rates use six hours. Instances do not share these caches or rate-limit counters.

The OpenAI stream client applies a configurable SDK request timeout and retries initial `429` responses twice with exponential delays. Main chat persistence remains required; tool logging is best effort. Full conversation history is sent on each turn, with no truncation or incremental summary.

Material UI’s theme and Tailwind’s dark class are synchronized by `useDarkMode`. Local `sx` overrides provide component-specific styles.

## Verification

Jest and Supertest exercise the business rules and HTTP/SSE contracts with mocked boundaries. Provider tests use the original Spanish response shapes to verify normalization and fallback behavior. Storage tests cover legacy metadata migration. No automated test writes to a live database or calls a paid model.

The frontend production build runs TypeScript checks and Vite bundling. UI screenshots use illustrative data and are intended to show behavior and layout, not current market prices.
