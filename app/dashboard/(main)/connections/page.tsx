"use client";

import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { Check, Loader2, Search, Plus, Zap, Webhook, X, AlertCircle } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import { useUser } from "@clerk/nextjs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { Link as LinkIcon } from "lucide-react";

// ─── Integration catalogue ───────────────────────────────────────────────────

type Badge = "Trigger" | "Action" | "Both";
type Status = "available" | "coming_soon";

interface Integration {
  id: string;
  name: string;
  description: string;
  category: string;
  emoji: string;
  color: string; // Tailwind bg class
  textColor: string; // Tailwind text class
  badges: Badge[];
  status: Status;
  authType: "webhook" | "api_key" | "oauth" | "none";
  url?: string;
  tools?: string[];
}

const CATALOGUE: Integration[] = [
  // Messaging
  { id: "whatsapp", name: "WhatsApp", description: "Trigger workflows on incoming messages or send replies via WhatsApp Business API.", category: "Messaging", emoji: "💬", color: "bg-green-500/10", textColor: "text-green-600", badges: ["Both"], status: "available", authType: "api_key", tools: ["Send Message", "Reply to Thread", "Send Media"] },
  { id: "slack", name: "Slack", description: "Listen for Slack messages, reactions, or events and send notifications to channels.", category: "Messaging", emoji: "🟣", color: "bg-purple-500/10", textColor: "text-purple-600", badges: ["Both"], status: "available", authType: "api_key", tools: ["Post Message", "Send DM", "React to Message"] },
  { id: "telegram", name: "Telegram", description: "Receive messages via a Telegram bot and send automated replies.", category: "Messaging", emoji: "✈️", color: "bg-sky-500/10", textColor: "text-sky-600", badges: ["Both"], status: "available", authType: "api_key", tools: ["Send Message", "Send Photo", "Answer Query"] },
  { id: "discord", name: "Discord", description: "Post messages to Discord channels and trigger workflows on server events.", category: "Messaging", emoji: "🎮", color: "bg-indigo-500/10", textColor: "text-indigo-600", badges: ["Both"], status: "available", authType: "api_key", tools: ["Send Message", "Create Thread"] },
  { id: "sms", name: "SMS (Twilio)", description: "Send and receive SMS messages using Twilio to trigger or notify via workflows.", category: "Messaging", emoji: "📱", color: "bg-red-500/10", textColor: "text-red-600", badges: ["Both"], status: "available", authType: "api_key" },

  // Webhooks & APIs
  { id: "webhook-in", name: "Inbound Webhook", description: "Generate a unique URL to trigger a workflow from any external service via HTTP POST.", category: "Webhooks", emoji: "🔗", color: "bg-orange-500/10", textColor: "text-orange-600", badges: ["Trigger"], status: "available", authType: "none", tools: ["Receive Payload"] },
  { id: "http", name: "HTTP Request", description: "Make GET/POST/PUT/DELETE requests to any REST API as a workflow step.", category: "Webhooks", emoji: "🌐", color: "bg-blue-500/10", textColor: "text-blue-600", badges: ["Action"], status: "available", authType: "none", tools: ["GET", "POST", "PUT", "DELETE"] },
  { id: "graphql", name: "GraphQL", description: "Query any GraphQL endpoint and use the result as data within your workflow.", category: "Webhooks", emoji: "🔷", color: "bg-pink-500/10", textColor: "text-pink-600", badges: ["Action"], status: "coming_soon", authType: "api_key" },

  // Email
  { id: "gmail", name: "Gmail", description: "Trigger on new emails, send emails, and manage labels programmatically.", category: "Email", emoji: "📧", color: "bg-red-500/10", textColor: "text-red-600", badges: ["Both"], status: "available", authType: "oauth" },
  { id: "resend", name: "Resend", description: "Send transactional emails using Resend's developer-friendly API.", category: "Email", emoji: "✉️", color: "bg-zinc-500/10", textColor: "text-zinc-600", badges: ["Action"], status: "available", authType: "api_key", tools: ["Send Email", "Send Batch"] },
  { id: "outlook", name: "Outlook", description: "Trigger workflows on Outlook email events and send replies.", category: "Email", emoji: "📨", color: "bg-blue-500/10", textColor: "text-blue-600", badges: ["Both"], status: "coming_soon", authType: "oauth" },

  // Data & Databases
  { id: "notion", name: "Notion", description: "Create, update, or query Notion pages and databases as part of a workflow.", category: "Data", emoji: "📓", color: "bg-neutral-500/10", textColor: "text-neutral-600", badges: ["Action"], status: "available", authType: "api_key" },
  { id: "airtable", name: "Airtable", description: "Read and write records in Airtable tables to power data-driven workflows.", category: "Data", emoji: "🗃️", color: "bg-amber-500/10", textColor: "text-amber-600", badges: ["Both"], status: "available", authType: "api_key" },
  { id: "sheets", name: "Google Sheets", description: "Append, read, and update rows in Google Sheets as workflow steps.", category: "Data", emoji: "📊", color: "bg-green-500/10", textColor: "text-green-600", badges: ["Both"], status: "coming_soon", authType: "oauth" },
  { id: "supabase", name: "Supabase", description: "Query and mutate rows in Supabase (PostgreSQL) within your workflows.", category: "Data", emoji: "⚡", color: "bg-emerald-500/10", textColor: "text-emerald-600", badges: ["Both"], status: "coming_soon", authType: "api_key" },

  // AI & Agents
  { id: "openai", name: "OpenAI", description: "Call GPT models, create embeddings, and generate images as workflow steps.", category: "AI", emoji: "🤖", color: "bg-neutral-500/10", textColor: "text-neutral-600", badges: ["Action"], status: "available", authType: "api_key", tools: ["Chat Completion", "Embeddings", "Image Gen"] },
  { id: "anthropic", name: "Anthropic", description: "Use Claude models for reasoning, summarization, and classification tasks.", category: "AI", emoji: "🧠", color: "bg-orange-500/10", textColor: "text-orange-600", badges: ["Action"], status: "available", authType: "api_key" },
  { id: "pinecone", name: "Pinecone", description: "Store and search embeddings using Pinecone for RAG and semantic memory.", category: "AI", emoji: "🌲", color: "bg-teal-500/10", textColor: "text-teal-600", badges: ["Action"], status: "available", authType: "api_key" },

  // Productivity
  { id: "github", name: "GitHub", description: "Trigger on push, PR, or issue events and create comments or issues.", category: "Productivity", emoji: "🐙", color: "bg-neutral-500/10", textColor: "text-neutral-600", badges: ["Both"], status: "available", authType: "api_key" },
  { id: "linear", name: "Linear", description: "Create and update Linear issues from workflow steps or on webhook events.", category: "Productivity", emoji: "📐", color: "bg-violet-500/10", textColor: "text-violet-600", badges: ["Both"], status: "coming_soon", authType: "api_key" },
  { id: "gcal", name: "Google Calendar", description: "Create events and check availability as part of scheduling workflows.", category: "Productivity", emoji: "📅", color: "bg-blue-500/10", textColor: "text-blue-600", badges: ["Both"], status: "coming_soon", authType: "oauth" },

  // Commerce
  { id: "stripe", name: "Stripe", description: "Trigger workflows on payment events — charges, subscriptions, and refunds.", category: "Commerce", emoji: "💳", color: "bg-purple-500/10", textColor: "text-purple-600", badges: ["Trigger"], status: "coming_soon", authType: "api_key" },
  { id: "shopify", name: "Shopify", description: "React to Shopify order, product, and customer webhook events.", category: "Commerce", emoji: "🛍️", color: "bg-green-500/10", textColor: "text-green-600", badges: ["Trigger"], status: "coming_soon", authType: "api_key" },

  // Storage
  { id: "gdrive", name: "Google Drive", description: "Upload, read, and organise files in Google Drive from workflow steps.", category: "Storage", emoji: "📁", color: "bg-yellow-500/10", textColor: "text-yellow-600", badges: ["Action"], status: "coming_soon", authType: "oauth" },
  { id: "s3", name: "AWS S3", description: "Upload and download objects from S3 buckets within your automation.", category: "Storage", emoji: "🗄️", color: "bg-orange-500/10", textColor: "text-orange-600", badges: ["Action"], status: "coming_soon", authType: "api_key" },
];

