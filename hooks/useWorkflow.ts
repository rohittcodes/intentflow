import { useState, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Workflow, WorkflowNode, WorkflowEdge } from '@/lib/workflow/types';
import { cleanupInvalidEdges } from '@/lib/workflow/edge-cleanup';

export function useWorkflow(workflowId?: string) {
  const queryClient = useQueryClient();
  const [localWorkflow, setLocalWorkflow] = useState<Workflow | null>(null);

  // Load all workflows
  const { data: workflowsData } = useQuery({
    queryKey: ['workflows'],
    queryFn: async () => {
      const response = await fetch('/api/workflows');
      if (!response.ok) throw new Error('Failed to fetch workflows');
      const data = await response.json();
      return (data.workflows || []) as Workflow[];
    }
  });

  const workflows = workflowsData || [];

  // Load single workflow
  const { data: serverWorkflow, isLoading: queryLoading } = useQuery({
    queryKey: ['workflow', workflowId],
    queryFn: async () => {
      if (!workflowId) return null;
      const response = await fetch(`/api/workflows/${workflowId}`);
      if (response.status === 404) return null;
      if (!response.ok) throw new Error('Failed to fetch workflow');
      const data = await response.json();
      let workflowData = data.workflow;

      if (workflowData) {
        const cleaned = cleanupInvalidEdges(workflowData.nodes, workflowData.edges);
        if (cleaned.removedCount > 0) {
          workflowData = { ...workflowData, nodes: cleaned.nodes, edges: cleaned.edges };
        }

        // Ensure start node exists
        const hasStartNode = workflowData.nodes.some((n: any) => n.type === 'start');
        if (!hasStartNode) {
          const startNode = {
            id: 'node_0',
            type: 'start',
            position: { x: 250, y: 250 },
            data: { 
              label: 'Start',
              nodeType: 'start',
              nodeName: 'Start'
            }
          };
          workflowData = {
            ...workflowData,
            nodes: [startNode, ...workflowData.nodes]
          };
        }
      }
      return workflowData as Workflow;
    },
    enabled: !!workflowId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Mutation for saving
  const saveMutation = useMutation({
    mutationKey: ['workflow-save'],
    mutationFn: async (updated: Workflow) => {
      const response = await fetch('/api/workflows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      });
      if (!response.ok) throw new Error('Failed to save workflow');
      return await response.json();
    },
    onSuccess: (data, variables) => {
      queryClient.setQueryData(['workflow', variables.id], {
        ...variables,
        _id: data.workflowId,
        _convexId: data.workflowId
      });
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
    }
  });

  // Mutation for deleting
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/workflows?id=${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete workflow');
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
    }
  });

  // Create new workflow helper
  const createNewWorkflow = useCallback(() => {
    const newWorkflow: Workflow = {
      id: `workflow_${Date.now()}`,
      name: 'New Workflow',
      nodes: [
        { 
          id: 'node_0', 
          type: 'start', 
          position: { x: 250, y: 150 }, 
          data: { 
            label: 'Start',
            nodeType: 'start',
            nodeName: 'Start'
          } 
        },
      ],
      edges: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setLocalWorkflow(newWorkflow);
    // Seed the cache so other components can see it immediately
    queryClient.setQueryData(['workflow', newWorkflow.id], newWorkflow);
    return newWorkflow;
  }, [queryClient]);

  // Determine current workflow
  const workflow = useMemo(() => {
    if (!workflowId) return localWorkflow;
    return serverWorkflow || localWorkflow;
  }, [workflowId, serverWorkflow, localWorkflow]);

  const loading = workflowId ? queryLoading : false;
  const isSaving = saveMutation.isPending;
  const convexId = serverWorkflow?._id || serverWorkflow?._convexId || null;

  const saveWorkflow = useCallback(async (updates: Partial<Workflow>) => {
    // If no workflow loaded and no workflowId, we can't save unless it's a new one being created
    const base = workflow;
    if (!base) return;

    const updated = {
      ...base,
      ...updates,
      updatedAt: new Date().toISOString(),
    } as Workflow;

    // Optimistic update for UI if it's the current one
    if (workflowId === updated.id) {
      setLocalWorkflow(null); // Clear local if we're now syncing with server
    } else if (!workflowId) {
      setLocalWorkflow(updated);
    }

    await saveMutation.mutateAsync(updated);
  }, [workflow, workflowId, saveMutation]);

  const saveWorkflowImmediate = saveWorkflow;

  const updateNodes = useCallback((nodes: WorkflowNode[]) => {
    saveWorkflow({ nodes });
  }, [saveWorkflow]);

  const updateEdges = useCallback((edges: WorkflowEdge[]) => {
    saveWorkflow({ edges });
  }, [saveWorkflow]);

  const updateNodeData = useCallback((nodeId: string, data: any) => {
    if (!workflow) return;
    const nodes = workflow.nodes.map(node =>
      node.id === nodeId ? { ...node, data: { ...node.data, ...data } } : node
    );
    updateNodes(nodes);
  }, [workflow, updateNodes]);

  const deleteWorkflow = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/workflows?id=${id}`, { method: 'DELETE' });
      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.message || data.error || 'Failed to delete workflow'
        };
      }

      queryClient.invalidateQueries({ queryKey: ['workflows'] });
      return { success: true };
    } catch (error) {
      console.error('Failed to delete workflow:', error);
      return { success: false, error: 'Network or database error' };
    }
  }, [queryClient]);

  return {
    workflow,
    workflows,
    loading,
    isSaving,
    convexId,
    saveWorkflow,
    saveWorkflowImmediate,
    updateNodes,
    updateEdges,
    updateNodeData,
    deleteWorkflow,
    restoreWorkflow: async (id: string) => {
      const response = await fetch('/api/workflows/trash', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workflowId: id }),
      });
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
      return response.ok;
    },
    permanentlyDeleteWorkflow: async (id: string) => {
      const response = await fetch(`/api/workflows/trash?id=${id}`, { method: 'DELETE' });
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
      return response.ok;
    },
    createNewWorkflow,
    loadWorkflows: () => queryClient.invalidateQueries({ queryKey: ['workflows'] }),
  };
}
