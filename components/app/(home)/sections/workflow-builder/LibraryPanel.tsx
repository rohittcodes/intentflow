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
  Zap,
  MousePointer2,
  StopCircle,
  FileText,
  GitBranch,
  Repeat,
  CheckCircle,
  Shield,
  Braces,
  Activity,
  Layers
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";

interface LibraryPanelProps {
  onAddSource?: () => void;
  onAddMCPServer?: () => void;
  filter?: 'all' | 'templates' | 'connectors' | 'nodes' | 'local' | 'external';
}

export default function LibraryPanel({ onAddSource, onAddMCPServer, filter = 'all' }: LibraryPanelProps) {
  const { user } = useUser();
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(["templates", "workflows", "connectors", "mcp"]));

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
      <div className="p-3 border-b border-border">
        <div className="relative">
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-black-alpha-32" />
          <Input
            type="text"
            placeholder="Search library..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-2 py-1.5 bg-background border border-border rounded-md text-[11px] text-foreground outline-none focus:border-primary transition-colors"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">


        {/* Workspace Section - local only */}
        {(filter === 'all' || filter === 'local') && (
          <LibrarySection
            id="workflows"
            label={`My Workflows (${filteredWorkflows?.length || 0})`}
            icon={<Globe className="w-6 h-6" />}
            isOpen={expandedSections.has("workflows")}
            onToggle={() => toggleSection("workflows")}
          >
            <div className="grid grid-cols-1 gap-2 p-2">
              {filteredWorkflows?.map((wf) => (
                <LibraryItem
                  key={wf._id}
                  label={wf.name}
                  description={wf.description}
                  icon={<Globe className="w-3.5 h-3.5 text-primary" />}
                  onDragStart={(e) => handleDragStart(e, "workflow", wf)}
                />
              ))}
              {filteredWorkflows?.length === 0 && (
                <p className="text-xs text-black-alpha-32 text-center py-8">No workflows found</p>
              )}
            </div>
          </LibrarySection>
        )}

        {/* Knowledge Bases Section - local only */}
        {(filter === 'all' || filter === 'local') && (
          <LibrarySection
            id="namespaces"
            label={`Knowledge Bases (${filteredNamespaces?.length || 0})`}
            icon={<Brain className="w-6 h-6" />}
            isOpen={expandedSections.has("namespaces")}
            onToggle={() => toggleSection("namespaces")}
          >
            <div className="grid grid-cols-1 gap-2 p-2">
              {filteredNamespaces?.map((ns) => (
                <LibraryItem
                  key={ns._id}
                  label={ns.name}
                  description={`${ns.documentCount || 0} documents`}
                  icon={<Brain className="w-3.5 h-3.5 text-purple-500" />}
                  onDragStart={(e) => handleDragStart(e, "namespace", ns)}
                />
              ))}
              {filteredNamespaces?.length === 0 && (
                <p className="text-xs text-black-alpha-32 text-center py-8">No knowledge bases found</p>
              )}
            </div>
          </LibrarySection>
        )}

        {/* Templates Section - external only */}
        {(filter === 'all' || filter === 'templates' || filter === 'external') && (
          <LibrarySection
            id="templates"
            label={`Templates (${filteredTemplates?.length || 0})`}
            icon={<LayoutTemplate className="w-6 h-6" />}
            isOpen={expandedSections.has("templates") || filter === 'templates' || filter === 'external'}
            onToggle={() => toggleSection("templates")}
          >
            <div className="grid grid-cols-1 gap-2 p-2">
              {filteredTemplates?.map((template) => (
                <LibraryItem
                  key={template._id}
                  label={template.name}
                  description={template.description}
                  icon={<FileCode className="w-3.5 h-3.5 text-blue-500" />}
                  onDragStart={(e) => handleDragStart(e, "template", template)}
                />
              ))}
              {filteredTemplates?.length === 0 && (
                <p className="text-xs text-black-alpha-32 text-center py-8">No templates found</p>
              )}
            </div>
          </LibrarySection>
        )}

        {/* Data Sources Section - external only */}
        {(filter === 'all' || filter === 'connectors' || filter === 'external') && (
          <LibrarySection
            id="connectors"
            label={`Data Sources (${filteredConnectors?.length || 0})`}
            icon={<Database className="w-6 h-6" />}
            isOpen={expandedSections.has("connectors") || filter === 'connectors' || filter === 'external'}
            onToggle={() => toggleSection("connectors")}
            action={
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onAddSource?.();
                }}
                className="p-1 hover:bg-black-alpha-8 rounded-md text-primary transition-colors"
                title="Add new data source"
              >
                <Plus className="w-4 h-4" />
              </button>
            }
          >
            <div className="grid grid-cols-1 gap-2 p-2">
              {filteredConnectors?.map((connector) => (
                <LibraryItem
                  key={connector._id}
                  label={connector.name}
                  description={connector.type}
                  icon={<Globe className="w-3.5 h-3.5 text-green-500" />}
                  onDragStart={(e) => handleDragStart(e, "connector", connector)}
                />
              ))}
              {filteredConnectors?.length === 0 && (
                <p className="text-xs text-black-alpha-32 text-center py-8">No data sources found</p>
              )}
            </div>
          </LibrarySection>
        )}

        {/* MCP Servers Section - external only */}
        {(filter === 'all' || filter === 'external') && (
          <LibrarySection
            id="mcp"
            label={`MCP Servers (${filteredMCP?.length || 0})`}
            icon={<Plug className="w-6 h-6" />}
            isOpen={expandedSections.has("mcp") || filter === 'external'}
            onToggle={() => toggleSection("mcp")}
            action={
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onAddMCPServer?.();
                }}
                className="p-1 hover:bg-black-alpha-8 rounded-md text-primary transition-colors"
                title="Add new MCP server"
              >
                <Plus className="w-4 h-4" />
              </button>
            }
          >
            <div className="grid grid-cols-1 gap-2 p-2">
              {filteredMCP?.map((mcp) => (
                <LibraryItem
                  key={mcp._id}
                  label={mcp.name}
                  description={mcp.category}
                  icon={<Plug className="w-3.5 h-3.5 text-primary" />}
                  onDragStart={(e) => handleDragStart(e, "mcp", mcp)}
                />
              ))}
              {filteredMCP?.length === 0 && (
                <p className="text-xs text-black-alpha-32 text-center py-8">No MCP servers found</p>
              )}
            </div>
          </LibrarySection>
        )}
      </div>

      {/* Footer Info */}
      <div className="p-3 border-t border-border bg-background">
        <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-4">Pro Tip</p>
        <p className="text-xs text-foreground/64 leading-relaxed">
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
    <div className="border-b border-border last:border-b-0">
      <div
        onClick={onToggle}
        className="flex items-center hover:bg-secondary transition-colors cursor-pointer group"
      >
        <div className="flex-1 flex items-center p-3 text-left min-w-0">
          <div className="flex-1 min-w-0 flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <div className="text-foreground opacity-60 scale-90 shrink-0">{icon}</div>
              <span className="text-[11px] font-semibold text-foreground truncate">{label}</span>
            </div>
            <div className="flex items-center gap-2">
              {action && (
                <div onClick={(e) => e.stopPropagation()}>
                  {action}
                </div>
              )}
              <div className="flex-shrink-0 ml-1">
                {isOpen ? (
                  <ChevronDown className="w-3.5 h-3.5 text-black-alpha-32" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 text-black-alpha-32" />
                )}
              </div>
            </div>
          </div>
        </div>
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
  color,
  onDragStart
}: {
  label: string;
  description?: string;
  icon: React.ReactNode;
  color?: string;
  onDragStart: (e: React.DragEvent) => void;
}) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      className="group p-2.5 bg-accent-white border border-border rounded-lg hover:border-black-alpha-12 hover:shadow-sm cursor-grab active:cursor-grabbing transition-all"
    >
      <div className="flex items-center gap-2.5">
        <div className={`mt-0.5 group-hover:scale-105 transition-transform shrink-0 flex items-center justify-center rounded-md ${color || 'bg-secondary'} w-7 h-7 shadow-sm`}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-bold text-foreground/90 truncate">{label}</p>
          {description && (
            <p className="text-[10px] text-muted-foreground/80 truncate mt-0.5">{description}</p>
          )}
        </div>
      </div>
    </div>
  );
}
