# Intentflow Build Roadmap (Event-Driven Edition)

**Vision**: Event-Driven AI Orchestrator with Cyclic Execution, RAG, and Universal MCP.
**Stack**: Convex + Next.js + React Flow + LangGraph.

## Phase 1: The Core Engine (Review & Setup)
- [x] 1. Initialize Next.js 14 repo (TypeScript, Tailwind, Shadcn). <!-- id: 0 -->
- [x] 2. Setup Convex Project (Database, Auth, Actions). <!-- id: 1 -->
- [x] 3. Workflow Schema (`workflows`, `executions` tables). <!-- id: 2 -->
- [x] 4. **[UPDATE]** Refine `executions` table for Event-Driven states (`SUSPENDED`, `waiting_on_event`). <!-- id: 3 -->
- [x] 5. **[UPDATE]** Create `secrets` table for encrypted API keys. <!-- id: 4 -->
- [x] 6. Install `reactflow`, `zustand` (Canvas State). <!-- id: 5 -->
- [x] 7. Build Canvas Layout (Sidebar + Drop Zone). <!-- id: 6 -->
- [x] 8. Implement Drag-and-Drop. <!-- id: 7 -->
- [x] 9. Create Generic `BaseNode`. <!-- id: 8 -->

## Phase 2: Visual Node Implementation
- [x] 10. `LLMNode` UI (Model selector, Prompt). <!-- id: 9 -->
- [x] 11. **[NEW]** `GuardrailsNode` UI (PII, Moderation Config). <!-- id: 10 -->
    - [x] UI Panel (`GuardrailsNodePanel`).
    - [x] Backend Executor (`guardrails.ts`).
    - [x] Verification (Linting & Testing).
- [x] 12. **[NEW]** `InputNode` UI (Webhook Configuration). <!-- id: 11 -->
    - [x] Create `InputNodePanel` (extending Start Node).
    - [x] Update `types.ts` with Trigger config.
- [x] 13. **[NEW]** `RouterNode` UI (Dynamic Handles for Routes). <!-- id: 12 -->
    - [x] Create `RouterNodePanel`.
    - [x] Implement conditional logic UI (Rules builder).
    - [x] Update `BaseNode` to support dynamic handles based on routes.
- [x] 14. **[FIX]** Resolve Linter Errors in `NodePanel.tsx` and `guardrails.ts`. <!-- id: 13 -->
- [x] 15. **[ENHANCE]** `NodePanel` (Side Config): <!-- id: 14 -->
    - [x] Add "MCP Tools" selector to `LLMNode` panel.
    - [x] Add "Direct Property Access" UI for specific nodes.
- [x] 16. Graph Serialization: Ensure robust JSON compaction. <!-- id: 15 -->
- [x] 17. Validation: Check for dangling edges before save. <!-- id: 16 -->
- [x] 18. **[REVAMP]** Modern Infra Layout & UI: <!-- id: rev_1 -->
    - [x] Implement collapsible multi-mode Sidebar.
    - [x] Create sleek Top Bar (Header) with breadcrumbs.
    - [x] Design Unified Property Inspector (Glassmorphic side panel).
    - [x] Implement floating Workflow Toolbar (Bottom center).
    - [x] Refine node aesthetics and selection feedback.

## Phase 3: The Backend Executor (LangGraph + Convex)
- [x] 18. Convex Action `runWorkflow` (The "Worker"). <!-- id: 17 -->
- [x] 19. `buildLangGraph(json)` compiler. <!-- id: 18 -->
- [ ] 20. **[REFACTOR]** Universal MCP: Remove hardcoded Firecrawl. <!-- id: 19 -->
    - [ ] Implement generic MCP Client in Convex (Discovery & Execution).
    - [ ] Dynamic Tool creation from discovered MCP resources.
    - [ ] Update `ToolNode` execution to use generic MCP client.
- [ ] 21. Variable Parsing: Support `{{global_state}}` injection. <!-- id: 20 -->
- [ ] 22. Test Run: "Start -> LLM (with MCP Tool) -> End" via API. <!-- id: 21 -->

## Phase 4: Agentic Features & Events
- [x] 23. **Conditional Edges**: Implement Router Logic (`if/else`). <!-- id: 22 -->
- [ ] 24. **The Loop**: Enable Backward Edges in LangGraph. <!-- id: 23 -->
- [ ] 25. **Recursion Limit**: Prevent infinite billing (Max 50 steps). <!-- id: 24 -->
- [ ] 26. **Code Interpreter**: Integration with `e2b` or Sandboxed Eval. <!-- id: 25 -->
- [ ] 27. **Webhook Trigger**: `POST /api/webhook/:id` -> Triggers Workflow. <!-- id: 26 -->
- [ ] 28. **Schedule Trigger**: Convex Cron -> Triggers Workflow. <!-- id: 27 -->

## Phase 5: Enterprise RAG (Knowledge)
- [ ] 29. **Schema**: Create `documents` table (Embedding, Namespace, Metadata). <!-- id: 28 -->
- [ ] 30. **Knowledge UI**: File Uploader & Namespace Manager. <!-- id: 29 -->
- [ ] 31. **Ingestion**: Action to Chunk & Embed. <!-- id: 30 -->
- [ ] 32. **Retriever Node**: UI to select Namespace. <!-- id: 31 -->
- [ ] 33. **Retriever Logic**: `ctx.vectorSearch` implementation. <!-- id: 32 -->
- [ ] 34. **Re-Ranker**: Optional optimization step. <!-- id: 33 -->

## Phase 6: Real-Time & HITL
- [ ] 35. **Integration**: Supabase/Convex Realtime on `executions` table. <!-- id: 34 -->
- [ ] 36. **Frontend**: `useExecutionStream` hook for "Green Light" tracing. <!-- id: 35 -->
- [ ] 37. **Output Drawer**: Inspect node inputs/outputs. <!-- id: 36 -->
- [ ] 38. **Human-in-the-Loop (HITL)**: <!-- id: 37 -->
    - [ ] `HumanNode` logic (Suspend execution).
    - [ ] Approval Dashboard / URL.
    - [ ] `resumeExecution` mutation.

## Phase 7: Production Polish
- [ ] 39. **Auth Guards**: Row Level Security (RLS) in Convex. <!-- id: 38 -->
- [ ] 40. **API Keys**: User generation & Middleware check. <!-- id: 39 -->
- [ ] 41. **Rate Limiting**: Convex-based logic. <!-- id: 40 -->
- [ ] 42. **Templates**: "Simple Chat", "RAG Agent", "Scraper". <!-- id: 41 -->
- [ ] 43. **Dashboard**: Runs Table (Status, Cost, Duration). <!-- id: 42 -->
- [ ] 44. **Documentation**: Auto-gen API docs. <!-- id: 43 -->
- [ ] 45. **Launch**: Final Verification. <!-- id: 44 -->
