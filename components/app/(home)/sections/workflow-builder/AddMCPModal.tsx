"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, TestTube, Shield } from "lucide-react";
import { toast } from "sonner";
import { Id } from "@/convex/_generated/dataModel";

export interface MCPServer {
  _id?: Id<"mcpServers">;
  userId?: string;
  name: string;
  url: string;
  description?: string;
  category: string;
  authType: string;
  accessToken?: string;
  tools?: string[];
  connectionStatus?: string;
  lastTested?: string;
  lastError?: string;
  enabled?: boolean;
  isOfficial?: boolean;
  headers?: any;
  createdAt?: string;
  updatedAt?: string;
}

export interface AddMCPModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingServer?: MCPServer | null;
  onSave: (data: {
    name: string;
    url: string;
    description?: string;
    category: string;
    authType: string;
    accessToken?: string;
    tools?: string[];
    headers?: any;
  }) => Promise<void>;
}

export default function AddMCPModal({ isOpen, onClose, onSave, editingServer }: AddMCPModalProps) {
  const [formData, setFormData] = useState({
    name: editingServer?.name || '',
    url: editingServer?.url || '',
    description: editingServer?.description || '',
    category: editingServer?.category || 'custom',
    authType: editingServer?.authType || 'none',
    accessToken: editingServer?.accessToken || ''
  });
  const [isTesting, setIsTesting] = useState(false);
  const [discoveredTools, setDiscoveredTools] = useState<string[] | null>(editingServer?.tools || null);

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden border-border bg-background shadow-2xl">
        <DialogHeader className="px-5 py-3 border-b border-border bg-muted/20">
          <div className="space-y-0.5">
            <DialogTitle className="text-xs font-bold text-foreground text-left">
              {editingServer ? 'Edit MCP Server' : 'Add MCP Server'}
            </DialogTitle>
            <DialogDescription className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest text-left">
              Server registry configuration
            </DialogDescription>
          </div>
        </DialogHeader>

        <div className="px-5 py-5 space-y-4 overflow-y-auto max-h-[70vh] custom-scrollbar">
          <div className="space-y-2">
            <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-1">Name</Label>
            <Input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., My MCP Server"
              className="h-8 text-[11px]"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-1">URL</Label>
            <Input
              type="text"
              value={formData.url}
              onChange={(e) => setFormData({ ...formData, url: e.target.value })}
              placeholder="https://mcp.example.com"
              className="h-8 text-[11px] font-mono"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-1">Description (optional)</Label>
            <Input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Brief description of this MCP server"
              className="h-8 text-[11px]"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-1">Category</Label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 h-8 bg-background border border-border rounded-md text-[11px] text-foreground outline-none focus:ring-1 focus:ring-primary/20 transition-all appearance-none cursor-pointer"
              >
                <option value="web">Web</option>
                <option value="ai">AI</option>
                <option value="data">Data</option>
                <option value="custom">Custom</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-1">Authentication</Label>
              <select
                value={formData.authType}
                onChange={(e) => setFormData({ ...formData, authType: e.target.value })}
                className="w-full px-3 h-8 bg-background border border-border rounded-md text-[11px] text-foreground outline-none focus:ring-1 focus:ring-primary/20 transition-all appearance-none cursor-pointer"
              >
                <option value="none">None</option>
                <option value="api-key">API Key</option>
                <option value="bearer">Bearer Token</option>
                <option value="oauth-coming-soon" disabled>OAuth (Coming Soon)</option>
              </select>
            </div>
          </div>

          {(formData.authType === 'api-key' || formData.authType === 'bearer') && (
            <div className="space-y-2">
              <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-1">
                {formData.authType === 'api-key' ? 'API Key' : 'Bearer Token'}
              </Label>
              <Input
                type="password"
                value={formData.accessToken}
                onChange={(e) => setFormData({ ...formData, accessToken: e.target.value })}
                placeholder={formData.authType === 'api-key' ? 'sk-...' : 'Bearer token'}
                className="h-8 text-[11px] font-mono"
              />
            </div>
          )}

          <Button
            type="button"
            variant="secondary"
            onClick={async () => {
              if (!formData.url) {
                toast.error('Please enter a URL first');
                return;
              }
              setIsTesting(true);
              setDiscoveredTools(null);
              try {
                const response = await fetch('/api/test-mcp-connection', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    url: formData.url,
                    authToken: formData.accessToken,
                  }),
                });
                const result = await response.json();
                if (result.success) {
                  setDiscoveredTools(result.tools || []);
                  toast.success(`Connection successful! ${result.tools?.length || 0} tools discovered`);
                } else {
                  toast.error('Connection failed', {
                    description: result.error || result.details,
                  });
                }
              } catch (error) {
                toast.error('Failed to test connection');
              } finally {
                setIsTesting(false);
              }
            }}
            disabled={isTesting || !formData.url}
            className="w-full h-9 font-bold text-[11px] flex items-center justify-center gap-2"
          >
            {isTesting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Testing...
              </>
            ) : (
              <>
                <TestTube className="w-3.5 h-3.5" />
                Test Connection
              </>
            )}
          </Button>

          {discoveredTools && discoveredTools.length > 0 && (
            <div className="space-y-2">
              <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-1">
                Discovered Tools ({discoveredTools.length})
              </Label>
              <div className="p-3 bg-muted/50 rounded-lg border border-primary/20">
                <div className="flex flex-wrap gap-2">
                  {discoveredTools.map((tool) => (
                    <Badge key={tool} variant="outline" className="bg-background text-primary border-primary/30 text-[10px] font-bold py-0.5 px-2">
                      {tool}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="px-5 py-3 border-t border-border bg-muted/20 flex gap-3">
          <Button
            variant="ghost"
            onClick={onClose}
            className="flex-1 text-[11px] font-bold text-muted-foreground hover:text-foreground h-9"
          >
            Cancel
          </Button>
          <Button
            onClick={() => onSave({
              ...formData,
              tools: discoveredTools || [],
              headers: editingServer?.headers
            })}
            className="flex-1 text-[11px] font-bold h-9 bg-primary hover:bg-primary/90 text-white shadow-sm"
          >
            {editingServer ? 'Update' : 'Add to Registry'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
