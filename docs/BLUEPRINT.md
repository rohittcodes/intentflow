# Intentflow MVP Blueprint

This document is the single source of truth for the Intentflow Workflow Builder, outlining the current infrastructure and the roadmap for reaching a production-ready MVP.

---

## 🏗️ Current Infrastructure Status

### 1. Data Persistence
- **Database**: **Convex** (Primary).
- **Workflows**: Nodes and edges stored as structured JSON.
- **Executions**: Point-in-time state of every step for full auditability.
- **MCP Registry**: Decentralized tool management and discovery via `mcpServers` and `mcpTools`.

### 2. RAG Foundation
- **Vector DB**: Built-in Convex vector search.
- **Isolation**: Namespace-based document isolation.
- **Status**: Functional document ingestion and semantic search.

### 3. Evaluation & Testing
- **Schema**: Tables for `feedback`, `evaluations`, and `evaluationResults` are ready.
- **Current State**: Infrastructure exists; UI exposure is the next step.

---

## 🗺️ Product Roadmap

### Phase 1: Observability & Interaction (v0.8)
- **Live Execution Tracing**: [COMPLETED] Animate the workflow path in real-time.
- **Floating Mini-map**: [COMPLETED] Glassmorphic canvas preview and navigation.
- **Step-through Debugger**: Ability to "pause" and inspect local variables at any node.
- **Model Caching**: Caching at the API layer to optimize token usage.

### Phase 2: "Intenty" - Global AI Co-pilot (v0.9)
- **AI Sidebar**: A persistent chat panel for natural language workflow construction.
- **Context Awareness**: Integrated with Help Center RAG to answer technical questions.
- **Chat-to-Workflow**: LLM logic to generate and modify ReactFlow JSON from chat.

### Phase 3: Unified Developer Workspace (v1.0 MVP)
- **Split-View Editor**: Multi-column layout for **Canvas | Code | Chat**.
- **Code Editor**: Bidirectional sync between a Monaco-powered JSON editor and the canvas.
- **Dynamic Model Selector**: Switch AI models on-the-fly within the co-pilot interface.
- **Route Optimization**: Intelligent routing to cost-effective models for simple tasks.

### Phase 4: Enterprise & Scalability (Post-MVP)
- **Custom Code Runner**: Secure sandboxed execution (e2b) for Python/JS logic.
- **Workflow Versioning**: GitHub-style history, commits, and rollback.
- **Sub-graphs**: Use saved workflows as modular nodes.
- **Multiplayer**: Real-time collaborative building.

### 4. Command Center Dashboard (Observer & Admin)
- **Agent Pulse**: A real-time, scrolling live feed of "Agent Thoughts" and orchestration steps across all active workflows.
- **Intelligence Metrics**: Beyond simple stats—track "Total Intelligence Seconds," "Successful Orchestrations," and "Cost Savings."
- **One-Click Deploy**: Toggle workflows into public Chatbots or API endpoints directly from the dashboard list.
- **Agentic Insights**: AI-generated "Magic" cards suggesting optimizations (e.g., "Switch this node to GPT-4o-mini to reduce cost by 25%").

### 5. Multi-Surface Interfaces
- **"Intenty" Global AI Co-pilot**: A persistent chat panel on every page for natural language workflow construction and help.
- **Agent Playground**: A dedicated dashboard tab to chat with any of your deployed workflows in a unified interface.
- **Command Palette (⌘K)**: Deep-search through Workflows, Knowledge Bases, and trigger quick actions (Invite, Create, Deploy).

---

## 🏗️ Future Planned Iterations (MVP Finalization)

### Iteration 19: "Intenty" - The Global AI Co-pilot
- **Natural Language Builder**: Chat UI to generate complex workflows from English prompts.
- **Context-Aware Help**: Side-by-side agent that helps users configure nodes based on documentation.
- **Tool Calling**: Allow the agent to search your libraries and knowledge bases to suggest the right node.

### Iteration 20: Unified Developer Workspace
- **Split-View Editor**: Side-by-side canvas and code/json editor for advanced logic control.
- **Bidirectional Sync**: Changes in the nodes reflect in code immediately and vice-versa.

---

## 🧪 Testing & Validation Strategy

### Node Testing
- **Prompt Playgrounds**: Integrated testing environments directly within Agent Panels.
- **Magic Enhance**: AI-powered prompt optimization tool for agent instructions.

### Evals & Quality Control
- **Golden Datasets**: Library of ideal responses for automated regression testing.
- **Factual Evaluators**: Automatic check for PII, tone, and hallucination metrics.

---

## 🏗️ Infrastructure Hardening & Quality (System Polish)

This phase focuses on making the backbone of Intentflow robust, reliable, and enterprise-ready.

### 1. Backend Reliability & Integrity
- **Zod Schema Validation**: Strict input/output validation for all LangGraph nodes.
- **Execution Resilience**: Circuit breakers for MCP tool failures to prevent cascading errors.
- **State Checkpointing**: Automatically save execution state at every node to support the "Resume" button on failures.

### 2. Observability & Cost Engineering
- **Flight Recorder**: Detailed JSON logs saved to Convex for every step of an execution.
- **Cost Attribution**: Per-node and per-run cost reporting based on token usage.

### 3. Builder Performance & Safety
- **Debounced State Sync**: Optimize canvas performance by batching state updates over the wire.
- **Deterministic Handles**: Type-safe connections to prevent linking incompatible nodes (e.g., File -> Number).

---

## 🔒 Security & Posture
- **Secrets Vault**: AES-256 encrypted storage for `userLLMKeys` and MCP credentials.
- **Execution Sandboxing**: Basic runtime isolation for sensitive data handling.
- **Rate Limiting**: Per-user budgets and runaway loop prevention logic.
