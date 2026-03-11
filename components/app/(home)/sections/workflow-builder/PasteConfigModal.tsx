"use client";

import { useState } from "react";
import { AlertCircle, Loader2, ExternalLink, X } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

interface PasteConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (servers: any[]) => Promise<void>;
}

export default function PasteConfigModal({ isOpen, onClose, onSave }: PasteConfigModalProps) {
  const [configJSON, setConfigJSON] = useState('');
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const parseAndSave = async () => {
    setParsing(true);
    setError('');

    try {
      // Parse the JSON
      const config = JSON.parse(configJSON);

      // Extract MCP servers from Cursor/Cline format
      const servers: any[] = [];

      if (config.mcpServers) {
        for (const [serverName, serverConfig] of Object.entries(config.mcpServers)) {
          const typedConfig = serverConfig as any;

          // Determine the server type and URL
          let name = serverName;
          let url = '';
          let category = 'custom';
          let authType = 'none';
          let accessToken = '';
          let description = '';
          let headers: any = null;

          // Check if it's a direct URL configuration (like Context7)
          if (typedConfig.url) {
            url = typedConfig.url;

            // Handle headers-based authentication
            if (typedConfig.headers) {
              headers = typedConfig.headers;
              authType = 'api-key';

              // Extract API key from headers
              const headerKeys = Object.keys(typedConfig.headers);
              if (headerKeys.length > 0) {
                // Find the key that contains API_KEY
                const apiKeyHeader = headerKeys.find(key => key.includes('API_KEY')) || headerKeys[0];
                accessToken = typedConfig.headers[apiKeyHeader];
              }
            }

            // Identify known services by URL or name
            if (serverName.includes('rube') || url.includes('rube.app/mcp')) {
              name = 'Rube MCP';
              category = 'web';
              description = 'Web scraping, searching, and data extraction';
            } else if (serverName.includes('context7') || url.includes('context7')) {
              name = 'Context7';
              category = 'ai';
              description = 'Documentation and code assistance';
            } else if (serverName.includes('firecrawl') || url.includes('firecrawl')) {
              name = 'Firecrawl';
              category = 'web';
              description = 'Web scraping, searching, and data extraction';
            }

          } else if (typedConfig.command === 'npx' && typedConfig.args) {
            // Handle npx-style configurations (Firecrawl, etc.)
            const packageName = typedConfig.args.find((arg: string) => arg !== '-y' && !arg.startsWith('-'));

            // Identify known MCPs
            if (packageName === 'firecrawl-mcp' || serverName.includes('firecrawl')) {
              name = 'Firecrawl';
              category = 'web';
              authType = 'api-key';
              description = 'Web scraping, searching, and data extraction';

              // Extract API key from env
              if (typedConfig.env?.FIRECRAWL_API_KEY) {
                accessToken = typedConfig.env.FIRECRAWL_API_KEY;
                url = `https://mcp.firecrawl.dev/${accessToken}/v2/mcp`;
              } else {
                url = 'https://mcp.firecrawl.dev/{FIRECRAWL_API_KEY}/v2/mcp';
              }
            } else {
              // Generic MCP server
              name = packageName || serverName;
              url = `npx -y ${packageName || serverName}`;

              // Check for API keys in env
              if (typedConfig.env) {
                const envKeys = Object.keys(typedConfig.env);
                if (envKeys.length > 0) {
                  authType = 'api-key';
                  // Take the first API key found
                  accessToken = typedConfig.env[envKeys[0]];
                }
              }
            }
          } else {
            // Unsupported format, skip
            console.warn(`Skipping unsupported MCP config format for ${serverName}`, typedConfig);
            continue;
          }

          servers.push({
            name: name.replace(/-mcp$/, '').replace(/mcp-/, '').replace(/-/g, ' ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
            url,
            description,
            category,
            authType,
            accessToken,
            headers,
            tools: [], // Will be discovered on test
          });
        }
      }

      if (servers.length === 0) {
        throw new Error('No MCP servers found in configuration');
      }

      // Save all servers (onSave will handle testing)
      await onSave(servers);

      // Don't show success here as onSave will show individual results
      onClose();
      setConfigJSON('');

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid JSON configuration');
    } finally {
      setParsing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl p-0 gap-0 overflow-hidden border-border bg-background shadow-2xl">
        <DialogHeader className="px-6 py-4 border-b border-border bg-muted/30">
          <DialogTitle className="text-sm font-bold text-foreground text-left">
            Paste MCP Configuration
          </DialogTitle>
          <DialogDescription className="text-[11px] text-muted-foreground">
            Paste your Cursor/Cline MCP configuration JSON below
          </DialogDescription>
        </DialogHeader>

        <div className="p-6 space-y-4 overflow-y-auto max-h-[70vh] custom-scrollbar">
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                Configuration JSON
              </Label>
              <a
                href="https://www.firecrawl.dev/app"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] text-primary hover:underline flex items-center gap-1 font-medium transition-colors"
              >
                See example config
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <textarea
              value={configJSON}
              onChange={(e) => setConfigJSON(e.target.value)}
              placeholder={`// Example 1 - Direct URL format (Context7):
{
  "mcpServers": {
    "context7": {
      "url": "https://mcp.context7.com/mcp",
      "headers": {
        "CONTEXT7_API_KEY": "your-api-key"
      }
    }
  }
}

// Example 2 - NPX format (Firecrawl):
{
  "mcpServers": {
    "firecrawl-mcp": {
      "command": "npx",
      "args": ["-y", "firecrawl-mcp"],
      "env": {
        "FIRECRAWL_API_KEY": "your-api-key"
      }
    }
  }
}`}
              className="w-full h-[250px] px-3 py-2 bg-background border border-border rounded-lg text-xs text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary/30 transition-all resize-none"
              spellCheck={false}
            />
          </div>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-600 rounded-md">
              <p className="text-[11px] font-medium leading-relaxed">{error}</p>
            </div>
          )}

          <div className="p-4 bg-muted/30 rounded-lg border border-border/50">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-primary/10 rounded-md text-primary">
                <AlertCircle className="w-4 h-4" />
              </div>
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-foreground">Supported Formats</h4>
                <div className="text-[11px] text-muted-foreground leading-relaxed space-y-1">
                  <p>• Direct URL with headers (Context7, etc.)</p>
                  <p>• NPX command format (Firecrawl, Cursor, Cline)</p>
                  <p className="pt-1 text-primary/70 font-medium italic">💡 Tip: Copy your MCP config from your editor's settings.json file</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-border bg-muted/30 flex gap-3">
          <Button
            variant="ghost"
            onClick={onClose}
            className="flex-1 text-xs font-bold text-muted-foreground hover:text-foreground h-10"
          >
            Cancel
          </Button>
          <Button
            onClick={parseAndSave}
            disabled={!configJSON.trim() || parsing}
            className="flex-1 text-xs font-bold h-10"
          >
            {parsing ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Importing & Testing...
              </>
            ) : (
              'Import & Test'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
