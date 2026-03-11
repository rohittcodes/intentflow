"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import { Key, Save, Trash2, Power, PowerOff, Database } from "lucide-react";
import Button from "@/components/ui/shadcn/button";
import { useUser } from "@clerk/nextjs";

export default function SettingsPage() {
  const { user } = useUser();
  const [activeTab, setActiveTab] = useState<'llm-keys' | 'pinecone'>('llm-keys');
  
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
      setApiKey(""); // Clear input on success
    } catch (error: any) {
      toast.error(`Failed to save key: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteKey = async (id: any) => {
    if (confirm("Are you sure you want to delete this API key?")) {
      try {
        await deleteKey({ id });
        toast.success("API key deleted.");
      } catch (error: any) {
        toast.error(`Failed to delete key: ${error.message}`);
      }
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
      setPineconeApiKey(""); // clear plain text key
    } catch (error: any) {
      toast.error(`Failed to save Pinecone config: ${error.message}`);
    } finally {
      setIsSubmittingPinecone(false);
    }
  };

  const handleDeletePinecone = async () => {
    if (confirm("Are you sure you want to delete your Pinecone configuration? RAG workflows will fail until a new one is provided.")) {
      try {
        await deletePinecone();
        setPineconeIndexName("");
        toast.success("Pinecone configuration deleted.");
      } catch (error: any) {
        toast.error(`Failed to delete Pinecone config: ${error.message}`);
      }
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
      className="max-w-4xl mx-auto w-full p-32 space-y-32"
    >
      <div>
        <h1 className="text-title-h3 text-accent-black mb-8">Settings</h1>
        <p className="text-body-medium text-black-alpha-64">Manage your account preferences and API keys.</p>
      </div>

      <div className="flex gap-24 border-b border-black-alpha-8">
        <button
          className={`pb-12 px-2 border-b-2 font-medium text-body-medium transition-all ${activeTab === 'llm-keys' ? 'border-heat-100 text-heat-100' : 'border-transparent text-black-alpha-48 hover:text-black-alpha-80'}`}
          onClick={() => setActiveTab('llm-keys')}
        >
          Model Providers (BYOK)
        </button>
        <button
          className={`pb-12 px-2 border-b-2 font-medium text-body-medium transition-all ${activeTab === 'pinecone' ? 'border-heat-100 text-heat-100' : 'border-transparent text-black-alpha-48 hover:text-black-alpha-80'}`}
          onClick={() => setActiveTab('pinecone')}
        >
          Pinecone (Vector DB)
        </button>
      </div>

      {activeTab === 'llm-keys' && (
        <div className="space-y-32">
          {/* Add Key Section */}
          <div className="bg-white border border-black-alpha-8 rounded-16 p-24 shadow-sm">
            <h3 className="text-label-large text-accent-black mb-8 flex items-center gap-8">
              <Key className="w-20 h-20 text-black-alpha-48" />
              Add Provider Key
            </h3>
            <p className="text-body-medium text-black-alpha-64 mb-24">
              Bring Your Own Key (BYOK) to run workflows using your own LLM provider accounts. 
              Keys are securely encrypted using AES-256-GCM before being stored in the database.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-16 items-start">
              <div className="w-full sm:w-1/3">
                <label className="block text-label-x-small font-medium text-black-alpha-48 mb-4">Provider</label>
                <select 
                  value={provider} 
                  onChange={(e) => setProvider(e.target.value)}
                  className="w-full px-12 py-8 bg-black-alpha-4 border border-black-alpha-8 rounded-8 text-body-medium focus:outline-none focus:border-heat-100 transition-all"
                >
                  {providers.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div className="w-full sm:w-2/3 flex gap-8 items-end">
                <div className="flex-1">
                  <label className="block text-label-x-small font-medium text-black-alpha-48 mb-4">API Key</label>
                  <input 
                    type="password" 
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="sk-..."
                    className="w-full px-12 py-8 bg-black-alpha-4 border border-black-alpha-8 rounded-8 text-body-medium focus:outline-none focus:border-heat-100 transition-all"
                  />
                </div>
                <Button 
                  onClick={handleSaveKey} 
                  disabled={!apiKey.trim() || isSubmitting}
                  className="mb-[1px]"
                >
                  {isSubmitting ? 'Saving...' : <><Save className="w-4 h-4 mr-2" /> Save Key</>}
                </Button>
              </div>
            </div>
          </div>

          {/* Manage Keys Section */}
          <div className="bg-white border border-black-alpha-8 rounded-16 p-24 shadow-sm">
            <h3 className="text-label-large text-accent-black mb-24">Manage Saved Keys</h3>
            
            {llmKeys === undefined ? (
              <div className="text-center py-8 text-muted-foreground text-sm">Loading keys...</div>
            ) : llmKeys.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm border border-dashed border-border-faint rounded-lg">
                No API keys saved yet. Add one above to get started.
              </div>
            ) : (
              <div className="space-y-12">
                {llmKeys.map((key) => {
                  const providerInfo = providers.find(p => p.id === key.provider);
                  return (
                    <div key={key._id} className="flex items-center justify-between p-16 border border-black-alpha-8 rounded-12 bg-black-alpha-4 transition-all hover:bg-black-alpha-8">
                      <div className="flex flex-col gap-4">
                        <div className="flex items-center gap-6">
                          <span className="font-semibold text-body-medium text-accent-black">{providerInfo?.name || key.provider}</span>
                          {key.isActive ? (
                            <span className="px-8 py-2 text-[10px] font-bold bg-green-500/10 text-green-600 rounded-full">ACTIVE</span>
                          ) : (
                            <span className="px-8 py-2 text-[10px] font-bold bg-black-alpha-8 text-black-alpha-40 rounded-full">INACTIVE</span>
                          )}
                        </div>
                        <span className="text-label-x-small text-black-alpha-48 font-mono">
                          {key.keyPrefix}
                        </span>
                        <span className="text-[10px] text-black-alpha-32">
                          Added: {new Date(key.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-12">
                        <Button 
                          variant="secondary"
                          onClick={() => handleToggleKey(key._id)}
                          className={`h-36 w-36 p-0 rounded-8 ${key.isActive ? "text-amber-600 hover:text-amber-700 hover:bg-amber-50" : "text-green-600 hover:text-green-700 hover:bg-green-50"}`}
                        >
                          {key.isActive ? <PowerOff className="w-18 h-18" /> : <Power className="w-18 h-18" />}
                        </Button>
                        <Button 
                          variant="secondary"
                          onClick={() => handleDeleteKey(key._id)}
                          className="h-36 w-36 p-0 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-8"
                        >
                          <Trash2 className="w-18 h-18" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'pinecone' && (
        <div className="space-y-32">
          <div className="bg-white border border-black-alpha-8 rounded-16 p-24 shadow-sm">
            <h3 className="text-label-large text-accent-black mb-8 flex items-center gap-8">
              <Database className="w-20 h-20 text-black-alpha-48" />
              Configure Pinecone RAG Cluster
            </h3>
            <p className="text-body-medium text-black-alpha-64 mb-24 leading-relaxed">
              Connect your Pinecone vector database to enable Retrieval-Augmented Generation (RAG) node workflows. 
              The system will chunk uploaded documents, embed them using the configured LLMs, and store them securely in your dedicated Pinecone Index.
            </p>
            
            <div className="flex flex-col gap-24">
              {pineconeConfig ? (
                <div className="p-24 border border-heat-100/20 bg-heat-100/5 rounded-12 flex justify-between items-center">
                  <div className="space-y-4">
                    <h4 className="text-label-medium text-heat-100 flex items-center gap-8">
                      <span className="w-8 h-8 rounded-full bg-heat-100 animate-pulse"></span>
                      Pinecone Connected
                    </h4>
                    <p className="text-body-small text-black-alpha-56">
                      Index: <span className="font-mono font-semibold">{pineconeConfig.indexName}</span>
                    </p>
                    <p className="text-body-small text-black-alpha-56">
                      Key: <span className="font-mono">{pineconeConfig.keyPrefix}</span>
                    </p>
                  </div>
                  <Button 
                    variant="secondary"
                    onClick={handleDeletePinecone}
                    className="h-44 px-20 text-red-600 hover:text-red-700 hover:bg-red-50 border-black-alpha-8 rounded-8"
                  >
                    <Trash2 className="w-18 h-18 mr-8" /> Disconnect
                  </Button>
                </div>
              ) : (
                <div className="space-y-24">
                  <div className="grid gap-16 md:grid-cols-2">
                    <div className="space-y-8">
                      <label className="block text-label-x-small font-semibold text-black-alpha-48">Pinecone API Key</label>
                      <input 
                        type="password" 
                        value={pineconeApiKey}
                        onChange={(e) => setPineconeApiKey(e.target.value)}
                        placeholder="pcsk_..."
                        className="w-full px-12 py-10 bg-black-alpha-4 border border-black-alpha-8 rounded-8 text-body-medium focus:outline-none focus:border-heat-100 transition-all font-mono"
                      />
                    </div>
                    <div className="space-y-8">
                      <label className="block text-label-x-small font-semibold text-black-alpha-48">Pinecone Index Name</label>
                      <input 
                        type="text" 
                        value={pineconeIndexName}
                        onChange={(e) => setPineconeIndexName(e.target.value)}
                        placeholder="intentflow-rag-index"
                        className="w-full px-12 py-10 bg-black-alpha-4 border border-black-alpha-8 rounded-8 text-body-medium focus:outline-none focus:border-heat-100 transition-all font-mono"
                      />
                    </div>
                  </div>
                  
                  <div className="p-16 bg-black-alpha-4 rounded-8 border-l-4 border-heat-100/40">
                    <p className="text-label-x-small text-black-alpha-48">
                      Ensure this index exists in your Pinecone project and is configured with 1536 dimensions (for OpenAI/Gemini embeddings) and cosine metric.
                    </p>
                  </div>

                  <div className="flex justify-start">
                    <Button 
                      onClick={handleSavePinecone}
                      disabled={isSubmittingPinecone || !pineconeApiKey.trim() || !pineconeIndexName.trim()}
                      className="bg-heat-100 hover:bg-heat-200 text-white px-24 h-44 rounded-8"
                    >
                      {isSubmittingPinecone ? 'Saving...' : <><Save className="w-18 h-18 mr-8" /> Save Configuration</>}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
