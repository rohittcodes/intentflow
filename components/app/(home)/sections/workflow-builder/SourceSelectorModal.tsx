"use client";

import React, { useState } from "react";
import {
  X,
  Database,
  Cloud,
  Globe,
  Slack,
  Github,
  Search,
  Check,
  ChevronRight,
  Plus,
  ArrowLeft,
  Settings,
  Shield,
  RefreshCw,
  Layout,
  MessageSquare,
  FileText
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";

interface SourceType {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  category: "database" | "cloud" | "saas" | "web";
}

const SOURCE_TYPES: SourceType[] = [
  // Custom First
  { id: "custom-tool", name: "Custom API Tool", description: "Connect to any REST API as a workflow tool", icon: <Plus />, color: "text-primary", category: "web" },
  { id: "custom-sync", name: "Custom Data Syncer", description: "Sync data from a custom URL into your Knowledge Base", icon: <RefreshCw />, color: "text-blue-600", category: "web" },

  // Databases
  { id: "postgres", name: "PostgreSQL", description: "Connect to your Postgres database", icon: <Database />, color: "text-blue-500", category: "database" },
  { id: "mongodb", name: "MongoDB", description: "Connect to a NoSQL collection", icon: <Database />, color: "text-green-500", category: "database" },
  { id: "snowflake", name: "Snowflake", description: "Large-scale data warehousing", icon: <Database />, color: "text-cyan-400", category: "database" },

  // Cloud & Productivity
  { id: "gdrive", name: "Google Drive", description: "Sync folders or specific documents", icon: <Cloud />, color: "text-yellow-500", category: "cloud" },
  { id: "notion", name: "Notion", description: "Sync workspaces or databases", icon: <FileText />, color: "text-black", category: "cloud" },

  // SaaS
  { id: "slack", name: "Slack", description: "Index channel history for AI memory", icon: <MessageSquare />, color: "text-purple-500", category: "saas" },
  { id: "salesforce", name: "Salesforce", description: "Lead notes and CRM data", icon: <Layout />, color: "text-blue-400", category: "saas" },

  // Web
  { id: "sitemap", name: "Dynamic Web Crawl", description: "Re-crawl sitemaps every 24h", icon: <Globe />, color: "text-indigo-500", category: "web" },
  { id: "rss", name: "RSS/News Feed", description: "Ingest latest articles automatically", icon: <RefreshCw />, color: "text-orange-500", category: "web" },
  { id: "github", name: "GitHub Repo", description: "Index codebases and documentation", icon: <Github />, color: "text-gray-800", category: "web" },
];

interface SourceSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (type: SourceType) => void;
}

