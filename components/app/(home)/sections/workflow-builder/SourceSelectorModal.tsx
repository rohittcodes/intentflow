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

  const filteredSources = SOURCE_TYPES.filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const categories = Array.from(new Set(SOURCE_TYPES.map(s => s.category)));

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
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-24">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-2xl bg-accent-white rounded-24 shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
      >
        {/* Header */}
        <div className="px-24 py-20 border-b border-border flex items-center justify-between bg-background">
          <div className="flex items-center gap-12">
            {step === "config" && (
              <button
                onClick={handleBack}
                className="p-8 hover:bg-secondary rounded-md text-black-alpha-40 transition-colors"
              >
                <ArrowLeft className="w-18 h-18" />
              </button>
            )}
            <div>
              <h2 className="text-lg font-bold text-foreground">
                {step === "select" ? "Add Data Source" : `Configure ${selectedType?.name}`}
              </h2>
              <p className="text-sm text-black-alpha-40">
                {step === "select"
                  ? "Select a service to connect to your Knowledge Base"
                  : `Set up the connection parameters for ${selectedType?.name}`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-8 hover:bg-secondary rounded-md text-black-alpha-40 transition-colors"
          >
            <X className="w-18 h-18" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-24 custom-scrollbar">
          {step === "select" ? (
            <div className="space-y-24">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-16 top-1/2 -translate-y-1/2 w-18 h-18 text-black-alpha-24" />
                <input
                  type="text"
                  placeholder="Search integrations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-48 pr-16 py-12 bg-secondary border border-border rounded-xl text-foreground outline-none focus:border-primary transition-colors"
                />
              </div>

              {/* Categories */}
              {categories.map(category => {
                const sources = filteredSources.filter(s => s.category === category);
                if (sources.length === 0) return null;

                return (
                  <div key={category} className="space-y-12">
                    <h3 className="text-xs font-bold text-black-alpha-32 uppercase tracking-widest px-4 flex items-center justify-between">
                      {category === "web" ? "Universal / Custom" : category}
                      {category === "database" || category === "cloud" || category === "saas" ? (
                        <span className="text-[10px] font-medium bg-secondary px-6 py-2 rounded-4 normal-case tracking-normal">Presets</span>
                      ) : null}
                    </h3>
                    <div className="grid grid-cols-2 gap-12">
                      {sources.map(source => (
                        <button
                          key={source.id}
                          onClick={() => handleSelect(source)}
                          className="flex items-start gap-16 p-16 bg-accent-white border border-border rounded-16 hover:border-primary hover:shadow-md transition-all group text-left"
                        >
                          <div className={`p-10 rounded-xl bg-secondary ${source.color} group-hover:scale-110 transition-transform`}>
                            {React.cloneElement(source.icon as React.ReactElement<any>, { className: "w-20 h-20" })}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-bold text-foreground truncate">{source.name}</h4>
                            <p className="text-xs text-muted-foreground line-clamp-2 mt-2">{source.description}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="space-y-24">
              <div className="p-20 bg-amber-500/5 border border-amber-500/10 rounded-16 flex items-start gap-16">
                <div className="p-10 bg-amber-500 rounded-xl text-accent-white">
                  <Shield className="w-20 h-20" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-amber-900">Secure Connection</h4>
                  <p className="text-xs text-amber-800/70 mt-4 leading-relaxed">
                    We use industry-standard encryption to protect your credentials. Your data is indexed securely and stays within your workspace.
                  </p>
                </div>
              </div>

              <div className="space-y-16">
                <div>
                  <label className="block text-xs font-bold text-black-alpha-40 uppercase tracking-widest mb-8 px-4">
                    Display Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={`My ${selectedType?.name} Source`}
                    className="w-full px-16 py-12 bg-accent-white border border-border rounded-xl text-sm text-foreground outline-none focus:border-primary transition-colors"
                  />
                </div>

                {selectedType?.category === "database" && (
                  <div>
                    <label className="block text-xs font-bold text-black-alpha-40 uppercase tracking-widest mb-8 px-4">
                      Connection String / URL
                    </label>
                    <textarea
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      placeholder="postgresql://user:password@localhost:5432/dbname"
                      rows={3}
                      className="w-full px-16 py-12 bg-accent-white border border-border rounded-xl text-sm text-foreground font-mono outline-none focus:border-primary transition-colors resize-none"
                    />
                  </div>
                )}

                {(selectedType?.category === "web" || selectedType?.category === "cloud" || selectedType?.category === "saas") && (
                  <div>
                    <label className="block text-xs font-bold text-black-alpha-40 uppercase tracking-widest mb-8 px-4">
                      {selectedType.id.includes("custom") ? "Base URL / Endpoint" : "Service URL / Identifier"}
                    </label>
                    <input
                      type="text"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      placeholder={selectedType.id === "sitemap" ? "https://example.com/sitemap.xml" : "https://api.service.com/v1"}
                      className="w-full px-16 py-12 bg-accent-white border border-border rounded-xl text-sm text-foreground outline-none focus:border-primary transition-colors"
                    />
                  </div>
                )}

                <div className="flex items-center justify-between p-16 bg-secondary rounded-16">
                  <div className="flex items-center gap-12">
                    <RefreshCw className="w-18 h-18 text-black-alpha-40" />
                    <div>
                      <p className="text-sm font-bold text-foreground">Auto-Sync</p>
                      <p className="text-xs text-black-alpha-40">Keep indexed data fresh automatically</p>
                    </div>
                  </div>
                  <div className="w-40 h-20 bg-primary rounded-full flex items-center px-4">
                    <div className="w-12 h-12 bg-accent-white rounded-full translate-x-20" />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-24 py-16 border-t border-border bg-background flex items-center justify-end gap-12">
          <button
            onClick={onClose}
            className="px-16 py-8 text-sm font-bold text-muted-foreground hover:text-foreground transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={step === "select" || !name || (step === "config" && !url)}
            className="px-20 py-10 bg-primary text-accent-white rounded-lg text-sm font-bold hover:shadow-lg disabled:opacity-50 disabled:shadow-none transition-all flex items-center gap-8"
          >
            {step === "select" ? "Continue" : "Create Integration"}
            <ChevronRight className="w-16 h-16" />
          </button>
        </div>
      </motion.div>
    </div>
  );
}
