/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as admin from "../admin.js";
import type * as apiKeys from "../apiKeys.js";
import type * as approvals from "../approvals.js";
import type * as checkpoints from "../checkpoints.js";
import type * as crons from "../crons.js";
import type * as executions from "../executions.js";
import type * as mcpServers from "../mcpServers.js";
import type * as scheduler from "../scheduler.js";
import type * as scheduler_queries from "../scheduler_queries.js";
import type * as secrets from "../secrets.js";
import type * as templates from "../templates.js";
import type * as userLLMKeys from "../userLLMKeys.js";
import type * as userMCPs from "../userMCPs.js";
import type * as webhooks from "../webhooks.js";
import type * as workflows from "../workflows.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  admin: typeof admin;
  apiKeys: typeof apiKeys;
  approvals: typeof approvals;
  checkpoints: typeof checkpoints;
  crons: typeof crons;
  executions: typeof executions;
  mcpServers: typeof mcpServers;
  scheduler: typeof scheduler;
  scheduler_queries: typeof scheduler_queries;
  secrets: typeof secrets;
  templates: typeof templates;
  userLLMKeys: typeof userLLMKeys;
  userMCPs: typeof userMCPs;
  webhooks: typeof webhooks;
  workflows: typeof workflows;
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
