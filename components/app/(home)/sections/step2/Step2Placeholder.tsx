"use client";

import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { listTemplates } from "@/lib/workflow/templates";
import { DashboardLayout } from "./DashboardLayout";
import { Plus, Database, Link as LinkIcon, ExternalLink, RefreshCw } from "lucide-react";
import Button from "@/components/ui/shadcn/button";

interface Step2PlaceholderProps {
  onReset: () => void;
  onCreateWorkflow: () => void;
  onLoadWorkflow?: (workflowId: string) => void;
  onLoadTemplate?: (templateId: string) => void;
}

interface Workflow {
  id: string;
  title: string;
  description?: string;
  createdAt: string;
}

interface Datastore {
  id: string;
  name: string;
  type: "vector" | "postgres" | "redis";
  itemCount: number;
  status: "active" | "syncing" | "error";
  lastSynced: string;
}

interface Connection {
  id: string;
  name: string;
  category: string;
  status: "connected" | "disconnected" | "error";
  description?: string;
}

export default function Step2Placeholder({ onReset, onCreateWorkflow, onLoadWorkflow, onLoadTemplate }: Step2PlaceholderProps) {
  const [activeView, setActiveView] = useState<"workflows" | "templates" | "datastores" | "connections">("workflows");
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Mock Datastores
  const datastores: Datastore[] = [
    { id: "1", name: "Product Knowledge Base", type: "vector", itemCount: 1250, status: "active", lastSynced: "2 mins ago" },
    { id: "2", name: "User Logs", type: "postgres", itemCount: 45000, status: "active", lastSynced: "1 hour ago" },
    { id: "3", name: "Session Cache", type: "redis", itemCount: 890, status: "syncing", lastSynced: "Just now" },
  ];

  const templates = listTemplates();

  useEffect(() => {
    // Load workflows
    const loadWorkflows = async () => {
      try {
        const response = await fetch('/api/workflows');
        const data = await response.json();

        if (data.workflows && Array.isArray(data.workflows)) {
          setWorkflows(data.workflows.map((w: any) => ({
            id: w.id,
            title: w.name,
            description: w.description,
            createdAt: new Date(w.updatedAt || w.createdAt).toLocaleDateString(),
          })));
        }
      } catch (error) {
        console.error('Error loading workflows:', error);
      }
    };

    // Load connections (MCP Servers)
    const loadConnections = async () => {
      try {
        const response = await fetch('/api/mcp/registry');
        const data = await response.json();

        if (data.success && data.servers) {
          setConnections(data.servers.map((s: any) => ({
            id: s.url, // Using URL as ID for now
            name: s.name,
            category: s.category || "General",
            status: s.enabled ? "connected" : "disconnected",
            description: s.description
          })));
        }
      } catch (error) {
        console.error('Error loading connections:', error);
      }
    }

    loadWorkflows();
    loadConnections();
  }, []);

  const renderContent = () => {
    switch (activeView) {
      case "workflows":
        return (
          <>
            <div className="flex justify-between items-center mb-8">
              <div>
                <h2 className="text-2xl font-bold tracking-tight">Workflows</h2>
                <p className="text-muted-foreground">Manage and monitor your automation workflows.</p>
              </div>
              <Button onClick={onCreateWorkflow} className="gap-2">
                <Plus className="w-4 h-4" /> New Workflow
              </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {/* Create New Card */}
              <div
                onClick={onCreateWorkflow}
                className="group relative flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed p-8 hover:bg-muted/50 cursor-pointer transition-colors"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors">
                  <Plus className="h-6 w-6 text-primary" />
                </div>
                <div className="text-center">
                  <h3 className="font-semibold">Create Workflow</h3>
                  <p className="text-sm text-muted-foreground">Start from scratch</p>
                </div>
              </div>

              {workflows.map((workflow) => (
                <div
                  key={workflow.id}
                  onClick={() => onLoadWorkflow?.(workflow.id)}
                  className="group relative flex flex-col gap-3 rounded-xl border bg-card p-6 shadow-sm hover:shadow-md cursor-pointer transition-all hover:border-primary/50"
                >
                  <div className="flex flex-col gap-1">
                    <h3 className="font-semibold leading-none tracking-tight group-hover:text-primary transition-colors">{workflow.title}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-2">{workflow.description || "No description provided."}</p>
                  </div>
                  <div className="mt-auto flex items-center text-xs text-muted-foreground">
                    <span>Updated {workflow.createdAt}</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        );

      case "templates":
        return (
          <>
            <div className="flex justify-between items-center mb-8">
              <div>
                <h2 className="text-2xl font-bold tracking-tight">Templates</h2>
                <p className="text-muted-foreground">Pre-built workflows to get you started faster.</p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {templates.map((template) => (
                <div
                  key={template.id}
                  onClick={() => onLoadTemplate?.(template.id)}
                  className="group relative flex flex-col gap-3 rounded-xl border bg-card p-6 shadow-sm hover:shadow-md cursor-pointer transition-all hover:border-blue-500/50"
                >
                  <div className="flex flex-col gap-1">
                    <h3 className="font-semibold leading-none tracking-tight group-hover:text-blue-500 transition-colors">{template.name}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-2">{template.description}</p>
                  </div>
                  <div className="mt-auto pt-4">
                    <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80">
                      Use Template
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </>
        );

      case "datastores":
        return (
          <>
            <div className="flex justify-between items-center mb-8">
              <div>
                <h2 className="text-2xl font-bold tracking-tight">Datastores</h2>
                <p className="text-muted-foreground">Manage your vector stores and knowledge bases.</p>
              </div>
              <Button variant="secondary" className="gap-2">
                <Database className="w-4 h-4" /> New Datastore
              </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {datastores.map((ds) => (
                <div key={ds.id} className="flex flex-col gap-3 rounded-xl border bg-card p-6 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/5 rounded-md text-primary">
                        <Database className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-sm">{ds.name}</h3>
                        <p className="text-xs text-muted-foreground capitalize">{ds.type}</p>
                      </div>
                    </div>
                    <div className={`w-2 h-2 rounded-full ${ds.status === 'active' ? 'bg-green-500' : ds.status === 'syncing' ? 'bg-amber-500 animate-pulse' : 'bg-red-500'}`} />
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-2 pt-4 border-t text-xs">
                    <div>
                      <p className="text-muted-foreground">Items</p>
                      <p className="font-medium">{ds.itemCount.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Last Synced</p>
                      <p className="font-medium">{ds.lastSynced}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        );

      case "connections":
        return (
          <>
            <div className="flex justify-between items-center mb-8">
              <div>
                <h2 className="text-2xl font-bold tracking-tight">Connections</h2>
                <p className="text-muted-foreground">Manage MCP servers and external integrations.</p>
              </div>
              <Button variant="secondary" className="gap-2">
                <LinkIcon className="w-4 h-4" /> Add Connection
              </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {connections.length > 0 ? (
                connections.map((conn) => (
                  <div key={conn.id} className="flex flex-col gap-3 rounded-xl border bg-card p-6 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-500/10 rounded-md text-blue-500">
                          <LinkIcon className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-sm">{conn.name}</h3>
                          <p className="text-xs text-muted-foreground capitalize">{conn.category}</p>
                        </div>
                      </div>
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${conn.status === 'connected' ? 'bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20' : 'bg-gray-50 text-gray-600 ring-1 ring-inset ring-gray-500/10'}`}>
                        {conn.status}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-2">{conn.description}</p>
                  </div>
                ))
              ) : (
                <div className="col-span-full py-12 text-center text-muted-foreground">
                  No connections found.
                </div>
              )}
            </div>
          </>
        );
    }
  };

  return (
    <DashboardLayout
      activeView={activeView}
      onViewChange={setActiveView}
      onReset={onReset}
    >
      <motion.div
        key={activeView}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="h-full"
      >
        {renderContent()}
      </motion.div>
    </DashboardLayout>
  );
}
