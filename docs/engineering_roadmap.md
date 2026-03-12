# Intentflow Engineering & Product Roadmap

This document outlines the current state of the Intentflow Workflow Builder and the strategic roadmap for future engineering and product enhancements.

---

## 🏗️ Current Infrastructure Status

### 1. Data Persistence (Nodes & Workflows)
- **Database**: We are using **Convex** as our primary database.
- **Node Storage**: Nodes and edges are stored as arrays within the `workflows` table. The `executions` table stores point-in-time results of every step, enabling full auditability.
- **MCP Registry**: A dedicated `mcpServers` and `mcpTools` table exists for decentralized tool management and discovery.

### 2. RAG Foundation
- **Vector DB**: Built-in into Convex. We have `documents` and `namespaces` tables with a `vectorIndex` on OpenAI-compatible 1536-dimensional embeddings.
- **RAG Status**: **Functional**. Supports document ingestion, semantic search, and namespace isolation.
- **Scoring**: Currently using standard semantic similarity.

### 3. Evaluation & Testing
- **Schema Ready**: We have `feedback`, `evaluations`, and `evaluationResults` tables in place.
- **Current State**: Infrastructure for human feedback and automated evals is defined but requires UI exposure in the Builder.

---

## 🗺️ Product Roadmap & Future Enhancements

### Phase 1: Observability & Reliability (Short Term)
- **Live Execution Tracing**: Animate the workflow path in real-time during execution.
- **Step-through Debugger**: Allow users to "pause" at any node and inspect local variables.
- **Model Caching**: Implement caching at the API layer (via Convex or Redis) to save tokens on repeated identical queries.
- **Route Optimization**: Logic that routes prompts to smaller models (e.g., Llama 3 8B) for simple tasks and "Up-routes" to GPT-4/Claude 3.5 only for complex reasoning.

### Phase 2: Advanced AI Engineering (Medium Term)
- **RAG Fine-tuning & Hybrid Search**:
    - Implement **Re-ranking nodes** (e.g., Cohere) to refine scores after initial vector search.
    - Add **Hybrid Search** (Keywords + Semantic) for higher precision.
- **Prompt Optimization (DSPy style)**:
    - "Magic Optimize" button to automatically refine system prompts based on successes/failures.
- **Automated Evaluators**:
    - "Eval Nodes" to check output for PII, tone, or factual consistency.

### Phase 3: Developer & Enterprise Experience (Long Term)
- **Custom Code Runner**: Secure sandboxed environment (e.g., E2B or Piston) for raw Python/JS logic.
- **Workflow Versioning**: GitHub-style commits/tags for workflows.
- **Sub-graphs (Nested Workflows)**: Ability to use a "Saved Workflow" as a single node.
- **Collaborative Builder**: Real-time multiplayer editing.

---

## 🧪 Testing & Validation Strategy

### Node Testing
- **Unit Testing**: Develop a "Node Mock" runner to test individual logic nodes.
- **Prompt Playgrounds**: Integrate testing playgrounds directly into the Agent Panels.

### Evals & Quality Control
- **Golden Datasets**: Library of "Ideal Responses" to run workflows against automatically.
- **Human-in-the-Loop 2.0**: Allow users to modify agent outputs in the `Approval` node to build few-shot correction datasets.

---

## 🔒 Security & Infra
- **Secrets Management**: Refine encryption for `userLLMKeys` for zero-knowledge storage.
- **Rate Limiting**: Per-user token budgets to prevent runaway loops.
