"use client";

import { useState, useRef } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  ArrowLeft,
  Trash2,
  FileText,
  Upload,
  Database,
  Loader2,
  Plus,
  FileUp,
  X,
  ChevronRight,
  Monitor,
  Globe,
  Settings
} from "lucide-react";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { Separator } from "@/components/ui/separator";

interface NamespaceDetailProps {
  namespaceId: any;
  onBack: () => void;
}

export default function NamespaceDetail({ namespaceId, onBack }: NamespaceDetailProps) {
  const namespace = useQuery(api.knowledge.getNamespace, { id: namespaceId });
  const documents = useQuery(api.knowledge.listDocuments, { namespaceId });
  const deleteNamespace = useMutation(api.knowledge.deleteNamespace);
  const deleteDocument = useMutation(api.knowledge.deleteDocument);
  const ingestDocument = useAction(api.ingestion.ingestDocument);

  const [isUploading, setIsUploading] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'main' | 'url'>('main');
  const [urlToSync, setUrlToSync] = useState("");
  const [connectorName, setConnectorName] = useState("");
  const createConnector = useMutation(api.knowledgeConnectors.createConnector);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCreateUrlConnector = async () => {
    if (!urlToSync.trim()) {
      toast.error("Please enter a URL");
      return;
    }

    try {
      await createConnector({
        namespaceId,
        name: connectorName || new URL(urlToSync).hostname,
        type: "url",
        config: { url: urlToSync },
      });
      toast.success("URL Connector created! Syncing will start shortly.");
      setIsConnectModalOpen(false);
      setActiveTab('main');
      setUrlToSync("");
      setConnectorName("");
    } catch (error) {
      toast.error("Failed to create connector");
      console.error(error);
    }
  };

  const handleDeleteNamespace = async () => {
    try {
      await deleteNamespace({ id: namespaceId });
      toast.success("Namespace deleted");
      onBack();
    } catch (error) {
      toast.error("Failed to delete namespace");
    }
  };

  const handleDeleteDocument = async (id: any) => {
    try {
      await deleteDocument({ id });
      toast.success("Document deleted");
    } catch (error) {
      toast.error("Failed to delete document");
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    const sizeLimit = isPdf ? 5 * 1024 * 1024 : 2 * 1024 * 1024;

    if (file.size > sizeLimit) {
      toast.error(`File size exceeds ${isPdf ? "5MB" : "2MB"} limit`);
      return;
    }

    setIsUploading(true);

    try {
      let content: string;
      if (isPdf) {
        const reader = new FileReader();
        content = await new Promise((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      } else {
        content = await file.text();
      }

      const result = await ingestDocument({
        namespaceId,
        content: content,
        fileName: file.name,
      });

      if (result.success) {
        toast.success(`Successfully ingested ${result.count} chunks`);
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to ingest document");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  if (!namespace) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between border-b pb-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={onBack} className="rounded-full h-10 w-10">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight">{namespace.name}</h1>
              <Badge variant="secondary" className="px-2 py-0.5 text-[10px] font-bold">
                {namespace.documentCount || 0} CHUNKS
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">{namespace.description}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            onChange={handleFileUpload}
            accept=".txt,.md,.json,.pdf"
          />

          <Dialog open={isConnectModalOpen} onOpenChange={(open) => {
            setIsConnectModalOpen(open);
            if (!open) setActiveTab('main');
          }}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Database className="h-4 w-4" />
                Connect Data Source
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              {activeTab === 'main' ? (
                <>
                  <DialogHeader>
                    <DialogTitle>Connect External Data Source</DialogTitle>
                    <DialogDescription>
                      Automatically sync knowledge from your existing databases, websites, or SaaS tools.
                    </DialogDescription>
                  </DialogHeader>

                  <div className="grid gap-3 py-4">
                    {[
                      { id: 'database', name: 'SQL Database', desc: 'Sync from Postgres, MySQL or MongoDB', icon: Database, comingSoon: true },
                      { id: 'url', name: 'Website / Sitemap', desc: 'Crawl and index documentation or blogs', icon: Globe, comingSoon: false },
                      { id: 'notion', name: 'Notion Workspace', desc: 'Connect your internal team knowledge', icon: FileText, comingSoon: true },
                    ].map((source) => (
                      <button
                        key={source.id}
                        disabled={source.comingSoon}
                        onClick={() => {
                          if (source.id === 'url') setActiveTab('url');
                        }}
                        className={cn(
                          "flex items-center gap-4 p-4 rounded-xl border text-left transition-all group",
                          source.comingSoon ? "opacity-50 cursor-not-allowed bg-muted/50" : "hover:border-primary hover:bg-primary/5"
                        )}
                      >
                        <div className={cn(
                          "p-2.5 rounded-lg transition-all",
                          source.comingSoon ? "bg-muted text-muted-foreground/50" : "bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
                        )}>
                          <source.icon className="h-6 w-6" />
                        </div>
                        <div className="flex-1 overflow-hidden">
                          <div className="flex justify-between items-center">
                            <p className="font-semibold text-sm">{source.name}</p>
                            {source.comingSoon && <Badge variant="outline" className="text-[10px] py-0 h-4">Soon</Badge>}
                          </div>
                          <p className="text-xs text-muted-foreground truncate">{source.desc}</p>
                        </div>
                      </button>
                    ))}
                  </div>

                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsConnectModalOpen(false)} className="w-full">Cancel</Button>
                  </DialogFooter>
                </>
              ) : (
                <>
                  <DialogHeader>
                    <div className="flex items-center gap-3">
                      <Button variant="ghost" size="icon" onClick={() => setActiveTab('main')} className="h-8 w-8 rounded-full">
                        <ArrowLeft className="h-4 w-4" />
                      </Button>
                      <DialogTitle>Setup URL Connector</DialogTitle>
                    </div>
                    <DialogDescription>
                      Enter a website URL or sitemap to crawl and index. We'll automatically keep it in sync.
                    </DialogDescription>
                  </DialogHeader>

                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <label className="text-sm font-medium">Website URL</label>
                      <Input
                        placeholder="https://docs.example.com"
                        value={urlToSync}
                        onChange={(e) => setUrlToSync(e.target.value)}
                      />
                    </div>
                    <div className="grid gap-2">
                      <label className="text-sm font-medium">Connector Name (Optional)</label>
                      <Input
                        placeholder="e.g. API Documentation"
                        value={connectorName}
                        onChange={(e) => setConnectorName(e.target.value)}
                      />
                    </div>
                  </div>

                  <DialogFooter className="gap-2 sm:gap-0">
                    <Button variant="outline" onClick={() => setActiveTab('main')} className="flex-1">Back</Button>
                    <Button onClick={handleCreateUrlConnector} className="flex-1">Start Sync</Button>
                  </DialogFooter>
                </>
              )}
            </DialogContent>
          </Dialog>

          <Button
            variant="outline"
            className="gap-2"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            <span>Upload</span>
          </Button>

          <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="icon" className="text-destructive hover:bg-destructive/10 hover:text-destructive h-10 w-10">
                <Trash2 className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete Namespace?</DialogTitle>
                <DialogDescription>
                  This will permanently delete the namespace <span className="font-semibold text-foreground">"{namespace.name}"</span> and all <span className="font-semibold text-foreground">{namespace.documentCount}</span> document chunks within it. This action <span className="text-destructive font-bold uppercase">cannot be undone</span>.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="gap-2 sm:gap-0">
                <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>Cancel</Button>
                <Button variant="destructive" onClick={handleDeleteNamespace}>Delete Namespace</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Knowledge Connectors Section */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold flex items-center gap-2 text-muted-foreground uppercase tracking-wider">
          <Database className="h-4 w-4 opacity-50" />
          Active Connectors
        </h2>

        {namespaceId && (
          <ConnectorsList namespaceId={namespaceId} />
        )}
      </div>

      <Separator />

      {/* Documents List */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Documents</h2>

        {documents === undefined ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        ) : documents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed rounded-lg">
            <FileUp className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-xl font-semibold mb-2">No documents yet</h3>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto mb-6"> Upload your first PDF, Markdown or Text file to populate this namespace. </p>
            <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
              Choose a file
            </Button>
          </div>
        ) : (
          <div className="grid gap-3">
            {documents.map((doc) => (
              <div
                key={doc._id}
                className="group flex items-center justify-between p-4 bg-card border rounded-xl hover:border-primary transition-all shadow-sm"
              >
                <div className="flex items-center gap-4 overflow-hidden">
                  <div className="p-2.5 bg-muted rounded-lg text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-all">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-sm font-medium truncate">{doc.metadata?.fileName || "unnamed document"}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-xs text-muted-foreground truncate max-w-[400px]">
                        {doc.content.substring(0, 100)}...
                      </p>
                      <Badge variant="outline" className="text-[10px] py-0 h-4 border-none bg-muted font-normal">
                        Chunk {doc.metadata?.chunkIndex}
                      </Badge>
                    </div>
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-all hover:text-destructive hover:bg-destructive/10"
                  onClick={() => handleDeleteDocument(doc._id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ConnectorsList({ namespaceId }: { namespaceId: any }) {
  const connectors = useQuery(api.knowledgeConnectors.listConnectorsByNamespace, { namespaceId });
  const deleteConnector = useMutation(api.knowledgeConnectors.deleteConnector);

  if (connectors === undefined) return null;
  if (connectors.length === 0) return (
    <div className="py-8 bg-muted/30 rounded-lg text-center border border-dashed">
      <p className="text-xs text-muted-foreground">No external data sources connected yet.</p>
    </div>
  );

  return (
    <div className="grid gap-3">
      {connectors.map((conn) => (
        <div
          key={conn._id}
          className="flex items-center justify-between p-4 bg-card border rounded-xl hover:border-primary transition-all shadow-sm group"
        >
          <div className="flex items-center gap-4 overflow-hidden">
            <div className="p-2.5 bg-primary/5 text-primary rounded-lg transition-all">
              {conn.type === 'database' ? <Database className="h-5 w-5" /> :
                conn.type === 'url' ? <Globe className="h-5 w-5" /> :
                  <FileText className="h-5 w-5" />}
            </div>
            <div className="overflow-hidden">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold truncate">{conn.name}</p>
                <Badge variant={conn.status === 'syncing' ? "default" : "outline"} className={cn(
                  "text-[10px] py-0 h-4 font-normal",
                  conn.status === 'syncing' && "animate-pulse"
                )}>
                  {conn.status.toUpperCase()}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground truncate mt-0.5">{conn.config?.url || "Database Connection"}</p>
            </div>
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-all hover:text-destructive hover:bg-destructive/10"
            onClick={() => deleteConnector({ id: conn._id })}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ))}
    </div>
  );
}
