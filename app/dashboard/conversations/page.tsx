"use client";

import { motion } from "framer-motion";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useUser } from "@clerk/nextjs";
import { 
  MessageSquare, 
  Clock, 
  ExternalLink, 
  MoreHorizontal,
  Search,
  Filter,
  Loader2,
  User
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function ConversationsPage() {
  const { user } = useUser();
  const threads = useQuery(api.threads.listThreads, 
    user?.id ? { userId: user.id } : "skip"
  );

  if (threads === undefined) {
    return (
      <div className="flex h-[400px] items-center justify-center text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin mr-2" />
        Loading conversations...
      </div>
    );
  }

  if (threads === null) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="pb-8 space-y-8"
    >
      <PageHeader title="Conversations" />

      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search sessions..." className="pl-9 h-9" />
        </div>
        <Button variant="outline" size="sm" className="h-9">
          <Filter className="mr-2 h-4 w-4" />
          Filter
        </Button>
      </div>

      <div className="grid gap-4">
        {threads.length > 0 ? (
          threads.map((thread: any) => (
            <Card key={thread._id} className="border-border hover:bg-muted/10 transition-colors group">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <MessageSquare className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm tracking-tight">
                        {thread.title || `Conversation ${thread._id.slice(-4)}`}
                      </span>
                      <Badge variant="secondary" className="text-[10px] h-4 py-0 font-bold uppercase tracking-widest px-1.5">
                        {thread.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-muted-foreground font-medium">
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {thread.extThreadId || "Anonymous User"}
                      </span>
                      <span className="w-1 h-1 rounded-full bg-border" />
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Last active {new Date(thread.lastMessageAt).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="hidden md:flex flex-col items-end mr-4">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Workflow</span>
                    <span className="text-xs font-semibold">{thread.workflowName}</span>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem className="gap-2">
                        <ExternalLink className="h-4 w-4" />
                        View Thread
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive gap-2">
                        Archive Session
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed rounded-2xl bg-muted/10">
            <div className="h-12 w-12 rounded-full bg-muted/20 flex items-center justify-center mb-4">
              <MessageSquare className="h-6 w-6 text-muted-foreground/40" />
            </div>
            <h3 className="font-bold text-lg">No sessions found</h3>
            <p className="text-muted-foreground text-sm max-w-xs">Once you embed your chatbot or workflow, user conversations will appear here.</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
