import { Node, Edge } from "@xyflow/react";
import { NodeData } from "./types";

// Utility to get node color based on type
export const getNodeColor = (type: string): string => {
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
    'workflow': 'bg-teal-600',
  };
  return colorMap[type] || 'bg-gray-500';
};

// Auto-layout function to position nodes left to right
export const autoLayoutNodes = (nodes: Node<NodeData>[], edges: Edge[]): Node<NodeData>[] => {
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

  const nodesByLayer: { [key: number]: Node<NodeData>[] } = {};
  for (const node of nodes) {
    const layer = layers[node.id];
    if (!nodesByLayer[layer]) nodesByLayer[layer] = [];
    nodesByLayer[layer].push(node);
  }

  const layoutNodes: Node<NodeData>[] = [];
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
