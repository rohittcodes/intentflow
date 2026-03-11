"use client";

import React from "react";
import {
  Settings2,
  Grid3X3,
  Zap,
  Clock,
  Maximize2,
  MousePointer2,
  ExternalLink,
  Save,
  Info,
  Shield
} from "lucide-react";
import { motion } from "framer-motion";

interface WorkflowSettingsPanelProps {
  workflow: any;
  onUpdateWorkflow: (updates: any) => void;
  onOpenGlobalSettings: () => void;
  // Canvas states
  snapToGrid: boolean;
  setSnapToGrid: (val: boolean) => void;
  gridStyle: 'dots' | 'lines' | 'none';
  setGridStyle: (style: 'dots' | 'lines' | 'none') => void;
  edgeStyle: 'default' | 'straight' | 'step' | 'smoothstep';
  setEdgeStyle: (style: 'default' | 'straight' | 'step' | 'smoothstep') => void;
  maxIterations: number;
  setMaxIterations: (val: number) => void;
  timeout: number;
  setTimeout: (val: number) => void;
  // Financial Guardrails
  maxTokens: number;
  setMaxTokens: (val: number) => void;
  maxRuntimeSeconds: number;
  setMaxRuntimeSeconds: (val: number) => void;
}

export default function WorkflowSettingsPanel({
  workflow,
  onUpdateWorkflow,
  onOpenGlobalSettings,
  snapToGrid,
  setSnapToGrid,
  gridStyle,
  setGridStyle,
  edgeStyle,
  setEdgeStyle,
  maxIterations,
  setMaxIterations,
  timeout,
  setTimeout,
  maxTokens,
  setMaxTokens,
  maxRuntimeSeconds,
  setMaxRuntimeSeconds,
}: WorkflowSettingsPanelProps) {
  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar bg-accent-white">
      <div className="p-20 space-y-24">

        {/* Workflow Info Section */}
        <SettingsSection label="Workflow Info" icon={<Info className="w-16 h-16" />}>
          <div className="space-y-16">
            <div>
              <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-6 block">
                Workflow Name
              </label>
              <input
                type="text"
                value={workflow?.name || ""}
                onChange={(e) => onUpdateWorkflow({ name: e.target.value })}
                className="w-full px-12 py-8 bg-background border border-border rounded-md text-xs text-foreground outline-none focus:border-primary transition-colors"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-6 block">
                Description
              </label>
              <textarea
                value={workflow?.description || ""}
                onChange={(e) => onUpdateWorkflow({ description: e.target.value })}
                rows={3}
                className="w-full px-12 py-8 bg-background border border-border rounded-md text-xs text-foreground outline-none focus:border-primary transition-colors resize-none"
                placeholder="What does this workflow do?"
              />
            </div>
          </div>
        </SettingsSection>

        {/* Canvas Preferences */}
        <SettingsSection label="Canvas & Editor" icon={<Grid3X3 className="w-16 h-16" />}>
          <div className="space-y-16">
            <ToggleItem
              label="Snap to Grid"
              description="Align nodes to gravity grid"
              active={snapToGrid}
              onToggle={() => setSnapToGrid(!snapToGrid)}
            />

            <div>
              <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-8 block">
                Grid Style
              </label>
              <div className="flex gap-4 p-4 bg-background border border-border rounded-lg">
                {(['dots', 'lines', 'none'] as const).map((style) => (
                  <button
                    key={style}
                    onClick={() => setGridStyle(style)}
                    className={`flex-1 py-6 text-[11px] font-bold uppercase rounded-6 transition-all ${gridStyle === style
                      ? "bg-accent-white text-primary shadow-sm border border-black-alpha-8"
                      : "text-muted-foreground hover:text-foreground"
                      }`}
                  >
                    {style}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-8 block">
                Edge Style
              </label>
              <select
                value={edgeStyle}
                onChange={(e) => setEdgeStyle(e.target.value as any)}
                className="w-full px-12 py-8 bg-background border border-border rounded-md text-xs text-foreground outline-none focus:border-primary transition-colors appearance-none cursor-pointer"
              >
                <option value="default">Bezier (Default)</option>
                <option value="smoothstep">Smooth Step</option>
                <option value="step">Step</option>
                <option value="straight">Straight</option>
              </select>
            </div>
          </div>
        </SettingsSection>

        {/* Execution Settings */}
        <SettingsSection label="Execution Limits" icon={<Zap className="w-16 h-16" />}>
          <div className="space-y-16">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-foreground">Max Iterations</p>
                <p className="text-[11px] text-muted-foreground">Prevents infinite loops</p>
              </div>
              <input
                type="number"
                value={maxIterations}
                onChange={(e) => setMaxIterations(parseInt(e.target.value) || 50)}
                className="w-64 px-8 py-6 bg-background border border-border rounded-6 text-xs text-center text-foreground"
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-foreground">Timeout (s)</p>
                <p className="text-[11px] text-muted-foreground">Max execution time</p>
              </div>
              <input
                type="number"
                value={timeout}
                onChange={(e) => setTimeout(parseInt(e.target.value) || 30)}
                className="w-64 px-8 py-6 bg-background border border-border rounded-6 text-xs text-center text-foreground"
              />
            </div>
          </div>
        </SettingsSection>

        {/* Financial Guardrails */}
        <SettingsSection label="Financial Guardrails" icon={<Shield className="w-16 h-16" />}>
          <div className="space-y-16">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-foreground">Max Tokens</p>
                <p className="text-[11px] text-muted-foreground">Token budget cap (0 = unlimited)</p>
              </div>
              <input
                type="number"
                value={maxTokens || 0}
                min={0}
                step={10000}
                onChange={(e) => setMaxTokens(parseInt(e.target.value) || 0)}
                className="w-80 px-8 py-6 bg-background border border-border rounded-6 text-xs text-center text-foreground"
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-foreground">Max Runtime (s)</p>
                <p className="text-[11px] text-muted-foreground">Wall-clock cap (0 = unlimited)</p>
              </div>
              <input
                type="number"
                value={maxRuntimeSeconds || 0}
                min={0}
                step={30}
                onChange={(e) => setMaxRuntimeSeconds(parseInt(e.target.value) || 0)}
                className="w-80 px-8 py-6 bg-background border border-border rounded-6 text-xs text-center text-foreground"
              />
            </div>
            {(maxTokens > 0 || maxRuntimeSeconds > 0) && (
              <div className="flex items-start gap-8 p-10 bg-secondary border border-primary/20 rounded-md">
                <Shield className="w-12 h-12 text-primary mt-1 shrink-0" />
                <p className="text-[11px] text-black-alpha-56">
                  Guardrails active: execution will be interrupted if limits are exceeded.
                </p>
              </div>
            )}
          </div>
        </SettingsSection>

        {/* Webhooks Config */}
        <SettingsSection label="Webhooks" icon={<Zap className="w-16 h-16" />}>
          <div className="space-y-16">
            <div>
              <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-6 block">
                Webhook on Success URL
              </label>
              <input
                type="url"
                value={workflow?.settings?.webhookOnSuccessUrl || ""}
                onChange={(e) => onUpdateWorkflow({ settings: { ...workflow?.settings, webhookOnSuccessUrl: e.target.value } })}
                className="w-full px-12 py-8 bg-background border border-border rounded-md text-xs text-foreground outline-none focus:border-primary transition-colors"
                placeholder="https://..."
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-6 block">
                Webhook on Failure URL
              </label>
              <input
                type="url"
                value={workflow?.settings?.webhookOnFailureUrl || ""}
                onChange={(e) => onUpdateWorkflow({ settings: { ...workflow?.settings, webhookOnFailureUrl: e.target.value } })}
                className="w-full px-12 py-8 bg-background border border-border rounded-md text-xs text-foreground outline-none focus:border-primary transition-colors"
                placeholder="https://..."
              />
            </div>
          </div>
        </SettingsSection>

        {/* Embeddable UI */}
        <SettingsSection label="Embeddable" icon={<Maximize2 className="w-16 h-16" />}>
          <div className="space-y-16">
            <ToggleItem
              label="Publicly Embeddable"
              description="Allow running this workflow in an iframe without auth"
              active={workflow?.settings?.isEmbeddable || false}
              onToggle={() => onUpdateWorkflow({ settings: { ...workflow?.settings, isEmbeddable: !workflow?.settings?.isEmbeddable } })}
            />

            {workflow?.settings?.isEmbeddable && (
              <div className="space-y-8">
                <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
                  Embed Code snippet
                </label>
                <p className="text-[11px] text-black-alpha-56 mb-8">
                  Copy this snippet to embed. <strong className="text-primary">Replace YOUR_API_KEY with an API key from Settings.</strong>
                </p>
                <div className="relative group">
                  <pre className="w-full p-12 bg-background border border-border rounded-md text-[11px] font-mono text-foreground/64 overflow-x-auto">
                    {`<iframe src="${typeof window !== 'undefined' ? window.location.origin : 'https://intentflow.com'}/embed/${workflow?.customId || workflow?._id}?apiKey=YOUR_API_KEY" width="100%" height="600" frameborder="0"></iframe>`}
                  </pre>
                  <button
                    className="absolute top-8 right-8 p-4 bg-accent-white border border-border rounded-6 text-muted-foreground hover:text-primary opacity-0 group-hover:opacity-100 transition-all shadow-sm"
                    onClick={() => {
                      const snippet = `<iframe src="${typeof window !== 'undefined' ? window.location.origin : 'https://intentflow.com'}/embed/${workflow?.customId || workflow?._id}?apiKey=YOUR_API_KEY" width="100%" height="600" frameborder="0"></iframe>`;
                      navigator.clipboard.writeText(snippet);
                    }}
                  >
                    Copy
                  </button>
                </div>
              </div>
            )}
          </div>
        </SettingsSection>

        {/* Global Config Link */}
        <div className="pt-8">
          <button
            onClick={onOpenGlobalSettings}
            className="w-full flex items-center justify-between p-16 bg-secondary border border-primary/20 rounded-xl hover:bg-secondary/80 transition-colors group"
          >
            <div className="flex items-center gap-12 text-left">
              <div className="w-32 h-32 rounded-lg bg-primary flex items-center justify-center text-white shadow-lg shadow-heat-100/20">
                <Settings2 className="w-16 h-16" />
              </div>
              <div>
                <p className="text-xs font-bold text-foreground">Global Configuration</p>
                <p className="text-[11px] text-black-alpha-56">API Keys & MCP Servers</p>
              </div>
            </div>
            <ExternalLink className="w-14 h-14 text-primary opacity-40 group-hover:opacity-100 transition-opacity" />
          </button>
        </div>

      </div>
    </div>
  );
}

function SettingsSection({ label, icon, children }: { label: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="space-y-12">
      <div className="flex items-center gap-8 text-muted-foreground">
        {icon}
        <h4 className="text-[11px] font-bold uppercase tracking-[0.1em]">{label}</h4>
      </div>
      <div className="p-16 bg-background/50 border border-border rounded-xl space-y-16">
        {children}
      </div>
    </div>
  );
}

function ToggleItem({ label, description, active, onToggle }: { label: string; description: string; active: boolean; onToggle: () => void }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex-1">
        <p className="text-xs font-semibold text-foreground">{label}</p>
        <p className="text-[11px] text-muted-foreground">{description}</p>
      </div>
      <button
        onClick={onToggle}
        className={`relative w-36 h-20 rounded-full transition-colors ${active ? "bg-primary" : "bg-secondary/80"}`}
      >
        <motion.div
          animate={{ x: active ? 18 : 2 }}
          className="absolute top-2 w-16 h-16 bg-accent-white rounded-full shadow-sm"
        />
      </button>
    </div>
  );
}
