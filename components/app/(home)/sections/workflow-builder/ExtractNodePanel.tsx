"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";

import type { Node } from "@xyflow/react";
import { llmProviders } from "@/lib/config/llm-config";

interface ExtractNodePanelProps {
  node: Node | null;
  nodes: Node[];
  onClose: () => void;
  onDelete: (nodeId: string) => void;
  onUpdate: (nodeId: string, data: any) => void;
  onAddMCP: () => void;
}

export default function ExtractNodePanel({
  node,
  nodes,
  onClose,
  onDelete,
  onUpdate,
  onAddMCP,
}: ExtractNodePanelProps) {
  const nodeData = node?.data as any;
  const [instructions, setInstructions] = useState(nodeData?.instructions || 'Extract information from the input');
  const [model, setModel] = useState(nodeData?.model || 'gpt-4o');
  const [customModel, setCustomModel] = useState('');
  const [jsonSchema, setJsonSchema] = useState(
    nodeData?.jsonSchema || JSON.stringify({
      type: "object",
      properties: {
        title: { type: "string", description: "The title" },
        summary: { type: "string", description: "A brief summary" },
      },
      required: ["title"]
    }, null, 2)
  );
  const [schemaError, setSchemaError] = useState('');

  // Validate JSON schema
  useEffect(() => {
    try {
      JSON.parse(jsonSchema);
      setSchemaError('');
    } catch (e) {
      setSchemaError('Invalid JSON');
    }
  }, [jsonSchema]);

  // Sync state with node data - fix infinite loop with change check and debounce
  useEffect(() => {
    if (!node?.id) return;

    const timeoutId = setTimeout(() => {
      const hasChanged =
        instructions !== node.data?.instructions ||
        model !== node.data?.model ||
        jsonSchema !== node.data?.jsonSchema;

      if (hasChanged) {
        onUpdate(node.id, {
          instructions,
          model,
          jsonSchema,
          nodeType: 'extract',
        });
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [instructions, model, jsonSchema, node?.id, node?.data, onUpdate]);

  if (!node) return null;

  return (
    <div className="flex-1 overflow-y-auto p-2 space-y-4 w-[260px]">
      {/* Instructions */}
      <div>
        <label className="block text-label-small text-muted-foreground mb-1">
          Extraction Instructions
        </label>
        <textarea
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          placeholder="What information should be extracted?"
          rows={4}
          className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm text-foreground focus:outline-none focus:border-primary transition-colors resize-none"
        />
        <p className="text-xs text-black-alpha-32 mt-1">
          The LLM will extract data matching the schema below
        </p>
      </div>

      {/* Model Selection */}
      <div>
        <label className="block text-label-small text-muted-foreground mb-1">
          Model
        </label>
        <select
          value={model}
          onChange={(e) => setModel(e.target.value)}
          className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm text-foreground focus:outline-none focus:border-primary transition-colors"
        >
          {llmProviders.map(provider => (
            <optgroup key={provider.id} label={provider.name}>
              {provider.models.map(m => (
                <option key={`${m.provider}/${m.id}`} value={`${m.provider}/${m.id}`}>
                  {m.name}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>

      {/* JSON Schema */}
      <div>
        <label className="block text-label-small text-muted-foreground mb-1">
          Output Schema (JSON Schema)
        </label>
        <textarea
          value={jsonSchema}
          onChange={(e) => setJsonSchema(e.target.value)}
          rows={12}
          className={`w-full px-3 py-2 bg-background border rounded-md text-xs text-foreground font-mono focus:outline-none focus:border-primary transition-colors resize-none ${schemaError ? 'border-red-500' : 'border-border'
            }`}
        />
        {schemaError && (
          <p className="text-xs text-foreground mt-6">{schemaError}</p>
        )}
        <p className="text-xs text-black-alpha-32 mt-6">
          Define the structure of data to extract
        </p>
      </div>

      {/* MCP Tools */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="block text-label-small text-muted-foreground">
            MCP Tools (Optional)
          </label>
          <button
            onClick={onAddMCP}
            className="px-3 py-1.5 bg-background hover:bg-secondary border border-border rounded-6 text-xs text-foreground transition-colors flex items-center gap-1.5"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add MCP
          </button>
        </div>

        {nodeData?.mcpTools && nodeData.mcpTools.length > 0 ? (
          <div className="space-y-2">
            {nodeData.mcpTools.map((mcp: any, index: number) => (
              <div key={index} className="p-3 bg-background rounded-md border border-border">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-xs text-foreground font-medium">{mcp.name}</p>
                    <p className="text-xs text-muted-foreground font-mono text-xs truncate mt-4">
                      {mcp.url}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      const newTools = nodeData.mcpTools.filter((_: any, i: number) => i !== index);
                      onUpdate(node?.id || '', { mcpTools: newTools });
                    }}
                    className="w-24 h-24 rounded-4 hover:bg-secondary transition-colors flex items-center justify-center group"
                  >
                    <svg className="w-6 h-6 text-muted-foreground group-hover:text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-4 bg-background rounded-md border border-border text-center">
            <p className="text-xs text-muted-foreground">
              No MCP tools - the agent will only use the LLM
            </p>
          </div>
        )}
      </div>

      {/* Info Box */}
      <div className="p-4 bg-accent-white rounded-xl border border-border">
        <p className="text-xs text-foreground">
          <strong>How it works:</strong> The LLM analyzes the input and extracts data matching your JSON schema. Use MCP tools to give the agent access to external data sources like web search.
        </p>
      </div>
    </div>
  );
}
