# Intentflow MVP Launch Roadmap

This document outlines the remaining tasks required to launch the Intentflow MVP. These items are categorized by priority and functional area.

## 🔴 High Priority (MVP Blockers)

### 1. Security & Authentication
- [ ] **Robust API Key Hashing**: Replace the simple hash function in `convex/apiKeys.ts` with a secure hashing library (e.g., `scrypt` or `argon2`).
- [ ] **Data Isolation (RLS)**: Audit all Convex queries and mutations to ensure they strictly filter by `userId` to prevent data leakage between users.
- [ ] **Secrets Management**: Enhance the `secrets` table to store encrypted MCP credentials and API keys using a robust encryption standard (AES-256).

### 2. Execution Reliability & Error Handling
- [ ] **Retry from Checkpoint**: Implement a "Resume" or "Retry" feature in the UI to allow users to restart a failed execution from the last successful node.
- [ ] **Workflow Validation**: Add pre-flight checks to ensure all nodes are connected and variables are properly referenced before allowing a "Run".
- [ ] **Resource Limits**: Implement per-user quotas for execution time and token usage to prevent abuse and manage costs.

### 3. Human-in-the-Loop (HITL) Completion
- [ ] **External Approval Page**: Finalize the public-facing approval page `/approval/[id]` to ensure it is functional for users who are not currently in the builder UI.
- [ ] **Notifications**: Integrate with Resend or Slack to notify users immediately when a workflow is suspended and requires approval.

---

## 🟡 Medium Priority (UX & Observability)

### 4. Dashboard & Execution History
- [ ] **Runs Table**: Create a dedicated "Executions" or "History" page to list all past runs with status, duration, and output summary.
- [ ] **Execution Tracing**: Improve the `OutputDrawer` to show a clearer "Trace" of the data flow, including inputs/outputs for every step of the LangGraph execution.

### 5. Knowledge Base (RAG) Polish
- [ ] **Knowledge Management UI**: Build a user-friendly interface for uploading documents, managing namespaces, and viewing ingestion status.
- [ ] **Advanced Retrieval**: Implement re-ranking and hybrid search (keyword + vector) for better RAG performance.

### 6. Templates & Sharing
- [ ] **Template Marketplace**: Enable users to publish their workflows to a community library or share them via a public link.

---

## 🟢 Low Priority (Future Improvements)

### 7. Native Mobile Support
- [ ] **Responsive Builder**: Optimize the React Flow canvas and property panels for tablet and mobile devices.

### 8. Advanced Integrations
- [ ] **OAuth MCP Support**: Complete the OAuth 2.0 flow for MCP servers to support services like Google Calendar, GitHub, and Slack securely.
- [ ] **Scheduled Triggers UI**: Add a simple UI for setting up cron schedules for automated workflow execution.

---

## Technical Debt Checklist
- [ ] Remove hardcoded Firecrawl references in `README.md` and legacy API routes.
- [ ] Clean up `convex/scheduler.ts` and consolidate with LangGraph execution logic.
- [ ] Standardize node type naming (e.g., `if-else` vs `if / else`).
