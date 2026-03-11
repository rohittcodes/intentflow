"use client";

import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { Link as LinkIcon, Plus, Check } from "lucide-react";
import Button from "@/components/ui/shadcn/button";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import { useUser } from "@clerk/nextjs";

export default function ConnectionsPage() {
  const { user } = useUser();
  const [activeTab, setActiveTab] = useState<'installed' | 'discover'>('installed');
  const [discoverable, setDiscoverable] = useState<any[]>([]);
  const [loadingDiscover, setLoadingDiscover] = useState(false);

  // Fetch installed connections from Convex
  const installedConnections = useQuery(api.mcpServers.listUserMCPs,
    user?.id ? {} : "skip"
  );

  const addMcpServer = useMutation(api.mcpServers.addMCPServer);

  useEffect(() => {
    if (activeTab === 'discover' && discoverable.length === 0) {
      setLoadingDiscover(true);
      fetch('/api/mcp/discover')
        .then(res => res.json())
        .then(data => {
          if (data.success && data.servers) {
            setDiscoverable(data.servers);
          }
        })
        .catch(err => console.error("Failed to fetch discovery catalog:", err))
        .finally(() => setLoadingDiscover(false));
    }
  }, [activeTab, discoverable.length]);

  const handleInstall = async (serverDef: any) => {
    try {
      if (!user?.id) throw new Error("Not logged in");

      const toastId = toast.loading(`Installing ${serverDef.name}...`);

      await addMcpServer({
        name: serverDef.name,
        url: serverDef.url,
        description: serverDef.description,
        category: serverDef.category,
        authType: serverDef.authType,
        tools: serverDef.tools,
      });

      toast.success(`${serverDef.name} installed successfully!`, { id: toastId });
      setActiveTab('installed');
    } catch (err: any) {
      toast.error(`Failed to install: ${err.message}`);
    }
  };

  const isInstalled = (serverId: string) => {
    return installedConnections?.some(conn => conn.name === serverId || conn.url.includes(serverId));
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="h-full flex flex-col"
    >
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Connections</h2>
          <p className="text-muted-foreground">Manage MCP servers and external integrations.</p>
        </div>
      </div>

      <div className="flex gap-4 mb-6 border-b border-border-faint pb-px">
        <button
          className={`pb-2 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'installed' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
          onClick={() => setActiveTab('installed')}
        >
          Installed
        </button>
        <button
          className={`pb-2 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'discover' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
          onClick={() => setActiveTab('discover')}
        >
          Discover (App Store)
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {activeTab === 'installed' && (
          installedConnections === undefined ? (
            <div className="col-span-full py-12 text-center text-muted-foreground">Loading connections...</div>
          ) : installedConnections.length > 0 ? (
            installedConnections.map((conn) => (
              <div key={conn._id} className="flex flex-col gap-3 rounded-xl border bg-card p-6 shadow-sm">
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
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${conn.enabled ? 'bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20' : 'bg-gray-50 text-gray-600 ring-1 ring-inset ring-gray-500/10'}`}>
                    {conn.enabled ? 'connected' : 'disabled'}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2 mt-2">{conn.description}</p>
              </div>
            ))
          ) : (
            <div className="col-span-full py-12 text-center text-muted-foreground">
              No connections installed. Click on 'Discover' to add integrations.
            </div>
          )
        )}

        {activeTab === 'discover' && (
          loadingDiscover ? (
            <div className="col-span-full py-12 text-center text-muted-foreground">Loading app store...</div>
          ) : discoverable.length > 0 ? (
            discoverable.map((server) => {
              const installed = isInstalled(server.name);
              return (
                <div key={server.id} className="flex flex-col justify-between gap-3 rounded-xl border bg-card p-6 shadow-sm">
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-orange-500/10 rounded-md text-orange-500">
                          <Plus className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-sm">{server.name}</h3>
                          <p className="text-xs text-muted-foreground capitalize">{server.category}</p>
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-2">{server.description}</p>
                  </div>
                  <Button
                    variant={installed ? "secondary" : undefined}
                    className="w-full mt-2"
                    disabled={installed}
                    onClick={() => handleInstall(server)}
                  >
                    {installed ? <><Check className="w-4 h-4 mr-2" /> Installed</> : 'Install'}
                  </Button>
                </div>
              );
            })
          ) : (
            <div className="col-span-full py-12 text-center text-muted-foreground">
              No apps available to discover.
            </div>
          )
        )}
      </div>
    </motion.div>
  );
}
