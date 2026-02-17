"use client";

import { useState, useEffect } from "react";
import type { Node } from "@xyflow/react";
import { Brain, Save, Download, Plus, Trash2, Shield, Info } from "lucide-react";
import VariableReferencePicker from "./VariableReferencePicker";

interface MemoryNodePanelProps {
  node: Node | null;
  nodes: Node[];
  onClose: () => void;
  onDelete: (nodeId: string) => void;
  onUpdate: (nodeId: string, data: any) => void;
}

export default function MemoryNodePanel({
  node,
  nodes,
  onClose,
  onDelete,
  onUpdate,
}: MemoryNodePanelProps) {
  const nodeData = node?.data as any;

  const [operation, setOperation] = useState(nodeData?.memoryOperation || "store");
  const [key, setKey] = useState(nodeData?.memoryKey || "");
  const [value, setValue] = useState(nodeData?.memoryValue || "");
  const [scope, setScope] = useState(nodeData?.memoryScope || "thread");

  // Auto-save changes
  useEffect(() => {
    if (!node?.id) return;

    const timeoutId = setTimeout(() => {
      const hasChanged =
        operation !== nodeData?.memoryOperation ||
        key !== nodeData?.memoryKey ||
        value !== nodeData?.memoryValue ||
        scope !== nodeData?.memoryScope;

      if (hasChanged) {
        onUpdate(node.id, {
          memoryOperation: operation,
          memoryKey: key,
          memoryValue: value,
          memoryScope: scope,
        });
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [operation, key, value, scope, node?.id, onUpdate, nodeData]);

  if (!node) return null;

  return (
    <div className="flex-1 overflow-y-auto p-20 space-y-20">
      <div>
        <h3 className="text-sm font-medium text-accent-black mb-12 flex items-center gap-8">
          <Brain className="w-16 h-16 text-purple-500" />
          Memory Management
        </h3>
        <p className="text-[13px] text-black-alpha-48 mb-20">
          explicitly manage persistent context across workflow execution steps.
        </p>

        <div className="space-y-16">
          {/* Operation Selection */}
          <div>
            <label className="block text-xs font-bold text-black-alpha-40 uppercase tracking-widest mb-8">
              Operation
            </label>
            <div className="grid grid-cols-2 gap-8">
              {[
                { id: 'store', label: 'Store', icon: Save, desc: 'Save value to memory' },
                { id: 'retrieve', label: 'Retrieve', icon: Download, desc: 'Get value from memory' },
                { id: 'append', label: 'Append', icon: Plus, desc: 'Add to existing list/string' },
                { id: 'clear', label: 'Clear', icon: Trash2, desc: 'Remove from memory' },
              ].map((op) => (
                <button
                  key={op.id}
                  onClick={() => setOperation(op.id)}
                  className={`p-10 rounded-10 border text-left transition-all ${operation === op.id
                    ? 'bg-purple-50 border-purple-200 text-purple-700'
                    : 'bg-accent-white border-border-faint text-accent-black hover:border-purple-200'
                    }`}
                >
                  <div className="flex items-center gap-6 mb-2">
                    <op.icon className={`w-14 h-14 ${operation === op.id ? 'text-purple-600' : 'text-black-alpha-40'}`} />
                    <span className="text-xs font-bold uppercase tracking-tight">{op.label}</span>
                  </div>
                  <p className="text-[10px] opacity-70 leading-tight">{op.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Key Input */}
          <div>
            <div className="flex items-center justify-between mb-8">
              <label className="block text-xs font-bold text-black-alpha-40 uppercase tracking-widest">
                Memory Key
              </label>
              <span className="cursor-help" title="The unique identifier for this data">
                <Info className="w-12 h-12 text-black-alpha-24" />
              </span>
            </div>
            <input
              type="text"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="e.g. userPreferences"
              className="w-full px-12 py-10 bg-black-alpha-4 border border-border-faint rounded-10 text-sm font-mono focus:outline-none focus:border-purple-500 transition-all"
            />
            <p className="mt-4 text-[10px] text-black-alpha-40 font-mono">
              Access as {`{{state.${key || 'key'}}} `} in other nodes
            </p>
          </div>

          {/* Value Input (only for Store/Append) */}
          {(operation === 'store' || operation === 'append') && (
            <div>
              <div className="flex items-center justify-between mb-8">
                <label className="block text-xs font-bold text-black-alpha-40 uppercase tracking-widest">
                  Value to {operation === 'store' ? 'Save' : 'Append'}
                </label>
                <VariableReferencePicker
                  nodes={nodes}
                  currentNodeId={node.id}
                  onSelect={(ref) => setValue(prev => prev + `{{${ref}}}`)}
                />
              </div>
              <textarea
                value={value}
                onChange={(e) => setValue(e.target.value)}
                rows={4}
                placeholder="Data or {{variable}} to store..."
                className="w-full px-12 py-10 bg-black-alpha-4 border border-border-faint rounded-12 text-sm focus:outline-none focus:border-purple-500 transition-all resize-none"
              />
            </div>
          )}

          {/* Scope selection (Advanced) */}
          <div className="pt-16 border-t border-border-faint space-y-12">
            {/* Scope selection */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-8">
                <Shield className="w-14 h-14 text-black-alpha-40" />
                <span className="text-xs font-bold text-black-alpha-40 uppercase tracking-widest">Memory Scope</span>
              </div>
              <select
                value={scope}
                onChange={(e) => setScope(e.target.value)}
                className="bg-transparent text-xs font-medium text-black-alpha-56 border-none focus:outline-none cursor-pointer"
              >
                <option value="thread">This Thread</option>
                <option value="user">User Session (Global)</option>
              </select>
            </div>

            {/* Inject into AI Toggle */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-8">
                <Brain className="w-14 h-14 text-black-alpha-40" />
                <span className="text-xs font-bold text-black-alpha-40 uppercase tracking-widest">Inject into AI Context</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={nodeData?.injectIntoAI || false}
                  onChange={(e) => onUpdate(node.id, { injectIntoAI: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-36 h-20 bg-black-alpha-4 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-16 after:w-16 after:transition-all peer-checked:bg-purple-500"></div>
              </label>
            </div>
            <p className="text-[11px] text-black-alpha-32 leading-relaxed">
              When enabled, the value of this memory key will be automatically added to the instructions of all AI agents in this workflow.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
