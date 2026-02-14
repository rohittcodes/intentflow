"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useCallback, useRef, DragEvent, useState, useEffect } from "react";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  useReactFlow,
  ReactFlowProvider,
  type OnConnect,
  type Node,
  type Edge,
  type NodeMouseHandler,
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
} from "lucide-react";
import NodePanel from "./NodePanel";
import MCPPanel from "./MCPPanel";
import PreviewPanel from "./PreviewPanel";
import ExecutionPanel from "./ExecutionPanel";
import TestEndpointPanel from "./TestEndpointPanel";
import LogicNodePanel from "./LogicNodePanel";
import DataNodePanel from "./DataNodePanel";
import HTTPNodePanel from "./HTTPNodePanel";
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
import { toast } from "sonner";
import { useWorkflow } from "@/hooks/useWorkflow";
import { useWorkflowExecution } from "@/hooks/useWorkflowExecution";
import { getWorkflow } from "@/lib/workflow/storage";
import type { WorkflowNode, WorkflowEdge } from "@/lib/workflow/types";
import { nodeTypes } from "./CustomNodes";
import type { NodeData } from "@/lib/workflow/types";
import { detectDuplicateCredentials } from "@/lib/workflow/duplicate-detection";
import { cleanupInvalidEdges } from "@/lib/workflow/edge-cleanup";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

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
      { type: "retriever", label: "Retriever", color: "bg-[#ECE3FF] dark:bg-[#9665FF]", icon: Database },
      { type: "http", label: "HTTP", color: "bg-[#ECE3FF] dark:bg-[#9665FF]", icon: Server },
      { type: "set-state", label: "Set state", color: "bg-[#ECE3FF] dark:bg-[#9665FF]", icon: Braces },
    ],
  },
];

// Utility to get node color based on type
const getNodeColor = (type: string): string => {
  const colorMap: Record<string, string> = {
    'agent': 'bg-blue-500',
    'custom-input': 'bg-indigo-500',
    'mcp': 'bg-heat-100',
    'if-else': 'bg-orange-500',
    'router': 'bg-orange-500',
    'while': 'bg-orange-500',
    'user-approval': 'bg-gray-400',
    'transform': 'bg-purple-500',
    'extract': 'bg-purple-500',
    'retriever': 'bg-purple-500',
    'http': 'bg-purple-500',
    'start': 'bg-gray-600',
    'end': 'bg-teal-500',
    'note': 'bg-gray-200',
  };
  return colorMap[type] || 'bg-gray-500';
};

// Auto-layout function to position nodes left to right
const autoLayoutNodes = (nodes: Node[], edges: Edge[]) => {
  if (nodes.length === 0) return nodes;

  const LAYER_SPACING = 350;
  const NODE_SPACING = 150;
  const START_X = 100;
  const START_Y = 100;

  const adjacency: { [key: string]: string[] } = {};
  nodes.forEach(n => (adjacency[n.id] = []));

  edges.forEach(e => {
    if (adjacency[e.source] && adjacency[e.target] !== undefined) {
      adjacency[e.source].push(e.target);
    }
  });

  const layers: { [key: string]: number } = {};
  const queue: string[] = [];

  const startNode = nodes.find(n => (n.data as any)?.nodeType === 'start');
  if (startNode) {
    layers[startNode.id] = 0;
    queue.push(startNode.id);
  } else if (nodes.length > 0) {
    layers[nodes[0].id] = 0;
    queue.push(nodes[0].id);
  }

  while (queue.length > 0) {
    const nodeId = queue.shift()!;
    const currentLayer = layers[nodeId];
    const children = adjacency[nodeId];
    if (children) {
      for (const childId of children) {
        if (!(childId in layers)) {
          layers[childId] = currentLayer + 1;
          queue.push(childId);
        }
      }
    }
  }

  for (const node of nodes) {
    if (!(node.id in layers)) {
      layers[node.id] = Math.max(...Object.values(layers), -1) + 1;
    }
  }

  const nodesByLayer: { [key: number]: Node[] } = {};
  for (const node of nodes) {
    const layer = layers[node.id];
    if (!nodesByLayer[layer]) nodesByLayer[layer] = [];
    nodesByLayer[layer].push(node);
  }

  const layoutNodes: Node[] = [];
  for (const layer in nodesByLayer) {
    const layerNodes = nodesByLayer[layer];
    const nodesInLayer = layerNodes.length;
    const totalHeight = (nodesInLayer - 1) * NODE_SPACING;
    const startYForLayer = START_Y + (300 - totalHeight / 2);

    layerNodes.forEach((node, index) => {
      layoutNodes.push({
        ...node,
        position: {
          x: START_X + parseInt(layer) * LAYER_SPACING,
          y: startYForLayer + index * NODE_SPACING,
        },
      });
    });
  }

  return layoutNodes;
};

