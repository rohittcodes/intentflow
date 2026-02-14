"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";

import type { Node } from "@xyflow/react";

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
  }, [instructions, model, jsonSchema, node?.id, node.data, onUpdate]);

  if (!node) return null;

  return (
    <div className="flex-1 overflow-y-auto p-20 space-y-24">
      {/* Instructions */}
      <div>
        <label className="block text-label-small text-black-alpha-48 mb-8">
          Extraction Instructions
        </label>
        <textarea
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          placeholder="What information should be extracted?"
          rows={4}
          className="w-full px-12 py-10 bg-background-base border border-border-faint rounded-8 text-body-medium text-accent-black focus:outline-none focus:border-heat-100 transition-colors resize-none"
        />
        <p className="text-body-small text-black-alpha-32 mt-6">
          The LLM will extract data matching the schema below
        </p>
      </div>

      {/* Model Selection */}
      <div>
        <label className="block text-label-small text-black-alpha-48 mb-8">
          Model
        </label>
        <select
          value={model}
          onChange={(e) => setModel(e.target.value)}
          className="w-full px-12 py-10 bg-background-base border border-border-faint rounded-8 text-body-medium text-accent-black focus:outline-none focus:border-heat-100 transition-colors"
        >
          <optgroup label="Anthropic">
            <option value="anthropic/claude-sonnet-4-5-20250929">Claude Sonnet 4.5</option>
            <option value="anthropic/claude-haiku-4-5-20251001">Claude Haiku 4.5</option>
          </optgroup>
          <optgroup label="OpenAI">
            <option value="gpt-4o">GPT-5</option>
            <option value="gpt-4o-mini">GPT-5 Mini</option>
          </optgroup>
          <optgroup label="Groq">
            <option value="groq/openai/gpt-oss-120b">GPT OSS 120B</option>
          </optgroup>
        </select>
      </div>

      {/* JSON Schema */}
      <div>
        <label className="block text-label-small text-black-alpha-48 mb-8">
          Output Schema (JSON Schema)
        </label>
        <textarea
          value={jsonSchema}
          onChange={(e) => setJsonSchema(e.target.value)}
          rows={12}
          className={`w-full px-12 py-10 bg-background-base border rounded-8 text-body-small text-accent-black font-mono focus:outline-none focus:border-heat-100 transition-colors resize-none ${schemaError ? 'border-red-500' : 'border-border-faint'
            }`}
        />
        {schemaError && (
          <p className="text-body-small text-accent-black mt-6">{schemaError}</p>
        )}
        <p className="text-body-small text-black-alpha-32 mt-6">
          Define the structure of data to extract
        </p>
      </div>

      {/* MCP Tools */}
      <div>
        <div className="flex items-center justify-between mb-8">
          <label className="block text-label-small text-black-alpha-48">
            MCP Tools (Optional)
          </label>
          <button
            onClick={onAddMCP}
            className="px-10 py-6 bg-background-base hover:bg-black-alpha-4 border border-border-faint rounded-6 text-body-small text-accent-black transition-colors flex items-center gap-6"
          >
            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add MCP
          </button>
        </div>

        {nodeData?.mcpTools && nodeData.mcpTools.length > 0 ? (
          <div className="space-y-8">
            {nodeData.mcpTools.map((mcp: any, index: number) => (
              <div key={index} className="p-12 bg-background-base rounded-8 border border-border-faint">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-body-small text-accent-black font-medium">{mcp.name}</p>
                    <p className="text-body-small text-black-alpha-48 font-mono text-xs truncate mt-4">
                      {mcp.url}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      const newTools = nodeData.mcpTools.filter((_: any, i: number) => i !== index);
                      onUpdate(node?.id || '', { mcpTools: newTools });
                    }}
                    className="w-24 h-24 rounded-4 hover:bg-black-alpha-4 transition-colors flex items-center justify-center group"
                  >
                    <svg className="w-12 h-12 text-black-alpha-48 group-hover:text-accent-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-16 bg-background-base rounded-8 border border-border-faint text-center">
            <p className="text-body-small text-black-alpha-48">
              No MCP tools - the agent will only use the LLM
            </p>
          </div>
        )}
      </div>

      {/* Info Box */}
      <div className="p-16 bg-accent-white rounded-12 border border-border-faint">
        <p className="text-body-small text-accent-black">
          <strong>How it works:</strong> The LLM analyzes the input and extracts data matching your JSON schema. Use MCP tools to give the agent access to external data sources like web search.
        </p>
      </div>
    </div>
  );
}
