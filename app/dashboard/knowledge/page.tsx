"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { motion } from "framer-motion";
import {
  Plus,
  Database,
  Search,
  FileText,
  ChevronRight,
  BookOpen,
  AlertCircle,
  Loader2
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import NamespaceDetail from "@/components/knowledge/NamespaceDetail";
import { useWorkspace } from "@/components/providers/WorkspaceProvider";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

export default function KnowledgePage() {
  const { activeWorkspaceId, activeProjectId } = useWorkspace();

  const namespaces = useQuery(
    api.knowledge.listNamespaces,
    activeWorkspaceId ? { workspaceId: activeWorkspaceId, projectId: activeProjectId || undefined } : "skip"
  );
  const createNamespace = useMutation(api.knowledge.createNamespace);

  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newNamespaceName, setNewNamespaceName] = useState("");
  const [newNamespaceDesc, setNewNamespaceDesc] = useState("");
  const [selectedNamespaceId, setSelectedNamespaceId] = useState<any>(null);

  const handleCreateNamespace = async () => {
    if (!newNamespaceName.trim()) {
      toast.error("Namespace name is required");
      return;
    }

    try {
      await createNamespace({
        name: newNamespaceName,
        description: newNamespaceDesc,
        workspaceId: activeWorkspaceId || undefined,
        projectId: activeProjectId || undefined,
      });
      toast.success("Namespace created successfully");
      setIsCreateDialogOpen(false);
      setNewNamespaceName("");
      setNewNamespaceDesc("");
    } catch (error) {
      toast.error("Failed to create namespace");
      console.error(error);
    }
  };

  const filteredNamespaces = namespaces?.filter(ns =>
    ns.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ns.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (selectedNamespaceId) {
    return (
      <NamespaceDetail
        namespaceId={selectedNamespaceId}
        onBack={() => setSelectedNamespaceId(null)}
      />
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="pb-8 space-y-8"
    >
      <PageHeader
        title="Knowledge Base"
        actions={
          <Button
            disabled={!activeProjectId}
            className="h-9 px-4 font-bold tracking-tight text-xs uppercase"
            onClick={() => setIsCreateDialogOpen(true)}
          >
            <Plus className="mr-2 h-4 w-4" /> Create Namespace
          </Button>
        }
      />
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[425px] p-0 overflow-hidden border-border bg-background">
          <DialogHeader className="p-8 pb-4">
            <DialogTitle className="text-2xl font-bold tracking-tight">Create Namespace</DialogTitle>
            <DialogDescription className="text-xs leading-relaxed mt-2">
              A namespace is a container for related documents. You can use it in your workflows to retrieve context for RAG.
            </DialogDescription>
          </DialogHeader>
          <div className="px-8 py-4 space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Namespace Name</label>
              <Input
                placeholder="e.g. Legal Documents, Technical Docs"
                value={newNamespaceName}
                onChange={(e) => setNewNamespaceName(e.target.value)}
                className="h-9"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Description (optional)</label>
              <Input
                placeholder="Briefly describe what's inside this namespace"
                value={newNamespaceDesc}
                onChange={(e) => setNewNamespaceDesc(e.target.value)}
                className="h-9"
              />
            </div>
          </div>
          <DialogFooter className="p-8 pt-4 bg-muted/50 border-t">
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)} className="h-9 font-bold">Cancel</Button>
            <Button onClick={handleCreateNamespace} className="h-9 font-bold uppercase tracking-widest text-[10px] px-8">Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {!activeProjectId ? (
        <div className="flex flex-col items-center justify-center h-[50vh] text-center border-2 border-dashed border-border/50 rounded-[32px] bg-muted/10 mt-8">
          <div className="p-4 rounded-full bg-background border border-border mb-6">
            <Database className="h-8 w-8 text-muted-foreground/30" />
          </div>
          <h3 className="text-xl font-bold tracking-tight mb-2">Select a Project</h3>
          <p className="text-xs text-muted-foreground max-w-xs mx-auto font-medium">
            You need to create a <strong className="font-bold text-foreground">Project</strong> to manage your knowledge base.
          </p>
        </div>
      ) : (
        <>

          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input
              placeholder="Search namespaces..."
              className="pl-11 h-12 bg-muted/20 border-border/50 focus:border-primary/50 transition-all rounded-2xl text-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {namespaces === undefined ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-[240px] rounded-3xl animate-pulse bg-muted" />
              ))}
            </div>
          ) : filteredNamespaces?.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center border-2 border-dashed border-border/50 rounded-[32px] bg-muted/10">
              <div className="p-4 rounded-full bg-background border border-border mb-6">
                <BookOpen className="h-8 w-8 text-muted-foreground/50" />
              </div>
              <h3 className="text-lg font-bold tracking-tight mb-2">No namespaces found</h3>
              <p className="text-xs text-muted-foreground max-w-xs mx-auto mb-8 font-medium italic"> Create your first namespace to start building your AI knowledge base. </p>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(true)} className="h-9 rounded-full px-8 font-bold border-border shadow-sm">
                Create your first namespace
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredNamespaces?.map((ns) => (
                <Card
                  key={ns._id}
                  className="group cursor-pointer hover:border-primary/50 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col rounded-[32px] border-border overflow-hidden"
                  onClick={() => setSelectedNamespaceId(ns._id)}
                >
                  <CardHeader className="p-8 pb-4">
                    <div className="flex items-start gap-5">
                      <div className="p-3.5 bg-muted rounded-[20px] text-foreground group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-500 shadow-sm">
                        <Database className="h-6 w-6" />
                      </div>
                      <div className="space-y-1.5 overflow-hidden flex-1">
                        <CardTitle className="text-xl font-bold tracking-tight group-hover:text-primary transition-colors truncate">
                          {ns.name}
                        </CardTitle>
                        <CardDescription className="line-clamp-2 text-[11px] font-medium leading-relaxed min-h-[32px]">
                          {ns.description || "No description provided."}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="px-8 pb-8 pt-0 flex-1 flex flex-col justify-end">
                    <div className="flex items-center justify-between mt-6 pt-6 border-t border-border/50">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-muted text-muted-foreground font-bold text-[9px] tracking-widest uppercase">
                          <FileText className="h-3 w-3" />
                          {ns.documentCount || 0} CHUNKS
                        </div>
                      </div>
                      <div className="flex items-center gap-1 text-[10px] font-black tracking-widest text-muted-foreground group-hover:text-primary transition-all">
                        GO
                        <ChevronRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </motion.div>
  );
}
