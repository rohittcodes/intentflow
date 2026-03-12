"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useUser } from "@clerk/nextjs";
import { useWorkspace } from "@/components/providers/WorkspaceProvider";
import Link from "next/link";
import {
  Workflow,
  CheckCircle2,
  XCircle,
  Clock,
  Zap,
  Link as LinkIcon,
  Plus,
  ArrowRight,
  Loader2,
  Activity,
  LayoutGrid,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

function StatCard({
  label,
  value,
  icon: Icon,
  iconColor,
  iconBg,
  sub,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
  sub?: string;
}) {
  return (
    <Card className="border-border/60 shadow-sm">
      <CardContent className="p-5 flex items-center gap-4">
        <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center shrink-0", iconBg)}>
          <Icon className={cn("h-5 w-5", iconColor)} />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold tracking-tight">{value}</p>
          {sub && <p className="text-xs text-muted-foreground mt-0.5 truncate">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  completed: { label: "Success", color: "text-green-500", icon: CheckCircle2 },
  failed: { label: "Failed", color: "text-red-500", icon: XCircle },
  running: { label: "Running", color: "text-blue-500", icon: Loader2 },
};

export default function DashboardPage() {
  const { user } = useUser();
  const { activeWorkspaceId, activeProjectId } = useWorkspace();
  const workflows = useQuery(
    api.workflows.listWorkflows,
    activeWorkspaceId ? { workspaceId: activeWorkspaceId, projectId: activeProjectId || undefined } : "skip"
  );
  const recentExecutions = useQuery(
    api.executions.listForWorkspace,
    activeWorkspaceId ? { workspaceId: activeWorkspaceId } : "skip"
  );
  const connections = useQuery(
    api.mcpServers.listUserMCPs,
    user?.id ? {} : "skip"
  );
  const usage = useQuery(
    api.usage_queries.getUserUsage,
    user?.id ? { userId: user.id } : "skip"
  );

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const firstName = user?.firstName || "there";

  const totalWorkflows = workflows?.length ?? 0;
  const activeConnections = connections?.filter((c) => c.enabled).length ?? 0;
  const successCount = recentExecutions?.filter((e: any) => e.status === "completed").length ?? 0;
  const failCount = recentExecutions?.filter((e: any) => e.status === "failed").length ?? 0;

  const QUICK_ACTIONS = [
    { label: "New Workflow", icon: Plus, href: "/dashboard/workflows", variant: "default" as const },
    { label: "Connections", icon: LinkIcon, href: "/dashboard/connections", variant: "outline" as const },
    { label: "View Logs", icon: Activity, href: "/dashboard/logs", variant: "outline" as const },
  ];

  return (
    <div className="pb-8 space-y-6">
      <PageHeader title="Overview" />

      {/* Greeting */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight">{greeting}, {firstName} 👋</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {QUICK_ACTIONS.map((action) => (
            <Button key={action.label} variant={action.variant} size="sm" className="h-8 gap-1.5 text-xs" asChild>
              <Link href={action.href}>
                <action.icon className="h-3.5 w-3.5" />
                {action.label}
              </Link>
            </Button>
          ))}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Workflows"
          value={totalWorkflows}
          icon={LayoutGrid}
          iconColor="text-primary"
          iconBg="bg-primary/10"
          sub={`${workflows?.filter((w: any) => w.isDeployed).length ?? 0} deployed`}
        />
        <StatCard
          label="Connections"
          value={activeConnections}
          icon={LinkIcon}
          iconColor="text-violet-500"
          iconBg="bg-violet-500/10"
          sub={`${connections?.length ?? 0} total`}
        />
        <StatCard
          label="Successful Runs"
          value={successCount}
          icon={CheckCircle2}
          iconColor="text-green-500"
          iconBg="bg-green-500/10"
          sub="last 6 executions"
        />
        <StatCard
          label="Usage"
          value={usage ? `${usage.executions.percentage}%` : "—"}
          icon={Zap}
          iconColor="text-amber-500"
          iconBg="bg-amber-500/10"
          sub={usage ? `${usage.executions.current} / ${usage.executions.limit} runs` : "Loading..."}
        />
      </div>

      {/* Recent executions + Workflows list */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Runs */}
        <Card className="border-border/60 shadow-sm">
          <CardHeader className="px-5 py-4 border-b border-border/40 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold">Recent Runs</CardTitle>
            <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-muted-foreground" asChild>
              <Link href="/dashboard/logs">View all <ArrowRight className="h-3 w-3" /></Link>
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {recentExecutions === undefined ? (
              <div className="flex items-center justify-center h-40">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : recentExecutions.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-center px-6">
                <Clock className="h-8 w-8 text-muted-foreground/30 mb-2" />
                <p className="text-xs text-muted-foreground">No runs yet — execute a workflow to see results here.</p>
              </div>
            ) : (
              <div className="divide-y divide-border/40">
                {recentExecutions.map((exec: any) => {
                  const cfg = STATUS_CONFIG[exec.status] ?? STATUS_CONFIG.running;
                  const Icon = cfg.icon;
                  return (
                    <div key={exec._id} className="flex items-center gap-3 px-5 py-3 hover:bg-muted/20 transition-colors">
                      <Icon className={cn("h-4 w-4 shrink-0", cfg.color, exec.status === "running" && "animate-spin")} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold truncate">{exec.workflowName || "Unnamed Workflow"}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {new Date(exec.startedAt).toLocaleString()}
                        </p>
                      </div>
                      <Badge
                        variant="secondary"
                        className={cn("text-[9px] font-bold uppercase tracking-wider h-5 px-1.5 shrink-0", cfg.color)}
                      >
                        {cfg.label}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Workflows list */}
        <Card className="border-border/60 shadow-sm">
          <CardHeader className="px-5 py-4 border-b border-border/40 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold">Your Workflows</CardTitle>
            <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-muted-foreground" asChild>
              <Link href="/dashboard/workflows">View all <ArrowRight className="h-3 w-3" /></Link>
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {workflows === undefined ? (
              <div className="flex items-center justify-center h-40">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : workflows.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-center px-6">
                <Workflow className="h-8 w-8 text-muted-foreground/30 mb-2" />
                <p className="text-xs text-muted-foreground mb-3">No workflows yet.</p>
                <Button size="sm" className="h-7 text-xs gap-1" asChild>
                  <Link href="/dashboard/workflows"><Plus className="h-3 w-3" /> Create one</Link>
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-border/40">
                {workflows.slice(0, 6).map((wf: any) => (
                  <div key={wf._id} className="flex items-center gap-3 px-5 py-3 hover:bg-muted/20 transition-colors">
                    <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Workflow className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold truncate">{wf.name}</p>
                      <p className="text-[10px] text-muted-foreground">{wf.nodes?.length ?? 0} nodes</p>
                    </div>
                    {wf.isDeployed && (
                      <Badge variant="secondary" className="text-[9px] font-bold text-green-600 bg-green-500/10 h-5 px-1.5 shrink-0">
                        LIVE
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
