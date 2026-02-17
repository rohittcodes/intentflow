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
  Info
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
  setTimeout
}: WorkflowSettingsPanelProps) {
  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar bg-accent-white">
      <div className="p-20 space-y-24">

        {/* Workflow Info Section */}
        <SettingsSection label="Workflow Info" icon={<Info className="w-16 h-16" />}>
          <div className="space-y-16">
            <div>
              <label className="text-[11px] font-bold text-black-alpha-48 uppercase tracking-wider mb-6 block">
                Workflow Name
              </label>
              <input
                type="text"
                value={workflow?.name || ""}
                onChange={(e) => onUpdateWorkflow({ name: e.target.value })}
                className="w-full px-12 py-8 bg-background-base border border-border-faint rounded-8 text-body-small text-accent-black outline-none focus:border-heat-100 transition-colors"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-black-alpha-48 uppercase tracking-wider mb-6 block">
                Description
              </label>
              <textarea
                value={workflow?.description || ""}
                onChange={(e) => onUpdateWorkflow({ description: e.target.value })}
                rows={3}
                className="w-full px-12 py-8 bg-background-base border border-border-faint rounded-8 text-body-small text-accent-black outline-none focus:border-heat-100 transition-colors resize-none"
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
              <label className="text-[11px] font-bold text-black-alpha-48 uppercase tracking-wider mb-8 block">
                Grid Style
              </label>
              <div className="flex gap-4 p-4 bg-background-base border border-border-faint rounded-10">
                {(['dots', 'lines', 'none'] as const).map((style) => (
                  <button
                    key={style}
                    onClick={() => setGridStyle(style)}
                    className={`flex-1 py-6 text-[11px] font-bold uppercase rounded-6 transition-all ${gridStyle === style
                      ? "bg-accent-white text-heat-100 shadow-sm border border-black-alpha-8"
                      : "text-black-alpha-48 hover:text-accent-black"
                      }`}
                  >
                    {style}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-black-alpha-48 uppercase tracking-wider mb-8 block">
                Edge Style
              </label>
              <select
                value={edgeStyle}
                onChange={(e) => setEdgeStyle(e.target.value as any)}
                className="w-full px-12 py-8 bg-background-base border border-border-faint rounded-8 text-body-small text-accent-black outline-none focus:border-heat-100 transition-colors appearance-none cursor-pointer"
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
                <p className="text-body-small font-semibold text-accent-black">Max Iterations</p>
                <p className="text-[11px] text-black-alpha-48">Prevents infinite loops</p>
              </div>
              <input
                type="number"
                value={maxIterations}
                onChange={(e) => setMaxIterations(parseInt(e.target.value) || 50)}
                className="w-64 px-8 py-6 bg-background-base border border-border-faint rounded-6 text-body-small text-center text-accent-black"
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-body-small font-semibold text-accent-black">Timeout (s)</p>
                <p className="text-[11px] text-black-alpha-48">Max execution time</p>
              </div>
              <input
                type="number"
                value={timeout}
                onChange={(e) => setTimeout(parseInt(e.target.value) || 30)}
                className="w-64 px-8 py-6 bg-background-base border border-border-faint rounded-6 text-body-small text-center text-accent-black"
              />
            </div>
          </div>
        </SettingsSection>

        {/* Global Config Link */}
        <div className="pt-8">
          <button
            onClick={onOpenGlobalSettings}
            className="w-full flex items-center justify-between p-16 bg-heat-4 border border-heat-100/20 rounded-12 hover:bg-heat-8 transition-colors group"
          >
            <div className="flex items-center gap-12 text-left">
              <div className="w-32 h-32 rounded-10 bg-heat-100 flex items-center justify-center text-white shadow-lg shadow-heat-100/20">
                <Settings2 className="w-16 h-16" />
              </div>
              <div>
                <p className="text-body-small font-bold text-accent-black">Global Configuration</p>
                <p className="text-[11px] text-black-alpha-56">API Keys & MCP Servers</p>
              </div>
            </div>
            <ExternalLink className="w-14 h-14 text-heat-100 opacity-40 group-hover:opacity-100 transition-opacity" />
          </button>
        </div>

      </div>
    </div>
  );
}

function SettingsSection({ label, icon, children }: { label: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="space-y-12">
      <div className="flex items-center gap-8 text-black-alpha-48">
        {icon}
        <h4 className="text-[11px] font-bold uppercase tracking-[0.1em]">{label}</h4>
      </div>
      <div className="p-16 bg-background-base/50 border border-border-faint rounded-12 space-y-16">
        {children}
      </div>
    </div>
  );
}

function ToggleItem({ label, description, active, onToggle }: { label: string; description: string; active: boolean; onToggle: () => void }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex-1">
        <p className="text-body-small font-semibold text-accent-black">{label}</p>
        <p className="text-[11px] text-black-alpha-48">{description}</p>
      </div>
      <button
        onClick={onToggle}
        className={`relative w-36 h-20 rounded-full transition-colors ${active ? "bg-heat-100" : "bg-black-alpha-8"}`}
      >
        <motion.div
          animate={{ x: active ? 18 : 2 }}
          className="absolute top-2 w-16 h-16 bg-accent-white rounded-full shadow-sm"
        />
      </button>
    </div>
  );
}
