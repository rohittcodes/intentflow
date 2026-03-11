"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useCallback, useRef, DragEvent, useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  ReactFlowProvider,
  type OnConnect,
  type Node,
  type Edge,
  type NodeMouseHandler,
  type NodeChange,
  SelectionMode,
  useKeyPress,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import "@/styles/workflow-execution.css";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield,
  LayoutGrid,
  Settings2,
  Activity,
  Layers,
  ChevronLeft,
  ChevronRight,
  Save,
  MousePointer2,
  Zap,
  StopCircle,
  FileText,
  Plug,
  GitBranch,
  Repeat,
  CheckCircle,
  Braces,
  Search,
  Server,
  Play,
  ChevronDown,
  Copy,
  Trash2,
  Maximize,
  Database,
  CloudUpload,
  CloudOff,
  Wand2,
  Undo,
  Redo,
  XCircle,
} from "lucide-react";
import NodePanel from "./NodePanel";
import MCPPanel from "./MCPPanel";
import PreviewPanel from "./PreviewPanel";
import ExecutionPanel from "./ExecutionPanel";
import TestEndpointPanel from "./TestEndpointPanel";
import LogicNodePanel from "./LogicNodePanel";
import MemoryNodePanel from "./MemoryNodePanel";
import DataNodePanel from "./DataNodePanel";
import HTTPNodePanel from "./HTTPNodePanel";
import SourceSelectorModal from "./SourceSelectorModal";
import ExtractNodePanel from "./ExtractNodePanel";
import StartNodePanel from "./StartNodePanel";
import RouterNodePanel from "./RouterNodePanel";
import RetrieverNodePanel from "./RetrieverNodePanel";
import WorkflowNameEditor from "./WorkflowNameEditor";
import SettingsPanel from "./SettingsPanelSimple";
import ConfirmDialog from "./ConfirmDialog";
import EdgeLabelModal from "./EdgeLabelModal";
import ShareWorkflowModal from "./ShareWorkflowModal";
import SaveAsTemplateModal from "./SaveAsTemplateModal";
import LibraryPanel from "./LibraryPanel";
import WorkflowSettingsPanel from "./WorkflowSettingsPanel";
import { toast } from "sonner";
import { useWorkflow } from "@/hooks/useWorkflow";
import { useWorkflowExecution } from "@/hooks/useWorkflowExecution";
import { useUndoRedo } from "@/hooks/useUndoRedo";
import WorkflowCanvas from "./WorkflowCanvas";
import { getWorkflow } from "@/lib/workflow/storage";
import type { WorkflowNode, WorkflowEdge } from "@/lib/workflow/types";
import { nodeTypes } from "./CustomNodes";
import type { NodeData } from "@/lib/workflow/types";
import { autoLayoutNodes, getNodeColor } from "@/lib/workflow/utils";
import { detectDuplicateCredentials } from "@/lib/workflow/duplicate-detection";
import { cleanupInvalidEdges } from "@/lib/workflow/edge-cleanup";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useUser } from "@clerk/nextjs";
import { validateWorkflow, ValidationResult } from "@/lib/workflow/validation";
import { ApiKeys } from "@/lib/workflow/types";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/shadcn/tooltip";
import { AlertTriangle, CheckCircle2, Info } from "lucide-react";

interface WorkflowBuilderProps {
  onBack: () => void;
  initialWorkflowId?: string | null;
  initialTemplateId?: string | null;
}

// Helper function to calculate max node ID
const calculateMaxNodeId = (nodes: Node<NodeData>[]) => {
  const maxId = nodes.reduce((max, node) => {
    const match = node.id.match(/^node_(\d+)$/);
    if (match) {
      const id = parseInt(match[1], 10);
      return Math.max(max, id);
    }
    return max;
  }, 1);
  return maxId + 1;
};

const initialNodes: Node<NodeData>[] = [
  {
    id: 'node_0',
    type: 'start',
    position: { x: 250, y: 250 },
    data: {
      label: 'Start',
      nodeType: 'start',
      nodeName: 'Start',
    },
  },
];

const initialEdges: Edge[] = [];

const nodeCategories = [
  {
    category: "Core",
    nodes: [
      { type: "agent", label: "Agent", color: "bg-blue-500", icon: MousePointer2 },
      { type: "custom-input", label: "Input", color: "bg-indigo-500", icon: Zap },
      { type: "end", label: "End", color: "bg-teal-500", icon: StopCircle },
      { type: "note", label: "Note", color: "bg-[#E4E4E7] dark:bg-[#52525B]", icon: FileText },
    ],
  },
  {
    category: "Tools",
    nodes: [
      { type: "mcp", label: "MCP", color: "bg-[#FFEFA4] dark:bg-[#FFDD40]", icon: Plug },
    ],
  },
  {
    category: "Logic",
    nodes: [
      { type: "if-else", label: "Condition", color: "bg-[#FEE7C2] dark:bg-[#FFAE2B]", icon: GitBranch },
      { type: "router", label: "Router", color: "bg-[#FEE7C2] dark:bg-[#FFAE2B]", icon: GitBranch },
      { type: "while", label: "While", color: "bg-[#FEE7C2] dark:bg-[#FFAE2B]", icon: Repeat },
      { type: "user-approval", label: "User approval", color: "bg-[#E5E7EB] dark:bg-[#9CA3AF]", icon: CheckCircle },
      { type: "guardrails", label: "Guardrails", color: "bg-heat-100", icon: Shield },
    ],
  },
  {
    category: "Data",
    nodes: [
      { type: "transform", label: "Transform", color: "bg-[#ECE3FF] dark:bg-[#9665FF]", icon: Braces },
      { type: "extract", label: "Extract", color: "bg-[#ECE3FF] dark:bg-[#9665FF]", icon: Search },
      { type: "set-state", label: "Set state", color: "bg-[#ECE3FF] dark:bg-[#9665FF]", icon: Braces },
    ],
  },
];

// Utilities imported from @/lib/workflow/utils

