"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useCallback, useRef, DragEvent, useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";

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
// import "@/styles/workflow-execution.css"; // Broken after cleanup
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { AlertTriangle, CheckCircle2, Info, MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

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
      { type: "guardrails", label: "Guardrails", color: "bg-primary", icon: Shield },
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
      router.push(`/dashboard/workflow/${workflow.id}`);
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
    <div className="h-screen w-full flex flex-col bg-background text-foreground overflow-hidden font-sans selection:bg-primary/30">
      {/* Standardized Top Bar */}
      <header className="h-14 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex items-center justify-between px-4 z-[100] shrink-0">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={onBack}
            className="h-9 w-9"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <div className="flex flex-col">
            <div className="flex items-center gap-3">
              <WorkflowNameEditor
                workflow={workflow}
                renameTrigger={renameTrigger}
                onSave={(name) => saveWorkflow({ ...workflow!, name })}
              />
              <Badge variant={workflow?.isDeployed ? "default" : "secondary"} className="h-5 px-1.5 text-[10px] font-bold uppercase tracking-wider">
                {workflow?.isDeployed ? (
                  <span className="flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary-foreground animate-pulse" />
                    Live
                  </span>
                ) : (
                  'Draft'
                )}
              </Badge>
            </div>
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-medium">
              <div className={`h-1.5 w-1.5 rounded-full ${isSaving ? 'bg-amber-500 animate-pulse' : (!convexId ? 'bg-muted-foreground/30' : 'bg-green-500')}`} />
              {isSaving ? 'Saving' : (!convexId ? 'Unsaved' : 'Saved')}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 gap-2">
                Workflow
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={handleDuplicateWorkflow} className="gap-2">
                <Copy className="h-4 w-4" /> Duplicate
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowSaveAsTemplateModal(true)} className="gap-2">
                <LayoutGrid className="h-4 w-4" /> Save as Template
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleAutoLayout} className="gap-2">
                <Wand2 className="h-4 w-4" /> Auto Layout
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {workflow?.isDeployed ? (
                <DropdownMenuItem onClick={handleUnpublish} className="gap-2">
                  <CloudOff className="h-4 w-4" /> Unpublish
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={handleDeploy} className="gap-2">
                  <CloudUpload className="h-4 w-4" /> Deploy
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={handleClearCanvas} className="gap-2">
                <Undo className="h-4 w-4" /> Clear Canvas
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={confirmDeleteWorkflow} className="text-destructive gap-2 focus:text-destructive">
                <Trash2 className="h-4 w-4" /> Move to Trash
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="flex items-center gap-1 border-r pr-2 mr-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleUndo}
                    disabled={!activeUndoRedo.canUndo}
                    className="h-8 w-8"
                  >
                    <Undo className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Undo (Ctrl+Z)</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleRedo}
                    disabled={!activeUndoRedo.canRedo}
                    className="h-8 w-8"
                  >
                    <Redo className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Redo (Ctrl+Y)</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          <Button variant="outline" size="sm" onClick={handleShowSettings} className="h-9 gap-2">
            <Settings2 className="h-4 w-4" />
            Config
          </Button>

          {/* Validation Indicator */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge
                  variant="outline"
                  className={`h-9 px-3 cursor-help gap-2 ${validationResult.isValid ? 'bg-green-50 text-green-700 border-green-200' :
                      validationResult.errors.some(e => e.severity === 'error') ? 'bg-destructive/10 text-destructive border-destructive/20' :
                        'bg-amber-50 text-amber-700 border-amber-200'
                    }`}
                >
                  {validationResult.isValid ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : validationResult.errors.some(e => e.severity === 'error') ? (
                    <AlertTriangle className="h-4 w-4" />
                  ) : (
                    <Info className="h-4 w-4" />
                  )}
                  <span className="text-[10px] font-bold uppercase tracking-wider">
                    {validationResult.isValid ? 'Valid' :
                      validationResult.errors.some(e => e.severity === 'error') ?
                        `${validationResult.errors.filter(e => e.severity === 'error').length} Errors` :
                        `${validationResult.errors.length} Warnings`
                    }
                  </span>
                </Badge>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="w-[280px] p-0 shadow-lg">
                <div className="px-3 py-2 border-b bg-muted/50">
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Workflow Validation</h4>
                </div>
                <div className="max-h-[300px] overflow-y-auto p-1">
                  {validationResult.errors.length === 0 ? (
                    <div className="p-4 text-xs text-muted-foreground text-center italic">No issues detected</div>
                  ) : (
                    validationResult.errors.map((error, i) => (
                      <div key={i} className="p-2 flex gap-3 hover:bg-muted rounded-md transition-colors">
                        {error.severity === 'error' ? (
                          <XCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                        ) : error.severity === 'warning' ? (
                          <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                        ) : (
                          <Info className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                        )}
                        <div className="space-y-1">
                          <p className="text-xs font-semibold leading-tight">{error.message}</p>
                          {error.nodeId && (
                            <p className="text-[10px] text-muted-foreground font-mono">Node: {error.nodeId}</p>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <Button variant="outline" size="sm" onClick={handleShowTestAPI} className="h-9 gap-2">
            <Activity className="h-4 w-4" />
            API
          </Button>

          {!isRunning ? (
            <Button
              onClick={handlePreview}
              className="h-9 px-4 gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-sm"
            >
              <Play className="h-4 w-4 fill-current" />
              Run
            </Button>
          ) : (
            <Button
              variant="destructive"
              size="sm"
              onClick={stopWorkflow}
              className="h-9 px-4 gap-2"
            >
              <StopCircle className="h-4 w-4" />
              Stop
            </Button>
          )}

          <Button variant="outline" size="sm" onClick={handleSave} className="h-9 gap-2">
            <Save className="h-4 w-4" />
            Save
          </Button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Nav */}
        <nav className="w-14 border-r bg-background flex flex-col items-center py-4 gap-4 z-40 shrink-0">
          {[
            { id: 'nodes', icon: LayoutGrid, tooltip: 'Nodes' },
            { id: 'library', icon: Layers, tooltip: 'Library' },
            { id: 'settings', icon: Settings2, tooltip: 'Settings' }
          ].map((tab) => (
            <TooltipProvider key={tab.id}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={activeSidebarTab === tab.id ? "default" : "ghost"}
                    size="icon"
                    onClick={() => { setActiveSidebarTab(tab.id as any); setSidebarExpanded(true); }}
                    className={`h-10 w-10 transition-all ${activeSidebarTab === tab.id ? 'shadow-md shadow-primary/20' : ''}`}
                  >
                    <tab.icon className="h-5 w-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">{tab.tooltip}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ))}
        </nav>

        {/* Sidebar Content */}
        <AnimatePresence mode="wait">
          {sidebarExpanded && (
            <motion.aside
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 300, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              className="relative border-r bg-background flex flex-col overflow-hidden shadow-sm h-full"
            >
              <div className="flex items-center justify-between p-4 border-b bg-muted/30">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{activeSidebarTab}</h3>
                <Button variant="ghost" size="icon" onClick={() => setSidebarExpanded(false)} className="h-7 w-7">
                  <ChevronLeft className="h-4 w-4 text-muted-foreground" />
                </Button>
              </div>
              <ScrollArea className="flex-1">
                <div className="p-4 space-y-6">
                  {activeSidebarTab === 'nodes' && (
                    <div className="space-y-6">
                      {nodeCategories.map((cat) => (
                        <div key={cat.category} className="space-y-3">
                          <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-2">{cat.category}</h4>
                          <div className="grid grid-cols-1 gap-2">
                            {cat.nodes.map((node) => (
                              <motion.div
                                key={node.type}
                                draggable
                                onDragStart={(e) => onDragStart(e as any, node.type, node.label, node.color)}
                                className="flex items-center gap-3 p-2 rounded-lg bg-card border border-border/50 hover:border-primary/50 hover:bg-accent/50 transition-all cursor-grab active:cursor-grabbing group"
                              >
                                <div className={`h-8 w-8 rounded-md ${node.color} flex items-center justify-center shadow-sm brightness-110 group-hover:brightness-125 transition-all`}>
                                  <node.icon className="h-4 w-4 text-white" />
                                </div>
                                <span className="text-xs font-medium text-foreground">{node.label}</span>
                              </motion.div>
                            ))}
                          </div>
                          {cat !== nodeCategories[nodeCategories.length - 1] && <Separator className="mt-4 opacity-50" />}
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
              </ScrollArea>
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
            <motion.aside
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 400, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              className="relative border-l bg-background flex flex-col overflow-hidden shadow-lg h-full"
            >
              <div className="flex items-center justify-between p-4 border-b bg-muted/30">
                <div className="flex items-center gap-3">
                  <div className={`h-8 w-8 rounded-lg ${activeNode ? getNodeColor(activeNode.type || '') : 'bg-primary'} flex items-center justify-center shadow-sm`}>
                    <LayoutGrid className="h-4 w-4 text-white" />
                  </div>
                  <h3 className="text-sm font-bold tracking-tight">
                    {showSettings ? 'Project Settings' : (activeNode?.data?.nodeName || activeNode?.data?.label || 'Properties')}
                  </h3>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => { setInspectorOpen(false); setSelectedNodeByCanvas(p => ({ ...p, [activeCanvasId]: null })); setShowSettings(false); }}
                  className="h-7 w-7"
                >
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </Button>
              </div>

              <ScrollArea className="flex-1">
                <div className="p-6">
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
                    <div className="space-y-6">
                      <div className="p-4 rounded-xl bg-primary/5 border border-primary/10 space-y-3">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
                            <Layers className="h-5 w-5 text-white" />
                          </div>
                          <div>
                            <h4 className="text-sm font-bold">{activeNode?.data?.label}</h4>
                            <p className="text-[10px] font-bold text-primary uppercase tracking-widest">Nested Workflow</p>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          This node represents a nested workflow. Any changes made in the side canvas will be saved directly to this workflow asset.
                        </p>
                      </div>
                    </div>
                  ) : activeNode ? (
                    <NodePanel node={activeNode as any} nodes={[]} onClose={() => { setInspectorOpen(false); setSelectedNodeByCanvas(p => ({ ...p, [activeCanvasId]: null })); }} onAddMCP={() => { }} onDelete={handleDeleteNode} onUpdate={handleUpdateNodeData} onOpenSettings={handleShowSettings} />
                  ) : (
                    <div className="py-20 text-center text-muted-foreground italic text-xs">Select a node to edit</div>
                  )}
                </div>
              </ScrollArea>
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
    <WorkflowBuilderInner {...props} />
  );
}
