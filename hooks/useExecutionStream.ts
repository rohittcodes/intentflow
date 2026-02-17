import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { useEffect, useState } from 'react';

/**
 * Real-time execution streaming hook using Convex subscriptions
 * Automatically updates when execution state changes in the database
 */
export function useExecutionStream(executionId: Id<"executions"> | null) {
  const execution = useQuery(
    api.executions.watchExecution,
    executionId ? { executionId } : "skip"
  );

  const [previousNodeId, setPreviousNodeId] = useState<string | null>(null);
  const [activeEdges, setActiveEdges] = useState<Set<string>>(new Set());

  // Track "Green Light" edge tracing
  useEffect(() => {
    if (!execution) return;

    const currentNode = execution.currentNodeId;

    // If node changed, update active edges
    if (currentNode && currentNode !== previousNodeId) {
      if (previousNodeId) {
        // Add edge from previous to current node
        const edgeId = `${previousNodeId}-${currentNode}`;
        setActiveEdges(prev => new Set([...prev, edgeId]));
      }
      setPreviousNodeId(currentNode);
    }

    // Clear active edges when execution completes
    if (execution.status === 'completed' || execution.status === 'failed') {
      setTimeout(() => {
        setActiveEdges(new Set());
        setPreviousNodeId(null);
      }, 2000); // Keep edges lit for 2 seconds after completion
    }
  }, [execution, previousNodeId]);

  return {
    execution,
    isRunning: execution?.status === 'running',
    currentNodeId: execution?.currentNodeId || null,
    nodeResults: execution?.nodeResults || {},
    activeEdges: Array.from(activeEdges),
    isComplete: execution?.status === 'completed',
    isFailed: execution?.status === 'failed',
    error: execution?.error,
  };
}

/**
 * Watch the latest execution for a workflow
 */
export function useLatestExecution(workflowId: Id<"workflows"> | null) {
  const execution = useQuery(
    api.executions.watchLatestExecution,
    workflowId ? { workflowId } : "skip"
  );

  return {
    execution,
    isRunning: execution?.status === 'running',
    currentNodeId: execution?.currentNodeId || null,
    nodeResults: execution?.nodeResults || {},
  };
}