function WorkflowBuilderInner({ onBack, initialWorkflowId, initialTemplateId }: WorkflowBuilderProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<NodeData>>(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [initialized, setInitialized] = useState(false);
  const [currentTemplateId, setCurrentTemplateId] = useState<string | null>(initialTemplateId ?? null);

  const template = useQuery(api.workflows.getTemplateByCustomId,
    currentTemplateId ? { customId: currentTemplateId } : "skip"
  );

  const [selectedNode, setSelectedNode] = useState<Node<NodeData> | null>(null);
  const [showExecution, setShowExecution] = useState(false);
  const [showTestEndpoint, setShowTestEndpoint] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showSaveAsTemplateModal, setShowSaveAsTemplateModal] = useState(false);
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

  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; nodeId: string } | null>(null);
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
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const nodeIdRef = useRef(2);
  const { screenToFlowPosition, getNode, setCenter } = useReactFlow<Node<NodeData>>();

  const getId = useCallback(() => `node_${nodeIdRef.current++}`, []);

  const { workflow, convexId, updateNodes, updateEdges, saveWorkflow, saveWorkflowImmediate, deleteWorkflow, createNewWorkflow } = useWorkflow(initialWorkflowId || undefined);
  const { runWorkflow, stopWorkflow, isRunning, nodeResults, execution, currentNodeId, pendingAuth, resumeWorkflow } = useWorkflowExecution();

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
    setEnvironment('draft');
    setShowTestEndpoint(false);
  }, [workflow?.id]);

  const isCtrlPressed = useKeyPress(['Control', 'Meta']);

  const handleDuplicateWorkflow = useCallback(() => {
    if (!workflow) return;
    const original = workflow;
    const newWorkflow = createNewWorkflow();
    setShowWorkflowMenu(false);
    setTimeout(() => {
      saveWorkflow({
        name: `${original.name || 'Workflow'} Copy`,
        description: original.description,
        nodes: original.nodes,
        edges: original.edges,
      });
      toast.success('Workflow duplicated');
    }, 0);
  }, [workflow, createNewWorkflow, saveWorkflow]);

  const handleRenameWorkflow = useCallback(() => {
    setRenameTrigger(prev => prev + 1);
    setShowWorkflowMenu(false);
  }, []);

  const handleSaveWorkflowImmediate = useCallback(() => {
    if (!workflow) return;
    const updatedWorkflow = {
      ...workflow,
      nodes: nodes.map(n => ({
        ...n,
        type: n.type || 'default',
        data: {
          ...n.data,
          label: typeof n.data.label === 'string' ? n.data.label : 'Node',
          nodeType: n.data.nodeType || n.type,
        },
      })) as any,
      edges: edges as any,
    };
    saveWorkflow(updatedWorkflow);
    toast.success('Saved to Cloud');
    setShowWorkflowMenu(false);
  }, [workflow, nodes, edges, saveWorkflow]);

  const handleClearCanvas = useCallback(() => {
    setConfirmDialog({
      isOpen: true,
      title: 'Clear Canvas',
      description: 'This will remove all nodes. This action cannot be undone.',
      variant: 'warning',
      onConfirm: () => {
        setNodes(initialNodes);
        setEdges(initialEdges);
        setSelectedNode(null);
        nodeIdRef.current = calculateMaxNodeId(initialNodes);
        toast.success('Canvas cleared');
      },
    });
    setShowWorkflowMenu(false);
  }, [setNodes, setEdges]);

  const confirmDeleteWorkflow = useCallback(() => {
    if (!workflow) return;
    setConfirmDialog({
      isOpen: true,
      title: 'Move to Trash',
      description: 'This will move the workflow to trash. You can restore it later.',
      variant: 'danger',
      onConfirm: async () => {
        await deleteWorkflow(workflow.id);
        toast.success('Workflow moved to trash');
      },
    });
    setShowWorkflowMenu(false);
  }, [workflow, deleteWorkflow]);


  // Initialization logic
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => {
    if (initialized) return;

    if (initialTemplateId && template) {
      const cleaned = cleanupInvalidEdges(template.nodes, template.edges);
      const templateNodes = cleaned.nodes.map((n: any) => ({
        ...n,
        data: {
          ...n.data,
          label: n.data.nodeName || n.data.label || n.type,
        },
      }));
      const layoutedNodes = autoLayoutNodes(templateNodes as any, cleaned.edges as any);

      setNodes(layoutedNodes as any);
      setEdges(cleaned.edges as any);
      nodeIdRef.current = calculateMaxNodeId(layoutedNodes as any);
      setInitialized(true);
    } else if (initialWorkflowId && workflow) {
      const cleaned = cleanupInvalidEdges(workflow.nodes, workflow.edges);
      const workflowNodes = cleaned.nodes.map((n: any) => ({
        ...n,
        data: {
          ...n.data,
          label: n.data.nodeName || n.data.label || n.type,
        },
      }));
      const layoutedNodes = autoLayoutNodes(workflowNodes as any, cleaned.edges as any);

      setNodes(layoutedNodes as any);
      setEdges(cleaned.edges as any);
      nodeIdRef.current = calculateMaxNodeId(layoutedNodes as any);
      setInitialized(true);
    } else if (!initialTemplateId && !initialWorkflowId) {
      setInitialized(true);
    }
  }, [initialTemplateId, initialWorkflowId, initialized, template, workflow, setNodes, setEdges]);

  // Visual updates for execution
  useEffect(() => {
    setNodes((nds) => nds.map((node) => {
      const isCurrentlyRunning = currentNodeId === node.id;
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

    setEdges((eds) => eds.map((edge) => {
      const isActive = nodeResults[edge.source]?.status === 'completed' && currentNodeId === edge.target;
      return {
        ...edge,
        className: isActive ? 'active-edge' : '',
        animated: isActive,
      };
    }));
  }, [currentNodeId, nodeResults, setNodes, setEdges]);

  const onConnect: OnConnect = useCallback((connection) => {
    setEdges((eds) => addEdge(connection, eds));
  }, [setEdges]);

  const onDragOver = useCallback((event: DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback((event: DragEvent) => {
    event.preventDefault();
    const type = event.dataTransfer.getData('application/reactflow');
    const label = event.dataTransfer.getData('application/reactflow-label');
    const color = event.dataTransfer.getData('application/reactflow-color');

    if (!type) return;

    const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });
    const newNode: Node<NodeData> = {
      id: getId(),
      type: type === 'firecrawl' ? 'mcp' : type,
      position,
      data: {
        label: label,
        nodeType: type === 'firecrawl' ? 'mcp' : type,
        nodeName: label,
      },
    };
    setNodes((nds) => nds.concat(newNode));
  }, [screenToFlowPosition, setNodes, getId]);

  const onDragStart = (event: DragEvent, nodeType: string, nodeLabel: string, nodeColor: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.setData('application/reactflow-label', nodeLabel);
    event.dataTransfer.setData('application/reactflow-color', nodeColor);
    event.dataTransfer.effectAllowed = 'move';
  };

  const onNodeClick: NodeMouseHandler<Node<NodeData>> = useCallback((_event, node) => {
    setShowExecution(false);
    setShowTestEndpoint(false);
    setSelectedEdgeId(null);
    setSelectedNode(node);
    setInspectorOpen(true);
  }, []);

  const handleShowTestAPI = useCallback(() => {
    setShowExecution(false);
    setSelectedNode(null);
    setShowSettings(false);
    setShowTestEndpoint(true);
    setInspectorOpen(true);
  }, []);

  const handleShowSettings = useCallback(() => {
    setSelectedNode(null);
    setShowTestEndpoint(false);
    setShowExecution(false);
    setShowSettings(true);
    setInspectorOpen(true);
  }, []);

  const handlePreview = useCallback(() => {
    setSelectedNode(null);
    setShowSettings(false);
    setShowTestEndpoint(false);
    setShowExecution(true);
    setInspectorOpen(true);
  }, []);

  const handleUpdateNodeData = useCallback((nodeId: string, data: any) => {
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
      if (workflow) updateNodes(updated as any);
      return updated;
    });
  }, [workflow, updateNodes, setNodes]);

  const handleDeleteNode = useCallback((nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId);
    if (node?.type === 'start') {
      toast.error('Cannot delete the start node');
      return;
    }
    setNodes(nds => nds.filter(n => n.id !== nodeId));
    setEdges(eds => eds.filter(e => e.source !== nodeId && e.target !== nodeId));
    setSelectedNode(null);
    setInspectorOpen(false);
    toast.success('Node deleted');
  }, [setNodes, setEdges, nodes]);

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

    setNodes((nds) => [...nds.map((n) => ({ ...n, selected: false })), newNode]);
    toast.success('Node duplicated');
  }, [nodes, getId, setNodes]);

  const onNodeContextMenu = useCallback(
    (event: any, node: any) => {
      event.preventDefault();
      setContextMenu({
        x: event.clientX,
        y: event.clientY,
        nodeId: node.id,
      });
    },
    [setContextMenu]
  );

  const onPaneContextMenu = useCallback(
    (event: any) => {
      event.preventDefault();
      setContextMenu({
        x: event.clientX,
        y: event.clientY,
        nodeId: '',
      });
    },
    [setContextMenu]
  );

  const handleRunWithInput = useCallback(async (input: string) => {
    if (!workflow) return;
    await saveWorkflowImmediate({ nodes: nodes as any, edges: edges as any });
    await runWorkflow(workflow, input);
  }, [workflow, nodes, edges, runWorkflow, saveWorkflowImmediate]);

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
              <span className="px-8 py-2 rounded-full bg-black-alpha-4 border border-black-alpha-8 text-[10px] uppercase tracking-wider text-black-alpha-56 font-bold">{environment}</span>
            </div>
            <p className="text-[11px] text-black-alpha-56 font-medium flex items-center gap-4">
              <span className="w-6 h-6 rounded-full bg-green-500 animate-pulse" /> Draft saved auto
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
                  <button onClick={handleSaveWorkflowImmediate} className="w-full px-12 py-8 text-left text-xs font-semibold text-accent-black hover:bg-black-alpha-4 rounded-8 transition-colors">Save</button>
                  <button onClick={() => { setShowSaveAsTemplateModal(true); setShowWorkflowMenu(false); }} className="w-full px-12 py-8 text-left text-xs font-semibold text-accent-black hover:bg-black-alpha-4 rounded-8 transition-colors border-b border-black-alpha-8 mb-4 pb-12">Save as Template</button>
                  <button onClick={handleClearCanvas} className="w-full px-12 py-8 text-left text-xs font-semibold text-accent-black hover:bg-black-alpha-4 rounded-8 transition-colors">Clear</button>
                  <button onClick={confirmDeleteWorkflow} className="w-full px-12 py-8 text-left text-xs font-semibold text-red-500 hover:bg-red-500/10 rounded-8 transition-colors">Delete</button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <button onClick={handleShowSettings} className="flex items-center gap-8 px-14 py-8 rounded-10 bg-accent-white hover:bg-black-alpha-4 border border-black-alpha-8 text-accent-black text-sm font-medium transition-all">
            <Settings2 className="w-16 h-16" /> Config
          </button>
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
          <button onClick={handleSaveWorkflowImmediate} className="flex items-center gap-8 px-14 py-8 rounded-10 bg-white hover:bg-[#f4f4f5] text-black text-sm font-semibold transition-all">
            <Save className="w-16 h-16" /> Deploy
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
              <div className="flex-1 overflow-y-auto p-12 space-y-24 no-scrollbar">
                {activeSidebarTab === 'nodes' && nodeCategories.map((cat) => (
                  <div key={cat.category}>
                    <h4 className="text-[10px] font-bold text-black-alpha-56 uppercase tracking-wider mb-12 px-8">{cat.category}</h4>
                    <div className="grid grid-cols-1 gap-4">
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
            </motion.aside>
          )}
        </AnimatePresence>

        {/* Main Workspace */}
        <motion.main initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 relative" ref={reactFlowWrapper}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onNodeClick={onNodeClick}
            onNodeContextMenu={onNodeContextMenu}
            onPaneContextMenu={onPaneContextMenu}
            onEdgeClick={(_e, edge) => setSelectedEdgeId(edge.id)}
            onPaneClick={() => { setSelectedEdgeId(null); setInspectorOpen(false); setContextMenu(null); }}
            onBeforeDelete={async ({ nodes: deletedNodes }) => {
              const hasStartNode = deletedNodes.some(n => (n.data as any)?.nodeType === 'start' || n.type === 'start');
              if (hasStartNode) {
                toast.error('Cannot delete the start node');
                return false;
              }
              return true;
            }}
            onNodesDelete={(deleted) => {
              if (workflow) updateNodes(nodes.filter(n => !deleted.find(d => d.id === n.id)) as any);
            }}
            onEdgesDelete={(deleted) => {
              if (workflow) updateEdges(edges.filter(e => !deleted.find(d => d.id === e.id)) as any);
            }}
            selectionOnDrag={!isCtrlPressed}
            selectionMode={SelectionMode.Partial}
            panOnDrag={isCtrlPressed ? [0, 1, 2] : [1, 2]} // Pan with Left Click only if Ctrl is pressed. Right/Middle always pan.
            panActivationKeyCode={undefined} // Manually handled
            defaultEdgeOptions={{ type: 'smoothstep', style: { strokeWidth: 2 } }}
          >
            <Background color="#e5e5e5" gap={20} size={1} />
            <Controls className="!bg-accent-white !border-black-alpha-8 !fill-black-alpha-56 !shadow-md react-flow-controls" position="bottom-right" showInteractive={false} />
          </ReactFlow>
        </motion.main>

        {/* Unified Inspector */}
        <AnimatePresence>
          {inspectorOpen && (
            <motion.aside initial={{ width: 0, opacity: 0 }} animate={{ width: 380, opacity: 1 }} exit={{ width: 0, opacity: 0 }} className="relative border-l border-black-alpha-8 bg-accent-white flex flex-col overflow-hidden shadow-2xl">
              <div className="flex items-center justify-between p-20 border-b border-black-alpha-8">
                <div className="flex items-center gap-10">
                  <div className={`w-28 h-28 rounded-8 ${selectedNode ? getNodeColor(selectedNode.type || '') : 'bg-heat-100'} flex items-center justify-center`}>
                    <LayoutGrid className="w-14 h-14 text-white" />
                  </div>
                  <h3 className="text-sm font-bold text-accent-black tracking-tight">
                    {showSettings ? 'Project Settings' : (selectedNode?.data?.nodeName || 'Properties')}
                  </h3>
                </div>
                <button onClick={() => { setInspectorOpen(false); setSelectedNode(null); setShowSettings(false); }} className="w-28 h-28 rounded-8 hover:bg-black-alpha-4 flex items-center justify-center text-black-alpha-56 transition-all"><ChevronRight className="w-18 h-18" /></button>
              </div>

              {showSettings ? (
                <SettingsPanel isOpen={true} onClose={() => { setShowSettings(false); setInspectorOpen(false); }} />
              ) : showTestEndpoint && workflow ? (
                <TestEndpointPanel key={workflow.id} workflowId={workflow.id} workflow={{ ...workflow, nodes: nodes as any }} environment={environment} onClose={() => setShowTestEndpoint(false)} />
              ) : showExecution ? (
                <ExecutionPanel workflow={workflow ? { ...workflow, nodes: nodes as any } : null} execution={execution} nodeResults={nodeResults} isRunning={isRunning} currentNodeId={currentNodeId} onRun={handleRunWithInput} onResumePendingAuth={resumeWorkflow} onClose={() => setShowExecution(false)} environment={environment} pendingAuth={pendingAuth} />
              ) : (selectedNode?.data as any)?.nodeType === 'mcp' ? (
                <MCPPanel node={selectedNode} mode="configure" onClose={() => { setInspectorOpen(false); setSelectedNode(null); }} onUpdate={handleUpdateNodeData} />
              ) : (selectedNode?.data as any)?.nodeType === 'router' ? (
                <RouterNodePanel node={selectedNode} updateNodeData={handleUpdateNodeData} />
              ) : (selectedNode?.data as any)?.nodeType?.includes('if') || (selectedNode?.data as any)?.nodeType?.includes('while') || (selectedNode?.data as any)?.nodeType?.includes('appr') ? (
                <LogicNodePanel node={selectedNode} nodes={nodes} onClose={() => { setInspectorOpen(false); setSelectedNode(null); }} onDelete={handleDeleteNode} onUpdate={handleUpdateNodeData} />
              ) : (selectedNode?.data as any)?.nodeType?.includes('trans') || (selectedNode?.data as any)?.nodeType?.includes('set-state') ? (
                <DataNodePanel node={selectedNode} nodes={nodes} onClose={() => { setInspectorOpen(false); setSelectedNode(null); }} onDelete={handleDeleteNode} onUpdate={handleUpdateNodeData} />
              ) : (selectedNode?.data as any)?.nodeType === 'extract' ? (
                <ExtractNodePanel node={selectedNode} nodes={nodes} onClose={() => { setInspectorOpen(false); setSelectedNode(null); }} onDelete={handleDeleteNode} onUpdate={handleUpdateNodeData} onAddMCP={() => { setTargetAgentForMCP(selectedNode); setShowMCPSelector(true); }} />
              ) : (selectedNode?.data as any)?.nodeType === 'retriever' ? (
                <RetrieverNodePanel node={selectedNode} nodes={nodes} updateNodeData={handleUpdateNodeData} />
              ) : (selectedNode?.data as any)?.nodeType === 'http' ? (
                <HTTPNodePanel node={selectedNode} nodes={nodes} onClose={() => { setInspectorOpen(false); setSelectedNode(null); }} onDelete={handleDeleteNode} onUpdate={handleUpdateNodeData} />
              ) : (selectedNode?.data as any)?.nodeType === 'start' ? (
                <StartNodePanel node={selectedNode} onClose={() => { setInspectorOpen(false); setSelectedNode(null); }} onUpdate={handleUpdateNodeData} />
              ) : selectedNode ? (
                <NodePanel node={selectedNode} nodes={nodes} onClose={() => { setInspectorOpen(false); setSelectedNode(null); }} onAddMCP={() => { setTargetAgentForMCP(selectedNode); setShowMCPSelector(true); }} onDelete={handleDeleteNode} onUpdate={handleUpdateNodeData} onOpenSettings={handleShowSettings} />
              ) : (
                <div className="p-40 text-center text-black-alpha-56">Select a node to edit</div>
              )}
            </motion.aside>
          )}
        </AnimatePresence>
      </div>

      <ShareWorkflowModal isOpen={showShareModal} onClose={() => setShowShareModal(false)} workflowId={workflow?.id || ''} workflowName={workflow?.name || 'Workflow'} />
      <SaveAsTemplateModal isOpen={showSaveAsTemplateModal} onClose={() => setShowSaveAsTemplateModal(false)} workflowId={convexId || ''} workflowName={workflow?.name || 'Workflow'} />
      <ConfirmDialog isOpen={confirmDialog.isOpen} title={confirmDialog.title} description={confirmDialog.description} variant={confirmDialog.variant} onConfirm={confirmDialog.onConfirm} onCancel={() => setConfirmDialog({ ...confirmDialog, isOpen: false })} />

      {contextMenu && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="fixed bg-accent-white border border-black-alpha-8 rounded-12 shadow-2xl z-[500] p-4 min-w-[180px] backdrop-blur-xl"
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
                className="w-full flex items-center gap-10 px-12 py-8 text-xs font-semibold text-accent-black hover:bg-black-alpha-4 rounded-8 transition-colors"
              >
                <div className="w-20 h-20 flex items-center justify-center bg-blue-500/20 text-blue-500 rounded-4">
                  <Copy className="w-12 h-12" />
                </div>
                Duplicate
              </button>
              <button
                onClick={() => {
                  setSelectedNode(nodes.find(n => n.id === contextMenu.nodeId) || null);
                  setInspectorOpen(true);
                  setContextMenu(null);
                }}
                className="w-full flex items-center gap-10 px-12 py-8 text-xs font-semibold text-accent-black hover:bg-black-alpha-4 rounded-8 transition-colors"
              >
                <div className="w-20 h-20 flex items-center justify-center bg-indigo-500/20 text-indigo-500 rounded-4">
                  <Settings2 className="w-12 h-12" />
                </div>
                Edit Properties
              </button>
              <div className="h-1 bg-black-alpha-8 my-4 mx-8 opacity-50" />
              <button
                onClick={() => {
                  handleDeleteNode(contextMenu.nodeId);
                  setContextMenu(null);
                }}
                className="w-full flex items-center gap-10 px-12 py-8 text-xs font-semibold text-red-500 hover:bg-red-500/10 rounded-8 transition-colors"
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
                  const layoutedNodes = autoLayoutNodes(nodes as any, edges as any);
                  setNodes(layoutedNodes as any);
                  setContextMenu(null);
                }}
                className="w-full flex items-center gap-10 px-12 py-8 text-xs font-semibold text-accent-black hover:bg-black-alpha-4 rounded-8 transition-colors"
              >
                <div className="w-20 h-20 flex items-center justify-center bg-teal-500/20 text-teal-500 rounded-4">
                  <Maximize className="w-12 h-12" />
                </div>
                Auto-layout
              </button>
              <button
                onClick={() => setContextMenu(null)}
                className="w-full flex items-center gap-10 px-12 py-8 text-xs font-semibold text-black-alpha-56 hover:bg-black-alpha-4 rounded-8 transition-colors"
              >
                <div className="w-20 h-20 flex items-center justify-center bg-black-alpha-8 rounded-4">
                  <Activity className="w-12 h-12" />
                </div>
                Cancel
              </button>
            </>
          )}
        </motion.div>
      )}

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
      <ReactFlowProvider>
        <WorkflowBuilderInner {...props} />
      </ReactFlowProvider>
    </ErrorBoundary>
  );
}
