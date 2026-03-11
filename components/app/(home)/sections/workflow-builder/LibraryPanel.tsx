"use client";

import React, { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useUser } from "@clerk/nextjs";
import {
  FileCode,
  Database,
  Brain,
  Plug,
  Search,
  ChevronRight,
  ChevronDown,
  LayoutTemplate,
  Globe,
  Plus,
  Server,
  Zap
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

interface LibraryPanelProps {
  onAddSource?: () => void;
}

interface LibraryPanelProps {
  onAddSource?: () => void;
  onAddMCPServer?: () => void;
}

export default function LibraryPanel({ onAddSource, onAddMCPServer }: LibraryPanelProps) {
  const { user } = useUser();
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(["templates"]));

  // Queries
  const workflows = useQuery(api.workflows.list, {});
  const templates = useQuery(api.templates.getUserTemplates, { userId: user?.id ?? undefined });
  const connectors = useQuery(api.knowledgeConnectors.listConnectors);
  const namespaces = useQuery(api.knowledge.listNamespaces, {});
  const mcpServers = useQuery(api.mcpServers.listUserMCPs, user?.id ? {} : "skip");

  const toggleSection = (section: string) => {
    const next = new Set(expandedSections);
    if (next.has(section)) next.delete(section);
    else next.add(section);
    setExpandedSections(next);
  };

  const handleDragStart = (e: React.DragEvent, type: string, data: any) => {
    e.dataTransfer.setData("application/reactflow-library-type", type);
    e.dataTransfer.setData("application/reactflow-library-data", JSON.stringify(data));
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragStandardNode = (e: React.DragEvent, type: string, label: string) => {
    e.dataTransfer.setData("application/reactflow", type);
    e.dataTransfer.setData("application/reactflow-label", label);
    e.dataTransfer.effectAllowed = "move";
  };

  const filteredWorkflows = workflows?.filter(w =>
    w.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    w.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredTemplates = templates?.filter(t =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredConnectors = connectors?.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredNamespaces = namespaces?.filter(n =>
    n.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredMCP = mcpServers?.filter(m =>
    m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-accent-white">
      {/* Search Bar */}
      <div className="p-16 border-b border-border-faint">
        <div className="relative">
          <Search className="absolute left-12 top-1/2 -translate-y-1/2 w-16 h-16 text-black-alpha-32" />
          <input
            type="text"
            placeholder="Search library..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-36 pr-12 py-8 bg-background-base border border-border-faint rounded-8 text-body-small text-accent-black outline-none focus:border-heat-100 transition-colors"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {/* Common Tools Section */}
        {(() => {
          const allTools = [
            { label: "Database Query", description: "Query external databases", icon: <Database className="w-16 h-16 text-amber-500" />, type: "data-query", nodeLabel: "Database" },
            { label: "HTTP Request", description: "Make API calls", icon: <Server className="w-16 h-16 text-blue-500" />, type: "http", nodeLabel: "HTTP" },
            { label: "Knowledge Retriever", description: "Search knowledge bases", icon: <Brain className="w-16 h-16 text-purple-500" />, type: "retriever", nodeLabel: "Retriever" },
            { label: "Memory Node", description: "Persistent context storage", icon: <Zap className="w-16 h-16 text-purple-400" />, type: "memory", nodeLabel: "Memory" },
          ];

          const filteredTools = allTools.filter(tool =>
            tool.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
            tool.description.toLowerCase().includes(searchQuery.toLowerCase())
          );

          if (filteredTools.length === 0 && searchQuery) return null;

          return (
            <LibrarySection
              id="tools"
              label={`Common Tools (${filteredTools.length})`}
              icon={<Plus className="w-18 h-18" />}
              isOpen={expandedSections.has("tools") || (!!searchQuery && filteredTools.length > 0)}
              onToggle={() => toggleSection("tools")}
            >
              <div className="grid grid-cols-1 gap-8 p-12 pt-0">
                {filteredTools.map((tool) => (
                  <LibraryItem
                    key={tool.type}
                    label={tool.label}
                    description={tool.description}
                    icon={tool.icon}
                    onDragStart={(e) => handleDragStandardNode(e, tool.type, tool.nodeLabel)}
                  />
                ))}
              </div>
            </LibrarySection>
          );
        })()}

        {/* Workflows Section */}
        <LibrarySection
          id="workflows"
          label={`My Workflows (${filteredWorkflows?.length || 0})`}
          icon={<Globe className="w-18 h-18" />}
          isOpen={expandedSections.has("workflows")}
          onToggle={() => toggleSection("workflows")}
        >
          <div className="grid grid-cols-1 gap-8 p-12 pt-0">
            {filteredWorkflows?.map((wf) => (
              <LibraryItem
                key={wf._id}
                label={wf.name}
                description={wf.description}
                icon={<Globe className="w-16 h-16 text-heat-100" />}
                onDragStart={(e) => handleDragStart(e, "workflow", wf)}
              />
            ))}
            {filteredWorkflows?.length === 0 && (
              <p className="text-xs text-black-alpha-32 text-center py-8">No workflows found</p>
            )}
          </div>
        </LibrarySection>

        {/* Templates Section */}
        <LibrarySection
          id="templates"
          label={`Templates (${filteredTemplates?.length || 0})`}
          icon={<LayoutTemplate className="w-18 h-18" />}
          isOpen={expandedSections.has("templates")}
          onToggle={() => toggleSection("templates")}
        >
          <div className="grid grid-cols-1 gap-8 p-12 pt-0">
            {filteredTemplates?.map((template) => (
              <LibraryItem
                key={template._id}
                label={template.name}
                description={template.description}
                icon={<FileCode className="w-16 h-16 text-blue-500" />}
                onDragStart={(e) => handleDragStart(e, "template", template)}
              />
            ))}
            {filteredTemplates?.length === 0 && (
              <p className="text-xs text-black-alpha-32 text-center py-8">No templates found</p>
            )}
          </div>
        </LibrarySection>

        {/* Data Sources Section */}
        <LibrarySection
          id="connectors"
          label={`Data Sources (${filteredConnectors?.length || 0})`}
          icon={<Database className="w-18 h-18" />}
          isOpen={expandedSections.has("connectors")}
          onToggle={() => toggleSection("connectors")}
          action={
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAddSource?.();
              }}
              className="p-4 hover:bg-black-alpha-8 rounded-4 text-heat-100 transition-colors"
              title="Add new data source"
            >
              <Plus className="w-16 h-16" />
            </button>
          }
        >
          <div className="grid grid-cols-1 gap-8 p-12 pt-0">
            {filteredConnectors?.map((connector) => (
              <LibraryItem
                key={connector._id}
                label={connector.name}
                description={connector.type}
                icon={<Globe className="w-16 h-16 text-green-500" />}
                onDragStart={(e) => handleDragStart(e, "connector", connector)}
              />
            ))}
            {filteredConnectors?.length === 0 && (
              <p className="text-xs text-black-alpha-32 text-center py-8">No data sources found</p>
            )}
          </div>
        </LibrarySection>

        {/* Knowledge Bases Section */}
        <LibrarySection
          id="namespaces"
          label={`Knowledge Bases (${filteredNamespaces?.length || 0})`}
          icon={<Brain className="w-18 h-18" />}
          isOpen={expandedSections.has("namespaces")}
          onToggle={() => toggleSection("namespaces")}
        >
          <div className="grid grid-cols-1 gap-8 p-12 pt-0">
            {filteredNamespaces?.map((ns) => (
              <LibraryItem
                key={ns._id}
                label={ns.name}
                description={`${ns.documentCount || 0} documents`}
                icon={<Brain className="w-16 h-16 text-purple-500" />}
                onDragStart={(e) => handleDragStart(e, "namespace", ns)}
              />
            ))}
            {filteredNamespaces?.length === 0 && (
              <p className="text-xs text-black-alpha-32 text-center py-8">No knowledge bases found</p>
            )}
          </div>
        </LibrarySection>

        {/* MCP Servers Section */}
        <LibrarySection
          id="mcp"
          label={`MCP Servers (${filteredMCP?.length || 0})`}
          icon={<Plug className="w-18 h-18" />}
          isOpen={expandedSections.has("mcp")}
          onToggle={() => toggleSection("mcp")}
          action={
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAddMCPServer?.();
              }}
              className="p-4 hover:bg-black-alpha-8 rounded-4 text-heat-100 transition-colors"
              title="Add new MCP server"
            >
              <Plus className="w-16 h-16" />
            </button>
          }
        >
          <div className="grid grid-cols-1 gap-8 p-12 pt-0">
            {filteredMCP?.map((mcp) => (
              <LibraryItem
                key={mcp._id}
                label={mcp.name}
                description={mcp.category}
                icon={<Plug className="w-16 h-16 text-heat-100" />}
                onDragStart={(e) => handleDragStart(e, "mcp", mcp)}
              />
            ))}
            {filteredMCP?.length === 0 && (
              <p className="text-xs text-black-alpha-32 text-center py-8">No MCP servers found</p>
            )}
          </div>
        </LibrarySection>
      </div>

      {/* Footer Info */}
      <div className="p-12 border-t border-border-faint bg-background-base">
        <p className="text-[10px] text-black-alpha-48 uppercase font-bold tracking-wider mb-4">Pro Tip</p>
        <p className="text-xs text-black-alpha-64 leading-relaxed">
          Drag and drop any asset directly onto the canvas to instantly create or merge nodes.
        </p>
      </div>
    </div>
  );
}

