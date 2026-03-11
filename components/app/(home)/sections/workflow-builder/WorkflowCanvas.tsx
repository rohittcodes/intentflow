"use client";

import { useCallback, useRef, useEffect, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  addEdge,
  useNodesState,
  useEdgesState,
  useReactFlow,
  type OnConnect,
  type Node,
  type Edge,
  type NodeMouseHandler,
  SelectionMode,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useWorkflow } from "@/hooks/useWorkflow";
import { useUndoRedo } from "@/hooks/useUndoRedo";
import { nodeTypes } from "./CustomNodes";
import type { NodeData } from "@/lib/workflow/types";
import { toast } from "sonner";
import { X, Globe, Database, Plug, Server, Activity, Layers, Copy, Settings2, Trash2, Maximize, Wand2, Columns, ExternalLink } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import ConfirmDialog from "./ConfirmDialog";
import { autoLayoutNodes, getNodeColor } from "@/lib/workflow/utils";

interface WorkflowCanvasProps {
  workflowId: string;
  instanceId: string;
  isMain?: boolean;
  onSelectNode: (node: Node<NodeData> | null, canvasId: string) => void;
  onOpenNestedWorkflow: (workflowId: string) => void;
  onClose?: () => void;
  // Shared settings from parent
  snapToGrid: boolean;
  gridStyle: string;
  edgeStyle: string;
  activeNodeId?: string | null;
  nodeResults?: Record<string, any>;
  onRegisterUpdateHandler?: (handlers: {
    update: (nodeId: string, data: any) => void;
    delete: (nodeId: string) => void;
    autoLayout: () => void;
    clearCanvas: () => void;
    undo: () => void;
    redo: () => void;
    getState: () => { nodes: Node<NodeData>[], edges: Edge[] };
  }) => void;
  onUndoRedoStateChange?: (instanceId: string, state: { canUndo: boolean, canRedo: boolean }) => void;
  onFocus?: (instanceId: string) => void;
  onGridStyleChange?: (style: 'dots' | 'lines' | 'none') => void;
  onEdgeStyleChange?: (style: 'default' | 'straight' | 'step' | 'smoothstep') => void;
  isFocused?: boolean;
}

