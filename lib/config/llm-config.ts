/**
 * LLM Configuration
 *
 * Configure available LLM providers and models
 * API keys are still in .env.local for security
 */

export interface LLMModel {
  id: string;
  name: string;
  provider: 'anthropic' | 'openai' | 'groq' | 'google';
  contextWindow: number;
  inputCostPer1M: number;
  outputCostPer1M: number;
  supportsJSON: boolean;
  supportsMCP: boolean;
  maxTokens: number;
  description?: string;
  useCases?: string[];
}

export interface LLMProvider {
  id: string;
  name: string;
  envKey: string;
  models: LLMModel[];
  defaultModel: string;
}

/**
 * LLM Providers Configuration
 */
export const llmProviders: LLMProvider[] = [
  {
    id: 'anthropic',
    name: 'Anthropic',
    envKey: 'ANTHROPIC_API_KEY',
    defaultModel: 'claude-sonnet-4-5-20250929',
    models: [
      {
        id: 'claude-sonnet-4-5-20250929',
        name: 'Claude Sonnet 4.5',
        provider: 'anthropic',
        contextWindow: 200000,
        inputCostPer1M: 3.00,
        outputCostPer1M: 15.00,
        supportsJSON: true,
        supportsMCP: true,
        maxTokens: 8192,
        description: 'Most capable model, best for complex tasks',
        useCases: ['Reasoning', 'Function Calling / Tool Use', 'Text to Text', 'Vision', 'Multilingual'],
      },
      {
        id: 'claude-haiku-4-5',
        name: 'Claude Haiku 4.5',
        provider: 'anthropic',
        contextWindow: 200000,
        inputCostPer1M: 1.00,
        outputCostPer1M: 5.00,
        supportsJSON: true,
        supportsMCP: true,
        maxTokens: 8192,
        description: 'Latest Haiku - fastest, matches Sonnet 4 on coding & agents',
        useCases: ['Reasoning', 'Function Calling / Tool Use', 'Text to Text', 'Multilingual'],
      },
    ],
  },
  {
    id: 'openai',
    name: 'OpenAI',
    envKey: 'OPENAI_API_KEY',
    defaultModel: 'gpt-4o',
    models: [
      {
        id: 'gpt-4o',
        name: 'GPT-5',
        provider: 'openai',
        contextWindow: 128000,
        inputCostPer1M: 2.50,
        outputCostPer1M: 10.00,
        supportsJSON: true,
        supportsMCP: true,
        maxTokens: 16384,
        description: 'Multimodal flagship model with function calling',
        useCases: ['Reasoning', 'Function Calling / Tool Use', 'Text to Text', 'Vision', 'Multilingual'],
      },
      {
        id: 'gpt-4o-mini',
        name: 'GPT-5 Mini',
        provider: 'openai',
        contextWindow: 128000,
        inputCostPer1M: 0.15,
        outputCostPer1M: 0.60,
        supportsJSON: true,
        supportsMCP: true,
        maxTokens: 16384,
        description: 'Affordable and fast with function calling',
        useCases: ['Reasoning', 'Function Calling / Tool Use', 'Text to Text', 'Multilingual'],
      },
    ],
  },
  {
    id: 'groq',
    name: 'Groq',
    envKey: 'GROQ_API_KEY',
    defaultModel: 'gpt-oss-120b',
    models: [
      {
        id: 'gpt-oss-120b',
        name: 'GPT OSS 120B',
        provider: 'groq',
        contextWindow: 128000,
        inputCostPer1M: 0.20,
        outputCostPer1M: 0.20,
        supportsJSON: true,
        supportsMCP: true,
        maxTokens: 32768,
        description: 'Larger Responses API model with MCP support',
        useCases: ['Reasoning', 'Function Calling / Tool Use', 'Text to Text', 'Multilingual'],
      },
      {
        id: 'gpt-oss-20b',
        name: 'GPT OSS 20B',
        provider: 'groq',
        contextWindow: 128000,
        inputCostPer1M: 0.05,
        outputCostPer1M: 0.05,
        supportsJSON: true,
        supportsMCP: true,
        maxTokens: 32768,
        description: 'Smaller footprint GPT OSS model',
        useCases: ['Reasoning', 'Function Calling / Tool Use', 'Text to Text', 'Multilingual'],
      },
      {
        id: 'qwen-3-32b',
        name: 'Qwen 3 32B',
        provider: 'groq',
        contextWindow: 32000,
        inputCostPer1M: 0.10,
        outputCostPer1M: 0.10,
        supportsJSON: true,
        supportsMCP: true,
        maxTokens: 8192,
        description: 'Qwen 3 32B model',
        useCases: ['Reasoning', 'Function Calling / Tool Use'],
      },
      {
        id: 'llama-4-scout',
        name: 'Llama 4 Scout',
        provider: 'groq',
        contextWindow: 128000,
        inputCostPer1M: 0.10,
        outputCostPer1M: 0.10,
        supportsJSON: true,
        supportsMCP: true,
        maxTokens: 8192,
        description: 'Llama 4 Scout model',
        useCases: ['Function Calling / Tool Use', 'Text to Text', 'Vision', 'Multilingual'],
      },
      {
        id: 'kimi-k2',
        name: 'Kimi K2',
        provider: 'groq',
        contextWindow: 64000,
        inputCostPer1M: 0.10,
        outputCostPer1M: 0.10,
        supportsJSON: true,
        supportsMCP: true,
        maxTokens: 8192,
        description: 'Kimi K2 model',
        useCases: ['Function Calling / Tool Use', 'Text to Text', 'Multilingual'],
      },
      {
        id: 'llama-3.3-70b',
        name: 'Llama 3.3 70B',
        provider: 'groq',
        contextWindow: 128000,
        inputCostPer1M: 0.10,
        outputCostPer1M: 0.10,
        supportsJSON: true,
        supportsMCP: true,
        maxTokens: 8192,
        description: 'Llama 3.3 70B model',
        useCases: ['Text to Text', 'Multilingual'],
      },
      {
        id: 'elevenlabs-tts',
        name: 'ElevenLabs TTS',
        provider: 'groq',
        contextWindow: 8192,
        inputCostPer1M: 0,
        outputCostPer1M: 0,
        supportsJSON: false,
        supportsMCP: false,
        maxTokens: 8192,
        description: 'High quality text to speech',
        useCases: ['Text to Speech'],
      },
      {
        id: 'orpheus-english',
        name: 'Orpheus English',
        provider: 'groq',
        contextWindow: 8192,
        inputCostPer1M: 0,
        outputCostPer1M: 0,
        supportsJSON: false,
        supportsMCP: false,
        maxTokens: 8192,
        description: 'Orpheus English text to speech',
        useCases: ['Text to Speech'],
      },
      {
        id: 'orpheus-arabic-saudi',
        name: 'Orpheus Arabic Saudi',
        provider: 'groq',
        contextWindow: 8192,
        inputCostPer1M: 0,
        outputCostPer1M: 0,
        supportsJSON: false,
        supportsMCP: false,
        maxTokens: 8192,
        description: 'Orpheus Arabic Saudi text to speech',
        useCases: ['Text to Speech'],
      },
      {
        id: 'whisper-large-v3',
        name: 'Whisper Large v3',
        provider: 'groq',
        contextWindow: 2048,
        inputCostPer1M: 0,
        outputCostPer1M: 0,
        supportsJSON: true,
        supportsMCP: false,
        maxTokens: 2048,
        description: 'Speech to text transcription',
        useCases: ['Speech to Text', 'Multilingual'],
      },
      {
        id: 'whisper-large-v3-turbo',
        name: 'Whisper Large v3 Turbo',
        provider: 'groq',
        contextWindow: 2048,
        inputCostPer1M: 0,
        outputCostPer1M: 0,
        supportsJSON: true,
        supportsMCP: false,
        maxTokens: 2048,
        description: 'Fast speech to text transcription',
        useCases: ['Speech to Text'],
      },
      {
        id: 'safety-gpt-oss-20b',
        name: 'Safety GPT OSS 20B',
        provider: 'groq',
        contextWindow: 128000,
        inputCostPer1M: 0.05,
        outputCostPer1M: 0.05,
        supportsJSON: true,
        supportsMCP: false,
        maxTokens: 8192,
        description: 'Safety / Content Moderation',
        useCases: ['Safety / Content Moderation'],
      },
    ],
  },
  {
    id: 'google',
    name: 'Google Gemini',
    envKey: 'GOOGLE_GENERATIVE_AI_API_KEY',
    defaultModel: 'gemini-2.5-pro',
    models: [
      {
        id: 'gemini-2.5-pro',
        name: 'Gemini 2.5 Pro',
        provider: 'google',
        contextWindow: 2000000,
        inputCostPer1M: 1.25,
        outputCostPer1M: 5.00,
        supportsJSON: true,
        supportsMCP: true,
        maxTokens: 8192,
        description: 'Most capable Gemini model',
        useCases: ['Reasoning', 'Function Calling / Tool Use', 'Text to Text', 'Vision', 'Multilingual'],
      },
      {
        id: 'gemini-2.5-flash',
        name: 'Gemini 2.5 Flash',
        provider: 'google',
        contextWindow: 1000000,
        inputCostPer1M: 0.075,
        outputCostPer1M: 0.30,
        supportsJSON: true,
        supportsMCP: true,
        maxTokens: 8192,
        description: 'Fast and versatile Gemini model',
        useCases: ['Reasoning', 'Function Calling / Tool Use', 'Text to Text', 'Vision', 'Multilingual'],
      },
    ],
  },
];