export default function SourceSelectorModal({ isOpen, onClose, onSelect }: SourceSelectorModalProps) {
  const [step, setStep] = useState<"select" | "config">("select");
  const [selectedType, setSelectedType] = useState<SourceType | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Config state
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [config, setConfig] = useState<any>({});

  const filteredSources: SourceType[] = SOURCE_TYPES.filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const categories = Array.from(new Set(SOURCE_TYPES.map(s => s.category))) as SourceType["category"][];

  const handleSelect = (type: SourceType) => {
    setSelectedType(type);
    setName(`My ${type.name}`);
    setUrl("");
    setStep("config");
  };

  const handleBack = () => {
    setStep("select");
    setSelectedType(null);
  };

  const handleCreate = () => {
    if (!selectedType) return;

    onSelect({
      ...selectedType,
      name,
      config: {
        ...config,
        url: url,
      }
    } as any);

    // Reset state
    handleBack();
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl p-0 gap-0 overflow-hidden border-border bg-background shadow-2xl">
        <DialogHeader className="px-6 py-4 border-b border-border bg-muted/30 flex-row items-center justify-between space-y-0">
          <div className="flex items-center gap-3">
            {step === "config" && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleBack}
                className="h-8 w-8 text-muted-foreground transition-all hover:bg-muted"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
            )}
            <div className="space-y-0.5 text-left">
              <DialogTitle className="text-sm font-bold text-foreground">
                {step === "select" ? "Add Data Source" : `Configure ${selectedType?.name}`}
              </DialogTitle>
              <DialogDescription className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">
                {step === "select"
                  ? "Select a service to connect to your Knowledge Base"
                  : `Set up the connection parameters for ${selectedType?.name}`}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="overflow-y-auto max-h-[70vh] custom-scrollbar">
          <div className="p-6">
            <AnimatePresence mode="wait">
              {step === "select" ? (
                <motion.div
                  key="select"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.15 }}
                  className="space-y-6"
                >
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
                    <Input
                      type="text"
                      placeholder="Search integrations..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 py-2 bg-background border-border text-xs"
                    />
                  </div>

                  <div className="space-y-8">
                    {categories.map(category => {
                      const sources = filteredSources.filter(s => s.category === category);
                      if (sources.length === 0) return null;

                      return (
                        <div key={category} className="space-y-4">
                          <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-1 flex items-center justify-between">
                            {category === "web" ? "Universal / Custom" : category}
                            {["database", "cloud", "saas"].includes(category) && (
                              <Badge variant="secondary" className="text-[9px] font-bold uppercase py-0 px-1.5 h-4">Presets</Badge>
                            )}
                          </h3>
                          <div className="grid grid-cols-2 gap-2">
                            {sources.map(source => (
                              <button
                                key={source.id}
                                onClick={() => handleSelect(source)}
                                className="flex items-start gap-3 p-3 bg-card border border-border/50 rounded-lg hover:border-primary/40 hover:bg-accent/30 hover:shadow-sm transition-all group text-left"
                              >
                                <div className={`p-2 rounded-md bg-muted/50 ${source.color} group-hover:scale-110 transition-transform brightness-110 group-hover:brightness-125 flex items-center justify-center`}>
                                  {React.cloneElement(source.icon as React.ReactElement<any>, { className: "w-4 h-4 text-primary" })}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h4 className="text-xs font-bold text-foreground truncate">{source.name}</h4>
                                  <p className="text-[11px] text-muted-foreground line-clamp-1 mt-1 opacity-70">{source.description}</p>
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="config"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.15 }}
                  className="space-y-6"
                >
                  <div className="p-4 bg-amber-500/5 border border-amber-500/10 rounded-lg flex items-start gap-3">
                    <div className="p-2 bg-amber-500/10 rounded-md text-amber-600">
                      <Shield className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-amber-900">Secure Connection</h4>
                      <p className="text-[11px] text-amber-800/70 mt-1 leading-relaxed">
                        We use industry-standard encryption to protect your credentials. Your data is indexed securely and stays within your workspace.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-1">
                        Display Name
                      </Label>
                      <Input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder={`My ${selectedType?.name} Source`}
                        className="text-xs"
                      />
                    </div>

                    {selectedType?.category === "database" && (
                      <div className="space-y-2">
                        <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-1">
                          Connection String / URL
                        </Label>
                        <textarea
                          value={url}
                          onChange={(e) => setUrl(e.target.value)}
                          placeholder="postgresql://user:password@localhost:5432/dbname"
                          rows={2}
                          className="w-full px-3 py-2 bg-background border border-border rounded-md text-[11px] text-foreground font-mono outline-none focus:ring-1 focus:ring-primary/30 transition-all resize-none"
                        />
                      </div>
                    )}

                    {["web", "cloud", "saas"].some(c => selectedType?.category === c) && (
                      <div className="space-y-2">
                        <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-1">
                          {selectedType?.id.includes("custom") ? "Base URL / Endpoint" : "Service URL / Identifier"}
                        </Label>
                        <Input
                          type="text"
                          value={url}
                          onChange={(e) => setUrl(e.target.value)}
                          placeholder={selectedType?.id === "sitemap" ? "https://example.com/sitemap.xml" : "https://api.service.com/v1"}
                          className="text-xs"
                        />
                      </div>
                    )}

                    <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border/50">
                      <div className="flex items-center gap-3">
                        <RefreshCw className="w-4 h-4 text-muted-foreground" />
                        <div className="space-y-0.5">
                          <p className="text-xs font-bold text-foreground">Auto-Sync</p>
                          <p className="text-[11px] text-muted-foreground font-medium">Keep indexed data fresh automatically</p>
                        </div>
                      </div>
                      <Switch checked={true} />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-border bg-muted/30 flex items-center justify-end gap-3">
          <Button
            variant="ghost"
            onClick={onClose}
            className="text-xs font-bold text-muted-foreground hover:text-foreground h-9"
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={step === "select" || !name || (step === "config" && !url)}
            className="h-9 px-4 font-bold text-xs flex items-center gap-2"
          >
            {step === "select" ? "Continue" : "Create Integration"}
            <ChevronRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
