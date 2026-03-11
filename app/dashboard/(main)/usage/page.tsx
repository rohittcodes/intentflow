"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useUser } from "@clerk/nextjs";
import {
  Zap,
  Layers,
  Workflow,
  Database,
  ShieldAlert,
  ChevronRight,
  Loader2,
  TrendingUp,
  Clock,
  CreditCard,
  BarChart2,
  AlertCircle
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export default function UsagePage() {
  const { user } = useUser();
  const usage = useQuery(api.usage_queries.getUserUsage,
    user?.id ? { userId: user.id } : "skip"
  );

  if (usage === undefined) {
    return (
      <div className="flex h-[400px] items-center justify-center text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin mr-2" />
        Loading usage data...
      </div>
    );
  }

  if (usage === null) return null;

  return (
    <div className="pb-8 space-y-8">
      <PageHeader
        title="Usage & Limits"
        actions={
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="px-3 py-1 text-xs font-bold uppercase tracking-wider bg-primary/5 text-primary border-primary/20">
              {usage.tier} Plan
            </Badge>
            <Button size="sm" className="h-8 group">
              Upgrade Plan
              <ChevronRight className="ml-1 h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
            </Button>
          </div>
        }
      />

      {/* Main Usage Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-border shadow-sm overflow-hidden relative">
          <div className="absolute top-0 right-0 p-6 opacity-5">
            <Zap className="h-24 w-24" />
          </div>
          <CardHeader>
            <div className="flex items-center gap-2 mb-1">
              <Zap className="h-4 w-4 text-primary" />
              <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Workflow Executions</CardTitle>
            </div>
            <CardDescription>Executions reset every 30 days</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-end justify-between">
              <div className="text-4xl font-bold tracking-tighter">
                {usage.executions.current}
                <span className="text-xl text-muted-foreground font-medium ml-2">/ {usage.executions.limit}</span>
              </div>
              <div className="text-sm font-bold text-muted-foreground">
                {usage.executions.percentage}% used
              </div>
            </div>
            <Progress value={usage.executions.percentage} className="h-2" />
            <p className="text-[11px] text-muted-foreground font-medium flex items-center gap-1.5">
              <Clock className="h-3 w-3" />
              Current period started {new Date(usage.periodStart).toLocaleDateString()}
            </p>
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-primary" />
              <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Resource Scoping</CardTitle>
            </div>
            <CardDescription>Current active resources across your workspace</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {usage.resources.map((resource: any) => (
              <div key={resource.name} className="space-y-2">
                <div className="flex justify-between text-xs font-bold uppercase tracking-wider">
                  <span className="text-muted-foreground flex items-center gap-2">
                    {resource.name === "Projects" && <Layers className="h-3 w-3" />}
                    {resource.name === "Workflows" && <Workflow className="h-3 w-3" />}
                    {resource.name === "Knowledge Bases" && <Database className="h-3 w-3" />}
                    {resource.name}
                  </span>
                  <span>{resource.current} / {resource.limit}</span>
                </div>
                <Progress value={resource.percentage} className="h-1.5" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Global Metadata Stats */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="border-border bg-muted/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Total Runs (All Time)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight">{usage.billing.totalExecutions}</div>
          </CardContent>
        </Card>
        <Card className="border-border bg-muted/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Compute Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight">{(usage.billing.totalRuntime / 60).toFixed(1)} mins</div>
          </CardContent>
        </Card>
        <Card className="border-border bg-muted/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Safety Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-green-500">
              <span className="text-sm font-bold uppercase tracking-wider">Nominal</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Upgrade Callout */}
      <Card className="border-primary/20 bg-primary/5 shadow-none border-dashed">
        <CardContent className="py-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <ShieldAlert className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h4 className="font-bold text-sm">Need more resources?</h4>
              <p className="text-xs text-muted-foreground">Upgrade to Pro for more projects, workflows, and advanced safety guardrails.</p>
            </div>
          </div>
          <Button variant="default">View Plans</Button>
        </CardContent>
      </Card>
    </div>
  );
}
