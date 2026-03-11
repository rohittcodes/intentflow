import { v } from "convex/values";
import { query, mutation, action } from "./_generated/server";
import { api } from "./_generated/api";
import { encrypt, decrypt } from "./utils/crypto";

/**
 * Centralized MCP Server Registry Operations
 * Single source of truth for all MCP configurations
 */

// Get all MCP servers for the authenticated user
export const listUserMCPs = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const userId = identity.subject;

    return await ctx.db
      .query("mcpServers")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();
  },
});

// Get enabled MCP servers for the authenticated user
export const getEnabledMCPs = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const userId = identity.subject;

    return await ctx.db
      .query("mcpServers")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("enabled"), true))
      .collect();
  },
});

// Get a single MCP server by ID with ownership check
export const getMCPServer = query({
  args: {
    id: v.id("mcpServers"),
  },
  handler: async (ctx, { id }) => {
    const identity = await ctx.auth.getUserIdentity();
    const server = await ctx.db.get(id);

    if (!server || (server.userId && identity?.subject !== server.userId)) {
      return null;
    }

    return server;
  },
});

// Get multiple MCP servers by IDs with ownership check
export const getMCPServersByIds = query({
  args: {
    ids: v.array(v.id("mcpServers")),
  },
  handler: async (ctx, { ids }) => {
    const identity = await ctx.auth.getUserIdentity();
    const servers = await Promise.all(
      ids.map(id => ctx.db.get(id))
    );

    return servers.filter((s): s is any =>
      !!s && (!s.userId || identity?.subject === s.userId)
    );
  },
});

