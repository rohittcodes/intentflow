"use client";

import { useState, useRef } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  ArrowLeft,
  Trash2,
  FileText,
  Upload,
  Settings,
  Loader2,
  Plus,
  FileUp,
  X,
  Database
} from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/utils/cn";

import Button from "@/components/ui/shadcn/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription
} from "@/components/ui/shadcn/dialog";
import { Input } from "@/components/ui/shadcn/input";
import { Badge } from "@/components/ui/shadcn/badge";
import { toast } from "sonner";

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
        // Read as Data URL (base64) for PDF
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
      <div className="flex items-center justify-center p-64">
        <Loader2 className="w-32 h-32 animate-spin text-heat-100" />
      </div>
    );
  }

  return (
    <div className="space-y-24">
      {/* Header */}
      <div className="flex items-center justify-between border-b pb-20 border-black-alpha-8">
        <div className="flex items-center gap-16">
          <Button variant="secondary" onClick={onBack} className="rounded-full w-40 h-40 p-0 flex items-center justify-center">
            <ArrowLeft className="w-20 h-20" />
          </Button>
          <div>
            <div className="flex items-center gap-12">
              <h1 className="text-2xl font-bold text-accent-black">{namespace.name}</h1>
              <div className="py-2 px-6 bg-heat-8 text-heat-100 hover:bg-heat-8 border-none font-normal">
                {namespace.documentCount || 0} chunks
              </div>
            </div>
            <p className="text-black-alpha-56 text-body-small mt-2">{namespace.description}</p>
          </div>
        </div>

        <div className="flex items-center gap-12">
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
              <Button
                variant="secondary"
                className="gap-8 h-44 px-20 shadow-sm border-black-alpha-12 hover:border-heat-100 transition-all text-heat-100 hover:bg-heat-4"
              >
                <Database className="w-18 h-18" />
                <span className="text-label-small">Connect Data Source</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-512 p-32 gap-0">
              {activeTab === 'main' ? (
                <>
                  <DialogHeader className="mb-24">
                    <DialogTitle className="text-title-h4 mb-8">Connect External DataSource</DialogTitle>
                    <DialogDescription className="text-body-medium text-black-alpha-48 leading-relaxed">
                      Automatically sync knowledge from your existing databases, websites, or SaaS tools.
                    </DialogDescription>
                  </DialogHeader>

                  <div className="grid grid-cols-1 gap-12 mb-32">
                    {[
                      { id: 'database', name: 'SQL Database', desc: 'Sync from Postgres, MySQL or MongoDB', icon: Database, comingSoon: true },
                      { id: 'url', name: 'Website / Sitemap', desc: 'Crawl and index documentation or blogs', icon: Upload, comingSoon: false },
                      { id: 'notion', name: 'Notion Workspace', desc: 'Connect your internal team knowledge', icon: FileText, comingSoon: true },
                    ].map((source) => (
                      <button
                        key={source.id}
                        disabled={source.comingSoon}
                        onClick={() => {
                          if (source.id === 'url') setActiveTab('url');
                        }}
                        className={cn(
                          "flex items-center gap-16 p-16 rounded-16 border border-black-alpha-8 transition-all text-left group",
                          source.comingSoon ? "opacity-50 cursor-not-allowed bg-black-alpha-4" : "hover:border-heat-100 hover:bg-heat-4"
                        )}
                      >
                        <div className={cn(
                          "p-10 rounded-12 transition-all",
                          source.comingSoon ? "bg-black-alpha-4 text-black-alpha-24" : "bg-black-alpha-4 text-black-alpha-40 group-hover:bg-heat-8 group-hover:text-heat-100"
                        )}>
                          <source.icon className="w-24 h-24" />
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between items-center">
                            <p className="text-label-medium text-accent-black font-semibold">{source.name}</p>
                            {source.comingSoon && <Badge className="bg-black-alpha-8 text-black-alpha-40 border-none text-[10px] py-0 px-6">Coming Soon</Badge>}
                          </div>
                          <p className="text-body-small text-black-alpha-48">{source.desc}</p>
                        </div>
                      </button>
                    ))}
                  </div>

                  <DialogFooter>
                    <Button variant="secondary" onClick={() => setIsConnectModalOpen(false)} className="h-44 px-24 w-full">Cancel</Button>
                  </DialogFooter>
                </>
              ) : (
                <>
                  <DialogHeader className="mb-24">
                    <div className="flex items-center gap-12 mb-16 pt-8">
                      <Button variant="secondary" onClick={() => setActiveTab('main')} className="w-32 h-32 p-0 rounded-full flex items-center justify-center">
                        <ArrowLeft className="w-16 h-16" />
                      </Button>
                      <DialogTitle className="text-title-h4">Setup URL Connector</DialogTitle>
                    </div>
                    <DialogDescription className="text-body-medium text-black-alpha-48 leading-relaxed">
                      Enter a website URL or sitemap to crawl and index. We'll automatically keep it in sync.
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-24 mb-32">
                    <div className="space-y-8">
                      <label className="text-label-small font-semibold">Website URL</label>
                      <Input
                        placeholder="https://docs.example.com"
                        value={urlToSync}
                        onChange={(e) => setUrlToSync(e.target.value)}
                        className="h-44 bg-background-base"
                      />
                    </div>
                    <div className="space-y-8">
                      <label className="text-label-small font-semibold">Connector Name (Optional)</label>
                      <Input
                        placeholder="e.g. API Documentation"
                        value={connectorName}
                        onChange={(e) => setConnectorName(e.target.value)}
                        className="h-44 bg-background-base"
                      />
                    </div>
                  </div>

                  <DialogFooter className="gap-12">
                    <Button variant="secondary" onClick={() => setActiveTab('main')} className="h-44 px-24 flex-1">Back</Button>
                    <Button onClick={handleCreateUrlConnector} className="h-44 px-24 flex-1 bg-heat-100 hover:bg-heat-200">Start Sync</Button>
                  </DialogFooter>
                </>
              )}
            </DialogContent>
          </Dialog>

          <Button
            variant="secondary"
            className="gap-8 h-44 px-20 shadow-sm border-black-alpha-12 hover:border-heat-100 transition-all"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            {isUploading ? <Loader2 className="w-18 h-18 animate-spin" /> : <Upload className="w-18 h-18 text-black-alpha-48" />}
            <span className="text-label-small">Upload PDF, Markdown, TXT</span>
          </Button>

          <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="secondary" className="text-red-500 hover:text-red-600 hover:bg-red-50 rounded-full w-40 h-40 p-0 flex items-center justify-center">
                <Trash2 className="w-18 h-18" />
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-448 p-32 gap-0">
              <DialogHeader className="mb-24">
                <DialogTitle className="text-title-h4 mb-8 text-accent-black">Delete Namespace?</DialogTitle>
                <DialogDescription className="text-body-medium text-black-alpha-48 leading-relaxed">
                  This will permanently delete the namespace <span className="font-semibold text-accent-black">"{namespace.name}"</span> and all <span className="font-semibold text-accent-black">{namespace.documentCount}</span> document chunks within it. This action <span className="text-red-500 font-medium">cannot be undone</span>.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="gap-12">
                <Button variant="secondary" onClick={() => setIsDeleteDialogOpen(false)} className="h-44 px-24">Cancel</Button>
                <Button variant="secondary" className="h-44 px-24 bg-red-500 text-white hover:bg-red-600 border-none" onClick={handleDeleteNamespace}>Delete Namespace</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Knowledge Connectors Section */}
      <div className="space-y-16">
        <h2 className="text-label-medium text-accent-black flex items-center gap-8">
          <Database className="w-16 h-16 opacity-40" />
          Active Connectors
        </h2>

        {namespaceId && (
          <ConnectorsList namespaceId={namespaceId} />
        )}
      </div>

      {/* Documents List */}
      <div className="space-y-16">
        <h2 className="text-label-medium text-accent-black">Documents</h2>

        {documents === undefined ? (
          <div className="space-y-12">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-64 bg-black-alpha-4 animate-pulse rounded-12" />
            ))}
          </div>
        ) : documents.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-64 bg-accent-white rounded-24 border border-dashed border-black-alpha-16 text-center">
            <FileUp className="w-48 h-48 text-black-alpha-24 mb-16" />
            <h3 className="text-label-large text-accent-black">No documents here yet</h3>
            <p className="text-black-alpha-56 mt-4 mb-24 max-w-320"> Upload your first PDF, Markdown or Text file to populate this namespace. </p>
            <Button variant="secondary" onClick={() => fileInputRef.current?.click()}>
              Choose a file
            </Button>
          </div>
        ) : (
          <div className="grid gap-12">
            {documents.map((doc) => (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                key={doc._id}
                className="group flex items-center justify-between p-16 bg-accent-white border border-black-alpha-8 rounded-16 hover:border-heat-100 transition-all shadow-sm"
              >
                <div className="flex items-center gap-16 overflow-hidden">
                  <div className="p-10 bg-black-alpha-4 rounded-10 text-black-alpha-40 group-hover:bg-heat-8 group-hover:text-heat-100 transition-all">
                    <FileText className="w-20 h-20" />
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-label-medium text-accent-black truncate">{doc.metadata?.fileName || "unnamed document"}</p>
                    <div className="flex items-center gap-8 mt-4">
                      <p className="text-body-small text-black-alpha-40 truncate max-w-400">
                        {doc.content.substring(0, 100)}...
                      </p>
                      <Badge className="text-[10px] py-0 px-6 h-18 bg-black-alpha-4 border-none font-normal">
                        Chunk {doc.metadata?.chunkIndex}
                      </Badge>
                    </div>
                  </div>
                </div>

                <Button
                  variant="secondary"
                  className="w-32 h-32 rounded-full opacity-0 group-hover:opacity-100 transition-all hover:text-red-500 hover:bg-red-50 p-0 flex items-center justify-center"
                  onClick={() => handleDeleteDocument(doc._id)}
                >
                  <Trash2 className="w-14 h-14" />
                </Button>
              </motion.div>
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
    <div className="p-20 bg-black-alpha-4 rounded-16 text-center border border-dashed border-black-alpha-8">
      <p className="text-body-small text-black-alpha-40">No external data sources connected yet.</p>
    </div>
  );

  return (
    <div className="grid gap-12">
      {connectors.map((conn) => (
        <div
          key={conn._id}
          className="flex items-center justify-between p-16 bg-accent-white border border-black-alpha-8 rounded-16 hover:border-heat-100 transition-all shadow-sm group"
        >
          <div className="flex items-center gap-16 overflow-hidden">
            <div className="p-10 bg-heat-4 rounded-10 text-heat-100 transition-all">
              {conn.type === 'database' ? <Database className="w-20 h-20" /> :
                conn.type === 'url' ? <Upload className="w-20 h-20" /> :
                  <FileText className="w-20 h-20" />}
            </div>
            <div className="overflow-hidden">
              <div className="flex items-center gap-8">
                <p className="text-label-medium text-accent-black font-semibold truncate">{conn.name}</p>
                <Badge className={cn(
                  "text-[10px] py-0 px-6 h-18 border-none font-normal",
                  conn.status === 'idle' ? "bg-black-alpha-4 text-black-alpha-40" :
                    conn.status === 'syncing' ? "bg-heat-8 text-heat-100 animate-pulse" :
                      "bg-red-50 text-red-500"
                )}>
                  {conn.status.toUpperCase()}
                </Badge>
              </div>
              <p className="text-body-small text-black-alpha-40 truncate mt-2">{conn.config?.url || "Database Connection"}</p>
            </div>
          </div>

          <Button
            variant="secondary"
            className="w-32 h-32 rounded-full opacity-0 group-hover:opacity-100 transition-all hover:text-red-500 hover:bg-red-50 p-0 flex items-center justify-center"
            onClick={() => deleteConnector({ id: conn._id })}
          >
            <Trash2 className="w-14 h-14" />
          </Button>
        </div>
      ))}
    </div>
  );
}
