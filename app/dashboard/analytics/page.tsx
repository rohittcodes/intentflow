"use client";

import { motion } from "framer-motion";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useUser } from "@clerk/nextjs";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Activity, CheckCircle, XCircle, Zap, RefreshCw } from "lucide-react";

export default function AnalyticsDashboardPage() {
  const { user } = useUser();

  const stats = useQuery(api.analytics.getDashboardStats,
    user?.id ? { userId: user.id } : "skip"
  );

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'm';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
    return num.toString();
  };

  if (stats === undefined) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        <RefreshCw className="w-5 h-5 animate-spin mr-2" />
        Loading analytics...
      </div>
    );
  }

  if (stats === null) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        Authentication required.
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="max-w-7xl mx-auto w-full p-32 space-y-32 overflow-y-auto"
    >
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-title-h3 text-accent-black mb-8">Analytics & Usage</h1>
          <p className="text-body-medium text-black-alpha-64">Monitor workflow execution volume, performance, and token usage.</p>
        </div>
      </div>

      <div className="grid gap-24 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-16 border border-black-alpha-8 bg-white p-24 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <h3 className="text-label-small font-medium text-black-alpha-48">Total Runs</h3>
            <Activity className="w-16 h-16 text-blue-500" />
          </div>
          <div className="mt-16">
            <span className="text-title-h4 text-accent-black">{formatNumber(stats.totalRuns)}</span>
          </div>
        </div>

        <div className="rounded-16 border border-black-alpha-8 bg-white p-24 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <h3 className="text-label-small font-medium text-black-alpha-48">Success Rate</h3>
            <CheckCircle className="w-16 h-16 text-green-500" />
          </div>
          <div className="mt-16">
            <span className="text-title-h4 text-accent-black">{stats.successRate}%</span>
            <p className="text-label-x-small text-black-alpha-48 mt-4">{stats.successfulRuns} successful, {stats.failedRuns} failed</p>
          </div>
        </div>

        <div className="rounded-16 border border-black-alpha-8 bg-white p-24 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <h3 className="text-label-small font-medium text-black-alpha-48">Total Tokens</h3>
            <Zap className="w-16 h-16 text-orange-500" />
          </div>
          <div className="mt-16">
            <span className="text-title-h4 text-accent-black">{formatNumber(stats.totalTokens)}</span>
          </div>
        </div>

        <div className="rounded-16 border border-black-alpha-8 bg-white p-24 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <h3 className="text-label-small font-medium text-black-alpha-48">Usage Cost</h3>
            <div className="text-label-small font-medium text-purple-500">$</div>
          </div>
          <div className="mt-16">
            <span className="text-title-h4 text-accent-black">${(stats.totalCredits * 0.01).toFixed(2)}</span>
            <p className="text-label-x-small text-black-alpha-48 mt-4">{formatNumber(stats.totalCredits)} credits</p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3 flex-1 min-h-0">
        <div className="md:col-span-2 rounded-xl border bg-card p-6 shadow-sm flex flex-col">
          <h3 className="font-semibold text-lg mb-4 text-accent-black">Execution Volume (Last 7 Days)</h3>
          <div className="flex-1 min-h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E5E5" />
                <XAxis
                  dataKey="date"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: '#666' }}
                  tickFormatter={(val) => {
                    const d = new Date(val);
                    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                  }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: '#666' }}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(0,0,0,0.05)' }}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #E5E5E5', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                />
                <Bar dataKey="success" stackId="a" fill="#22c55e" radius={[0, 0, 4, 4]} name="Successful" />
                <Bar dataKey="failed" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} name="Failed" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="md:col-span-1 rounded-xl border bg-card p-6 shadow-sm flex flex-col">
          <h3 className="font-semibold text-lg mb-4 text-accent-black">Recent Executions</h3>
          <div className="flex flex-col gap-3 overflow-y-auto">
            {stats.recentExecutions.length > 0 ? (
              stats.recentExecutions.map((ex: any) => (
                <div key={ex.id} className="flex justify-between items-center p-3 rounded-lg border border-border-faint bg-[#FAFAFA]">
                  <div>
                    <div className="flex items-center gap-2">
                      {ex.status === 'completed' ? (
                        <CheckCircle className="w-3 h-3 text-green-500" />
                      ) : ex.status === 'failed' ? (
                        <XCircle className="w-3 h-3 text-red-500" />
                      ) : (
                        <RefreshCw className="w-3 h-3 text-blue-500 animate-spin" />
                      )}
                      <span className="font-medium text-sm text-accent-black capitalize">{ex.status}</span>
                    </div>
                    <span className="text-xs text-muted-foreground mt-1">
                      {new Date(ex.startedAt).toLocaleString()}
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-medium text-accent-black">
                      {formatNumber(ex.tokensUsed)} tkns
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-sm text-muted-foreground py-8">
                No recent executions found.
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
