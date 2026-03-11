"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import { Key, Save, Trash2, Power, PowerOff, Database, Loader2, Info } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";

export default function SettingsPage() {
  const { user } = useUser();
  
  // LLM Keys State
  const [provider, setProvider] = useState<string>("openai");
  const [apiKey, setApiKey] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [pineconeApiKey, setPineconeApiKey] = useState("");
  const [pineconeIndexName, setPineconeIndexName] = useState("");
  const [isSubmittingPinecone, setIsSubmittingPinecone] = useState(false);

  // Fetch keys
  const llmKeys = useQuery(api.userLLMKeys.getUserLLMKeys, 
    user?.id ? {} : "skip"
  );
  
  // Fetch Pinecone
  const pineconeConfig = useQuery(api.pineconeConnectors.getPineconeConfig,
    user?.id ? {} : "skip"
  );

  const upsertKey = useMutation(api.userLLMKeys.upsertLLMKey);
  const deleteKey = useMutation(api.userLLMKeys.deleteLLMKey);
  const toggleKey = useMutation(api.userLLMKeys.toggleKeyActive);

  const handleSaveKey = async () => {
    if (!apiKey.trim()) {
      toast.error("Please enter an API key");
      return;
    }

    setIsSubmitting(true);
    try {
      await upsertKey({
        provider,
        apiKey: apiKey.trim(),
      });
      toast.success(`${provider} API key saved successfully.`);
      setApiKey(""); 
    } catch (error: any) {
      toast.error(`Failed to save key: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteKey = async (id: any) => {
    try {
      await deleteKey({ id });
      toast.success("API key deleted.");
    } catch (error: any) {
      toast.error(`Failed to delete key: ${error.message}`);
    }
  };

  const handleToggleKey = async (id: any) => {
    try {
      await toggleKey({ id });
    } catch (error: any) {
      toast.error(`Failed to toggle key: ${error.message}`);
    }
  };

  const upsertPinecone = useMutation(api.pineconeConnectors.upsertPineconeConfig);
  const deletePinecone = useMutation(api.pineconeConnectors.deletePineconeConfig);

  const handleSavePinecone = async () => {
    if (!pineconeApiKey.trim() || !pineconeIndexName.trim()) {
      toast.error("Please enter both API key and Index Name");
      return;
    }

    setIsSubmittingPinecone(true);
    try {
      await upsertPinecone({
        apiKey: pineconeApiKey.trim(),
        indexName: pineconeIndexName.trim(),
      });
      toast.success("Pinecone configuration saved successfully.");
      setPineconeApiKey(""); 
    } catch (error: any) {
      toast.error(`Failed to save Pinecone config: ${error.message}`);
    } finally {
      setIsSubmittingPinecone(false);
    }
  };

  const handleDeletePinecone = async () => {
    try {
      await deletePinecone();
      setPineconeIndexName("");
      toast.success("Pinecone configuration deleted.");
    } catch (error: any) {
      toast.error(`Failed to delete Pinecone config: ${error.message}`);
    }
  };

  const providers = [
    { id: "openai", name: "OpenAI" },
    { id: "anthropic", name: "Anthropic" },
    { id: "groq", name: "Groq" },
    { id: "google", name: "Google Gemini" }
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="w-full pb-8"
    >
      <PageHeader title="Settings" />

      <Tabs defaultValue="llm-keys" className="space-y-8">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="llm-keys">Model Providers (BYOK)</TabsTrigger>
          <TabsTrigger value="pinecone">Pinecone (Vector DB)</TabsTrigger>
        </TabsList>

        <TabsContent value="llm-keys" className="space-y-8">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg font-bold">
                <Key className="h-5 w-5 text-muted-foreground" />
                Add Provider Key
              </CardTitle>
              <CardDescription className="text-xs">
                Bring Your Own Key (BYOK) to run workflows using your own LLM provider accounts. 
                Keys are securely encrypted using AES-256-GCM.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="w-full sm:w-1/3 space-y-2">
                  <Label htmlFor="provider" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Provider</Label>
                  <Select value={provider} onValueChange={setProvider}>
                    <SelectTrigger id="provider" className="h-10">
                      <SelectValue placeholder="Select provider" />
                    </SelectTrigger>
                    <SelectContent>
                      {providers.map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-full sm:w-2/3 space-y-2">
                  <Label htmlFor="apiKey" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">API Key</Label>
                  <div className="flex gap-2">
                    <Input 
                      id="apiKey"
                      type="password" 
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="sk-..."
                      className="flex-1 h-10"
                    />
                    <Button 
                      className="h-10 px-6 font-bold"
                      onClick={handleSaveKey} 
                      disabled={!apiKey.trim() || isSubmitting}
                    >
                      {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Save className="h-4 w-4 mr-2" /> Save</>}
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-bold">Manage Saved Keys</CardTitle>
            </CardHeader>
            <CardContent>
              {llmKeys === undefined ? (
                <div className="flex items-center justify-center py-12 text-muted-foreground text-xs">
                  <Loader2 className="h-6 w-6 animate-spin mr-3 opacity-50" /> Loading your keys...
                </div>
              ) : llmKeys.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed rounded-xl bg-muted/20">
                  <Key className="h-10 w-10 text-muted-foreground/30 mb-4" />
                  <p className="text-sm font-medium text-muted-foreground">No API keys saved yet.</p>
                  <p className="text-[10px] text-muted-foreground italic mt-1">Add one above to get started with custom models.</p>
                </div>
              ) : (
                <div className="grid gap-3">
                  {llmKeys.map((key) => {
                    const providerInfo = providers.find(p => p.id === key.provider);
                    return (
                      <div key={key._id} className="group relative flex items-center justify-between p-4 border rounded-xl bg-background hover:border-primary/50 hover:shadow-sm transition-all">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm tracking-tight">{providerInfo?.name || key.provider}</span>
                            <Badge variant={key.isActive ? "default" : "secondary"} className="text-[9px] font-bold tracking-widest px-1.5 h-4">
                              {key.isActive ? "ACTIVE" : "INACTIVE"}
                            </Badge>
                          </div>
                          <span className="text-[10px] text-muted-foreground font-mono bg-muted/50 px-1.5 py-0.5 rounded w-fit">
                            {key.keyPrefix}
                          </span>
                          <span className="text-[9px] text-muted-foreground/60 font-medium">
                            Linked: {new Date(key.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-1">
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => handleToggleKey(key._id)}
                            className={cn(
                              "h-9 w-9 rounded-lg transition-all",
                              key.isActive ? "text-primary hover:bg-primary/10" : "text-muted-foreground hover:bg-muted"
                            )}
                          >
                            {key.isActive ? <Power className="h-4.5 w-4.5" /> : <PowerOff className="h-4.5 w-4.5" />}
                          </Button>
                          
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all">
                                <Trash2 className="h-4.5 w-4.5" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete API Key?</AlertDialogTitle>
                                <AlertDialogDescription className="text-sm">
                                  This will permanently remove the <span className="font-bold text-foreground">{providerInfo?.name || key.provider}</span> key from your account. 
                                  Workflows using this provider may fail unless you have an alternative key.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteKey(key._id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                  Delete Permanently
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pinecone" className="space-y-8">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg font-bold">
                <Database className="h-5 w-5 text-muted-foreground" />
                Vector Database
              </CardTitle>
              <CardDescription className="text-xs leading-relaxed">
                Connect your Pinecone instance to enable Knowledge Base persistence and semantic search capabilities across your workflows.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {pineconeConfig ? (
                <div className="p-6 border rounded-xl bg-background hover:shadow-md transition-all flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)] animate-pulse" />
                      <span className="text-sm font-bold tracking-tight">Status: Connected</span>
                      <Badge variant="outline" className="text-[9px] font-bold tracking-widest bg-green-500/5 text-green-600 border-green-500/20">STABLE</Badge>
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest w-20">Index</span>
                        <code className="text-[11px] font-bold bg-muted px-2 py-0.5 rounded text-foreground">{pineconeConfig.indexName}</code>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest w-20">API Key</span>
                        <code className="text-[11px] tracking-tight bg-muted/50 px-2 py-0.5 rounded font-mono text-muted-foreground">{pineconeConfig.keyPrefix}</code>
                      </div>
                    </div>
                  </div>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" className="h-9 px-4 text-xs font-bold border-destructive/20 text-destructive hover:bg-destructive/10 hover:border-destructive transition-all">
                        Disconnect Cluster
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Disconnect Pinecone?</AlertDialogTitle>
                        <AlertDialogDescription className="text-sm">
                          RAG and Knowledge Base features will stop working immediately. 
                          Your data in Pinecone will NOT be deleted, but the link will be removed.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeletePinecone} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                          Disconnect Now
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              ) : (
                <div className="grid gap-6">
                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="pineconeApiKey" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">API Key</Label>
                      <Input 
                        id="pineconeApiKey"
                        type="password" 
                        value={pineconeApiKey}
                        onChange={(e) => setPineconeApiKey(e.target.value)}
                        placeholder="pcsk_..."
                        className="h-10 font-mono text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="pineconeIndexName" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Index Name</Label>
                      <Input 
                        id="pineconeIndexName"
                        type="text" 
                        value={pineconeIndexName}
                        onChange={(e) => setPineconeIndexName(e.target.value)}
                        placeholder="e.g. documentation-index"
                        className="h-10 text-sm font-medium"
                      />
                    </div>
                  </div>
                  
                  <div className="p-4 bg-muted/30 rounded-xl border border-border/50 flex gap-3">
                    <Info className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Recommended: Use an index with <span className="font-bold text-foreground">1536 dimensions</span> (OpenAI/Gemini) and <span className="font-bold text-foreground">cosine metric</span> for optimal semantic search performance.
                    </p>
                  </div>

                  <Button 
                    onClick={handleSavePinecone}
                    className="w-full sm:w-fit h-10 px-8 font-bold"
                    disabled={isSubmittingPinecone || !pineconeApiKey.trim() || !pineconeIndexName.trim()}
                  >
                    {isSubmittingPinecone ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Save className="h-4 w-4 mr-2" /> Connect Cluster</>}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}
