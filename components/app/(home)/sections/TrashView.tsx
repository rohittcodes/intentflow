"use client";

import { useState, useEffect } from "react";
import { Trash2, RotateCcw, X, AlertTriangle, Loader2, Workflow } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle, 
  AlertDialogTrigger 
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";

interface TrashedWorkflow {
  id: string;
  _id: string;
  name: string;
  description?: string;
  deletedAt: string;
  nodeCount: number;
  edgeCount: number;
}

export default function TrashView() {
  const [trashedWorkflows, setTrashedWorkflows] = useState<TrashedWorkflow[]>([]);
  const [loading, setLoading] = useState(true);

  // Load trashed workflows
  const loadTrashed = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/workflows/trash");
      const data = await response.json();
      setTrashedWorkflows(data.workflows || []);
    } catch (error) {
      console.error("Failed to load trashed workflows:", error);
      toast.error("Failed to load trashed workflows");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTrashed();
  }, []);

  // Restore workflow from trash
  const handleRestore = async (workflowId: string, name: string) => {
    try {
      const response = await fetch("/api/workflows/trash", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workflowId }),
      });

      if (response.ok) {
        toast.success(`"${name}" restored successfully`);
        loadTrashed();
      } else {
        const data = await response.json();
        toast.error(data.message || "Failed to restore workflow");
      }
    } catch (error) {
      console.error("Failed to restore workflow:", error);
      toast.error("Failed to restore workflow");
    }
  };

  // Permanently delete workflow
  const handlePermanentDelete = async (workflowId: string, name: string) => {
    try {
      const response = await fetch(`/api/workflows/trash?id=${workflowId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success(`"${name}" permanently deleted`);
        loadTrashed();
      } else {
        const data = await response.json();
        toast.error(data.message || "Failed to delete workflow");
      }
    } catch (error) {
      console.error("Failed to delete workflow:", error);
      toast.error("Failed to delete workflow");
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="pb-8 space-y-8">
      <PageHeader title="Trash" />

      {/* Loading State */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Emptying the trash bin...</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && trashedWorkflows.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-center border-2 border-dashed rounded-lg">
          <Trash2 className="h-12 w-12 text-muted-foreground/30 mb-4" />
          <h3 className="text-lg font-semibold mb-2">Trash is empty</h3>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto">
            Deleted workflows will appear here. You can restore them or permanently delete them.
          </p>
        </div>
      )}

      {/* Trashed Workflows List */}
      {!loading && trashedWorkflows.length > 0 && (
        <div className="grid gap-4">
            {trashedWorkflows.map((workflow) => (
              <div key={workflow._id}>
                <Card className="group hover:border-primary transition-all">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-muted rounded-lg text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-all">
                          <Workflow className="h-5 w-5" />
                        </div>
                        <div className="space-y-1">
                          <CardTitle className="text-base font-bold">{workflow.name}</CardTitle>
                          {workflow.description && (
                            <CardDescription className="text-xs line-clamp-1">
                              {workflow.description}
                            </CardDescription>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRestore(workflow._id, workflow.name)}
                          className="h-8 gap-2 text-xs"
                        >
                          <RotateCcw className="h-3 w-3" />
                          Restore
                        </Button>
  
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-8 gap-2 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
                            >
                              <Trash2 className="h-3 w-3" />
                              Delete Forever
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle className="flex items-center gap-2">
                                <AlertTriangle className="h-5 w-5 text-destructive" />
                                Permanently delete workflow?
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                This action <span className="font-bold text-foreground">cannot be undone</span>. 
                                The workflow <span className="font-semibold text-foreground">"{workflow.name}"</span> will be permanently removed from our servers.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={() => handlePermanentDelete(workflow._id, workflow.name)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete Forever
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pb-4">
                    <div className="flex items-center gap-4 text-[10px] text-muted-foreground font-medium">
                      <span className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-muted text-foreground">
                        {workflow.nodeCount} nodes
                      </span>
                      <span className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-muted text-foreground">
                        {workflow.edgeCount} connections
                      </span>
                      <span className="ml-auto flex items-center gap-1">
                        Deleted {formatDate(workflow.deletedAt)}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
