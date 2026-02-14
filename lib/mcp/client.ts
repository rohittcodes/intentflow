import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";

/**
 * Generic MCP Client
 * Wraps the official SDK to provide a simple interface for IntentFlow
 */
export class GenericMCPClient {
  private client: Client;
  private transport: SSEClientTransport;
  private url: string;
  private isConnected: boolean = false;

  constructor(url: string, headers?: Record<string, string>) {
    this.url = url;

    // Prepare transport options if needed (headers support varies by SDK version/transport)
    // The SSEClientTransport in some versions accepts EventSourceInit or custom fetch
    this.transport = new SSEClientTransport(new URL(url), {
      eventSourceInit: {
        // @ts-ignore - dict is compatible with EventSourceInit
        headers: headers
      }
    });

    this.client = new Client({
      name: "IntentFlow Client",
      version: "1.0.0",
    }, {
      capabilities: {
        tools: {},
        resources: {},
        prompts: {},
      }
    });
  }

  /**
   * Connect to the MCP server
   */
  async connect() {
    if (this.isConnected) return;

    try {
      await this.client.connect(this.transport);
      this.isConnected = true;
      console.log(`✅ Connected to MCP server: ${this.url}`);
    } catch (error) {
      console.error(`❌ Failed to connect to MCP server ${this.url}:`, error);
      throw error;
    }
  }

  /**
   * List available tools
   */
  async listTools() {
    if (!this.isConnected) await this.connect();

    try {
      const result = await this.client.listTools();
      return result.tools;
    } catch (error) {
      console.error(`❌ Failed to list tools for ${this.url}:`, error);
      throw error;
    }
  }

  /**
   * Call a tool
   */
  async callTool(name: string, args: any) {
    if (!this.isConnected) await this.connect();

    try {
      const result = await this.client.callTool({
        name,
        arguments: args
      });
      return result;
    } catch (error) {
      console.error(`❌ Failed to call tool ${name} on ${this.url}:`, error);
      throw error;
    }
  }

  /**
   * Close the connection
   */
  async close() {
    if (this.isConnected) {
      await this.client.close();
      this.isConnected = false;
    }
  }
}
