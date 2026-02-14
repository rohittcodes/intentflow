# Intentflow Master Implementation Plan

## Goal Description
Build an **Event-Driven AI Orchestrator** (Intentflow) that enables **Cyclic, State-Aware Agentic Workflows**.
**Stack**: Convex (Backend/DB/Vector/Queue), Next.js 14 (Frontend), React Flow (Visual Builder), LangGraph.js (Execution Engine).

## Core Architecture
- **Database**: Convex Tables (`workflows`, `executions`, `documents`, `secrets`).
- **Vector Search**: Convex Vector Index (Native RAG).
- **Queue/Scheduling**: Convex Scheduled Actions (replaces BullMQ).
- **Realtime**: Native Convex Subscriptions (replaces Supabase Realtime).
- **Universal MCP**: Generic connector for *any* MCP server (replacing hardcoded Firecrawl).

---

## Phase 1: The Core Engine (Foundations)
### Objectives
Audit implementation and ensure the "Headless OS" foundation is solid.

### Technical Implementation
#### Database Schema (`convex/schema.ts`)
- **[VERIFY]** `workflows`: Stores JSON graph (`nodes`, `edges`).
- **[VERIFY]** `executions`: Stores state, logs, and `currentNodeId`.
- **[NEW]** `secrets`: Secure storage for user API keys (Encrypted).

#### State Management
- **Zustand**: For the high-frequency React Flow canvas state.
- **Convex**: For persistent workflow storage and execution state.

---

## Phase 2: Visual Node Implementation
### Objectives
Expand the node library to support the "Event-Driven" vision.

### Technical Implementation
#### [NEW] `GuardrailsNode`
- **UI**: Panel for PII, Moderation, Jailbreak, Hallucination config.
- **Logic**: Pre-computation step before passing data to downstream nodes.

#### [NEW] `InputNode` / `TriggerNode`
- **Webhook**: `POST /api/webhook/:workflowId`.
- **Schedule**: Cron configuration (Convex Cron).
- **Email**: Inbound email processing (via SendGrid/Resend parse).

#### [MODIFY] `RouterNode`
- **Dynamic Handles**: Allow user to add N routes.
- **Logic**: LLM Classification -> Edge Selection.

#### [ENHANCE] Node Configuration Panel (`NodePanel.tsx`)
- **MCP Integration**:
  - **LLM Node**: Add a multi-select dropdown in the side panel to "Connect MCP Tools". This allows the `LLMNode` to dynamically call tools from connected MCP servers.
  - **Direct Access**: For specific nodes (e.g., `ToolNode`), allow selecting a specific tool from a specific MCP server directly in the UI.
  - **Property Access**: Allow mapping node outputs to specific properties of an MCP result (e.g., `firecrawl.output.markdown`).

---

## Phase 3: The Backend Executor (LangGraph)
### Objectives
Robust execution engine with support for Universal MCP and Cycles.

### Technical Implementation
#### [REFACTOR] Universal MCP Support
- **Current**: Hardcoded Firecrawl logic in `lib/workflow/langgraph.ts`.
- **New Strategy**:
  1.  **Registry**: `convex/mcpServers.ts` stores user-added MCP URLs.
  2.  **Discovery**: on `init`, fetch tools list from MCP server (SSE/Stdio).
  3.  **Execution**: `ToolNode` dynamically constructs LangChain `Tool` instances that proxy calls to the MCP server.

#### Logic & Flow
- **Cycles**: Enable `recursion_limit` (default 50) in StateGraph.
- **State**: Persist `variables` (Global Memory) in `executions` table after every step.

---

## Phase 4: Agentic Features (Advanced)
### Objectives
Enable true autonomy and logic.

### Technical Implementation
#### [NEW] `CodeInterpreterNode`
- **Sandboxed Execution**: Use `e2b` or a secure `vm2` wrapper (if self-hosted) to run Python/JS.
- **Use Case**: Math, Data Transformation, Chart Generation.

#### [NEW] `HumanNode` (HITL)
- **Logic**:
  1.  Workflow reaches node -> Status: `SUSPENDED`.
  2.  Generate "Approval URL" -> Email/Slack to user.
  3.  Wait for `mutation approveExecution(id, decision)`.
  4.  Resume workflow execution.

---

## Phase 5: RAG & Knowledge ("Enterprise RAG")
### Objectives
Namespace-aware retrieval with re-ranking.

### Technical Implementation
#### Database (`convex/schema.ts`)
- **[NEW]** `documents` table:
  - `embedding`: `v.array(v.float64())` (Dimensions: 1536).
  - `namespace`: `v.string()` (e.g., "HR", "Legal").
  - `metadata`: `v.any()`.

#### Ingestion Pipeline (`convex/actions/ingest.ts`)
- PDF/Text -> RecursiveChunker -> OpenAI Embeddings -> `convex.insert`.

#### Retrieval (`RetrieverNode`)
- **Combined Search**: `ctx.vectorSearch` + `filter: q.eq("namespace", target)`.
- **Re-Ranking**: Optional step using Cohere/Jina API before returning context.

---

## Phase 6: Real-Time & Observability
### Objectives
"Green Light" tracing and live output streaming.

### Technical Implementation
#### Execution Stream
- Frontend subscribes to `api.executions.get({ id })`.
- **Visuals**: React Flow `useNodesState` updates styling `border-green-500` based on `execution.currentNodeId`.

#### Output Drawer
- Slide-over panel showing `nodeResults` (Inputs, Outputs, Logs, Token Usage).

---

## Phase 7: Production Polish
### Objectives
Security, Templates, and Launch.

### Technical Implementation
#### API Key Management
- User generates `nx_sk_...` keys.
- Stored hash in `apiKeys` table.
- Middleware validates key on `POST /api/run`.

#### Template Library
- Seed `convex/templates.ts` with:
  1.  **RAG Chatbot** (Input -> Retriever -> LLM)
  2.  **Competitor Monitor** (Schedule -> Search -> Summarize -> Email)
  3.  **Data Extractor** (Webhook -> Scrape -> JSON Extract -> Webhook)