// Add a new MCP server
export const addMCPServer = mutation({
  args: {
    name: v.string(),
    url: v.string(),
    description: v.optional(v.string()),
    category: v.string(),
    authType: v.string(),
    accessToken: v.optional(v.string()),
    tools: v.optional(v.array(v.string())),
    headers: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");
    const userId = identity.subject;

    const accessToken = args.accessToken
      ? await encrypt(args.accessToken, userId)
      : undefined;

    const serverId = await ctx.db.insert("mcpServers", {
      ...args,
      accessToken,
      userId,
      connectionStatus: "untested",
      enabled: true,
      isOfficial: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    return serverId;
  },
});

// Update MCP server
export const updateMCPServer = mutation({
  args: {
    id: v.id("mcpServers"),
    name: v.optional(v.string()),
    url: v.optional(v.string()),
    description: v.optional(v.string()),
    category: v.optional(v.string()),
    authType: v.optional(v.string()),
    accessToken: v.optional(v.string()),
    tools: v.optional(v.array(v.string())),
    connectionStatus: v.optional(v.string()),
    lastTested: v.optional(v.string()),
    lastError: v.optional(v.string()),
    enabled: v.optional(v.boolean()),
    headers: v.optional(v.any()),
  },
  handler: async (ctx, { id, ...updates }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");
    const userId = identity.subject;

    const server = await ctx.db.get(id);
    if (!server || server.userId !== userId) {
      throw new Error("Unauthorized");
    }

    const updatesWithEncryptedToken: any = { ...updates };
    if (updates.accessToken) {
      updatesWithEncryptedToken.accessToken = await encrypt(updates.accessToken, userId);
    }

    await ctx.db.patch(id, {
      ...updatesWithEncryptedToken,
      updatedAt: new Date().toISOString(),
    });
    return id;
  },
});

// Delete MCP server
export const deleteMCPServer = mutation({
  args: {
    id: v.id("mcpServers"),
  },
  handler: async (ctx, { id }) => {
    const identity = await ctx.auth.getUserIdentity();
    const server = await ctx.db.get(id);

    if (!server || (server.userId && identity?.subject !== server.userId)) {
      throw new Error("Unauthorized");
    }

    await ctx.db.delete(id);
    return { success: true };
  },
});

// Test MCP connection and discover tools
export const testConnection = action({
  args: {
    id: v.id("mcpServers"),
  },
  handler: async ({ runMutation, runQuery }, { id }): Promise<any> => {
    const server = await runQuery(api.mcpServers.getMCPServer, { id });

    if (!server) {
      throw new Error("MCP server not found");
    }

    try {
      // This will be called from the frontend which will do the actual connection test
      // The frontend will then update the server with the results
      return {
        serverId: id,
        needsTest: true,
        server,
      };
    } catch (error) {
      await runMutation(api.mcpServers.updateMCPServer, {
        id,
        connectionStatus: "error",
        lastTested: new Date().toISOString(),
        lastError: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
  },
});

/**
 * Sync Tools from an MCP Server
 * Connects to the server, lists tools, and saves them to mcpTools table
 */
export const syncTools = action({
  args: {
    id: v.id("mcpServers"),
  },
  handler: async ({ runMutation, runQuery }, { id }): Promise<any> => {
    const server = await runQuery(api.mcpServers.getMCPServer, { id });
    if (!server) throw new Error("MCP server not found");

    try {
      // Import the GenericMCPClient dynamically to avoid potential build issues in all environments
      // Note: This relies on the file being accessible or a similar logic being implemented
      const { GenericMCPClient } = await import("../lib/mcp/client");

      const serverUrl = server.url;
      const headers = (server.headers as Record<string, string>) || {};
      if (server.accessToken) {
        const decryptedToken = await decrypt(server.accessToken, server.userId);
        headers['Authorization'] = `Bearer ${decryptedToken}`;
      }

      const client = new GenericMCPClient(serverUrl, headers);
      await client.connect();

      const tools = await client.listTools();
      await client.close();

      // Clear existing tools first
      const apiAny = api as any;
      await runMutation(apiAny.mcpTools.clearServerTools, { serverId: id });

      // Save each tool
      const toolNames: string[] = [];
      for (const tool of tools) {
        await runMutation(apiAny.mcpTools.upsertTool, {
          serverId: id,
          userId: server.userId,
          name: tool.name,
          description: tool.description || "",
          schema: tool.inputSchema || {},
          isSearchable: true,
          category: server.category,
        });
        toolNames.push(tool.name);
      }

      // Update server status and tool list
      await runMutation(api.mcpServers.updateConnectionStatus, {
        id,
        status: "connected",
        tools: toolNames,
      });

      return { success: true, count: tools.length };
    } catch (error) {
      console.error(`❌ Sync failed for ${server.name}:`, error);
      await runMutation(api.mcpServers.updateMCPServer, {
        id,
        connectionStatus: "error",
        lastError: error instanceof Error ? error.message : "Sync failed",
      });
      throw error;
    }
  },
});

// Toggle MCP enabled status with ownership check
export const toggleMCPEnabled = mutation({
  args: {
    id: v.id("mcpServers"),
  },
  handler: async (ctx, { id }) => {
    const identity = await ctx.auth.getUserIdentity();
    const server = await ctx.db.get(id);

    if (!server || (server.userId && identity?.subject !== server.userId)) {
      throw new Error("Unauthorized");
    }

    await ctx.db.patch(id, {
      enabled: !server.enabled,
      updatedAt: new Date().toISOString(),
    });

    return { enabled: !server.enabled };
  },
});

// Update connection status after testing with ownership check
export const updateConnectionStatus = mutation({
  args: {
    id: v.id("mcpServers"),
    status: v.string(),
    tools: v.optional(v.array(v.string())),
    error: v.optional(v.string()),
  },
  handler: async (ctx, { id, status, tools, error }) => {
    const identity = await ctx.auth.getUserIdentity();
    const server = await ctx.db.get(id);

    // If identity is present, check ownership.
    if (server && server.userId && identity && identity.subject !== server.userId) {
      throw new Error("Unauthorized");
    }

    await ctx.db.patch(id, {
      connectionStatus: status,
      tools,
      lastTested: new Date().toISOString(),
      lastError: error,
      updatedAt: new Date().toISOString(),
    });
    return { success: true };
  },
});

// Seed official MCP servers (run once on first user setup)
export const seedOfficialMCPs = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return { success: false, message: "Unauthorized" };
    const userId = identity.subject;

    const officialMCPs = [
      {
        userId,
        name: "Rube MCP",
        url: "https://rube.app/mcp",
        description: "Powerful suite of tools for web scraping, searching, and data extraction.",
        category: "web",
        authType: "none",
        enabled: true,
        isOfficial: true,
        connectionStatus: "untested",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    ];

    for (const mcp of officialMCPs) {
      const existing = await ctx.db
        .query("mcpServers")
        .withIndex("by_userId", (q) => q.eq("userId", userId))
        .filter((q) => q.eq(q.field("name"), mcp.name))
        .first();

      if (!existing) {
        await ctx.db.insert("mcpServers", mcp);
      }
    }

    return { success: true, message: "Official MCPs seeded" };
  },
});

// Clean up non-Firecrawl official MCPs
export const cleanupOfficialMCPs = mutation({
  args: {},
  handler: async () => {
    return { message: "Cleanup disabled" };
  },
});
