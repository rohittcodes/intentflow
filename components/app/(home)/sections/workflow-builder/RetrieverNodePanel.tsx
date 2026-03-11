"use client";

import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { Switch } from "@/components/ui/switch";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Database, Search, ChevronDown, Loader2 } from "lucide-react";
import VariableReferencePicker from "./VariableReferencePicker";
import { Id } from "@/convex/_generated/dataModel";

interface RetrieverNodePanelProps {
  node: any;
  nodes?: any[];
  updateNodeData: (nodeId: string, data: any) => void;
}

export default function RetrieverNodePanel({
  node,
  nodes,
  updateNodeData,
}: RetrieverNodePanelProps) {
  const data = node.data || {};
  const namespaces = useQuery(api.knowledge.listNamespaces, {});

  const [name, setName] = useState(data.nodeName || data.label || "Retriever");
  const [namespaceId, setNamespaceId] = useState<string>(data.namespaceId || "");
  const [query, setQuery] = useState(data.query || "");
  const [limit, setLimit] = useState(data.limit || 5);
  const [reRank, setReRank] = useState(data.reRank || false);
  const [showNamespaceDropdown, setShowNamespaceDropdown] = useState(false);

  // Auto-save
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      updateNodeData(node.id, {
        name,
        nodeName: name,
        namespaceId,
        query,
        limit: Number(limit),
        reRank,
        nodeType: "retriever",
      });
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [name, namespaceId, query, limit, reRank, node.id, updateNodeData]);

  const selectedNamespace = namespaces?.find((n) => n._id === namespaceId);

  return (
    <div className="flex-1 overflow-y-auto p-2 space-y-2 w-[260px]">
      {/* Node Name */}
      <div>
        <label className="block text-sm font-medium text-muted-foreground mb-1">
          Node Name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Fetch Documents"
          className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:border-primary transition-colors"
        />
      </div>

      {/* Namespace Selection */}
      <div>
        <label className="block text-sm font-medium text-muted-foreground mb-1">
          Knowledge Base (Namespace)
        </label>
        <div className="relative">
          <button
            onClick={() => setShowNamespaceDropdown(!showNamespaceDropdown)}
            className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:border-primary transition-colors flex items-center justify-between hover:bg-secondary"
          >
            <div className="flex items-center gap-2 truncate">
              <Database className="w-4 h-4 text-black-alpha-32" />
              <span className="truncate">
                {selectedNamespace ? selectedNamespace.name : "Select a namespace..."}
              </span>
            </div>
            <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${showNamespaceDropdown ? 'rotate-180' : ''}`} />
          </button>

          {showNamespaceDropdown && (
            <div className="absolute z-10 w-full mt-8 bg-accent-white border border-border rounded-xl shadow-xl overflow-hidden max-h-200 overflow-y-auto">
              {namespaces === undefined ? (
                <div className="p-4 flex items-center justify-center">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : namespaces.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  No namespaces found. Create one in the Knowledge Base dashboard.
                </div>
              ) : (
                namespaces.map((ns) => (
                  <button
                    key={ns._id}
                    onClick={() => {
                      setNamespaceId(ns._id);
                      setShowNamespaceDropdown(false);
                    }}
                    className={`w-full text-left px-16 py-10 text-sm transition-colors hover:bg-secondary flex flex-col gap-2 ${namespaceId === ns._id ? "bg-secondary" : ""
                      }`}
                  >
                    <span className="font-medium text-foreground">{ns.name}</span>
                    <span className="text-xs text-black-alpha-40">{ns.documentCount} document chunks</span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Search Query */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="block text-sm font-medium text-muted-foreground">
            Search Query
          </label>
          <div className="flex items-center gap-2">
            {nodes && (
              <VariableReferencePicker
                nodes={nodes}
                currentNodeId={node.id}
                onSelect={(ref) => setQuery(query + ` {{${ref}}}`)}
              />
            )}
          </div>
        </div>
        <div className="relative">
          <textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search text or {{variable}}..."
            rows={4}
            className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-sm text-foreground placeholder-black-alpha-32 focus:outline-none focus:border-primary transition-colors resize-y pr-40"
          />
          <Search className="absolute right-12 top-3 w-4 h-4 text-black-alpha-24" />
        </div>
        <p className="text-[10px] text-black-alpha-40 mt-1">
          The retriever will find the most relevant chunks based on this text.
        </p>
      </div>

      {/* Limit */}
      <div>
        <label className="block text-sm font-medium text-muted-foreground mb-1">
          Result Limit
        </label>
        <div className="flex items-center gap-3">
          <input
            type="range"
            min="1"
            max="20"
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            className="flex-1 accent-heat-100"
          />
          <span className="text-sm font-semibold text-foreground min-w-24 text-center">
            {limit}
          </span>
        </div>
        <p className="text-[10px] text-black-alpha-40 mt-4">
          Maximum number of chunks to retrieve.
        </p>
      </div>

      {/* Re-Ranking Toggle */}
      <div className="flex items-center justify-between p-3 bg-secondary rounded-lg border border-border">
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-foreground">
            Enable Re-ranking
          </label>
          <p className="text-[10px] text-black-alpha-40 leading-tight pr-20">
            Uses LLM to re-score results for significantly better accuracy (+ latency).
          </p>
        </div>
        <Switch
          checked={reRank}
          onCheckedChange={setReRank}
          className="scale-75 origin-right"
        />
      </div>

      <div className="pt-20 border-t border-border">
        <div className="p-3 bg-secondary border border-primary/20 rounded-lg flex gap-3">
          <Search className="w-4 h-4 text-primary shrink-0" />
          <p className="text-xs text-heat-120 leading-relaxed font-medium">
            This node will output a list of documents found in the selected Knowledge Base.
          </p>
        </div>
      </div>
    </div>
  );
}
