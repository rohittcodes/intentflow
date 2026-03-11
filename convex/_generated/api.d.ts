/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as analytics from "../analytics.js";
import type * as apiKeys from "../apiKeys.js";
import type * as approvals from "../approvals.js";
import type * as auditLogs from "../auditLogs.js";
import type * as checkpoints from "../checkpoints.js";
import type * as crons from "../crons.js";
import type * as executions from "../executions.js";
import type * as ingestion from "../ingestion.js";
import type * as knowledge from "../knowledge.js";
import type * as knowledgeActions from "../knowledgeActions.js";
import type * as knowledgeConnectors from "../knowledgeConnectors.js";
import type * as mcpServers from "../mcpServers.js";
import type * as mcpTools from "../mcpTools.js";
import type * as memories from "../memories.js";
import type * as pineconeConnectors from "../pineconeConnectors.js";
import type * as projects from "../projects.js";
import type * as scheduler from "../scheduler.js";
import type * as scheduler_queries from "../scheduler_queries.js";
import type * as secrets from "../secrets.js";
import type * as templates from "../templates.js";
import type * as usage from "../usage.js";
import type * as userLLMKeys from "../userLLMKeys.js";
import type * as userMCPs from "../userMCPs.js";
import type * as utils_crypto from "../utils/crypto.js";
import type * as webhooks from "../webhooks.js";
import type * as workflows from "../workflows.js";
import type * as workspaces from "../workspaces.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  analytics: typeof analytics;
  apiKeys: typeof apiKeys;
  approvals: typeof approvals;
  auditLogs: typeof auditLogs;
  checkpoints: typeof checkpoints;
  crons: typeof crons;
  executions: typeof executions;
  ingestion: typeof ingestion;
  knowledge: typeof knowledge;
  knowledgeActions: typeof knowledgeActions;
  knowledgeConnectors: typeof knowledgeConnectors;
  mcpServers: typeof mcpServers;
  mcpTools: typeof mcpTools;
  memories: typeof memories;
  pineconeConnectors: typeof pineconeConnectors;
  projects: typeof projects;
  scheduler: typeof scheduler;
  scheduler_queries: typeof scheduler_queries;
  secrets: typeof secrets;
  templates: typeof templates;
  usage: typeof usage;
  userLLMKeys: typeof userLLMKeys;
  userMCPs: typeof userMCPs;
  "utils/crypto": typeof utils_crypto;
  webhooks: typeof webhooks;
  workflows: typeof workflows;
  workspaces: typeof workspaces;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
