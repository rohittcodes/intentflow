"use client";

import { useState, useEffect } from "react";

interface OutputMapping {
  outputAs: "full" | "field" | "custom";
  fieldName?: string;
  customPath?: string;
}

interface UniversalOutputSelectorProps {
  nodeId: string;
  nodeType: string;
  currentMapping?: OutputMapping;
  onUpdate: (mapping: OutputMapping) => void;
}

export default function UniversalOutputSelector({
  nodeId,
  nodeType,
  currentMapping,
  onUpdate,
}: UniversalOutputSelectorProps) {
  const [outputAs, setOutputAs] = useState<"full" | "field" | "custom">(
    currentMapping?.outputAs || "full"
  );
  const [fieldName, setFieldName] = useState(currentMapping?.fieldName || "result");
  const [customPath, setCustomPath] = useState(currentMapping?.customPath || "");

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      onUpdate({ outputAs, fieldName, customPath });
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [outputAs, fieldName, customPath, onUpdate]);

  const getDefaultFields = () => {
    switch (nodeType) {
      case 'agent':
        return ['message', 'text', 'response'];
      case 'mcp':
      case 'firecrawl':
        return ['markdown', 'html', 'json', 'results', 'urls'];
      case 'transform':
        return ['result', 'output', 'data'];
      case 'if-else':
        return ['condition', 'branch'];
      case 'while':
        return ['iterations', 'result'];
      case 'guardrails':
        return ['passed', 'sanitized', 'result'];
      case 'file-search':
        return ['files', 'matches'];
      default:
        return ['result', 'output'];
    }
  };

  const defaultFields = getDefaultFields();

  return (
    <div className="space-y-12">
      <div>
        <label className="block text-xs text-muted-foreground mb-6 font-medium">
          Output Format
        </label>
        <p className="text-xs text-muted-foreground mb-10">
          Choose how downstream nodes access this node's output
        </p>

        <div className="space-y-8">
          {/* Full Output */}
          <button
            onClick={() => setOutputAs('full')}
            className={`w-full p-12 rounded-md border transition-all text-left ${
              outputAs === 'full'
                ? 'border-primary bg-secondary'
                : 'border-border bg-background hover:border-border-light'
            }`}
          >
            <p className="text-xs text-foreground font-medium mb-4">Full Output</p>
            <p className="text-xs text-muted-foreground">
              <code className="font-mono text-xs">state.variables.{nodeId}</code> returns entire result
            </p>
          </button>

          {/* Single Field */}
          <button
            onClick={() => setOutputAs('field')}
            className={`w-full p-12 rounded-md border transition-all text-left ${
              outputAs === 'field'
                ? 'border-primary bg-secondary'
                : 'border-border bg-background hover:border-border-light'
            }`}
          >
            <p className="text-xs text-foreground font-medium mb-4">Extract Field</p>
            <p className="text-xs text-muted-foreground">
              Extract a specific field from the output
            </p>
          </button>

          {outputAs === 'field' && (
            <div className="ml-16 pl-12 border-l-2 border-primary">
              <label className="block text-xs text-muted-foreground mb-6">
                Field Name
              </label>
              <select
                value={fieldName}
                onChange={(e) => setFieldName(e.target.value)}
                className="w-full px-10 py-6 bg-white border border-border rounded-6 text-xs text-foreground font-mono focus:outline-none focus:border-primary transition-colors mb-8"
              >
                {defaultFields.map(field => (
                  <option key={field} value={field}>{field}</option>
                ))}
                <option value="__custom__">Custom...</option>
              </select>

              {fieldName === '__custom__' && (
                <input
                  type="text"
                  value={customPath}
                  onChange={(e) => {
                    setCustomPath(e.target.value);
                    setFieldName(e.target.value);
                  }}
                  placeholder="data.items[0].title"
                  className="w-full px-10 py-6 bg-white border border-border rounded-6 text-xs text-foreground font-mono focus:outline-none focus:border-primary transition-colors"
                />
              )}

              <p className="text-xs text-muted-foreground mt-8">
                Access as: <code className="font-mono text-xs text-primary">state.variables.{nodeId}</code>
              </p>
            </div>
          )}

          {/* Custom Path */}
          <button
            onClick={() => setOutputAs('custom')}
            className={`w-full p-12 rounded-md border transition-all text-left ${
              outputAs === 'custom'
                ? 'border-primary bg-secondary'
                : 'border-border bg-background hover:border-border-light'
            }`}
          >
            <p className="text-xs text-foreground font-medium mb-4">Custom Path</p>
            <p className="text-xs text-muted-foreground">
              Use dot notation to extract nested data
            </p>
          </button>

          {outputAs === 'custom' && (
            <div className="ml-16 pl-12 border-l-2 border-primary">
              <input
                type="text"
                value={customPath}
                onChange={(e) => setCustomPath(e.target.value)}
                placeholder="result.data.items[0].title"
                className="w-full px-10 py-6 bg-white border border-border rounded-6 text-xs text-foreground font-mono focus:outline-none focus:border-primary transition-colors"
              />
              <p className="text-xs text-muted-foreground mt-8">
                Supports dot notation and array indexing
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Preview */}
      <div className="p-12 bg-blue-50 rounded-md border border-blue-200">
        <p className="text-xs text-blue-900 font-medium mb-6">Preview:</p>
        <code className="text-xs text-blue-800 font-mono">
          state.variables.{nodeId}
          {outputAs === 'field' && fieldName !== '__custom__' && ` → ${fieldName} only`}
          {outputAs === 'custom' && customPath && ` → ${customPath}`}
        </code>
      </div>
    </div>
  );
}