function LibrarySection({
  id,
  label,
  icon,
  isOpen,
  onToggle,
  action,
  children
}: {
  id: string;
  label: string;
  icon: React.ReactNode;
  isOpen: boolean;
  onToggle: () => void;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="border-b border-border-faint last:border-b-0">
      <div className="flex items-center hover:bg-black-alpha-4 transition-colors">
        <button
          onClick={onToggle}
          className="flex-1 flex items-center justify-between p-16 text-left"
        >
          <div className="flex items-center gap-12">
            <div className="text-accent-black opacity-60">{icon}</div>
            <span className="text-label-medium font-medium text-accent-black">{label}</span>
          </div>
          {isOpen ? (
            <ChevronDown className="w-16 h-16 text-black-alpha-32" />
          ) : (
            <ChevronRight className="w-16 h-16 text-black-alpha-32" />
          )}
        </button>
        {action && <div className="pr-16">{action}</div>}
      </div>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function LibraryItem({
  label,
  description,
  icon,
  onDragStart
}: {
  label: string;
  description?: string;
  icon: React.ReactNode;
  onDragStart: (e: React.DragEvent) => void;
}) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      className="group p-12 bg-accent-white border border-border-faint rounded-8 hover:border-heat-100 hover:shadow-sm cursor-grab active:cursor-grabbing transition-all"
    >
      <div className="flex items-start gap-10">
        <div className="mt-2 group-hover:scale-110 transition-transform">{icon}</div>
        <div className="flex-1 min-w-0">
          <p className="text-body-small font-semibold text-accent-black truncate">{label}</p>
          {description && (
            <p className="text-xs text-black-alpha-48 truncate mt-1">{description}</p>
          )}
        </div>
      </div>
    </div>
  );
}
