
"use client";


import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useMemo } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Workflow } from "@/lib/workflow/types";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Key, Copy, Plus, Loader2, RefreshCw, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface TestEndpointPanelProps {
  workflowId: string;
  workflow: Workflow | null;
  environment: 'draft' | 'production';
  onClose: () => void;
}

export default function TestEndpointPanel({ workflowId, workflow, environment, onClose }: TestEndpointPanelProps) {
  // Get user's API keys
  const apiKeys = useQuery(api.apiKeys.list, {});
  const generateKey = useMutation(api.apiKeys.generate); // Added generate mutation
  const firstKey = apiKeys?.[0];

  // Try to get the full API key from localStorage (only available if just generated)
  const [fullApiKey, setFullApiKey] = useState<string | null>(null);

  // API Key Generation State
  const [isGenerating, setIsGenerating] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [generatedDetails, setGeneratedDetails] = useState<{ key: string, name: string } | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedKey = sessionStorage.getItem('latest_api_key');
      if (storedKey) {
        setFullApiKey(storedKey);
      }
    }
  }, [apiKeys]);

  // Get input variables from the workflow's start node
  const startNode = workflow?.nodes.find(n => (n.data as any)?.nodeType === 'start');
  const inputVariables = (startNode?.data as any)?.inputVariables || [];

  // Generate default payload from input variables
  const defaultPayload = useMemo(() => {
    if (inputVariables.length === 0) {
      return { input: "https://firecrawl.dev" };
    }
    return inputVariables.reduce((acc: any, v: any) => {
      acc[v.name] = v.defaultValue || '';
      return acc;
    }, {});
  }, [inputVariables, workflow?.id]);

  const [input, setInput] = useState(JSON.stringify(defaultPayload, null, 2));
  const [response, setResponse] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState("curl");

  // Update input when workflow changes
  useEffect(() => {
    setInput(JSON.stringify(defaultPayload, null, 2));
  }, [defaultPayload, workflowId]);

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const endpointUrl = `${baseUrl}/api/workflows/${workflowId}/execute`;
  const streamUrl = `${baseUrl}/api/workflows/${workflowId}/execute-stream`;

  const parsedInput = useMemo(() => {
    try {
      return input && input.trim().length > 0 ? JSON.parse(input) : defaultPayload;
    } catch {
      return defaultPayload;
    }
  }, [input, defaultPayload]);

  const requestBodyMinified = useMemo(
    () => JSON.stringify({ input: parsedInput }),
    [parsedInput],
  );

  const requestBodyPretty = useMemo(
    () => JSON.stringify({ input: parsedInput }, null, 2),
    [parsedInput],
  );

  const handleCopy = async (key: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedKey(key);
      setTimeout(() => {
        setCopiedKey((current) => (current === key ? null : current));
      }, 1500);
    } catch (copyError) {
      console.error("Failed to copy code block", copyError);
    }
  };

  const handleGenerateKey = async () => {
    if (!newKeyName.trim()) {
      toast.error('Please enter a key name');
      return;
    }

    setIsGenerating(true);
    try {
      const result = await generateKey({ name: newKeyName.trim() });
      setGeneratedDetails({ key: result.key, name: newKeyName.trim() });
      setFullApiKey(result.key); // Use this new key for examples instantly
      setNewKeyName("");

      // Store in sessionStorage
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('latest_api_key', result.key);
      }

      toast.success('API key generated successfully');
    } catch (err) {
      toast.error('Failed to generate API key');
    } finally {
      setIsGenerating(false);
    }
  };

  // Use full API key if available (from recent generation), otherwise show placeholder
  const apiKeyToUse = fullApiKey || 'YOUR_API_KEY_HERE';
  const hasRealKey = !!fullApiKey;

  const apiKeyHeader = `  -H "Authorization: Bearer ${apiKeyToUse}" \\`;

  const curlStandard = `curl -X POST ${endpointUrl} \\
${apiKeyHeader}
  -H "Content-Type: application/json" \\
  -d '${requestBodyMinified.replace(/'/g, "'\\''")}'`;

  const curlStreaming = `curl -N -X POST ${streamUrl} \\
${apiKeyHeader}
  -H "Content-Type: application/json" \\
  -H "Accept: text/event-stream" \\
  -d '${requestBodyMinified.replace(/'/g, "'\\''")}'`;

  const apiKeyForCode = apiKeyToUse;

  const tsExample = `import fetch from 'node-fetch';

const payload = ${requestBodyPretty};

const response = await fetch('${endpointUrl}', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ${apiKeyForCode}' // Your API key
  },
  body: JSON.stringify(payload),
});

const result = await response.json();
console.log(result);

// Streaming example
const streamResponse = await fetch('${streamUrl}', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'Accept': 'text/event-stream' },
  body: JSON.stringify(payload),
});

const reader = streamResponse.body?.getReader();
const decoder = new TextDecoder();

while (reader) {
  const { value, done } = await reader.read();
  if (done) break;
  console.log(decoder.decode(value));
}`;

  const pythonExample = `import requests
import json

payload = ${requestBodyPretty}

# Standard request
response = requests.post(
    "${endpointUrl}",
    headers={"Content-Type": "application/json"},
    data=json.dumps(payload),
)
print(response.json())

# Streaming request
with requests.post(
    "${streamUrl}",
    headers={"Content-Type": "application/json", "Accept": "text/event-stream"},
    data=json.dumps(payload),
    stream=True,
) as r:
    for line in r.iter_lines():
        if line:
            print(line.decode())`;


  const handleTest = async () => {
    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      // Parse input to validate JSON
      let parsedInput;
      try {
        parsedInput = JSON.parse(input);
      } catch (e) {
        setError('Invalid JSON in request body');
        setLoading(false);
        return;
      }

      // API expects { input: <input variables object> }
      const requestBody = {
        input: parsedInput,
      };

      const res = await fetch(endpointUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const data = await res.json();
      setResponse(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-accent-white w-full max-w-[340px] overflow-x-hidden">
      {/* Header */}
      <div className="p-3 px-4 border-b border-border flex-shrink-0">
        <div className="flex items-center justify-between">
          <h2 className="text-[11px] font-bold text-foreground font-medium uppercase tracking-wider">Endpoint</h2>
        </div>
        <p className="text-[10px] text-muted-foreground">
          Test your workflow API endpoint
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2 w-full max-w-[340px]">
        {/* API Key Generation Section */}
        <div className="bg-background">
          <h3 className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">API Access</h3>

          {generatedDetails ? (
            <div className="p-2 bg-secondary border border-primary rounded-md mb-2 animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-start gap-1.5 mb-1.5">
                <Key className="w-16 h-16 text-primary flex-shrink-0 mt-2" />
                <div className="flex-1">
                  <p className="text-xs text-foreground font-medium mb-1">
                    Key generated successfully!
                  </p>
                  <p className="text-[10px] text-foreground/64 mb-4">
                    Make sure to copy it now. You won't be able to see it again.
                  </p>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-foreground uppercase tracking-wider block">API Key</label>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 px-3 py-2 bg-white border border-border rounded-md text-sm font-mono text-foreground break-all">
                        {generatedDetails.key}
                      </code>
                      <Button
                        size="sm"
                        onClick={() => handleCopy('new-key', generatedDetails.key)}
                        className="h-8 px-3 bg-accent-black hover:bg-accent-black/90 text-white rounded-md text-xs font-medium transition-all active:scale-[0.98] flex items-center gap-2 flex-shrink-0"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        {copiedKey === 'new-key' ? 'Copied' : 'Copy'}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
              <Button
                variant="link"
                size="sm"
                onClick={() => setGeneratedDetails(null)}
                className="text-xs text-foreground/64 hover:text-foreground p-0 h-auto font-normal underline ml-32"
              >
                Done, I've saved it
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex gap-1.5">
                <Input
                  type="text"
                  placeholder="Key Name (e.g. Production App)"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  className="flex-1 h-10 bg-white border border-border text-xs text-foreground placeholder:text-black-alpha-32 focus-visible:ring-1 focus-visible:ring-accent-black transition-colors"
                  onKeyDown={(e) => e.key === 'Enter' && handleGenerateKey()}
                />
                <Button
                  size="sm"
                  onClick={handleGenerateKey}
                  disabled={isGenerating || !newKeyName.trim()}
                  className="h-10 bg-primary hover:bg-primary/90 text-white rounded-md text-xs font-medium transition-all active:scale-[0.98] flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isGenerating && (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  )}
                  Generate Key
                </Button>
              </div>
              {apiKeys && apiKeys.length > 0 && (
                <p className="text-[10px] text-muted-foreground flex items-center gap-4">
                  <Key className="w-10 h-10" />
                  You have {apiKeys.length} active API key{apiKeys.length !== 1 ? 's' : ''}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Endpoint URL */}
        <div>
          <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">
            Endpoint URL
          </label>
          <div className="px-1.5 py-1 bg-background border border-border rounded-md text-[12px] text-foreground font-mono break-all whitespace-normal">
            {endpointUrl}
          </div>
        </div>

        {/* Request Body */}
        <div>
          <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">
            Input Payload
          </label>
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            rows={3}
            className="w-full min-h-[60px] p-1.5 bg-gray-900 text-white border border-border rounded-md text-[11px] font-mono focus-visible:ring-1 focus-visible:ring-accent-black transition-colors resize-none"
          />
        </div>

        {/* Expected Output Schema */}
        {(() => {
          // Find the last node before the end node that has output
          const endNode = workflow?.nodes.find(n => (n.data as any)?.nodeType === 'end');
          if (!endNode) return null;

          // Find edges that connect to the end node
          const edgesToEnd = workflow?.edges.filter(e => e.target === endNode.id);
          if (!edgesToEnd || edgesToEnd.length === 0) return null;

          // Get the last node before end
          const lastNodeId = edgesToEnd[0]?.source;
          const lastNode = workflow?.nodes.find(n => n.id === lastNodeId);
          if (!lastNode) return null;

          const nodeData = lastNode.data as any;
          const outputSchema = nodeData?.jsonOutputSchema;

          if (outputSchema) {
            return (
              <div>
                <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">
                  Expected Output Schema
                </label>
                <div className="p-2 bg-secondary rounded-md border border-primary">
                  <p className="text-[10px] text-primary mb-1.5">
                    This workflow returns structured JSON matching this schema:
                  </p>
                  <pre className="text-xs text-foreground font-mono whitespace-pre-wrap break-all overflow-y-auto max-h-[200px]">
                    {typeof outputSchema === 'string' ? outputSchema : JSON.stringify(outputSchema, null, 2)}
                  </pre>
                </div>
              </div>
            );
          }

          return null;
        })()}

        {/* Code Examples */}
        <div className="space-y-1.5">
          {/* API Key Notice */}
          {!hasRealKey && (
            <div className="p-2 bg-secondary border border-primary rounded-md">
              <p className="text-xs text-foreground">
                <strong>Note:</strong> Replace <code className="p-1 bg-white rounded text-xs font-mono">YOUR_API_KEY_HERE</code> with your actual API key from Settings.
              </p>
            </div>
          )}

          {hasRealKey && (
            <div className="p-2 bg-secondary border border-primary rounded-md">
              <p className="text-xs text-foreground">
                <strong>Ready to use!</strong> Your API key is included in the examples below.
              </p>
            </div>
          )}


          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Example Code</label>
              <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
                <SelectTrigger className="w-[140px] h-8 text-[11px] bg-background border-border">
                  <SelectValue placeholder="Select Language" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="curl" className="text-[11px]">cURL</SelectItem>
                  <SelectItem value="curl-stream" className="text-[11px]">Streaming cURL</SelectItem>
                  <SelectItem value="ts" className="text-[11px]">TypeScript</SelectItem>
                  <SelectItem value="python" className="text-[11px]">Python</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="relative group">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const val = selectedLanguage === 'curl' ? curlStandard
                    : selectedLanguage === 'curl-stream' ? curlStreaming
                      : selectedLanguage === 'ts' ? tsExample // Changed from tsCode to tsExample based on original content
                        : pythonExample; // Changed from pythonCode to pythonExample based on original content
                  handleCopy(selectedLanguage, val);
                }}
                className="absolute top-2 right-2 h-7 px-2 bg-accent-white hover:bg-[#f4f4f5] border border-border rounded-md text-[10px] text-foreground transition-all shadow-sm gap-1.5 opacity-0 group-hover:opacity-100 z-10"
              >
                <Copy className="w-3 h-3" />
                {copiedKey === selectedLanguage ? 'Copied' : 'Copy'}
              </Button>
              <pre className="px-3 py-2.5 bg-background text-foreground rounded-md text-xs font-mono whitespace-pre overflow-x-auto max-h-[320px] border border-border">
                {selectedLanguage === 'curl' ? curlStandard
                  : selectedLanguage === 'curl-stream' ? curlStreaming
                    : selectedLanguage === 'ts' ? tsExample // Changed from tsCode to tsExample
                      : pythonExample} {/* Changed from pythonCode to pythonExample */}
              </pre>
            </div>
          </div>
        </div>

        {/* Response */}
        {error && (
          <div className="p-2 bg-secondary rounded-xl border border-border">
            <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Error</h3>
            <pre className="text-xs text-foreground whitespace-pre-wrap">
              {error}
            </pre>
          </div>
        )}

        {response && (
          <div>
            <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">
              Response
            </label>
            <div className="p-2 bg-gray-900 rounded-md border border-border">
              <pre className="text-[10px] text-white font-mono whitespace-pre-wrap break-all overflow-y-auto max-h-[300px]">
                {JSON.stringify(response, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
