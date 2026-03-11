"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import type { Node } from "@xyflow/react";
import VariableReferencePicker from "./VariableReferencePicker";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Globe, Shield, Zap } from "lucide-react";

interface HTTPNodePanelProps {
  node: Node | null;
  nodes?: Node[];
  onClose: () => void;
  onDelete: (nodeId: string) => void;
  onUpdate: (nodeId: string, data: any) => void;
}

interface Header {
  key: string;
  value: string;
}

export default function HTTPNodePanel({ node, nodes, onClose, onDelete, onUpdate }: HTTPNodePanelProps) {
  const nodeData = node?.data as any;

  const [url, setUrl] = useState(nodeData?.httpUrl || "https://api.example.com/endpoint");
  const [method, setMethod] = useState(nodeData?.httpMethod || "GET");
  const [headers, setHeaders] = useState<Header[]>(nodeData?.httpHeaders || [
    { key: "Content-Type", value: "application/json" }
  ]);
  const [body, setBody] = useState(nodeData?.httpBody || "");
  const [authType, setAuthType] = useState(nodeData?.httpAuthType || "none");
  const [authToken, setAuthToken] = useState(nodeData?.httpAuthToken || "");
  const [showAuthToken, setShowAuthToken] = useState(false);
  const [selectedConnectorId, setSelectedConnectorId] = useState(nodeData?.connectorId || "");
  const connectors = useQuery(api.knowledgeConnectors.listConnectors);

  // Auto-save with change check
  useEffect(() => {
    if (!node?.id) return;

    const timeoutId = setTimeout(() => {
      const hasChanged =
        url !== node.data?.httpUrl ||
        method !== node.data?.httpMethod ||
        JSON.stringify(headers) !== JSON.stringify(node.data?.httpHeaders) ||
        body !== node.data?.httpBody ||
        authType !== node.data?.httpAuthType ||
        authToken !== node.data?.httpAuthToken ||
        selectedConnectorId !== node.data?.connectorId;

      if (hasChanged) {
        onUpdate(node.id, {
          httpUrl: url,
          httpMethod: method,
          httpHeaders: headers,
          httpBody: body,
          httpAuthType: authType,
          httpAuthToken: authToken,
          connectorId: selectedConnectorId,
        });
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [url, method, headers, body, authType, authToken, node?.id, node?.data, onUpdate]);

  const addHeader = () => {
    setHeaders([...headers, { key: "", value: "" }]);
  };

  const updateHeader = (index: number, field: 'key' | 'value', value: string) => {
    setHeaders(headers.map((h, i) => i === index ? { ...h, [field]: value } : h));
  };

  const removeHeader = (index: number) => {
    setHeaders(headers.filter((_, i) => i !== index));
  };

  const insertQuickHeader = (key: string, value: string) => {
    const existing = headers.findIndex(h => h.key === key);
    if (existing >= 0) {
      updateHeader(existing, 'value', value);
    } else {
      setHeaders([...headers, { key, value }]);
    }
  };

  if (!node) return null;

  return (
    <div className="flex-1 overflow-y-auto p-2 space-y-3 w-[260px]">
      {/* Method */}
      <div>
        <label className="block text-label-small text-muted-foreground mb-1">
          HTTP Method
        </label>
        <select
          value={method}
          onChange={(e) => setMethod(e.target.value)}
          className="w-fit px-3 py-1.5 bg-background border border-border rounded-md text-xs text-foreground font-medium focus:outline-none focus:border-primary transition-colors"
        >
          <option value="GET">GET</option>
          <option value="POST">POST</option>
          <option value="PUT">PUT</option>
          <option value="PATCH">PATCH</option>
          <option value="DELETE">DELETE</option>
        </select>
      </div>

      {/* Connector / Data Source Selection */}
      <div className="p-2 bg-accent-blue-alpha-4 border border-accent-blue-alpha-12 rounded-lg">
        <div className="flex items-center gap-2 mb-1">
          <Zap className="w-3.5 h-3.5 text-accent-blue" />
          <label className="block text-label-small font-bold text-accent-blue uppercase tracking-widest">
            Connector (Optional)
          </label>
        </div>
        <p className="text-body-tiny text-muted-foreground mb-3">
          Link to a saved connector to automatically include base URL and authentication.
        </p>
        <select
          value={selectedConnectorId}
          onChange={(e) => setSelectedConnectorId(e.target.value)}
          className="w-full px-3 py-1.5 bg-background border border-border rounded-md text-xs text-foreground focus:outline-none focus:border-accent-blue transition-colors cursor-pointer"
        >
          <option value="">No Connector (Direct Request)</option>
          {connectors?.map((c) => (
            <option key={c._id} value={c._id}>
              {c.name} ({c.type})
            </option>
          ))}
        </select>
        {selectedConnectorId && connectors && (
          <div className="mt-4 flex items-center gap-2 text-body-tiny text-accent-green font-medium">
            <Shield className="w-4 h-4" />
            Connector settings will be resolved at runtime
          </div>
        )}
      </div>

      {/* URL Input - Full Width */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="block text-label-small text-muted-foreground">
            Request URL
          </label>
          {nodes && (
            <VariableReferencePicker
              nodes={nodes}
              currentNodeId={node.id}
              onSelect={(ref) => setUrl(url + `{{${ref}}}`)}
            />
          )}
        </div>
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://api.example.com/endpoint"
          className="w-full px-3 py-1.5 bg-background border border-border rounded-md text-xs text-foreground font-mono focus:outline-none focus:border-primary transition-colors"
        />
      </div>

      {/* Authentication */}
      <div>
        <label className="block text-label-small text-muted-foreground mb-1">
          Authentication
        </label>
        <select
          value={authType}
          onChange={(e) => setAuthType(e.target.value)}
          className="w-full px-3 py-1.5 bg-background border border-border rounded-md text-xs text-foreground focus:outline-none focus:border-primary transition-colors mb-3"
        >
          <option value="none">None</option>
          <option value="bearer">Bearer Token</option>
          <option value="basic">Basic Auth</option>
          <option value="api-key">API Key (Header)</option>
        </select>

        {authType !== 'none' && (
          <div className="relative">
            <input
              type={showAuthToken ? "text" : "password"}
              value={authToken}
              onChange={(e) => setAuthToken(e.target.value)}
              placeholder={authType === 'bearer' ? 'Bearer token...' : 'API key or credentials...'}
              className="w-full px-3 py-1.5 pr-40 bg-background border border-border rounded-md text-xs text-foreground font-mono focus:outline-none focus:border-primary transition-colors"
            />
            <button
              onClick={() => setShowAuthToken(!showAuthToken)}
              className="absolute right-12 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              {showAuthToken ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Headers */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="block text-label-small text-muted-foreground">
            Headers
          </label>
          <div className="flex gap-2">
            <button
              onClick={() => insertQuickHeader('Content-Type', 'application/json')}
              className="px-3 py-1.5 bg-background hover:bg-secondary border border-border rounded-md text-xs text-foreground transition-colors"
            >
              + JSON
            </button>
            <button
              onClick={addHeader}
              className="px-3 py-1.5 bg-background hover:bg-secondary border border-border rounded-md text-xs text-foreground transition-colors"
            >
              + Header
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {headers.map((header, index) => (
            <div key={index} className="flex gap-2">
              <input
                type="text"
                value={header.key}
                onChange={(e) => updateHeader(index, 'key', e.target.value)}
                placeholder="Header-Name"
                className="flex-1 px-3 py-1.5 bg-background border border-border rounded-6 text-xs text-foreground font-mono focus:outline-none focus:border-primary transition-colors"
              />
              <input
                type="text"
                value={header.value}
                onChange={(e) => updateHeader(index, 'value', e.target.value)}
                placeholder="value"
                className="flex-1 px-3 py-1.5 bg-background border border-border rounded-6 text-xs text-foreground focus:outline-none focus:border-primary transition-colors"
              />
              <button
                onClick={() => removeHeader(index)}
                className="w-8 h-8 rounded-md hover:bg-secondary transition-colors flex items-center justify-center group"
              >
                <svg className="w-4 h-4 text-muted-foreground group-hover:text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Body (for POST/PUT/PATCH) */}
      {(method === 'POST' || method === 'PUT' || method === 'PATCH') && (
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-label-small text-muted-foreground">
              Request Body
            </label>
            {nodes && (
              <VariableReferencePicker
                nodes={nodes}
                currentNodeId={node.id}
                onSelect={(ref) => setBody(body + `{{${ref}}}`)}
              />
            )}
          </div>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={5}
            placeholder='{"key": "value"}'
            className="w-full px-3 py-2 bg-gray-900 text-primary border border-border rounded-md text-xs font-mono focus:outline-none focus:border-primary transition-colors resize-none"
          />
          <div className="flex gap-2 mt-2">
            <button
              onClick={() => setBody('{{state.variables.lastOutput}}')}
              className="px-3 py-1.5 bg-secondary hover:bg-secondary/80 border border-primary rounded-6 text-xs text-foreground transition-colors"
            >
              Use Previous Output
            </button>
            <button
              onClick={() => setBody(JSON.stringify({ data: "{{state.variables.lastOutput}}" }, null, 2))}
              className="px-3 py-1.5 bg-secondary hover:bg-secondary/80 border border-primary rounded-6 text-xs text-foreground transition-colors"
            >
              Wrap in JSON
            </button>
          </div>
        </div>
      )}

      {/* Quick Examples */}
      <details className="group">
        <summary className="cursor-pointer text-xs text-primary hover:text-heat-200 transition-colors">
          Show API examples
        </summary>
        <div className="mt-2 space-y-4">
          <button
            onClick={() => {
              setUrl('https://api.slack.com/api/chat.postMessage');
              setMethod('POST');
              insertQuickHeader('Authorization', 'Bearer xoxb-your-token');
              setBody('{\n  "channel": "C123456",\n  "text": "{{state.variables.lastOutput}}"\n}');
            }}
            className="w-full p-3 bg-secondary hover:bg-secondary/80 rounded-lg text-left border border-primary transition-colors"
          >
            <p className="text-xs text-foreground font-medium">Slack Message</p>
            <p className="text-xs text-primary mt-4">Post to Slack channel</p>
          </button>

          <button
            onClick={() => {
              setUrl('https://api.notion.com/v1/pages');
              setMethod('POST');
              insertQuickHeader('Authorization', 'Bearer secret_...');
              insertQuickHeader('Notion-Version', '2022-06-28');
              setBody('{\n  "parent": { "database_id": "..." },\n  "properties": {}\n}');
            }}
            className="w-full p-3 bg-secondary hover:bg-secondary/80 rounded-lg text-left border border-primary transition-colors"
          >
            <p className="text-xs text-foreground font-medium">Notion Page</p>
            <p className="text-xs text-primary mt-4">Create Notion page</p>
          </button>

          <button
            onClick={() => {
              setUrl('https://hooks.zapier.com/hooks/catch/...');
              setMethod('POST');
              setBody('{{state.variables.lastOutput}}');
            }}
            className="w-full p-3 bg-secondary hover:bg-secondary/80 rounded-lg text-left border border-primary transition-colors"
          >
            <p className="text-xs text-foreground font-medium">Zapier Webhook</p>
            <p className="text-xs text-primary mt-4">Trigger Zapier automation</p>
          </button>
        </div>
      </details>

      {/* Universal Output Selector */}
      <div className="pt-4 border-t border-border">
      </div>
    </div>
  );
}
