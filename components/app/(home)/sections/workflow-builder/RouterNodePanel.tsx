"use client";

import { useState, useEffect } from "react";
import { 
  Plus, 
  Trash2, 
  ArrowRight, 
  Split, 
  GitBranch, 
  Zap, 
  Settings2, 
  Infinity,
  Check,
  ChevronRight,
  Route
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

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
      { id: "route-1", label: "Success", condition: "true" },
      { id: "route-2", label: "Failure", condition: "false" },
    ]
  );

  // Sync with node data
  useEffect(() => {
    if (!node?.id) return;

    if (JSON.stringify(routes) !== JSON.stringify(node.data?.routes)) {
      updateNodeData(node.id, {
        routes,
        nodeType: 'router'
      });
    }
  }, [routes, node?.id, node.data?.routes, updateNodeData]);

  const addRoute = () => {
    const newId = `route-${Date.now()}`;
    setRoutes([...routes, { id: newId, label: `Route ${routes.length + 1}`, condition: "" }]);
  };

  const removeRoute = (id: string) => {
    // Protect Success (route-1) and Failure (route-2) routes
    if (id === "route-1" || id === "route-2") {
      toast.error("System routes cannot be deleted", {
        description: "Success and Failure routes are required for flow integrity."
      });
      return;
    }
    if (routes.length <= 1) return;
    setRoutes(routes.filter((r) => r.id !== id));
  };

  const updateRoute = (id: string, updates: any) => {
    setRoutes(routes.map((r) => (r.id === id ? { ...r, ...updates } : r)));
  };

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 w-full pb-10">
      {/* Header */}
      <div className="space-y-3 pt-1 max-w-[320px] mx-auto">
        <div className="flex items-center justify-between">
          <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Router Configuration</Label>
          <Badge variant="secondary" className="bg-blue-500/10 text-blue-600 border border-blue-500/20 text-[9px] font-bold uppercase tracking-widest px-1.5 h-5 rounded-sm">
            Logical Branching
          </Badge>
        </div>
      </div>

      {/* Routes & Conditions */}
      <div className="space-y-3 border-t border-border/50 pt-5 max-w-[320px] mx-auto">
        <div className="flex items-center justify-between">
          <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Routes</Label>
          <Button
            variant="outline"
            size="sm"
            onClick={addRoute}
            className="h-7 px-2.5 bg-primary/5 border-primary/20 text-primary hover:bg-primary/10 transition-all gap-1.5 rounded-md"
          >
            <Plus className="h-3 w-3" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Add Route</span>
          </Button>
        </div>

        <div className="space-y-3">
          <AnimatePresence initial={false} mode="popLayout">
            {routes.map((route, index) => (
              <motion.div
                key={route.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
              >
                <Card className="bg-muted/10 border-border/50 shadow-none hover:border-primary/20 transition-all rounded-md overflow-hidden group">
                  <CardContent className="p-3 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="h-6 w-6 rounded-md bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0 font-mono text-[10px] font-bold">
                        {index + 1}
                      </div>
                      <div className="flex-1 flex items-center gap-3">
                        <Input
                          value={route.label}
                          onChange={(e) => updateRoute(route.id, { label: e.target.value })}
                          placeholder="Route Name"
                          className="h-7 bg-transparent border-none shadow-none text-xs font-bold focus-visible:ring-0 p-0"
                        />
                      </div>
                      {routes.length > 1 && route.id !== "route-1" && route.id !== "route-2" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeRoute(route.id)}
                          className="h-6 w-6 text-muted-foreground hover:text-red-500 hover:bg-red-500/5 transition-all rounded-md"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>

                    <div className="space-y-2 pt-1">
                      <Textarea
                        value={route.condition}
                        onChange={(e) => updateRoute(route.id, { condition: e.target.value })}
                        placeholder="e.g. input.score > 0.8"
                        rows={2}
                        className="min-h-[50px] bg-slate-950 text-emerald-400 border-border/30 font-mono text-[11px] focus-visible:ring-primary/20 transition-all resize-none leading-relaxed p-4 shadow-inner rounded-sm"
                      />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Logic Summary */}
      <Card className="bg-secondary/40 border-border/30 shadow-none rounded-lg max-w-[320px] mx-auto">
        <CardContent className="p-4 flex gap-3">
          <Zap className="h-4 w-4 text-primary shrink-0 opacity-60" />
          <p className="text-[11px] text-muted-foreground leading-relaxed italic font-medium">
            <strong className="text-foreground font-bold">Execution Order:</strong> Evaluation is sequential. The first truthy condition triggers the route. Use <code className="bg-primary/5 text-primary px-1 rounded-sm font-bold">true</code> for a default "Else" catch-all.
          </p>
        </CardContent>
      </Card>

      {/* Advanced info */}
      <div className="space-y-3 border-t border-border/50 pt-6 max-w-[320px] mx-auto">
        <div className="flex items-center gap-2">
          <Infinity className="h-3.5 w-3.5 text-muted-foreground/60" />
          <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Global Scope Registry</Label>
        </div>
        <div className="grid grid-cols-2 gap-2">
            {['input', 'state', 'lastOutput'].map((v) => (
                <div key={v} className="flex items-center gap-2 p-2 rounded-lg bg-muted/5 border border-border/30">
                    <Check className="h-2.5 w-2.5 text-emerald-500" />
                    <code className="text-[10px] font-mono text-muted-foreground opacity-70">{v}</code>
                </div>
            ))}
        </div>
      </div>
    </div>
  );
}