export default function WorkflowCanvas({
  workflowId,
  instanceId,
  isMain = false,
  onSelectNode,
  onOpenNestedWorkflow,
  onClose,
  snapToGrid,
  gridStyle,
  edgeStyle,
  activeNodeId,
  nodeResults = {},
  onRegisterUpdateHandler,
  onUndoRedoStateChange,
  onFocus,
  onGridStyleChange,
  onEdgeStyleChange,
  isFocused = false,
}: WorkflowCanvasProps) {
  const {
    workflow,
    loading,
    updateNodes,
    updateEdges,
    saveWorkflow,
    isSaving,
  } = useWorkflow(workflowId);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node<NodeData>>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const { screenToFlowPosition } = useReactFlow();
  const reactFlowWrapper = useRef<HTMLDivElement>(null);

  // Undo/Redo tracking
  const { undo, redo, canUndo, canRedo, pushState, enableTracking, clearHistory, isEnabled: undoRedoEnabled, resetUndoRedoFlagDelayed } = useUndoRedo();
  const internalNodesUpdateRef = useRef(false);
  const isDraggingNodeRef = useRef(false);
  const initialized = useRef<string | null>(null);

  const [navMenu, setNavMenu] = useState<{ x: number; y: number; nodeId: string; workflowId: string } | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; nodeId: string } | null>(null);
  const [isCtrlPressed, setIsCtrlPressed] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    onConfirm: () => void;
    variant?: "danger" | "warning" | "default";
  }>({
    isOpen: false,
    title: "",
    description: "",
    onConfirm: () => { },
  });

  // Ref for generating unique IDs based on current nodes
  const nodeIdRef = useRef(0);
  const getId = useCallback(() => {
    const currentMaxId = nodes.reduce((max, node) => {
      const match = node.id.match(/^node_(\d+)$/);
      if (match) return Math.max(max, parseInt(match[1], 10));
      return max;
    }, -1);
    nodeIdRef.current = Math.max(nodeIdRef.current, currentMaxId + 1);
    return `node_${nodeIdRef.current++}`;
  }, [nodes]);

  // Sync with workflow data on first load or when workflow targets change
  useEffect(() => {
    const isWorkflowMatch = workflow && (workflow.id === workflowId || workflow._id === workflowId || (workflow as any)._convexId === workflowId);
    if (!loading && workflow && isWorkflowMatch) {
      if (!initialized.current || initialized.current !== workflowId) {
        setNodes(workflow.nodes || []);
        setEdges(workflow.edges || []);
        initialized.current = workflowId;
        enableTracking(workflow.nodes || [], workflow.edges || []);
        console.log(`✅ Canvas initialized for ${workflowId} with ${workflow.nodes?.length || 0} nodes`);

        // If this is a nested canvas, make sure it's focused if just opened
        if (!isMain && !isFocused) {
          onFocus?.(instanceId);
        }
      }
    }
  }, [workflow, loading, workflowId, setNodes, setEdges, enableTracking, isMain, isFocused, onFocus, instanceId]);

  // Visual updates for execution (Current Node highlighting)
  useEffect(() => {
    internalNodesUpdateRef.current = true;
    setNodes((nds) => nds.map((node) => {
      const isCurrentlyRunning = activeNodeId === node.id;
      const result = nodeResults[node.id];
      const nextClassName = isCurrentlyRunning ? 'executing-node' :
        result?.status === 'completed' ? 'completed-node' :
          result?.status === 'failed' ? 'failed-node' : '';

      return {
        ...node,
        className: nextClassName,
        data: {
          ...node.data,
          isRunning: isCurrentlyRunning,
          executionStatus: result?.status,
        },
      };
    }));
  }, [activeNodeId, nodeResults, setNodes]);

  // Sync edges with global edge style
  useEffect(() => {
    setEdges((eds) => eds.map((edge) => ({
      ...edge,
      type: edgeStyle === 'default' ? undefined : edgeStyle,
    })));
  }, [edgeStyle, setEdges]);

  // Handle connection
  const onConnect: OnConnect = useCallback((params) => {
    onFocus?.(instanceId);
    const newEdges = addEdge({ ...params, type: edgeStyle === 'default' ? undefined : edgeStyle, style: { strokeWidth: 2 } }, edges);
    setEdges(newEdges);
    pushState(nodes, newEdges);
    updateEdges(newEdges as any);
  }, [edges, nodes, setEdges, updateEdges, edgeStyle, pushState, onFocus, instanceId]);

  // Drag & Drop Handling
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    onFocus?.(instanceId);

    const type = event.dataTransfer.getData('application/reactflow');
    const label = event.dataTransfer.getData('application/reactflow-label');
    const libraryType = event.dataTransfer.getData('application/reactflow-library-type');
    const libraryDataRaw = event.dataTransfer.getData('application/reactflow-library-data');

    const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });

    if (libraryType && libraryDataRaw) {
      const data = JSON.parse(libraryDataRaw);

      if (libraryType === 'template') {
        const { nodes: templateNodes, edges: templateEdges } = data;
        if (!templateNodes?.length) return;

        const minX = Math.min(...templateNodes.map((n: any) => n.position.x));
        const minY = Math.min(...templateNodes.map((n: any) => n.position.y));
        const idMap = new Map();

        const newNodes = templateNodes.map((node: any) => {
          const newId = getId();
          idMap.set(node.id, newId);
          return {
            ...node,
            id: newId,
            position: { x: node.position.x - minX + position.x, y: node.position.y - minY + position.y },
          };
        });

        const newEdges = (templateEdges || []).map((edge: any) => ({
          ...edge,
          id: `e_${idMap.get(edge.source)}_${idMap.get(edge.target)}`,
          source: idMap.get(edge.source),
          target: idMap.get(edge.target),
        }));

        setNodes((nds) => {
          const updated = nds.concat(newNodes);
          pushState(updated, edges.concat(newEdges));
          updateNodes(updated as any);
          return updated;
        });
        setEdges((eds) => {
          const updated = eds.concat(newEdges);
          updateEdges(updated as any);
          return updated;
        });
        toast.success(`Template merged: ${data.name}`);
        return;
      }

      if (libraryType === 'workflow') {
        // Recursion check: Cannot drop a workflow into itself
        const targetId = data._id || data.id;
        const currentId = workflow?._id || workflowId;

        if (targetId === currentId || (data.name === workflow?.name && !isMain)) {
          toast.error("Recursion alert: Cannot nest a workflow within itself");
          return;
        }

        const newNode: Node<NodeData> = {
          id: getId(),
          type: 'workflow',
          position,
          data: { label: data.name, nodeType: 'workflow', nodeName: data.name, workflowId: data._id },
        };
        setNodes((nds) => {
          const updated = nds.concat(newNode);
          pushState(updated, edges);
          updateNodes(updated as any);
          return updated;
        });
        toast.success(`Workflow added: ${data.name}`);
        return;
      }

      if (libraryType === 'namespace') {
        const newNode: Node<NodeData> = {
          id: getId(),
          type: 'retriever',
          position,
          data: { label: data.name, nodeType: 'retriever', nodeName: data.name, namespaceId: data._id },
        };
        const updated = nodes.concat(newNode);
        setNodes(updated);
        pushState(updated, edges);
        updateNodes(updated as any);
        return;
      }

      if (libraryType === 'mcp') {
        const newNode: Node<NodeData> = {
          id: getId(),
          type: 'mcp',
          position,
          data: { label: data.name, nodeType: 'mcp', nodeName: data.name, serverId: data._id, mcpType: data.isOfficial ? 'official' : 'custom' },
        };
        const updated = nodes.concat(newNode);
        setNodes(updated);
        pushState(updated, edges);
        updateNodes(updated as any);
        return;
      }

      if (libraryType === 'connector') {
        const newNode: Node<NodeData> = {
          id: getId(),
          type: data.type === 'database' ? 'data-query' : 'http',
          position,
          data: {
            label: data.name,
            nodeType: data.type === 'database' ? 'data-query' : 'http',
            nodeName: data.name,
            connectorId: data._id,
            httpUrl: "",
            httpMethod: data.type === 'webhook' ? 'POST' : 'GET',
            sqlQuery: data.type === 'database' ? 'SELECT * FROM table LIMIT 10;' : '',
          },
        };
        const updated = nodes.concat(newNode);
        setNodes(updated);
        pushState(updated, edges);
        updateNodes(updated as any);
        return;
      }
    }

    if (type) {
      const newNode: Node<NodeData> = {
        id: getId(),
        type: type === 'firecrawl' ? 'mcp' : type,
        position,
        data: { label: label, nodeType: type === 'firecrawl' ? 'mcp' : type, nodeName: label },
      };
      const updated = nodes.concat(newNode);
      setNodes(updated);
      pushState(updated, edges);
      updateNodes(updated as any);
    }
  }, [screenToFlowPosition, getId, setNodes, setEdges, workflowId, updateNodes, updateEdges, nodes, edges]);

  const onNodeDragStop = useCallback(() => {
    pushState(nodes, edges);
    updateNodes(nodes as any);
  }, [nodes, edges, pushState, updateNodes]);

  const onNodesDelete = useCallback((deleted: Node[]) => {
    const updated = nodes.filter(n => !deleted.find(d => d.id === n.id));
    pushState(updated, edges.filter(e => !deleted.find(d => d.id === e.source || d.id === e.target)));
    updateNodes(updated as any);
  }, [nodes, edges, pushState, updateNodes]);

  const onEdgesDelete = useCallback((deleted: Edge[]) => {
    const updated = edges.filter(e => !deleted.find(d => d.id === e.id));
    pushState(nodes, updated);
    updateEdges(updated as any);
  }, [nodes, edges, pushState, updateEdges]);

  const onNodeClick: NodeMouseHandler<Node<NodeData>> = useCallback((event, node) => {
    onFocus?.(instanceId);
    setContextMenu(null);

    // Check if it's a workflow node and handles nested opening logic
    if (node.type === 'workflow' && node.data.workflowId) {
      // Prevent default selection and show navigation menu
      onSelectNode(null, instanceId);
      setNavMenu({
        x: (event as any).clientX,
        y: (event as any).clientY,
        nodeId: node.id,
        workflowId: node.data.workflowId
      });
    } else {
      onSelectNode(node, instanceId);
      setNavMenu(null);
    }
  }, [onFocus, instanceId, onSelectNode, setContextMenu, setNavMenu]);

  const onNodeContextMenu = useCallback(
    (event: any, node: any) => {
      event.preventDefault();
      onFocus?.(instanceId);
      setContextMenu({
        x: event.clientX,
        y: event.clientY,
        nodeId: node.id,
      });
    },
    [onFocus, instanceId, setContextMenu]
  );

  const onPaneContextMenu = useCallback(
    (event: any) => {
      event.preventDefault();
      onFocus?.(instanceId);
      setContextMenu({
        x: event.clientX,
        y: event.clientY,
        nodeId: '',
      });
    },
    [onFocus, instanceId, setContextMenu]
  );

  const handleDeleteNode = useCallback((nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId);
    if (node?.type === 'start') {
      toast.error('Cannot delete the start node');
      return;
    }
    setConfirmDialog({
      isOpen: true,
      title: "Delete Node",
      description: `Are you sure you want to delete "${node?.data.label || node?.type}"?`,
      variant: "danger",
      onConfirm: () => {
        setNodes(nds => {
          const updated = nds.filter(n => n.id !== nodeId);
          return updated;
        });
        setEdges(eds => {
          const updated = eds.filter(e => e.source !== nodeId && e.target !== nodeId);
          return updated;
        });

        // Final state sync and push
        const nextNodes = nodes.filter(n => n.id !== nodeId);
        const nextEdges = edges.filter(e => e.source !== nodeId && e.target !== nodeId);
        pushState(nextNodes, nextEdges);
        updateNodes(nextNodes as any);
        updateEdges(nextEdges as any);
        onSelectNode(null, instanceId);
        setConfirmDialog(p => ({ ...p, isOpen: false }));
        toast.success('Node deleted');
      },
    });
  }, [nodes, setNodes, setEdges, updateNodes, updateEdges, onSelectNode, instanceId]);

  const handleDuplicateNode = useCallback((nodeId: string) => {
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return;

    const newNode: Node<NodeData> = {
      ...node,
      id: getId(),
      position: { x: node.position.x + 40, y: node.position.y + 40 },
      data: { ...node.data },
      selected: true,
    };

    const updatedNodes = [...nodes.map((n) => ({ ...n, selected: false })), newNode];
    setNodes(updatedNodes);
    pushState(updatedNodes, edges);
    updateNodes(updatedNodes as any);
    toast.success('Node duplicated');
  }, [nodes, getId, setNodes]);

  const handleAutoLayout = useCallback(() => {
    const layoutedNodes = autoLayoutNodes(nodes as any, edges as any);
    setNodes(layoutedNodes as any);
    pushState(layoutedNodes as any, edges);
    updateNodes(layoutedNodes as any);
    toast.success('Layout updated');
  }, [nodes, edges, setNodes, updateNodes]);

  const handleClearCanvas = useCallback(() => {
    setConfirmDialog({
      isOpen: true,
      title: "Clear Canvas",
      description: "Are you sure you want to clear the entire canvas? This cannot be undone.",
      variant: "danger",
      onConfirm: () => {
        setNodes([]);
        setEdges([]);
        pushState([], []);
        updateNodes([]);
        updateEdges([]);
        onSelectNode(null, instanceId);
        setConfirmDialog(p => ({ ...p, isOpen: false }));
        toast.success('Canvas cleared');
      },
    });
  }, [setNodes, setEdges, updateNodes, updateEdges, onSelectNode, instanceId]);

  // Keyboard listeners for Ctrl
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Control' || e.metaKey) setIsCtrlPressed(true);
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Control' || e.metaKey) setIsCtrlPressed(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Hook up the update handler for the parent (Inspector bridge)
  useEffect(() => {
    if (onRegisterUpdateHandler) {
      onRegisterUpdateHandler({
        update: (nodeId, data) => {
          setNodes((nds) => {
            const updated = nds.map((node) => {
              if (node.id === nodeId) {
                const updatedData = { ...node.data, ...data };
                if (data.name) {
                  updatedData.label = data.name;
                }
                return { ...node, data: updatedData };
              }
              return node;
            });
            // Also sync with the workflow storage hook
            updateNodes(updated as any);
            pushState(updated as any, edges);
            return updated;
          });
        },
        delete: (nodeId) => {
          handleDeleteNode(nodeId);
        },
        autoLayout: () => {
          handleAutoLayout();
        },
        clearCanvas: () => {
          handleClearCanvas();
        },
        undo: async () => {
          const state = undo();
          if (state) {
            setNodes(state.nodes);
            setEdges(state.edges);
            // Wait for React to apply state before saving to DB
            await saveWorkflow({ nodes: state.nodes as any, edges: state.edges as any });
            resetUndoRedoFlagDelayed();
            toast.info('Undo applied');
          }
        },
        redo: async () => {
          const state = redo();
          if (state) {
            setNodes(state.nodes);
            setEdges(state.edges);
            // Wait for React to apply state before saving to DB
            await saveWorkflow({ nodes: state.nodes as any, edges: state.edges as any });
            resetUndoRedoFlagDelayed();
            toast.info('Redo applied');
          }
        },
        getState: () => {
          return { nodes, edges };
        }
      });
    }
  }, [onRegisterUpdateHandler, setNodes, updateNodes, handleDeleteNode, handleAutoLayout, handleClearCanvas, nodes, edges, undo, redo]);

  // Report undo/redo state to parent for header buttons
  useEffect(() => {
    onUndoRedoStateChange?.(instanceId, { canUndo, canRedo });
  }, [instanceId, canUndo, canRedo, onUndoRedoStateChange]);

  return (
    <div
      className={`flex-1 relative h-full w-full bg-background overflow-hidden transition-all duration-300 ${isMain ? "" : "border-l"} ${isFocused ? "ring-2 ring-heat-100/50 ring-inset z-10" : "border-black-alpha-8"}`}
      ref={reactFlowWrapper}
      onMouseDown={(e) => {
        // Prevent focus stealing if clicking UI elements
        if ((e.target as HTMLElement).closest('.react-flow__controls') || (e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('.nav-menu')) {
          return;
        }
        onFocus?.(instanceId);
      }}
      onClick={(e) => {
        // Only trigger select null if clicking the pane directly (not handles or buttons)
        if (e.target === e.currentTarget) {
          onSelectNode(null, instanceId);
          setNavMenu(null);
        }
      }}
    >
      <AnimatePresence>
        {!isMain && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute top-16 left-16 right-16 z-50 flex items-center justify-between"
          >
            <div className="flex items-center gap-8 px-12 py-6 rounded-lg bg-accent-white border border-black-alpha-8 text-[11px] font-bold uppercase tracking-wider text-black-alpha-56 shadow-sm">
              <Globe className="w-12 h-12 text-teal-600" />
              {workflow?.name || 'Loading Workflow...'}
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); onClose?.(); }}
              className="w-32 h-32 rounded-lg bg-accent-white hover:bg-red-50 hover:text-red-500 border border-black-alpha-8 flex items-center justify-center transition-all shadow-sm"
            >
              <X className="w-16 h-16" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeDragStop={onNodeDragStop}
        onNodesDelete={onNodesDelete}
        onEdgesDelete={onEdgesDelete}
        onConnect={onConnect}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onNodeClick={onNodeClick}
        onNodeContextMenu={onNodeContextMenu}
        onPaneContextMenu={onPaneContextMenu}
        onPaneClick={() => {
          onFocus?.(instanceId);
          onSelectNode(null, instanceId);
          setContextMenu(null);
        }}
        snapToGrid={snapToGrid}
        snapGrid={[20, 20]}
        selectionOnDrag={!isCtrlPressed}
        selectionMode={SelectionMode.Partial}
        panOnDrag={isCtrlPressed ? [0, 1, 2] : [1, 2]}
        defaultEdgeOptions={{
          type: edgeStyle === 'default' ? 'smoothstep' : edgeStyle,
          style: { strokeWidth: 2 }
        }}
      >
        {gridStyle !== 'none' && (
          <Background
            variant={gridStyle === 'dots' ? 'dots' as any : 'lines' as any}
            color="#888"
            gap={20}
            size={gridStyle === 'dots' ? 2 : 1}
          />
        )}
        <Controls className="!bg-accent-white !border-black-alpha-8 !fill-black-alpha-56 !shadow-md react-flow-controls" position="bottom-right" showInteractive={false} />
      </ReactFlow>

      {contextMenu && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="fixed bg-accent-white border border-black-alpha-8 rounded-xl shadow-2xl z-[500] p-4 min-w-[180px] backdrop-blur-xl"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          {contextMenu.nodeId ? (
            <>
              <button
                onClick={() => {
                  handleDuplicateNode(contextMenu.nodeId);
                  setContextMenu(null);
                }}
                className="w-full flex items-center gap-10 px-12 py-8 text-xs font-semibold text-foreground hover:bg-secondary rounded-md transition-colors"
              >
                <div className="w-20 h-20 flex items-center justify-center bg-blue-500/20 text-blue-500 rounded-4">
                  <Copy className="w-12 h-12" />
                </div>
                Duplicate
              </button>
              <button
                onClick={() => {
                  setContextMenu(null);
                }}
                className="w-full flex items-center gap-10 px-12 py-8 text-xs font-semibold text-foreground hover:bg-secondary rounded-md transition-colors"
              >
                <div className="w-20 h-20 flex items-center justify-center bg-indigo-500/20 text-indigo-500 rounded-4">
                  <Settings2 className="w-12 h-12" />
                </div>
                Edit Properties
              </button>
              <div className="h-1 bg-secondary/80 my-4 mx-8 opacity-50" />
              <button
                onClick={() => {
                  handleDeleteNode(contextMenu.nodeId);
                  setContextMenu(null);
                }}
                className="w-full flex items-center gap-10 px-12 py-8 text-xs font-semibold text-red-500 hover:bg-red-500/10 rounded-md transition-colors"
              >
                <div className="w-20 h-20 flex items-center justify-center bg-red-500/10 rounded-4">
                  <Trash2 className="w-12 h-12" />
                </div>
                Delete
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => {
                  handleAutoLayout();
                  setContextMenu(null);
                }}
                className="w-full flex items-center gap-10 px-12 py-8 text-xs font-semibold text-foreground hover:bg-secondary rounded-md transition-colors"
              >
                <div className="w-20 h-20 flex items-center justify-center bg-teal-500/20 text-teal-500 rounded-4">
                  <Maximize className="w-12 h-12" />
                </div>
                Auto-layout
              </button>
              <button
                onClick={() => setContextMenu(null)}
                className="w-full flex items-center gap-10 px-12 py-8 text-xs font-semibold text-black-alpha-56 hover:bg-secondary rounded-md transition-colors"
              >
                <div className="w-20 h-20 flex items-center justify-center bg-secondary/80 rounded-4">
                  <Activity className="w-12 h-12" />
                </div>
                Cancel
              </button>
            </>
          )}
        </motion.div>
      )}

      {/* Navigation Menu for Workflow Nodes */}
      <AnimatePresence>
        {navMenu && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            className="fixed z-[200] w-220 bg-accent-white/80 backdrop-blur-xl border border-black-alpha-8 rounded-16 shadow-2xl p-6 nav-menu"
            style={{ left: navMenu.x, top: navMenu.y }}
          >
            <div className="px-12 py-8 border-b border-black-alpha-8 mb-4">
              <p className="text-[10px] font-bold text-black-alpha-40 uppercase tracking-widest">Navigation</p>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onOpenNestedWorkflow(navMenu.workflowId);
                setNavMenu(null);
              }}
              className="w-full flex items-center gap-12 px-12 py-10 text-xs font-bold text-foreground hover:bg-primary hover:text-white rounded-lg transition-all group"
            >
              <div className="w-24 h-24 flex items-center justify-center bg-primary/10 group-hover:bg-white/20 rounded-6 transition-colors">
                <Columns className="w-14 h-14" />
              </div>
              Open in Side Canvas
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                window.open(`/flow/${navMenu.workflowId}`, '_blank');
                setNavMenu(null);
              }}
              className="w-full flex items-center gap-12 px-12 py-10 text-xs font-bold text-foreground hover:bg-secondary rounded-lg transition-all group"
            >
              <div className="w-24 h-24 flex items-center justify-center bg-secondary/80 rounded-6 transition-colors">
                <ExternalLink className="w-14 h-14" />
              </div>
              Open in New Tab
            </button>
            <div className="h-1 bg-secondary/80 my-4 mx-8" />
            <button
              onClick={() => setNavMenu(null)}
              className="w-full flex items-center gap-12 px-12 py-10 text-xs font-bold text-black-alpha-40 hover:bg-secondary hover:text-black-alpha-80 rounded-lg transition-all"
            >
              <div className="w-24 h-24" />
              Dismiss
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        description={confirmDialog.description}
        variant={confirmDialog.variant}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog(p => ({ ...p, isOpen: false }))}
      />

      {isSaving && (
        <div className="absolute bottom-16 left-16 z-50 flex items-center gap-8 px-12 py-6 rounded-full bg-accent-white border border-black-alpha-8 text-[10px] font-bold uppercase tracking-wider text-teal-600 shadow-sm animate-pulse">
          <Wand2 className="w-12 h-12" />
          Saving...
        </div>
      )}
    </div>
  );
}
