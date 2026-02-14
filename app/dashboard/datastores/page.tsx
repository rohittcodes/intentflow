"use client";

import { motion } from "framer-motion";
import { Database } from "lucide-react";
import Button from "@/components/ui/shadcn/button";

interface Datastore {
  id: string;
  name: string;
  type: "vector" | "postgres" | "redis";
  itemCount: number;
  status: "active" | "syncing" | "error";
  lastSynced: string;
}

export default function DatastoresPage() {
  // Mock Datastores
  const datastores: Datastore[] = [
    { id: "1", name: "Product Knowledge Base", type: "vector", itemCount: 1250, status: "active", lastSynced: "2 mins ago" },
    { id: "2", name: "User Logs", type: "postgres", itemCount: 45000, status: "active", lastSynced: "1 hour ago" },
    { id: "3", name: "Session Cache", type: "redis", itemCount: 890, status: "syncing", lastSynced: "Just now" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="h-full"
    >
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Datastores</h2>
          <p className="text-muted-foreground">Manage your vector stores and knowledge bases.</p>
        </div>
        <Button variant="secondary" className="gap-2">
          <Database className="w-4 h-4" /> New Datastore
        </Button>
      </div>

      <div className="grid gap-16 md:grid-cols-2 lg:grid-cols-3">
        {datastores.map((ds) => (
          <div key={ds.id} className="flex flex-col gap-12 rounded-12 border border-black-alpha-8 bg-accent-white p-16">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-12">
                <div className="p-8 bg-heat-8 rounded-8 text-heat-100">
                  <Database className="w-20 h-20" />
                </div>
                <div>
                  <h3 className="text-label-medium text-accent-black">{ds.name}</h3>
                  <p className="text-body-small text-black-alpha-56 capitalize">{ds.type}</p>
                </div>
              </div>
              <div className={`w-8 h-8 rounded-full ${ds.status === 'active' ? 'bg-green-500' : ds.status === 'syncing' ? 'bg-amber-500 animate-pulse' : 'bg-red-500'}`} />
            </div>
            <div className="grid grid-cols-2 gap-8 mt-8 pt-12 border-t border-black-alpha-8 text-body-small">
              <div>
                <p className="text-black-alpha-56">Items</p>
                <p className="text-label-medium text-accent-black">{ds.itemCount.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-black-alpha-56">Last Synced</p>
                <p className="text-label-medium text-accent-black">{ds.lastSynced}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
