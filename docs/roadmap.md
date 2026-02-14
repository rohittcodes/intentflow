# Intentflow Build Roadmap (Event-Driven Edition)

**Vision**: Event-Driven AI Orchestrator with Cyclic Execution, RAG, and Universal MCP.
**Stack**: Convex + Next.js + React Flow + LangGraph.

## Phase 1: The Core Engine (Review & Setup)
- [x] 1. Initialize Next.js 14 repo (TypeScript, Tailwind, Shadcn).
- [x] 2. Setup Convex Project (Database, Auth, Actions).
- [x] 3. Workflow Schema (`workflows`, `executions` tables).
- [ ] 4. **[UPDATE]** Refine `executions` table for Event-Driven states (`SUSPENDED`, `waiting_on_event`).
- [ ] 5. **[UPDATE]** Create `secrets` table for encrypted API keys.
- [x] 6. Install `reactflow`, `zustand` (Canvas State).
- [x] 7. Build Canvas Layout (Sidebar + Drop Zone).
- [x] 8. Implement Drag-and-Drop.
- [x] 9. Create Generic `BaseNode`.

## Phase 2: Visual Node Implementation
- [x] 10. `LLMNode` UI (Model selector, Prompt).
- [ ] 11. **[NEW]** `GuardrailsNode` UI (PII, Moderation Config).
- [ ] 12. **[NEW]** `InputNode` UI (Webhook Configuration).
- [ ] 13. **[NEW]** `RouterNode` UI (Dynamic Handles for Routes).
- [ ] 14. **[NEW]** `ToolNode` UI (Universal MCP Configuration).
- [ ] 15. **[ENHANCE]** `NodePanel` (Side Config):
    - [ ] Add "MCP Tools" selector to `LLMNode` panel (allow Agent to call tools).
    - [ ] Add "Direct Property Access" UI for specific nodes (e.g., extracting values from MCP outputs).
- [ ] 16. Graph Serialization: Ensure roTbust JSON compaction.
- [ ] 17. Validation: Check for dangling edges before save.

## Phase 3: The Backend Executor (LangGraph + Convex)
- [x] 18. Convex Action `runWorkflow` (The "Worker").
- [x] 19. `buildLangGraph(json)` compiler.
- [ ] 20. **[REFACTOR]** Universal MCP: Remove hardcoded Firecrawl.
    - [ ] Implement generic MCP Client in Convex (Discovery & Execution).
    - [ ] Dynamic Tool creation from discovered MCP resources.
    - [ ] Update `ToolNode` execution to use generic MCP client.
- [ ] 21. Variable Parsing: Support `{{global_state}}` injection.
- [ ] 22. Test Run: "Start -> LLM (with MCP Tool) -> End" via API.

## Phase 4: Agentic Features & Events
- [ ] 23. **Conditional Edges**: Implement Router Logic (`if/else`).
- [ ] 24. **The Loop**: Enable Backward Edges in LangGraph.
- [ ] 25. **Recursion Limit**: Prevent infinite billing (Max 50 steps).
- [ ] 26. **Code Interpreter**: Integration with `e2b` or Sandboxed Eval.
- [ ] 27. **Webhook Trigger**: `POST /api/webhook/:id` -> Triggers Workflow.
- [ ] 28. **Schedule Trigger**: Convex Cron -> Triggers Workflow.

## Phase 5: Enterprise RAG (Knowledge)
- [ ] 29. **Schema**: Create `documents` table (Embedding, Namespace, Metadata).
- [ ] 30. **Knowledge UI**: File Uploader & Namespace Manager.
- [ ] 31. **Ingestion**: Action to Chunk & Embed.
- [ ] 32. **Retriever Node**: UI to select Namespace.
- [ ] 33. **Retriever Logic**: `ctx.vectorSearch` implementation.
- [ ] 34. **Re-Ranker**: Optional optimization step.

## Phase 6: Real-Time & HITL
- [ ] 35. **Integration**: Supabase/Convex Realtime on `executions` table.
- [ ] 36. **Frontend**: `useExecutionStream` hook for "Green Light" tracing.
- [ ] 37. **Output Drawer**: Inspect node inputs/outputs.
- [ ] 38. **Human-in-the-Loop (HITL)**:
    - [ ] `HumanNode` logic (Suspend execution).
    - [ ] Approval Dashboard / URL.
    - [ ] `resumeExecution` mutation.

## Phase 7: Production Polish
- [ ] 39. **Auth Guards**: Row Level Security (RLS) in Convex.
- [ ] 40. **API Keys**: User generation & Middleware check.
- [ ] 41. **Rate Limiting**: Convex-based logic.
- [ ] 42. **Templates**: "Simple Chat", "RAG Agent", "Scraper".
- [ ] 43. **Dashboard**: Runs Table (Status, Cost, Duration).
- [ ] 44. **Documentation**: Auto-gen API docs.
- [ ] 45. **Launch**: Final Verification.
