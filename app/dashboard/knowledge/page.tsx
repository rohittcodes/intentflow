"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { motion } from "framer-motion";
import {
  Plus,
  Database,
  Search,
  Trash2,
  FileText,
  Upload,
  Settings,
  MoreVertical,
  ChevronRight,
  BookOpen
} from "lucide-react";

import Button from "@/components/ui/shadcn/button";
import { Input } from "@/components/ui/shadcn/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription
} from "@/components/ui/shadcn/dialog";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/shadcn/card";
import { Badge } from "@/components/ui/shadcn/badge";
import { toast } from "sonner";
import NamespaceDetail from "@/components/knowledge/NamespaceDetail";

export default function KnowledgePage() {
  const namespaces = useQuery(api.knowledge.listNamespaces);
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
      className="space-y-24"
    >
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-16">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-accent-black">Knowledge Base</h1>
          <p className="text-black-alpha-56">Manage your documents and semantic search namespaces for RAG.</p>
        </div>

        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-8 h-40 px-20">
              <Plus className="w-18 h-18" /> Create Namespace
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-448 p-32 gap-0">
            <DialogHeader className="mb-24">
              <DialogTitle className="text-title-h4 mb-8">Create New Namespace</DialogTitle>
              <DialogDescription className="text-body-medium text-black-alpha-48 leading-relaxed">
                A namespace is a container for related documents. You can use it in your workflows to retrieve context for RAG.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-24 mb-32">
              <div className="space-y-10">
                <label className="text-label-small font-semibold text-accent-black">Namespace Name</label>
                <Input
                  placeholder="e.g. Legal Documents, Technical Docs"
                  value={newNamespaceName}
                  onChange={(e) => setNewNamespaceName(e.target.value)}
                  className="h-44 bg-background-base border-black-alpha-12 focus:border-heat-100 rounded-8 transition-all"
                />
              </div>
              <div className="space-y-10">
                <label className="text-label-small font-semibold text-accent-black">Description (optional)</label>
                <Input
                  placeholder="Briefly describe what's inside this namespace"
                  value={newNamespaceDesc}
                  onChange={(e) => setNewNamespaceDesc(e.target.value)}
                  className="h-44 bg-background-base border-black-alpha-12 focus:border-heat-100 rounded-8 transition-all"
                />
              </div>
            </div>
            <DialogFooter className="gap-12">
              <Button variant="secondary" onClick={() => setIsCreateDialogOpen(false)} className="h-44 px-24">Cancel</Button>
              <Button onClick={handleCreateNamespace} className="h-44 px-24 bg-heat-100 hover:bg-heat-200">Create Namespace</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative">
        <Search className="absolute left-12 top-1/2 -translate-y-1/2 w-16 h-16 text-black-alpha-40" />
        <Input
          placeholder="Search namespaces..."
          className="pl-40 h-48 bg-accent-white border-black-alpha-12 focus:border-heat-100 transition-all rounded-12"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {namespaces === undefined ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-24">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-200 bg-black-alpha-4 animate-pulse rounded-16" />
          ))}
        </div>
      ) : filteredNamespaces?.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-64 bg-accent-white rounded-24 border border-dashed border-black-alpha-16 text-center">
          <BookOpen className="w-64 h-64 text-black-alpha-24 mb-16" />
          <h3 className="text-label-large text-accent-black">No namespaces found</h3>
          <p className="text-black-alpha-56 mt-4 mb-24 max-w-320"> Create your first namespace to start building your AI knowledge base. </p>
          <Button variant="secondary" onClick={() => setIsCreateDialogOpen(true)}>
            Create your first namespace
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-24">
          {filteredNamespaces?.map((ns) => (
            <Card
              key={ns._id}
              className="group cursor-pointer hover:shadow-xl transition-all duration-300 border-black-alpha-12 hover:border-heat-100 rounded-24 overflow-hidden flex flex-col bg-accent-white hover:-translate-y-4"
              onClick={() => setSelectedNamespaceId(ns._id)}
            >
              <CardHeader className="p-24 pb-16 flex flex-row items-start justify-between">
                <div className="flex items-start gap-20">
                  <div className="p-14 bg-heat-4 rounded-18 text-heat-100 group-hover:bg-heat-100 group-hover:text-accent-white transition-all duration-300 shadow-sm">
                    <Database className="w-28 h-28" />
                  </div>
                  <div className="space-y-4 overflow-hidden">
                    <CardTitle className="text-xl font-bold text-accent-black group-hover:text-heat-100 transition-colors truncate">
                      {ns.name}
                    </CardTitle>
                    <CardDescription className="line-clamp-2 text-black-alpha-48 leading-relaxed text-sm">
                      {ns.description || "No description provided."}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="px-24 pb-24 pt-0 flex-1 flex flex-col justify-end">
                <div className="flex items-center justify-between mt-20 pt-20 border-t border-black-alpha-8">
                  <div className="flex items-center gap-12">
                    <div className="flex items-center gap-6 bg-black-alpha-4 text-black-alpha-56 border-none font-medium text-xs px-10 py-4 rounded-8">
                      <FileText className="w-14 h-14 mr-6 inline opacity-60" />
                      {ns.documentCount || 0} chunks
                    </div>
                  </div>
                  <div className="flex items-center text-black-alpha-40 group-hover:text-heat-100 group-hover:translate-x-4 transition-all duration-300">
                    <span className="text-label-small font-semibold mr-6">Open Namespace</span>
                    <ChevronRight className="w-18 h-18" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </motion.div>
  );
}