/**
 * Get default model for a provider
 */
export function getDefaultModel(provider: 'anthropic' | 'openai' | 'groq' | 'google'): string {
  const config = llmProviders.find(p => p.id === provider);
  return config?.defaultModel || '';
}

/**
 * Get all models for a provider
 */
export function getModelsForProvider(provider: 'anthropic' | 'openai' | 'groq' | 'google'): LLMModel[] {
  const config = llmProviders.find(p => p.id === provider);
  return config?.models || [];
}

/**
 * Get model info by full ID (provider/model-id)
 */
export function getModelInfo(fullModelId: string): LLMModel | null {
  const [provider, modelId] = fullModelId.split('/');
  const providerConfig = llmProviders.find(p => p.id === provider);
  if (!providerConfig) return null;

  return providerConfig.models.find(m => m.id === modelId) || null;
}

/**
 * Format model ID for API calls
 */
export function formatModelId(provider: string, modelId: string): string {
  return `${provider}/${modelId}`;
}

/**
 * Get all available models (flattened)
 */
export function getAllModels(): Array<LLMModel & { fullId: string }> {
  return llmProviders.flatMap(provider =>
    provider.models.map(model => ({
      ...model,
      fullId: `${provider.id}/${model.id}`,
    }))
  );
}

/**
 * Check if provider API key is configured
 */
export function isProviderConfigured(provider: 'anthropic' | 'openai' | 'groq' | 'google'): boolean {
  const config = llmProviders.find(p => p.id === provider);
  if (!config) return false;

  // This only works server-side
  if (typeof process === 'undefined') return false;

  return !!process.env[config.envKey];
}

/**
 * Get configured providers
 */
export function getConfiguredProviders(): string[] {
  return llmProviders
    .filter(p => isProviderConfigured(p.id as any))
    .map(p => p.id);
}
