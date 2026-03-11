"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface RouterNodePanelProps {
  node: any;
  updateNodeData: (nodeId: string, data: any) => void;
}

export default function RouterNodePanel({
  node,
  updateNodeData,
}: RouterNodePanelProps) {
  const [routes, setRoutes] = useState<Array<{ id: string; label: string; condition: string }>>(
    node?.data?.routes || [
      { id: "route-1", label: "Route 1", condition: "" },
      { id: "route-2", label: "Route 2", condition: "" },
    ]
  );

  // Sync with node data - stop infinite loop by checking for changes
  useEffect(() => {
    if (!node?.id) return;

    if (JSON.stringify(routes) !== JSON.stringify(node.data?.routes)) {
      updateNodeData(node.id, {
        routes,
      });
    }
  }, [routes, node?.id, node.data?.routes, updateNodeData]);

  const addRoute = () => {
    const newId = `route-${routes.length + 1}-${Math.random().toString(36).substr(2, 4)}`;
    setRoutes([...routes, { id: newId, label: `Route ${routes.length + 1}`, condition: "" }]);
  };

  const removeRoute = (id: string) => {
    if (routes.length <= 1) return;
    setRoutes(routes.filter((r) => r.id !== id));
  };

  const updateRoute = (id: string, updates: any) => {
    setRoutes(routes.map((r) => (r.id === id ? { ...r, ...updates } : r)));
  };

  return (
    <div className="p-2 space-y-2 w-[260px]">
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-muted-foreground">
            Routes & Conditions
          </label>
          <button
            onClick={addRoute}
            className="flex items-center gap-1 text-xs font-semibold text-primary hover:text-heat-200 transition-colors"
          >
            <Plus className="w-3 h-3" />
            Add Route
          </button>
        </div>

        <div className="space-y-2">
          <AnimatePresence initial={false}>
            {routes.map((route, index) => (
              <motion.div
                key={route.id}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="p-2 bg-background border border-border rounded-lg space-y-2"
              >
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-secondary flex items-center justify-center text-[10px] font-bold text-primary">
                    {index + 1}
                  </div>
                  <input
                    type="text"
                    value={route.label}
                    onChange={(e) => updateRoute(route.id, { label: e.target.value })}
                    placeholder="Route label (e.g. Success)"
                    className="flex-1 bg-transparent border-none outline-none text-sm font-medium text-foreground px-1 focus:ring-0"
                  />
                  <button
                    onClick={() => removeRoute(route.id)}
                    className="p-1 hover:bg-secondary rounded-4 text-black-alpha-32 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex flex-col gap-1.5 pl-7">
                  <label className="text-[10px] uppercase tracking-wider font-bold text-black-alpha-24">
                    Condition
                  </label>
                  <textarea
                    value={route.condition}
                    onChange={(e) => updateRoute(route.id, { condition: e.target.value })}
                    placeholder="e.g. {{output.score}} > 0.8"
                    rows={2}
                    className="w-full px-3 py-1.5 bg-accent-white border border-border rounded-6 text-xs text-foreground focus:outline-none focus:border-primary transition-colors resize-none"
                  />
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      <div className="p-2 bg-secondary rounded-lg border border-border">
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          <ArrowRight className="w-3 h-3 inline mr-1 mb-0.5" />
          The router will evaluate conditions in order. The first route to match will be followed. Add an "Else" route at the end with <code>true</code> as the condition.
        </p>
      </div>
    </div>
  );
}
