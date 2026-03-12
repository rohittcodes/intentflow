"use client";

import React, { useState } from "react";
import { 
  Search, 
  X, 
  HelpCircle, 
  Bot, 
  Plug, 
  GitBranch, 
  Repeat, 
  Braces, 
  FileText, 
  Database, 
  Play, 
  StopCircle,
  Brain,
  Globe,
  Zap,
  ChevronRight,
  BookOpen,
  Info,
  CheckCircle
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

interface HelpPanelProps {
  onClose: () => void;
}

interface DocSection {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  category: 'core' | 'logic' | 'data' | 'integration';
  content: {
    what: string;
    when: string;
    inputs: string[];
    outputs: string[];
    example?: string;
  };
}

const docSections: DocSection[] = [
  {
    id: 'start',
    title: 'Start Node',
    description: 'The entry point for every workflow.',
    icon: <Play className="w-4 h-4" />,
    category: 'core',
    content: {
      what: 'Defines the input variables your workflow needs to begin execution.',
      when: 'Automatically added to every new workflow. Cannot be deleted.',
      inputs: ['Manual Trigger', 'API Webhook', 'Scheduled Cron'],
      outputs: ['Variable context for the rest of the flow'],
      example: 'Define a "query" variable to receive user messages from a chat interface.'
    }
  },
  {
    id: 'agent',
    title: 'Agent Node',
    description: 'The brain of your workflow.',
    icon: <Bot className="w-4 h-4" />,
    category: 'core',
    content: {
      what: 'Uses an LLM (GPT-4, Claude, etc.) to process information, reason, and generate responses.',
      when: 'Use for complex tasks like summarization, creative writing, or decision making.',
      inputs: ['System Prompt', 'User Message', 'Variable Context'],
      outputs: ['Text Response', 'Structured JSON'],
      example: 'A Customer Support Agent that uses documented FAQs to answer user queries.'
    }
  },
  {
    id: 'mcp',
    title: 'MCP Server',
    description: 'Connect to external tools and APIs.',
    icon: <Plug className="w-4 h-4" />,
    category: 'integration',
    content: {
      what: 'Connects to a Machine Control Protocol (MCP) server to execute specialized tools (Search, Slack, GitHub, etc.).',
      when: 'Use when your agent needs to take action in the real world or fetch live data.',
      inputs: ['Server URL', 'Tool Name', 'Arguments'],
      outputs: ['Tool Execution Results'],
      example: 'Connect to the Slack MCP to post a summary of the workflow execution to a channel.'
    }
  },
  {
    id: 'if-else',
    title: 'If-Else Node',
    description: 'Conditional branching logic.',
    icon: <GitBranch className="w-4 h-4" />,
    category: 'logic',
    content: {
      what: 'Evaluates a condition and routes the workflow down one of two paths (True or False).',
      when: 'Use when you need to make decisions based on data (e.g., "If score > 80, then...").',
      inputs: ['Condition Expression', 'Input Data'],
      outputs: ['Successful Path', 'Fallback Path'],
      example: 'If the detected sentiment is "negative", route the call to a human support agent node.'
    }
  },
  {
    id: 'transform',
    title: 'Transform Node',
    description: 'Reshape and format data.',
    icon: <Braces className="w-4 h-4" />,
    category: 'data',
    content: {
      what: 'Uses JavaScript or JSON templates to reshape information between steps.',
      when: 'Use when the output of one node doesn\'t match the required input format of the next.',
      inputs: ['Source Data', 'Mapping Logic'],
      outputs: ['Formatted Data'],
      example: 'Convert a detailed MCP tool response into a simple "summary" string for the Agent node.'
    }
  },
  {
    id: 'extract',
    title: 'Extract Node',
    description: 'Turn unstructured text into JSON.',
    icon: <FileText className="w-4 h-4" />,
    category: 'data',
    content: {
      what: 'Takes raw text and forces it into a specific schema (keys and values).',
      when: 'Use for web scraping summaries, invoice parsing, or sentiment analysis.',
      inputs: ['Raw Text', 'Target Schema'],
      outputs: ['Structured Objects'],
      example: 'Extract "Company Name", "Total Amount", and "Due Date" from a raw PDF OCR result.'
    }
  },
  {
    id: 'retriever',
    title: 'Retriever Node',
    description: 'Search your Knowledge Bases.',
    icon: <Brain className="w-4 h-4" />,
    category: 'data',
    content: {
      what: 'Performs semantic search across your uploaded documents (RAG).',
      when: 'Use when your agent needs background context from your own company data.',
      inputs: ['Query String', 'Namespace ID'],
      outputs: ['Contextual Document Chunks'],
      example: 'Retrieve relevant sections from a legal contract based on a user\'s question about liability.'
    }
  }
];

export default function HelpPanel({ onClose }: HelpPanelProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filteredDocs = docSections.filter(doc => 
    doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doc.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doc.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedDoc = docSections.find(d => d.id === selectedId);

  return (
    <motion.div 
      initial={{ x: 380, opacity: 0 }} 
      animate={{ x: 0, opacity: 1 }} 
      exit={{ x: 380, opacity: 0 }}
      className="absolute top-4 right-4 bottom-4 w-[380px] bg-white/70 backdrop-blur-2xl border border-white/40 shadow-[0_20px_50px_rgba(0,0,0,0.15)] rounded-3xl z-[100] flex flex-col overflow-hidden"
    >
      {/* Header */}
      <div className="p-5 border-b border-black/5 flex items-center justify-between bg-white/20">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center shadow-[inset_0_1px_1px_rgba(255,255,255,0.5)] border border-primary/5">
            <BookOpen className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-foreground tracking-tight">Help Center</h2>
            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest leading-none mt-1 opacity-70">Documentation</p>
          </div>
        </div>
        <button 
          onClick={onClose}
          className="p-2 hover:bg-black/5 rounded-xl text-muted-foreground transition-all flex items-center justify-center"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Search */}
      <div className="p-5 bg-white/10">
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
          <Input
            placeholder="Search guides, nodes, tools..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-11 h-11 text-xs bg-white/50 border-white/50 focus:bg-white/80 focus:ring-primary/20 transition-all rounded-xl shadow-inner-sm"
          />
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-5 space-y-6">
          <AnimatePresence mode="wait">
            {!selectedId ? (
              <motion.div 
                key="list"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.02 }}
                className="space-y-6"
              >
                {['core', 'logic', 'data', 'integration'].map(cat => {
                  const items = filteredDocs.filter(d => d.category === cat);
                  if (items.length === 0) return null;
                  
                  return (
                    <div key={cat} className="space-y-3">
                      <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] px-1 opacity-60">
                        {cat}
                      </h3>
                      <div className="grid grid-cols-1 gap-2">
                        {items.map(doc => (
                          <button
                            key={doc.id}
                            onClick={() => setSelectedId(doc.id)}
                            className="flex items-center gap-4 p-3.5 rounded-2xl bg-white/30 border border-white/50 hover:border-primary/30 hover:bg-white/60 transition-all text-left group shadow-sm hover:shadow-md"
                          >
                            <div className="h-10 w-10 rounded-xl bg-white/80 flex items-center justify-center shrink-0 group-hover:scale-110 group-hover:rotate-3 transition-transform shadow-inner-sm">
                              {React.isValidElement(doc.icon) && React.cloneElement(doc.icon as React.ReactElement<any>, { className: 'w-5 h-5 text-foreground/70' })}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-[12px] font-bold text-foreground truncate">{doc.title}</div>
                              <div className="text-[10px] text-muted-foreground truncate leading-tight mt-0.5">{doc.description}</div>
                            </div>
                            <div className="h-6 w-6 rounded-full flex items-center justify-center bg-black/5 -mr-1 group-hover:bg-primary/10 transition-colors">
                              <ChevronRight className="w-3 h-3 text-muted-foreground group-hover:text-primary transition-colors" />
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}

                {/* Keyboard Shortcuts Section */}
                <div className="space-y-3 pt-4">
                  <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] px-1 opacity-60 flex items-center gap-2">
                    <Zap className="w-3 h-3 text-amber-500" />
                    Power Workflow
                  </h3>
                  <div className="p-4 rounded-2xl bg-black/5 border border-black/5 space-y-2.5">
                    {[
                      { keys: ['S'], label: 'Save workflow' },
                      { keys: ['R'], label: 'Run current version' },
                      { keys: ['Backspace'], label: 'Delete selected node' },
                      { keys: ['Ctrl', 'Z'], label: 'Undo recent change' },
                    ].map((s, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <span className="text-[11px] font-medium text-foreground/60">{s.label}</span>
                        <div className="flex gap-1">
                          {s.keys.map(k => (
                            <kbd key={k} className="px-1.5 py-0.5 rounded md bg-white/80 border border-black/10 text-[9px] font-black shadow-sm">{k}</kbd>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div 
                key="detail"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-6 pb-20"
              >
                <button 
                  onClick={() => setSelectedId(null)}
                  className="group flex items-center gap-2 text-[11px] font-bold text-primary hover:text-primary/70 mb-2 transition-colors"
                >
                  <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center group-hover:-translate-x-1 transition-transform">
                    <ChevronRight className="w-3 h-3 rotate-180" />
                  </div>
                  Back to Help Center
                </button>

                {selectedDoc && (
                  <div className="space-y-7">
                    <div className="flex items-start gap-4">
                      <div className="h-14 w-14 rounded-2xl bg-primary shadow-[0_8px_16px_rgba(59,130,246,0.3)] flex items-center justify-center shrink-0 border border-white/20">
                        {React.isValidElement(selectedDoc.icon) && React.cloneElement(selectedDoc.icon as React.ReactElement<any>, { className: 'w-7 h-7 text-white' })}
                      </div>
                      <div className="flex-1 pt-0.5">
                        <h2 className="text-xl font-black text-foreground tracking-tight leading-none">{selectedDoc.title}</h2>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge className="h-5 text-[10px] font-black uppercase tracking-wider bg-primary/10 text-primary border-none shadow-none">
                            {selectedDoc.category}
                          </Badge>
                          <div className="h-1 w-1 rounded-full bg-black/10" />
                          <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest opacity-60">Verified</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <section className="space-y-3">
                        <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] opacity-60">Description</h4>
                        <p className="text-[13px] text-foreground/80 leading-relaxed font-semibold">
                          {selectedDoc.content.what}
                        </p>
                      </section>

                      {selectedDoc.content.example && (
                        <div className="p-4 rounded-xl bg-primary/5 border border-primary/10">
                          <h4 className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-2">Example Use Case</h4>
                          <p className="text-[11px] font-bold text-foreground/70 leading-relaxed italic">
                            "{selectedDoc.content.example}"
                          </p>
                        </div>
                      )}

                      <Separator className="opacity-40" />

                      <section className="space-y-3">
                        <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] opacity-60 flex items-center gap-1.5">
                          Common Usage
                        </h4>
                        <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/10">
                          <p className="text-[11px] text-foreground/80 leading-relaxed font-bold flex items-start gap-2.5">
                            <Info className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                            {selectedDoc.content.when}
                          </p>
                        </div>
                      </section>

                      <div className="grid grid-cols-2 gap-4">
                        <section className="space-y-3">
                          <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] opacity-60">Inputs</h4>
                          <div className="flex flex-wrap gap-1.5">
                            {selectedDoc.content.inputs.map((inp, i) => (
                              <Badge key={i} variant="outline" className="text-[10px] font-bold bg-white/40 border-black/5 hover:bg-white/60 transition-colors">
                                {inp}
                              </Badge>
                            ))}
                          </div>
                        </section>

                        <section className="space-y-3">
                          <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] opacity-60">Outputs</h4>
                          <div className="flex flex-wrap gap-1.5">
                            {selectedDoc.content.outputs.map((out, i) => (
                              <Badge key={i} variant="outline" className="text-[10px] font-bold bg-white/40 border-black/5 hover:bg-white/60 transition-colors">
                                {out}
                              </Badge>
                            ))}
                          </div>
                        </section>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </ScrollArea>

      {/* Footer Info */}
      <div className="p-5 border-t border-black/5 bg-white/30 space-y-4">
        <div className="p-4 rounded-2xl bg-gradient-to-br from-primary/10 to-transparent border border-white/50 shadow-sm">
          <p className="text-[10px] text-primary uppercase font-black tracking-widest mb-1.5">Pro Tip</p>
          <p className="text-[11px] text-foreground/70 leading-relaxed font-bold">
            Most nodes can be configured via <span className="text-primary font-black">Variables</span> (double braces <code>{"{{ }}"}</code>) to dynamically pass data between steps.
          </p>
        </div>
        <div className="flex items-center justify-center gap-2.5 opacity-40">
          <BookOpen className="w-3 h-3" />
          <span className="text-[9px] font-black uppercase tracking-widest">v2.0 Documentation Core</span>
        </div>
      </div>
    </motion.div>
  );
}