interface CanvasWindowProps {
  workflowId: string;
  instanceId: string;
  isMain?: boolean;
  onSelectNode: (node: Node<NodeData> | null, instanceId: string) => void;
  onOpenNestedWorkflow: (workflowId: string) => void;
  onClose?: (instanceId: string) => void;
  snapToGrid: boolean;
  gridStyle: string;
  edgeStyle: string;
  activeNodeId?: string | null;
  nodeResults?: Record<string, any>;
  onRegisterUpdate: (instanceId: string, handlers: any) => void;
  onUndoRedoStateChange?: (instanceId: string, state: { canUndo: boolean, canRedo: boolean }) => void;
  onFocus?: (instanceId: string) => void;
  onGridStyleChange: (style: 'dots' | 'lines' | 'none') => void;
  onEdgeStyleChange: (style: 'default' | 'straight' | 'step' | 'smoothstep') => void;
  isFocused: boolean;
}

const CanvasWindow = ({
  workflowId,
  instanceId,
  isMain,
  onSelectNode,
  onOpenNestedWorkflow,
  onClose,
  snapToGrid,
  gridStyle,
  edgeStyle,
  activeNodeId,
  nodeResults,
  onRegisterUpdate,
  onUndoRedoStateChange,
  onFocus,
  onGridStyleChange,
  onEdgeStyleChange,
  isFocused,
}: CanvasWindowProps) => {
  const handleRegister = useCallback((handlers: any) => {
    onRegisterUpdate(instanceId, handlers);
  }, [instanceId, onRegisterUpdate]);

  const handleUndoRedoChange = useCallback((id: string, state: { canUndo: boolean, canRedo: boolean }) => {
    onUndoRedoStateChange?.(id, state);
  }, [onUndoRedoStateChange]);

  const handleFocus = useCallback(() => {
    onFocus?.(instanceId);
  }, [instanceId, onFocus]);

  return (
    <ReactFlowProvider>
      <WorkflowCanvas
        workflowId={workflowId}
        instanceId={instanceId}
        isMain={isMain}
        onSelectNode={onSelectNode}
        onOpenNestedWorkflow={onOpenNestedWorkflow}
        onClose={onClose ? () => onClose(instanceId) : undefined}
        snapToGrid={snapToGrid}
        gridStyle={gridStyle}
        edgeStyle={edgeStyle}
        activeNodeId={activeNodeId}
        nodeResults={nodeResults || {}
        }
        onRegisterUpdateHandler={handleRegister}
        onUndoRedoStateChange={handleUndoRedoChange}
        onFocus={handleFocus}
        onGridStyleChange={onGridStyleChange}
        onEdgeStyleChange={onEdgeStyleChange}
        isFocused={isFocused}
      />
    </ReactFlowProvider>
  );
};

