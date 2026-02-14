"use client";

import { motion } from "framer-motion";
import { useState, useEffect } from "react";
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
  const namespaces = useQuery(api.knowledge.listNamespaces);

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
    <div className="flex-1 overflow-y-auto p-20 space-y-20">
      {/* Node Name */}
      <div>
        <label className="block text-sm font-medium text-black-alpha-48 mb-8">
          Node Name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Fetch Documents"
          className="w-full px-14 py-10 bg-background-base border border-border-faint rounded-10 text-sm text-accent-black focus:outline-none focus:border-heat-100 transition-colors"
        />
      </div>

      {/* Namespace Selection */}
      <div>
        <label className="block text-sm font-medium text-black-alpha-48 mb-8">
          Knowledge Base (Namespace)
        </label>
        <div className="relative">
          <button
            onClick={() => setShowNamespaceDropdown(!showNamespaceDropdown)}
            className="w-full px-14 py-10 bg-background-base border border-border-faint rounded-10 text-sm text-accent-black focus:outline-none focus:border-heat-100 transition-colors flex items-center justify-between hover:bg-black-alpha-4"
          >
            <div className="flex items-center gap-8 truncate">
              <Database className="w-16 h-16 text-black-alpha-32" />
              <span className="truncate">
                {selectedNamespace ? selectedNamespace.name : "Select a namespace..."}
              </span>
            </div>
            <ChevronDown className={`w-16 h-16 text-black-alpha-48 transition-transform ${showNamespaceDropdown ? 'rotate-180' : ''}`} />
          </button>

          {showNamespaceDropdown && (
            <div className="absolute z-10 w-full mt-8 bg-accent-white border border-border-faint rounded-12 shadow-xl overflow-hidden max-h-200 overflow-y-auto">
              {namespaces === undefined ? (
                <div className="p-16 flex items-center justify-center">
                  <Loader2 className="w-20 h-20 animate-spin text-heat-100" />
                </div>
              ) : namespaces.length === 0 ? (
                <div className="p-16 text-center text-sm text-black-alpha-48">
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
                    className={`w-full text-left px-16 py-10 text-sm transition-colors hover:bg-black-alpha-4 flex flex-col gap-2 ${namespaceId === ns._id ? "bg-heat-4" : ""
                      }`}
                  >
                    <span className="font-medium text-accent-black">{ns.name}</span>
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
        <div className="flex items-center justify-between mb-8">
          <label className="block text-sm font-medium text-black-alpha-48">
            Search Query
          </label>
          <div className="flex items-center gap-8">
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
            className="w-full px-14 py-10 bg-background-base border border-border-faint rounded-10 text-sm text-accent-black placeholder-black-alpha-32 focus:outline-none focus:border-heat-100 transition-colors resize-y pr-40"
          />
          <Search className="absolute right-12 top-12 w-16 h-16 text-black-alpha-24" />
        </div>
        <p className="text-[10px] text-black-alpha-40 mt-6">
          The retriever will find the most relevant chunks based on this text.
        </p>
      </div>

      {/* Limit */}
      <div>
        <label className="block text-sm font-medium text-black-alpha-48 mb-8">
          Result Limit
        </label>
        <div className="flex items-center gap-12">
          <input
            type="range"
            min="1"
            max="20"
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            className="flex-1 accent-heat-100"
          />
          <span className="text-sm font-semibold text-accent-black min-w-24 text-center">
            {limit}
          </span>
        </div>
        <p className="text-[10px] text-black-alpha-40 mt-4">
          Maximum number of chunks to retrieve.
        </p>
      </div>

      {/* Re-Ranking Toggle */}
      <div className="flex items-center justify-between p-12 bg-black-alpha-4 rounded-10 border border-border-faint">
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-accent-black">
            Enable Re-ranking
          </label>
          <p className="text-[10px] text-black-alpha-40 leading-tight pr-20">
            Uses LLM to re-score results for significantly better accuracy (+ latency).
          </p>
        </div>
        <button
          onClick={() => setReRank(!reRank)}
          className={`relative inline-flex h-20 w-36 items-center rounded-full transition-colors focus:outline-none ${reRank ? "bg-heat-100" : "bg-black-alpha-16"
            }`}
        >
          <span
            className={`inline-block h-14 w-14 transform rounded-full bg-white transition-transform ${reRank ? "translate-x-18" : "translate-x-4"
              }`}
          />
        </button>
      </div>

      <div className="pt-20 border-t border-border-faint">
        <div className="p-12 bg-heat-4 border border-heat-100/20 rounded-10 flex gap-12">
          <Search className="w-16 h-16 text-heat-100 shrink-0" />
          <p className="text-xs text-heat-120 leading-relaxed font-medium">
            This node will output a list of documents found in the selected Knowledge Base.
          </p>
        </div>
      </div>
    </div>
  );
}
