"use client";

import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { Link as LinkIcon } from "lucide-react";
import Button from "@/components/ui/shadcn/button";

interface Connection {
  id: string;
  name: string;
  category: string;
  status: "connected" | "disconnected" | "error";
  description?: string;
}

export default function ConnectionsPage() {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
      } finally {
        setLoading(false);
      }
    };

    loadConnections();
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="h-full"
    >
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
    </motion.div>
  );
}
