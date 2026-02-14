
import {
  BaseCheckpointSaver,
  Checkpoint,
  CheckpointMetadata,
  CheckpointTuple,
  SerializerProtocol,
} from "@langchain/langgraph-checkpoint";
import { RunnableConfig } from "@langchain/core/runnables";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

/**
 * ConvexCheckpointer
 * Persists LangGraph state to Convex database.
 */
export class ConvexCheckpointer extends BaseCheckpointSaver {
  private client: any;

  // Client can be ConvexHttpClient (browser/server) or ActionCtx (convex backend)
  constructor(client: any) {
    super();
    this.client = client;
  }

  /**
   * Get a checkpoint by threadId and optional checkpointId.
   */
  async getTuple(config: RunnableConfig): Promise<CheckpointTuple | undefined> {
    const threadId = config.configurable?.thread_id;
    const checkpointId = config.configurable?.checkpoint_id;

    if (!threadId) {
      return undefined;
    }

    try {
      // We need a query to fetch checkpoints. 
      // Since we can't import backend queries directly in this file if it runs on Edge/Server,
      // we rely on the client passed in.
      // However, BaseCheckpointSaver is often synchronous or Promise-based.

      // Note: We need to define these queries in `convex/checkpoints.ts` (we'll create this next).
      // For now, assuming `api.checkpoints.getCheckpoint`.
      const tuple = await this.client.query(api.checkpoints.getCheckpoint, {
        threadId,
        checkpointId,
      });

      if (!tuple) {
        return undefined;
      }

      return {
        config,
        checkpoint: tuple.checkpoint as Checkpoint,
        metadata: tuple.metadata as CheckpointMetadata,
        parentConfig: tuple.parentCheckpointId
          ? {
            configurable: {
              thread_id: threadId,
              checkpoint_id: tuple.parentCheckpointId,
            },
          }
          : undefined,
      };
    } catch (error) {
      console.error("Failed to get checkpoint tuple:", error);
      return undefined;
    }
  }

  /**
   * List checkpoints for a thread.
   */
  async *list(
    config: RunnableConfig,
    options?: { before?: RunnableConfig; limit?: number }
  ): AsyncGenerator<CheckpointTuple> {
    const threadId = config.configurable?.thread_id;
    if (!threadId) return;

    try {
      const checkpoints = await this.client.query(api.checkpoints.listCheckpoints, {
        threadId,
        limit: options?.limit,
        beforeId: options?.before?.configurable?.checkpoint_id,
      });

      for (const cp of checkpoints) {
        yield {
          config: {
            configurable: {
              thread_id: threadId,
              checkpoint_id: cp.checkpoint_id,
            },
          },
          checkpoint: cp.checkpoint as Checkpoint,
          metadata: cp.metadata as CheckpointMetadata,
          parentConfig: cp.parent_checkpoint_id
            ? {
              configurable: {
                thread_id: threadId,
                checkpoint_id: cp.parent_checkpoint_id,
              },
            }
            : undefined,
        };
      }
    } catch (error) {
      console.error("Failed to list checkpoints:", error);
    }
  }

  /**
   * Save a checkpoint.
   */
  async put(
    config: RunnableConfig,
    checkpoint: Checkpoint,
    metadata: CheckpointMetadata,
    newVersions?: Record<string, string | number>
  ): Promise<RunnableConfig> {
    const threadId = config.configurable?.thread_id;

    if (!threadId) {
      throw new Error("Missing thread_id in config");
    }

    try {
      await this.client.mutation(api.checkpoints.saveCheckpoint, {
        threadId,
        checkpointId: checkpoint.id,
        checkpoint: checkpoint,
        metadata: metadata,
        parentCheckpointId: config.configurable?.checkpoint_id,
      });

      return {
        configurable: {
          thread_id: threadId,
          checkpoint_id: checkpoint.id,
        },
      };
    } catch (error) {
      console.error("Failed to save checkpoint:", error);
      throw error;
    }
  }
  async putWrites(
    config: RunnableConfig,
    writes: any[],
    taskId: string
  ): Promise<void> {
    // Optional: Store pending writes if needed for advanced resumption
    // For now, we can leave this as a no-op or log it.
    // Real implementation would store this in a separate table or column.
    console.log("putWrites called (not implemented in Convex persistence yet)", {
      config,
      writesCount: writes.length,
      taskId,
    });
  }

  async deleteThread(threadId: string): Promise<void> {
    if (!threadId) return;

    // In a real implementation, valid to delete checkpoints.
    // For now, logging.
    console.log(`deleteThread called for ${threadId} (not implemented/needed yet)`);
  }
}