function WorkflowBuilderInner({ onBack, initialWorkflowId, initialTemplateId }: WorkflowBuilderProps) {
  const { user } = useUser();
  const router = useRouter();
  const [initialized, setInitialized] = useState(false);
  const [currentTemplateId, setCurrentTemplateId] = useState<string | null>(initialTemplateId ?? null);
  const [serverAPIConfig, setServerAPIConfig] = useState<any>(null);

  // Fetch server config for environment keys
  useEffect(() => {
    fetch('/api/config')
      .then(res => res.json())
      .then(data => setServerAPIConfig(data))
      .catch(err => console.error("Failed to fetch server config", err));
  }, []);

  // Fetch user LLM keys
  const userLLMKeys = useQuery(api.userLLMKeys.getUserLLMKeys, user?.id ? {} : "skip");

  const availableApiKeys = useMemo<ApiKeys>(() => {
    const keys: ApiKeys = {};
    if (userLLMKeys) {
      userLLMKeys.forEach((k: any) => {
        if (k.isActive) {
          // @ts-ignore
          keys[k.provider as keyof ApiKeys] = 'configured';
        }
      });
    }

    // Merge server config
    if (serverAPIConfig) {
      if (serverAPIConfig.anthropicConfigured) keys.anthropic = keys.anthropic || 'env';
      if (serverAPIConfig.openaiConfigured) keys.openai = keys.openai || 'env';
      if (serverAPIConfig.groqConfigured) keys.groq = keys.groq || 'env';
      if (serverAPIConfig.firecrawlConfigured) keys.firecrawl = keys.firecrawl || 'env';
      if (serverAPIConfig.arcadeConfigured) keys.arcade = keys.arcade || 'env';
    }

    return keys;
  }, [userLLMKeys, serverAPIConfig]);

  const template = useQuery(api.workflows.getTemplateByCustomId,
    currentTemplateId ? { customId: currentTemplateId } : "skip"
  );

  const [showExecution, setShowExecution] = useState(false);
  const [showTestEndpoint, setShowTestEndpoint] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showSaveAsTemplateModal, setShowSaveAsTemplateModal] = useState(false);
  const [showSourceSelector, setShowSourceSelector] = useState(false);
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

  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [editingEdge, setEditingEdge] = useState<Edge | null>(null);
  const [showMCPSelector, setShowMCPSelector] = useState(false);
  const [targetAgentForMCP, setTargetAgentForMCP] = useState<Node | null>(null);
  const [showWorkflowMenu, setShowWorkflowMenu] = useState(false);
  const workflowMenuRef = useRef<HTMLDivElement>(null);
  const [renameTrigger, setRenameTrigger] = useState(0);
  const [environment, setEnvironment] = useState<'draft' | 'production'>('draft');
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const [activeSidebarTab, setActiveSidebarTab] = useState<'nodes' | 'library' | 'settings'>('nodes');
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [gridStyle, setGridStyle] = useState<'dots' | 'lines' | 'none'>('dots');
  const [edgeStyle, setEdgeStyle] = useState<'default' | 'straight' | 'step' | 'smoothstep'>('default');
  const [maxIterations, setMaxIterations] = useState(50);
  const [timeout, setTimeoutSec] = useState(30);
  const [maxTokens, setMaxTokens] = useState(0);
  const [maxRuntimeSeconds, setMaxRuntimeSeconds] = useState(0);
  const [inspectorOpen, setInspectorOpen] = useState(false);

  // Multi-canvas state
  const [canvasStack, setCanvasStack] = useState<{ workflowId: string; instanceId: string }[]>([]);
  const [activeCanvasId, setActiveCanvasId] = useState<string>("main");
  const [selectedNodeByCanvas, setSelectedNodeByCanvas] = useState<Record<string, Node<NodeData> | null>>({});
  const [canvasUndoRedoState, setCanvasUndoRedoState] = useState<Record<string, { canUndo: boolean, canRedo: boolean }>>({});

  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const updateHandlersRef = useRef<Record<string, {
    update: (nodeId: string, data: any) => void;
    delete: (nodeId: string) => void;
    autoLayout: () => void;
    clearCanvas: () => void;
    undo: () => void;
    redo: () => void;
    getState: () => { nodes: any[], edges: any[] };
  }>>({});

  const nodeIdRef = useRef(2);
  const getId = useCallback(() => `node_${nodeIdRef.current++}`, []);

  const activeWorkflowId = (canvasStack.find(c => c.instanceId === activeCanvasId)?.workflowId || initialWorkflowId) as string | undefined;

  const { workflow, convexId, updateNodes, updateEdges, saveWorkflow, saveWorkflowImmediate, updateNodeData, isSaving, createNewWorkflow } = useWorkflow(activeWorkflowId);

  const validationResult = useMemo<ValidationResult>(() => {
    if (!workflow) return { isValid: true, errors: [] };
    return validateWorkflow(workflow as any, availableApiKeys);
  }, [workflow, availableApiKeys]);
  const deleteWorkflow = useMutation(api.workflows.deleteWorkflow);
  const createConnector = useMutation(api.knowledgeConnectors.createConnector);
  const deployWorkflow = useMutation(api.workflows.deployWorkflow);
  const { runWorkflow, stopWorkflow, isRunning, nodeResults, execution, currentNodeId, pendingAuth, resumeWorkflow, retryExecution } = useWorkflowExecution();


  // Initialize canvas stack with the main workflow
  useEffect(() => {
    if (workflow && canvasStack.length === 0) {
      setCanvasStack([{ workflowId: workflow.id, instanceId: "main" }]);
    }
  }, [workflow?.id, canvasStack.length]);

  // Handle "New Workflow" initialization
  useEffect(() => {
    if (!initialWorkflowId && !workflow && !initialized) {
      createNewWorkflow();
    } else if (initialWorkflowId && workflow && !initialized) {
      // If an initial workflow ID is provided and the workflow is loaded,
      // ensure the canvas stack is initialized and mark as initialized.
      if (canvasStack.length === 0) {
        setCanvasStack([{ workflowId: workflow.id, instanceId: "main" }]);
      }
      setInitialized(true);
    }
  }, [initialWorkflowId, workflow, initialized, createNewWorkflow, canvasStack.length]);

  const activeUndoRedo = canvasUndoRedoState[activeCanvasId] || { canUndo: false, canRedo: false };

  const handleUndo = useCallback(() => {
    updateHandlersRef.current[activeCanvasId]?.undo();
  }, [activeCanvasId]);

  const handleRedo = useCallback(() => {
    updateHandlersRef.current[activeCanvasId]?.redo();
  }, [activeCanvasId]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (workflowMenuRef.current && !workflowMenuRef.current.contains(event.target as any)) {
        setShowWorkflowMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (workflow && !initialized) {
      setEnvironment('draft');
      setShowTestEndpoint(false);

      // Initialize settings from workflow
      if (workflow.settings) {
        if (workflow.settings.snapToGrid !== undefined) setSnapToGrid(workflow.settings.snapToGrid);
        if (workflow.settings.gridStyle) setGridStyle(workflow.settings.gridStyle as any);
        if (workflow.settings.edgeStyle) setEdgeStyle(workflow.settings.edgeStyle as any);
        if (workflow.settings.maxIterations) setMaxIterations(workflow.settings.maxIterations);
        if (workflow.settings.timeout) setTimeoutSec(workflow.settings.timeout);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const extendedSettings = workflow.settings as any;
        if (extendedSettings.maxTokens) setMaxTokens(extendedSettings.maxTokens);
        if (extendedSettings.maxRuntimeSeconds) setMaxRuntimeSeconds(extendedSettings.maxRuntimeSeconds);
      }
      setInitialized(true);
    }
  }, [workflow?.id, initialized]);

  const isCtrlPressed = useKeyPress(['Control', 'Meta']);

  const handleDuplicateWorkflow = useCallback(() => {
    const bridge = updateHandlersRef.current[activeCanvasId];
    if (!bridge || !workflow) return;
    const { nodes: canvasNodes, edges: canvasEdges } = bridge.getState();
    const original = workflow;
    const newWorkflow = createNewWorkflow();
    setShowWorkflowMenu(false);
    setTimeout(() => {
      saveWorkflow({
        name: `${original.name || 'Workflow'} Copy`,
        description: original.description,
        nodes: canvasNodes as any,
        edges: canvasEdges as any,
      });
      toast.success('Workflow duplicated');
    }, 0);
  }, [workflow, createNewWorkflow, saveWorkflow, activeCanvasId]);

  // Bridge top-bar actions to the active canvas
  const handleSave = useCallback(async () => {
    const bridge = updateHandlersRef.current[activeCanvasId];
    if (!bridge || !workflow) return;
    const { nodes: canvasNodes, edges: canvasEdges } = bridge.getState();
    const updatedWorkflow = {
      ...workflow,
      nodes: canvasNodes as any,
      edges: canvasEdges as any,
      settings: { snapToGrid, gridStyle, edgeStyle, maxIterations, timeout, maxTokens, maxRuntimeSeconds }
    };
    await saveWorkflowImmediate(updatedWorkflow);

    // Redirect if this was a new workflow
    if (!initialWorkflowId && workflow.id.startsWith('workflow_')) {
      // The API should have saved it to its customId (which is workflow.id)
      router.push(`/flow/${workflow.id}`);
    }

    toast.success('Saved to Cloud');
    setShowWorkflowMenu(false);
  }, [workflow, activeCanvasId, snapToGrid, gridStyle, edgeStyle, maxIterations, timeout, maxTokens, maxRuntimeSeconds, saveWorkflowImmediate, initialWorkflowId, router]);

  const handleDeploy = useCallback(async () => {
    const bridge = updateHandlersRef.current[activeCanvasId];
    if (!bridge || !workflow) return;
    const { nodes: canvasNodes, edges: canvasEdges } = bridge.getState();
    const updatedWorkflow = {
      ...workflow,
      nodes: canvasNodes as any,
      edges: canvasEdges as any,
      isDeployed: true,
      deployedAt: new Date().toISOString(),
      settings: { snapToGrid, gridStyle, edgeStyle, maxIterations, timeout, maxTokens, maxRuntimeSeconds }
    };
    await saveWorkflowImmediate(updatedWorkflow);
    toast.success('Workflow deployed');
    setShowWorkflowMenu(false);
  }, [workflow, activeCanvasId, snapToGrid, gridStyle, edgeStyle, maxIterations, timeout, maxTokens, maxRuntimeSeconds, saveWorkflowImmediate]);


  const handleUnpublish = useCallback(async () => {
    const bridge = updateHandlersRef.current[activeCanvasId];
    if (!bridge || !workflow) return;
    const { nodes: canvasNodes, edges: canvasEdges } = bridge.getState();
    const updatedWorkflow = {
      ...workflow,
      nodes: canvasNodes as any,
      edges: canvasEdges as any,
      isDeployed: false,
      settings: { snapToGrid, gridStyle, edgeStyle, maxIterations, timeout, maxTokens, maxRuntimeSeconds }
    };
    await saveWorkflowImmediate(updatedWorkflow);
    toast.success('Workflow unpublished (Draft mode)');
    setShowWorkflowMenu(false);
  }, [workflow, activeCanvasId, snapToGrid, gridStyle, edgeStyle, maxIterations, timeout, maxTokens, maxRuntimeSeconds, saveWorkflowImmediate]);

  const handleAutoLayout = useCallback(() => {
    updateHandlersRef.current[activeCanvasId]?.autoLayout();
    setShowWorkflowMenu(false);
  }, [activeCanvasId]);

  const handleClearCanvas = useCallback(() => {
    updateHandlersRef.current[activeCanvasId]?.clearCanvas();
    setShowWorkflowMenu(false);
  }, [activeCanvasId]);

  const confirmDeleteWorkflow = useCallback(() => {
    if (!workflow) return;
    setConfirmDialog({
      isOpen: true,
      title: 'Move to Trash',
      description: 'This will move the workflow to trash. You can restore it later.',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await deleteWorkflow({ id: workflow.id as any });
          toast.success('Workflow moved to trash');
          setConfirmDialog((p) => ({ ...p, isOpen: false }));
        } catch (error) {
          toast.error("Failed to delete workflow");
        }
      },
    });
    setShowWorkflowMenu(false);
  }, [workflow, deleteWorkflow]);

  const handleSelectNode = useCallback((node: Node<NodeData> | null, instanceId: string) => {
    setSelectedNodeByCanvas(prev => ({ ...prev, [instanceId]: node }));
    setActiveCanvasId(instanceId);
    if (node) {
      setInspectorOpen(true);
      setShowSettings(false);
      setShowTestEndpoint(false);
      setShowExecution(false);
    } else {
      setInspectorOpen(false);
    }
  }, []);

  const handleUndoRedoChange = useCallback((id: string, state: { canUndo: boolean, canRedo: boolean }) => {
    setCanvasUndoRedoState(prev => ({ ...prev, [id]: state }));
  }, []);

  const handleUpdateNodeData = useCallback((nodeId: string, data: any) => {
    const handler = updateHandlersRef.current[activeCanvasId];
    if (handler) {
      handler.update(nodeId, data);

      // Also update the local state for the inspector's preview
      setSelectedNodeByCanvas(prev => {
        const current = prev[activeCanvasId];
        if (current && current.id === nodeId) {
          return { ...prev, [activeCanvasId]: { ...current, data: { ...current.data, ...data } } };
        }
        return prev;
      });
    }
  }, [activeCanvasId]);

  const handleDeleteNode = useCallback((nodeId: string) => {
    const handler = updateHandlersRef.current[activeCanvasId];
    if (handler) {
      handler.delete(nodeId);
    }
  }, [activeCanvasId]);

  const onDragStart = (event: DragEvent, nodeType: string, nodeLabel: string, nodeColor: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.setData('application/reactflow-label', nodeLabel);
    event.dataTransfer.setData('application/reactflow-color', nodeColor);
    event.dataTransfer.effectAllowed = 'move';
  };

  const handleShowTestAPI = useCallback(() => {
    setShowExecution(false);
    handleSelectNode(null, activeCanvasId);
    setShowSettings(false);
    setShowTestEndpoint(true);
    setInspectorOpen(true);
  }, [activeCanvasId, handleSelectNode]);

  const handleShowSettings = useCallback(() => {
    handleSelectNode(null, activeCanvasId);
    setShowTestEndpoint(false);
    setShowExecution(false);
    setShowSettings(true);
    setInspectorOpen(true);
  }, [activeCanvasId, handleSelectNode]);

  const handlePreview = useCallback(() => {
    if (validationResult.errors.some(e => e.severity === 'error')) {
      toast.error(`Cannot run workflow: ${validationResult.errors.filter(e => e.severity === 'error').length} critical errors detected.`);
      // We still allow opening the panel so they can see what's wrong if they want,
      // but the "Run" in Execution panel should also be disabled or warned.
    }
    setShowSettings(false);
    setShowTestEndpoint(false);
    setShowExecution(true);
    setInspectorOpen(true);
  }, [validationResult]);

  const handleOpenNestedWorkflow = useCallback((nestedId: string) => {
    setCanvasStack(prev => {
      // Check if already open
      if (prev.find(c => c.workflowId === nestedId)) {
        return prev;
      }

      // Limit to 3
      if (prev.length >= 3) {
        toast.error("Maximum 3 active windows reached", {
          action: {
            label: "Open in new tab",
            onClick: () => window.open(`/workflows/${nestedId}`, '_blank')
          }
        });
        return prev;
      }

      return [...prev, { workflowId: nestedId, instanceId: nestedId }];
    });
    // Set active canvas outside
    setActiveCanvasId(nestedId);
  }, []);

  const handleCloseCanvas = useCallback((instanceId: string) => {
    setCanvasStack(prev => {
      const filtered = prev.filter(c => c.instanceId !== instanceId);
      // Logic for changing active canvas if we close the current one
      if (activeCanvasId === instanceId) {
        setActiveCanvasId(filtered[filtered.length - 1]?.instanceId || "main");
      }
      return filtered;
    });
  }, [activeCanvasId]);

  const activeNode = selectedNodeByCanvas[activeCanvasId];

  const handleRunWithInput = useCallback(async (input: string) => {
    if (!workflow) return;
    await runWorkflow(workflow as any, input);
  }, [workflow, runWorkflow]);

  return (
    <div className="h-screen w-full flex flex-col bg-background-base text-accent-black overflow-hidden font-sans selection:bg-heat-100/30">
      {/* Modern Top Bar */}
      <header className="h-64 border-b border-black-alpha-8 bg-accent-white/80 backdrop-blur-xl flex items-center justify-between px-20 z-[100]">
        <div className="flex items-center gap-16">
          <button onClick={onBack} className="w-36 h-36 rounded-10 bg-accent-white hover:bg-black-alpha-4 border border-black-alpha-8 flex items-center justify-center transition-all group">
            <ChevronLeft className="w-20 h-20 text-black-alpha-56 group-hover:text-accent-black" />
          </button>
          <div className="flex flex-col">
            <div className="flex items-center gap-8">
              <WorkflowNameEditor workflow={workflow} renameTrigger={renameTrigger} onSave={(name) => saveWorkflow({ ...workflow!, name })} />
              <div className={`px-8 py-2 rounded-full border text-[10px] uppercase tracking-wider font-bold flex items-center gap-4 ${workflow?.isDeployed ? 'bg-green-100 border-green-200 text-green-700' : 'bg-black-alpha-4 border-black-alpha-8 text-black-alpha-56'}`}>
                {workflow?.isDeployed ? (
                  <>
                    <span className="w-4 h-4 rounded-full bg-green-500 animate-pulse" />
                    Live
                  </>
                ) : (
                  'Draft'
                )}
              </div>
            </div>
            <p className="text-[11px] text-black-alpha-56 font-medium flex items-center gap-4">
              <span className={`w-6 h-6 rounded-full ${isSaving ? 'bg-amber-500 animate-pulse' : (!convexId ? 'bg-black-alpha-24' : 'bg-green-500')}`} />
              {isSaving ? 'Saving changes...' : (!convexId ? 'Unsaved' : 'Changes saved')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-12">
          <div className="relative" ref={workflowMenuRef}>
            <button onClick={() => setShowWorkflowMenu(!showWorkflowMenu)} className="flex items-center gap-8 px-14 py-8 rounded-10 bg-accent-white hover:bg-black-alpha-4 border border-black-alpha-8 text-accent-black text-sm font-medium transition-all">
              Workflow <ChevronDown className={`w-14 h-14 transition-transform ${showWorkflowMenu ? 'rotate-180' : ''}`} />
            </button>
            <AnimatePresence>
              {showWorkflowMenu && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="absolute right-0 mt-8 w-200 bg-accent-white border border-black-alpha-8 rounded-12 shadow-2xl z-[110] overflow-hidden p-4">
                  <button onClick={handleDuplicateWorkflow} className="w-full px-12 py-8 text-left text-xs font-semibold text-accent-black hover:bg-black-alpha-4 rounded-8 transition-colors">Duplicate</button>
                  <button onClick={() => { setShowSaveAsTemplateModal(true); setShowWorkflowMenu(false); }} className="w-full px-12 py-8 text-left text-xs font-semibold text-accent-black hover:bg-black-alpha-4 rounded-8 transition-colors">Save as Template</button>
                  <button onClick={handleAutoLayout} className="w-full px-12 py-8 text-left text-xs font-semibold text-accent-black hover:bg-black-alpha-4 rounded-8 transition-colors flex items-center justify-between">
                    Auto Layout
                    <Wand2 className="w-14 h-14 text-black-alpha-32" />
                  </button>
                  {workflow?.isDeployed ? (
                    <button onClick={handleUnpublish} className="w-full px-12 py-8 text-left text-xs font-semibold text-accent-black hover:bg-black-alpha-4 rounded-8 transition-colors border-b border-black-alpha-8 mb-4 pb-12 flex items-center justify-between">
                      Unpublish
                      <CloudOff className="w-14 h-14 text-black-alpha-32" />
                    </button>
                  ) : (
                    <button onClick={handleDeploy} className="w-full px-12 py-8 text-left text-xs font-semibold text-accent-black hover:bg-black-alpha-4 rounded-8 transition-colors border-b border-black-alpha-8 mb-4 pb-12 flex items-center justify-between">
                      Deploy
                      <CloudUpload className="w-14 h-14 text-black-alpha-32" />
                    </button>
                  )}
                  <button onClick={handleClearCanvas} className="w-full px-12 py-8 text-left text-xs font-semibold text-accent-black hover:bg-black-alpha-4 rounded-8 transition-colors">Clear</button>
                  <button onClick={confirmDeleteWorkflow} className="w-full px-12 py-8 text-left text-xs font-semibold text-red-500 hover:bg-red-500/10 rounded-8 transition-colors">Delete</button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <div className="flex items-center gap-4 mr-8 border-r border-black-alpha-8 pr-12">
            <button
              onClick={handleUndo}
              disabled={!activeUndoRedo.canUndo}
              className={`w-32 h-32 rounded-8 flex items-center justify-center transition-all ${activeUndoRedo.canUndo ? 'text-black-alpha-56 hover:bg-black-alpha-4 hover:text-accent-black' : 'text-black-alpha-16 cursor-not-allowed'}`}
              title="Undo (Ctrl+Z)"
            >
              <Undo className="w-16 h-16" />
            </button>
            <button
              onClick={handleRedo}
              disabled={!activeUndoRedo.canRedo}
              className={`w-32 h-32 rounded-8 flex items-center justify-center transition-all ${activeUndoRedo.canRedo ? 'text-black-alpha-56 hover:bg-black-alpha-4 hover:text-accent-black' : 'text-black-alpha-16 cursor-not-allowed'}`}
              title="Redo (Ctrl+Y)"
            >
              <Redo className="w-16 h-16" />
            </button>
          </div>

          <button onClick={handleShowSettings} className="flex items-center gap-8 px-14 py-8 rounded-10 bg-accent-white hover:bg-black-alpha-4 border border-black-alpha-8 text-accent-black text-sm font-medium transition-all">
            <Settings2 className="w-16 h-16" /> Config
          </button>

          {/* Validation Indicator */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className={`flex items-center gap-6 px-12 py-8 rounded-10 border transition-all cursor-help ${validationResult.isValid ? 'bg-green-500/5 border-green-500/20 text-green-600' :
                  validationResult.errors.some(e => e.severity === 'error') ? 'bg-red-500/5 border-red-500/20 text-red-600' :
                    'bg-amber-500/5 border-amber-500/20 text-amber-600'
                  }`}>
                  {validationResult.isValid ? (
                    <CheckCircle2 className="w-14 h-14" />
                  ) : validationResult.errors.some(e => e.severity === 'error') ? (
                    <AlertTriangle className="w-14 h-14" />
                  ) : (
                    <Info className="w-14 h-14" />
                  )}
                  <span className="text-[11px] font-bold uppercase tracking-wider">
                    {validationResult.isValid ? 'Valid' :
                      validationResult.errors.some(e => e.severity === 'error') ?
                        `${validationResult.errors.filter(e => e.severity === 'error').length} Errors` :
                        `${validationResult.errors.length} Warnings`
                    }
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="w-280 p-0 bg-accent-white border border-black-alpha-12 shadow-2xl">
                <div className="p-12 border-b border-black-alpha-8 bg-black-alpha-4">
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-black-alpha-56">Workflow Validation</h4>
                </div>
                <div className="max-h-300 overflow-y-auto p-4">
                  {validationResult.errors.length === 0 ? (
                    <div className="p-12 text-xs text-black-alpha-44 text-center">No issues detected</div>
                  ) : (
                    validationResult.errors.map((error, i) => (
                      <div key={i} className="p-10 flex gap-10 hover:bg-black-alpha-4 rounded-8 transition-colors">
                        {error.severity === 'error' ? (
                          <XCircle className="w-14 h-14 text-red-500 mt-2 shrink-0" />
                        ) : error.severity === 'warning' ? (
                          <AlertTriangle className="w-14 h-14 text-amber-500 mt-2 shrink-0" />
                        ) : (
                          <Info className="w-14 h-14 text-blue-500 mt-2 shrink-0" />
                        )}
                        <div className="space-y-2">
                          <p className="text-xs font-semibold text-accent-black leading-tight">{error.message}</p>
                          {error.nodeId && (
                            <p className="text-[10px] text-black-alpha-44 font-medium uppercase tracking-tighter">Node: {error.nodeId}</p>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <button onClick={handleShowTestAPI} className="flex items-center gap-8 px-14 py-8 rounded-10 bg-accent-white hover:bg-black-alpha-4 border border-black-alpha-8 text-accent-black text-sm font-medium transition-all">
            <Activity className="w-16 h-16" /> API
          </button>
          {!isRunning ? (
            <button onClick={handlePreview} className="flex items-center gap-8 px-16 py-8 rounded-10 bg-heat-100 hover:bg-heat-200 text-white text-sm font-semibold shadow-[0_0_20px_rgba(250,93,25,0.3)] transition-all active:scale-95">
              <Play className="w-16 h-16 fill-current" /> Run
            </button>
          ) : (
            <button onClick={stopWorkflow} className="flex items-center gap-8 px-16 py-8 rounded-10 bg-red-500 hover:bg-red-600 text-white text-sm font-semibold transition-all">
              <StopCircle className="w-16 h-16" /> Stop
            </button>
          )}
          <button onClick={handleSave} className="flex items-center gap-8 px-14 py-8 rounded-10 bg-accent-white hover:bg-black-alpha-4 border border-black-alpha-8 text-accent-black text-sm font-semibold transition-all">
            <Save className="w-16 h-16" /> Save
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Nav */}
        <nav className="w-64 border-r border-black-alpha-8 bg-accent-white flex flex-col items-center py-20 gap-12 z-40">
          {[
            { id: 'nodes', icon: LayoutGrid, tooltip: 'Nodes' },
            { id: 'library', icon: Layers, tooltip: 'Library' },
            { id: 'settings', icon: Settings2, tooltip: 'Settings' }
          ].map((tab) => (
            <button key={tab.id} onClick={() => { setActiveSidebarTab(tab.id as any); setSidebarExpanded(true); }} className={`w-40 h-40 rounded-12 flex items-center justify-center transition-all group relative ${activeSidebarTab === tab.id ? 'bg-heat-100 text-white' : 'text-black-alpha-56 hover:bg-black-alpha-4 hover:text-accent-black'}`}>
              <tab.icon className="w-20 h-20" />
            </button>
          ))}
        </nav>

        {/* Sidebar Content */}
        <AnimatePresence mode="wait">
          {sidebarExpanded && (
            <motion.aside initial={{ width: 0, opacity: 0 }} animate={{ width: 280, opacity: 1 }} exit={{ width: 0, opacity: 0 }} className="relative border-r border-black-alpha-8 bg-accent-white flex flex-col overflow-hidden shadow-2xl">
              <div className="flex items-center justify-between p-20 border-b border-black-alpha-8">
                <h3 className="text-sm font-bold uppercase tracking-wider text-black-alpha-56">{activeSidebarTab}</h3>
                <button onClick={() => setSidebarExpanded(false)} className="w-24 h-24 rounded-6 hover:bg-black-alpha-4 flex items-center justify-center text-black-alpha-56 transition-all"><ChevronLeft className="w-16 h-16" /></button>
              </div>
              <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-black-alpha-8 scrollbar-track-transparent">
                {activeSidebarTab === 'nodes' && (
                  <div className="p-20 space-y-24">
                    {nodeCategories.map((cat) => (
                      <div key={cat.category}>
                        <h4 className="text-[10px] font-bold text-black-alpha-56 uppercase tracking-wider mb-12 px-8">{cat.category}</h4>
                        <div className="grid grid-cols-1 gap-8">
                          {cat.nodes.map((node) => (
                            <motion.div key={node.type} draggable onDragStart={(e) => onDragStart(e as any, node.type, node.label, node.color)} className="flex items-center gap-12 p-10 rounded-12 bg-background-base border border-black-alpha-8 hover:border-heat-100/50 hover:bg-black-alpha-4 transition-all cursor-grab active:cursor-grabbing">
                              <div className={`w-32 h-32 rounded-10 ${node.color} flex items-center justify-center`}><node.icon className="w-16 h-16 text-white" /></div>
                              <span className="text-xs font-semibold text-accent-black">{node.label}</span>
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {activeSidebarTab === 'library' && (
                  <LibraryPanel
                    onAddSource={() => setShowSourceSelector(true)}
                    onAddMCPServer={() => setShowSettings(true)}
                  />
                )}
                {activeSidebarTab === 'settings' && (
                  <WorkflowSettingsPanel
                    workflow={workflow}
                    onUpdateWorkflow={(updates) => saveWorkflow({ ...workflow!, ...updates })}
                    onOpenGlobalSettings={handleShowSettings}
                    snapToGrid={snapToGrid}
                    setSnapToGrid={setSnapToGrid}
                    gridStyle={gridStyle}
                    setGridStyle={setGridStyle}
                    edgeStyle={edgeStyle}
                    setEdgeStyle={setEdgeStyle}
                    maxIterations={maxIterations}
                    setMaxIterations={setMaxIterations}
                    timeout={timeout}
                    setTimeout={setTimeoutSec}
                    maxTokens={maxTokens}
                    setMaxTokens={setMaxTokens}
                    maxRuntimeSeconds={maxRuntimeSeconds}
                    setMaxRuntimeSeconds={setMaxRuntimeSeconds}
                  />
                )}
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* Main Workspace */}
        <motion.main initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 relative flex overflow-hidden">
          <div className={`flex-1 grid gap-1 h-full w-full ${canvasStack.length === 1 ? 'grid-cols-1' :
            canvasStack.length === 2 ? 'grid-cols-2' :
              'grid-cols-[1fr_1fr]'
            }`}>
            {/* Column 1 (Main) */}
            <div className="h-full w-full relative">
              {canvasStack[0] && (
                <CanvasWindow
                  workflowId={canvasStack[0].workflowId}
                  instanceId="main"
                  isMain={true}
                  onSelectNode={handleSelectNode}
                  onOpenNestedWorkflow={handleOpenNestedWorkflow}
                  snapToGrid={snapToGrid}
                  gridStyle={gridStyle}
                  edgeStyle={edgeStyle}
                  onGridStyleChange={(style) => setGridStyle(style)}
                  onEdgeStyleChange={(style) => setEdgeStyle(style)}
                  activeNodeId={currentNodeId}
                  nodeResults={nodeResults}
                  onRegisterUpdate={(id, h) => { updateHandlersRef.current[id] = h; }}
                  onUndoRedoStateChange={handleUndoRedoChange}
                  onFocus={setActiveCanvasId}
                  isFocused={activeCanvasId === "main"}
                />
              )}
            </div>

            {/* Column 2 (Secondary/Stack) */}
            {canvasStack.length > 1 && (
              <div className={`grid gap-1 ${canvasStack.length === 2 ? 'grid-rows-1' : 'grid-rows-2'}`}>
                {canvasStack.slice(1).map((c) => (
                  <CanvasWindow
                    key={c.instanceId}
                    workflowId={c.workflowId}
                    instanceId={c.instanceId}
                    onSelectNode={handleSelectNode}
                    onOpenNestedWorkflow={handleOpenNestedWorkflow}
                    onClose={handleCloseCanvas}
                    snapToGrid={snapToGrid}
                    gridStyle={gridStyle}
                    edgeStyle={edgeStyle}
                    onGridStyleChange={(style) => setGridStyle(style)}
                    onEdgeStyleChange={(style) => setEdgeStyle(style)}
                    onRegisterUpdate={(id, h) => { updateHandlersRef.current[id] = h; }}
                    onUndoRedoStateChange={handleUndoRedoChange}
                    onFocus={setActiveCanvasId}
                    isFocused={activeCanvasId === c.instanceId}
                  />
                ))}
              </div>
            )}
          </div>
        </motion.main>

        {/* Unified Inspector */}
        <AnimatePresence>
          {inspectorOpen && (
            <motion.aside initial={{ width: 0, opacity: 0 }} animate={{ width: 380, opacity: 1 }} exit={{ width: 0, opacity: 0 }} className="relative border-l border-black-alpha-8 bg-accent-white flex flex-col overflow-hidden shadow-2xl h-full">
              <div className="flex items-center justify-between p-20 border-b border-black-alpha-8">
                <div className="flex items-center gap-10">
                  <div className={`w-28 h-28 rounded-8 ${activeNode ? getNodeColor(activeNode.type || '') : 'bg-heat-100'} flex items-center justify-center`}>
                    <LayoutGrid className="w-14 h-14 text-white" />
                  </div>
                  <h3 className="text-sm font-bold text-accent-black tracking-tight">
                    {showSettings ? 'Project Settings' : (activeNode?.data?.nodeName || activeNode?.data?.label || 'Properties')}
                  </h3>
                </div>
                <button onClick={() => { setInspectorOpen(false); setSelectedNodeByCanvas(p => ({ ...p, [activeCanvasId]: null })); setShowSettings(false); }} className="w-28 h-28 rounded-8 hover:bg-black-alpha-4 flex items-center justify-center text-black-alpha-56 transition-all"><ChevronRight className="w-18 h-18" /></button>
              </div>

              {showSettings ? (
                <SettingsPanel isOpen={true} onClose={() => { setShowSettings(false); setInspectorOpen(false); }} />
              ) : showTestEndpoint && workflow ? (
                <TestEndpointPanel key={workflow.id} workflowId={workflow.id} workflow={{ ...workflow }} environment={environment} onClose={() => setShowTestEndpoint(false)} />
              ) : showExecution ? (
                <ExecutionPanel workflow={workflow ? { ...workflow } : null} execution={execution} nodeResults={nodeResults} isRunning={isRunning} currentNodeId={currentNodeId} onRun={handleRunWithInput} onResumePendingAuth={resumeWorkflow} onRetry={retryExecution} onClose={() => setShowExecution(false)} environment={environment} pendingAuth={pendingAuth} />
              ) : (activeNode?.data as any)?.nodeType === 'mcp' ? (
                <MCPPanel node={activeNode as any} mode="configure" onClose={() => { setInspectorOpen(false); setSelectedNodeByCanvas(p => ({ ...p, [activeCanvasId]: null })); }} onUpdate={handleUpdateNodeData} />
              ) : (activeNode?.data as any)?.nodeType === 'router' ? (
                <RouterNodePanel node={activeNode as any} updateNodeData={handleUpdateNodeData} />
              ) : (activeNode?.data as any)?.nodeType?.includes('if') || (activeNode?.data as any)?.nodeType?.includes('while') || (activeNode?.data as any)?.nodeType?.includes('appr') ? (
                <LogicNodePanel node={activeNode as any} nodes={[]} onClose={() => { setInspectorOpen(false); setSelectedNodeByCanvas(p => ({ ...p, [activeCanvasId]: null })); }} onDelete={handleDeleteNode} onUpdate={handleUpdateNodeData} />
              ) : (activeNode?.data as any)?.nodeType?.includes('trans') || (activeNode?.data as any)?.nodeType?.includes('set-state') || (activeNode?.data as any)?.nodeType?.includes('query') ? (
                <DataNodePanel node={activeNode as any} nodes={[]} onClose={() => { setInspectorOpen(false); setSelectedNodeByCanvas(p => ({ ...p, [activeCanvasId]: null })); }} onDelete={handleDeleteNode} onUpdate={handleUpdateNodeData} />
              ) : (activeNode?.data as any)?.nodeType === 'extract' ? (
                <ExtractNodePanel node={activeNode as any} nodes={[]} onClose={() => { setInspectorOpen(false); setSelectedNodeByCanvas(p => ({ ...p, [activeCanvasId]: null })); }} onDelete={handleDeleteNode} onUpdate={handleUpdateNodeData} onAddMCP={() => { }} />
              ) : (activeNode?.data as any)?.nodeType === 'retriever' ? (
                <RetrieverNodePanel node={activeNode as any} nodes={[]} updateNodeData={handleUpdateNodeData} />
              ) : (activeNode?.data as any)?.nodeType === 'memory' ? (
                <MemoryNodePanel node={activeNode as any} nodes={[]} onClose={() => { setInspectorOpen(false); setSelectedNodeByCanvas(p => ({ ...p, [activeCanvasId]: null })); }} onDelete={handleDeleteNode} onUpdate={handleUpdateNodeData} />
              ) : (activeNode?.data as any)?.nodeType === 'http' ? (
                <HTTPNodePanel node={activeNode as any} nodes={[]} onClose={() => { setInspectorOpen(false); setSelectedNodeByCanvas(p => ({ ...p, [activeCanvasId]: null })); }} onDelete={handleDeleteNode} onUpdate={handleUpdateNodeData} />
              ) : (activeNode?.data as any)?.nodeType === 'start' ? (
                <StartNodePanel node={activeNode as any} onClose={() => { setInspectorOpen(false); setSelectedNodeByCanvas(p => ({ ...p, [activeCanvasId]: null })); }} onUpdate={handleUpdateNodeData} />
              ) : (activeNode?.data as any)?.nodeType === 'workflow' ? (
                <div className="p-40 space-y-24">
                  <div className="p-20 rounded-16 bg-teal-50 border border-teal-100 space-y-12">
                    <div className="flex items-center gap-12">
                      <div className="w-40 h-40 rounded-12 bg-teal-600 flex items-center justify-center shadow-lg shadow-teal-200">
                        <Layers className="w-20 h-20 text-white" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-teal-900">{activeNode?.data?.label}</h4>
                        <p className="text-[10px] font-medium text-teal-600 uppercase tracking-wider">Nested Workflow</p>
                      </div>
                    </div>
                    <p className="text-xs text-teal-700 leading-relaxed">
                      This node represents a nested workflow. Any changes made in the side canvas will be saved directly to this workflow asset.
                    </p>
                  </div>
                </div>
              ) : activeNode ? (
                <NodePanel node={activeNode as any} nodes={[]} onClose={() => { setInspectorOpen(false); setSelectedNodeByCanvas(p => ({ ...p, [activeCanvasId]: null })); }} onAddMCP={() => { }} onDelete={handleDeleteNode} onUpdate={handleUpdateNodeData} onOpenSettings={handleShowSettings} />
              ) : (
                <div className="p-40 text-center text-black-alpha-56">Select a node to edit</div>
              )}
            </motion.aside>
          )}
        </AnimatePresence>
      </div>

      {/* Context Menu and Dialogs moved to WorkflowCanvas */}
      <ShareWorkflowModal isOpen={showShareModal} onClose={() => setShowShareModal(false)} workflowId={workflow?.id || ''} workflowName={workflow?.name || 'Workflow'} />
      <SaveAsTemplateModal isOpen={showSaveAsTemplateModal} onClose={() => setShowSaveAsTemplateModal(false)} workflowId={convexId || ''} workflowName={workflow?.name || 'Workflow'} />
      <SourceSelectorModal
        isOpen={showSourceSelector}
        onClose={() => setShowSourceSelector(false)}
        onSelect={async (data: any) => {
          try {
            const loadingToast = toast.loading(`Creating integration ${data.name}...`);
            await createConnector({
              name: data.name,
              type: data.category === 'database' ? 'database' : 'custom',
              config: data.config,
            });
            toast.success(`Success! Connected to ${data.name}.`, { id: loadingToast });
            setShowSourceSelector(false);
          } catch (error) {
            toast.error("Failed to create integration");
            console.error(error);
          }
        }}
      />

      {/* Context Menu and Dialogs moved to WorkflowCanvas */}

      <style jsx global>{`
        .react-flow__pane {
          cursor: default !important;
        }
        .react-flow__pane.dragging {
          cursor: grabbing !important;
        }
        .react-flow__node {
          cursor: pointer !important;
        }
        .react-flow__edge {
          cursor: pointer !important;
        }
        .react-flow__controls button {
          cursor: pointer !important;
        }
        .react-flow__selectionpane {
          cursor: crosshair !important;
        }
      `}</style>
    </div >
  );
}

export default function WorkflowBuilder(props: WorkflowBuilderProps) {
  return (
    <ErrorBoundary>
      <WorkflowBuilderInner {...props} />
    </ErrorBoundary>
  );
}