const CATEGORIES = ["All", "Messaging", "Webhooks", "Email", "Data", "AI", "Productivity", "Commerce", "Storage"];

const BADGE_STYLE: Record<Badge, string> = {
  Trigger: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  Action: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  Both: "bg-primary/10 text-primary border-primary/20",
};

export default function ConnectionsPage() {
  const { user } = useUser();
  const [activeTab, setActiveTab] = useState<'installed' | 'discover'>('installed');
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [setupIntegration, setSetupIntegration] = useState<Integration | null>(null);
  const [apiKeyValue, setApiKeyValue] = useState("");
  const [webhookUrlValue, setWebhookUrlValue] = useState("");
  const [isInstalling, setIsInstalling] = useState(false);

  const installedConnections = useQuery(api.mcpServers.listUserMCPs, user?.id ? {} : "skip");
  const addMcpServer = useMutation(api.mcpServers.addMCPServer);

  const filtered = CATALOGUE.filter((i) => {
    const matchesCategory = selectedCategory === "All" || i.category === selectedCategory;
    const matchesSearch = i.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      i.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const isInstalled = (id: string) =>
    installedConnections?.some((c) => c.name.toLowerCase().includes(id));

  const handleInstall = async () => {
    if (!setupIntegration || !user?.id) return;
    setIsInstalling(true);
    try {
      await addMcpServer({
        name: setupIntegration.name,
        url: webhookUrlValue || setupIntegration.url || `https://api.intentflow.ai/integrations/${setupIntegration.id}`,
        description: setupIntegration.description,
        category: setupIntegration.category.toLowerCase(),
        authType: setupIntegration.authType === "none" ? "none" : "api-key",
        tools: setupIntegration.tools,
      });
      toast.success(`${setupIntegration.name} connected successfully!`);
      setSetupIntegration(null);
      setApiKeyValue("");
      setWebhookUrlValue("");
      setActiveTab("installed");
    } catch (err: any) {
      toast.error(`Failed: ${err.message}`);
    } finally {
      setIsInstalling(false);
    }
  };

  return (
    <div className="pb-8 space-y-6">
      <PageHeader title="Connections" />

      <Tabs defaultValue="installed" onValueChange={(val) => setActiveTab(val as any)} className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <TabsList className="bg-muted/50 p-1 rounded-xl h-9">
            <TabsTrigger value="installed" className="rounded-lg px-5 font-bold text-xs tracking-tight data-[state=active]:bg-background data-[state=active]:shadow-sm">
              My Connections
            </TabsTrigger>
            <TabsTrigger value="discover" className="rounded-lg px-5 font-bold text-xs tracking-tight data-[state=active]:bg-background data-[state=active]:shadow-sm">
              Marketplace
            </TabsTrigger>
          </TabsList>

          {activeTab === "discover" && (
            <div className="relative w-full sm:w-72 group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary" />
              <Input
                placeholder="Search integrations..."
                className="pl-9 h-9 bg-muted/20 rounded-xl text-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button className="absolute right-3 top-1/2 -translate-y-1/2" onClick={() => setSearchQuery("")}>
                  <X className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Installed Tab */}
        <TabsContent value="installed" className="m-0 focus-visible:outline-none">
          {installedConnections === undefined ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map(i => <div key={i} className="h-36 rounded-2xl animate-pulse bg-muted/50 border border-border/50" />)}
            </div>
          ) : installedConnections.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {installedConnections.map((conn) => (
                <Card key={conn._id} className="group hover:border-primary/40 rounded-2xl border-border">
                  <CardHeader className="p-5 pb-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-muted rounded-xl text-foreground group-hover:bg-primary/10 group-hover:text-primary border border-border/10">
                          <LinkIcon className="h-5 w-5" />
                        </div>
                        <div>
                          <CardTitle className="text-sm font-bold">{conn.name}</CardTitle>
                          <CardDescription className="text-[10px] uppercase font-bold tracking-widest">{conn.category}</CardDescription>
                        </div>
                      </div>
                      <Badge variant={conn.enabled ? "default" : "secondary"} className="text-[9px] font-bold uppercase shrink-0">
                        {conn.enabled ? "Active" : "Off"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="px-5 pb-5">
                    <p className="text-xs text-muted-foreground/80 line-clamp-2 mb-4">{conn.description}</p>
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      <span className="text-[10px] font-bold text-muted-foreground">Connected</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-border/50 rounded-2xl bg-muted/10 text-center">
              <div className="p-3 rounded-full bg-background border border-border mb-4">
                <LinkIcon className="h-6 w-6 text-muted-foreground/30" />
              </div>
              <h3 className="text-sm font-bold mb-1">No connections yet</h3>
              <p className="text-xs text-muted-foreground max-w-xs mx-auto mb-6">Connect tools and services to trigger workflows or take actions automatically.</p>
              <Button onClick={() => setActiveTab("discover")} size="sm" className="h-9 px-6 font-bold">
                Browse Marketplace
              </Button>
            </div>
          )}
        </TabsContent>

        {/* Marketplace Tab */}
        <TabsContent value="discover" className="m-0 focus-visible:outline-none space-y-6">
          {/* Category filter chips */}
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={cn(
                  "px-3 py-1 rounded-full text-xs font-semibold border transition-all",
                  selectedCategory === cat
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-muted/50 text-muted-foreground border-border/50 hover:border-border hover:text-foreground"
                )}
              >
                {cat}
              </button>
            ))}
          </div>

          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-border/50 rounded-2xl bg-muted/10 text-center">
              <AlertCircle className="h-8 w-8 text-muted-foreground/30 mb-2" />
              <p className="text-sm text-muted-foreground">No integrations match your search.</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filtered.map((integration) => {
                const installed = isInstalled(integration.id);
                return (
                  <Card
                    key={integration.id}
                    className={cn(
                      "flex flex-col group rounded-2xl border-border",
                      integration.status === "coming_soon"
                        ? "opacity-60"
                        : "hover:border-primary/40 cursor-pointer"
                    )}
                  >
                    <CardHeader className="p-5 pb-3">
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center text-lg shrink-0", integration.color)}>
                          {integration.emoji}
                        </div>
                        <div className="flex flex-wrap gap-1 justify-end">
                          {integration.status === "coming_soon" ? (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground border border-border/50">
                              Soon
                            </span>
                          ) : (
                            integration.badges.map((b) => (
                              <span key={b} className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded-full border", BADGE_STYLE[b])}>
                                {b}
                              </span>
                            ))
                          )}
                        </div>
                      </div>
                      <CardTitle className="text-sm font-bold mb-1">{integration.name}</CardTitle>
                      <CardDescription className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground/60">{integration.category}</CardDescription>
                    </CardHeader>
                    <CardContent className="px-5 pb-5 flex flex-col flex-1 justify-between gap-4">
                      <p className="text-xs text-muted-foreground/80 leading-relaxed line-clamp-3">{integration.description}</p>
                      <Button
                        variant={installed ? "outline" : "default"}
                        size="sm"
                        className="w-full h-8 text-xs font-bold"
                        disabled={installed || integration.status === "coming_soon"}
                        onClick={() => integration.status === "available" && !installed && setSetupIntegration(integration)}
                      >
                        {installed ? (
                          <><Check className="h-3.5 w-3.5 mr-1.5" /> Connected</>
                        ) : integration.status === "coming_soon" ? (
                          "Coming Soon"
                        ) : (
                          <><Plus className="h-3.5 w-3.5 mr-1.5" /> Connect</>
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Setup Dialog */}
      <Dialog open={!!setupIntegration} onOpenChange={(o) => !o && setSetupIntegration(null)}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-base">
              {setupIntegration && (
                <span className={cn("h-9 w-9 rounded-xl flex items-center justify-center text-lg", setupIntegration.color)}>
                  {setupIntegration.emoji}
                </span>
              )}
              Connect {setupIntegration?.name}
            </DialogTitle>
            <DialogDescription className="text-xs">{setupIntegration?.description}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {setupIntegration?.authType === "api_key" && (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">{setupIntegration.name} API Key</Label>
                <Input
                  type="password"
                  placeholder="Enter your API key..."
                  value={apiKeyValue}
                  onChange={(e) => setApiKeyValue(e.target.value)}
                  className="h-9 text-sm font-mono"
                />
                <p className="text-[10px] text-muted-foreground">Your key is encrypted and never stored in plain text.</p>
              </div>
            )}
            {setupIntegration?.authType === "webhook" && (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Webhook URL</Label>
                <Input
                  placeholder="https://..."
                  value={webhookUrlValue}
                  onChange={(e) => setWebhookUrlValue(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
            )}
            {setupIntegration?.authType === "oauth" && (
              <div className="rounded-xl border border-border/50 bg-muted/20 p-4 text-center">
                <p className="text-xs text-muted-foreground mb-3">Click below to authenticate via OAuth.</p>
                <Button size="sm" className="h-8 text-xs font-bold gap-1.5">
                  <Zap className="h-3.5 w-3.5" /> Authorize with {setupIntegration.name}
                </Button>
              </div>
            )}
            {setupIntegration?.authType === "none" && (
              <div className="rounded-xl border border-border/50 bg-muted/20 p-4">
                <p className="text-xs text-muted-foreground">This integration will generate a unique webhook URL you can use in external services.</p>
              </div>
            )}

            {setupIntegration?.tools && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Available Actions</p>
                <div className="flex flex-wrap gap-1.5">
                  {setupIntegration.tools.map((t) => (
                    <span key={t} className="text-[10px] px-2 py-0.5 rounded-full bg-muted border border-border/50 font-medium">{t}</span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setSetupIntegration(null)}>Cancel</Button>
            <Button
              size="sm"
              className="h-8 text-xs font-bold"
              disabled={isInstalling || (setupIntegration?.authType === "api_key" && !apiKeyValue)}
              onClick={handleInstall}
            >
              {isInstalling ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Check className="h-3.5 w-3.5 mr-1.5" />}
              {isInstalling ? "Connecting..." : "Connect"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
