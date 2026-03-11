"use client";

import { motion } from "framer-motion";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useUser } from "@clerk/nextjs";
import { useWorkspace } from "@/components/providers/WorkspaceProvider";
import { Id } from "@/convex/_generated/dataModel";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Activity, BarChart2, TrendingUp, Zap, Clock, AlertCircle, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
export default function AnalyticsDashboardPage() {
  const { activeWorkspaceId } = useWorkspace();

  const stats = useQuery(api.analytics.getDashboardStats,
    activeWorkspaceId ? { workspaceId: activeWorkspaceId as Id<"workspaces"> } : "skip"
  );

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'm';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
    return num.toString();
  };

  if (stats === undefined) {
    return (
      <div className="flex h-[400px] items-center justify-center text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin mr-2" />
        Loading analytics...
      </div>
    );
  }

  if (stats === null) {
    return (
      <div className="flex h-[400px] items-center justify-center text-muted-foreground">
        Authentication required.
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="pb-8 space-y-8"
    >
      <PageHeader title="Analytics" />

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Total Runs</CardTitle>
            <div className="h-8 w-8 rounded-full bg-blue-500/10 flex items-center justify-center">
              <Activity className="h-4 w-4 text-blue-500" />
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="text-3xl font-bold tracking-tight">{formatNumber(stats.totalRuns)}</div>
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Success Rate</CardTitle>
            <div className="h-8 w-8 rounded-full bg-green-500/10 flex items-center justify-center">
              <CheckCircle className="h-4 w-4 text-green-500" />
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="text-3xl font-bold tracking-tight">{stats.successRate}%</div>
            <p className="text-[10px] font-medium text-muted-foreground mt-2 flex items-center gap-2">
              <span className="text-green-500">{stats.successfulRuns} OK</span>
              <span className="w-1 h-1 rounded-full bg-border" />
              <span className="text-destructive">{stats.failedRuns} ERR</span>
            </p>
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Total Tokens</CardTitle>
            <div className="h-8 w-8 rounded-full bg-amber-500/10 flex items-center justify-center">
              <Zap className="h-4 w-4 text-amber-500" />
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="text-3xl font-bold tracking-tight">{formatNumber(stats.totalTokens)}</div>
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Usage Cost</CardTitle>
            <div className="h-8 w-8 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-500 text-xs font-bold">
              $
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="text-3xl font-bold tracking-tight">${(stats.totalCredits * 0.01).toFixed(2)}</div>
            <p className="text-[10px] font-medium text-muted-foreground mt-2 uppercase tracking-wide">
              {formatNumber(stats.totalCredits)} credits
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2 border-border shadow-sm">
          <CardHeader className="pb-8 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Execution Volume (Last 7 Days)</CardTitle>
            <div className="flex items-center gap-4 text-[10px] uppercase font-bold tracking-wider">
              <div className="flex items-center gap-1.5">
                <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
                <span className="text-muted-foreground">Success</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-1.5 w-1.5 rounded-full bg-destructive" />
                <span className="text-muted-foreground">Failed</span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[320px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.chartData} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.5} />
                  <XAxis
                    dataKey="date"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))', fontWeight: 500 }}
                    tickFormatter={(val) => {
                      const d = new Date(val);
                      return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                    }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))', fontWeight: 500 }}
                  />
                  <Tooltip
                    cursor={{ fill: 'hsl(var(--muted))', opacity: 0.3 }}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--background))',
                      borderColor: 'hsl(var(--border))',
                      borderRadius: 'var(--radius)',
                      fontSize: '11px',
                      fontWeight: '600'
                    }}
                  />
                  <Bar dataKey="success" stackId="a" fill="#22c55e" radius={[0, 0, 2, 2]} />
                  <Bar dataKey="failed" stackId="a" fill="#ef4444" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm flex flex-col">
          <CardHeader className="pb-4">
            <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Top Workflows</CardTitle>
          </CardHeader>
          <CardContent className="flex-grow overflow-hidden px-4">
            <div className="flex flex-col gap-3 overflow-y-auto max-h-[340px] pr-2 scrollbar-thin scrollbar-thumb-border">
              {(stats?.topWorkflows || []).length > 0 ? (
                stats.topWorkflows.map((tw: any) => (
                  <div key={tw.id} className="group flex flex-col gap-2 p-3 rounded-xl border border-border/50 bg-muted/10 hover:bg-muted/30 transition-colors">
                    <div className="flex justify-between items-start">
                      <span className="font-bold text-xs truncate max-w-[140px]">{tw.name}</span>
                      <span className="text-[10px] font-mono font-bold text-muted-foreground">{tw.runs} runs</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(tw.runs / stats.totalRuns) * 100}%` }}
                        className="bg-primary h-full"
                      />
                    </div>
                    <div className="text-[9px] text-muted-foreground font-medium flex justify-between uppercase tracking-wider">
                      <span>{formatNumber(tw.tokens)} tokens</span>
                      <span>{((tw.runs / stats.totalRuns) * 100).toFixed(0)}% of total</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Activity className="h-8 w-8 text-muted-foreground/20 mb-3" />
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">No workflow data</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Recent Executions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {stats.recentExecutions.length > 0 ? (
              stats.recentExecutions.map((ex: any) => (
                <div key={ex.id} className="group flex justify-between items-center p-4 rounded-xl border border-border/50 bg-muted/20 hover:bg-muted/40 transition-all hover:translate-y-[-2px]">
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-2">
                      {ex.status === 'completed' ? (
                        <div className="h-2 w-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]" />
                      ) : ex.status === 'failed' ? (
                        <div className="h-2 w-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]" />
                      ) : (
                        <Loader2 className="h-3 w-3 text-blue-500 animate-spin" />
                      )}
                      <span className="font-bold text-[10px] uppercase tracking-wider text-foreground/80">{ex.status}</span>
                    </div>
                    <span className="text-[10px] font-medium text-muted-foreground">
                      {new Date(ex.startedAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-mono font-bold text-muted-foreground group-hover:text-foreground transition-colors">
                      {formatNumber(ex.tokensUsed)} <span className="text-[8px] font-sans opacity-60">TKNS</span>
                    </div>
                    <div className="text-[9px] font-medium text-primary/60">
                      ~${ex.creditsConsumed.toFixed(4)}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full flex flex-col items-center justify-center py-12 text-center">
                <Activity className="h-8 w-8 text-muted-foreground/20 mb-3" />
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">No traffic yet</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
