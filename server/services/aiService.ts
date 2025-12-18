import { GoogleGenAI } from "@google/genai";
import { storage } from "../storage";
import { decrypt } from "./crypto";

type AIProvider = "gemini" | "openai" | "deepseek";

// Organization AI settings for bring-your-own-key functionality
interface OrgAIConfig {
  useOwnAiKey: boolean;
  aiProvider: AIProvider;
  aiApiKey: string | null;
}

// Cache for organization AI configs (keyed by orgId)
const orgAiConfigCache: Map<string, { config: OrgAIConfig; timestamp: number }> = new Map();
const ORG_CONFIG_CACHE_TTL = 60000;

async function getOrgAIConfig(organizationId: string): Promise<OrgAIConfig | null> {
  const now = Date.now();
  const cached = orgAiConfigCache.get(organizationId);
  if (cached && (now - cached.timestamp) < ORG_CONFIG_CACHE_TTL) {
    return cached.config;
  }

  try {
    const org = await storage.getOrganization(organizationId);
    if (!org) return null;
    
    const config: OrgAIConfig = {
      useOwnAiKey: org.useOwnAiKey === true,
      aiProvider: (org.aiProvider as AIProvider) || "gemini",
      aiApiKey: org.aiApiKey || null,
    };
    
    orgAiConfigCache.set(organizationId, { config, timestamp: now });
    return config;
  } catch (err) {
    console.warn("Failed to fetch org AI config:", err);
    return null;
  }
}

export function invalidateOrgAiConfigCache(organizationId?: string) {
  if (organizationId) {
    orgAiConfigCache.delete(organizationId);
  } else {
    orgAiConfigCache.clear();
  }
}

interface AISettings {
  provider: AIProvider;
  geminiModel: string;
  openaiModel: string;
  deepseekModel: string;
  isActive: boolean;
}

interface CachedKeys {
  gemini?: string;
  openai?: string;
  deepseek?: string;
}

let cachedApiKeys: CachedKeys | null = null;
let keysLastFetched: number = 0;
const KEYS_CACHE_TTL = 60000;

interface GenerateOptions {
  systemPrompt?: string;
  contents: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }>;
  thinking?: boolean;
}

interface UsageMetadata {
  promptTokenCount: number;
  candidatesTokenCount: number;
  totalTokenCount: number;
}

interface AIResponse {
  text: string;
  usageMetadata?: UsageMetadata;
}

const TOKEN_PRICING: Record<string, { input: number; output: number }> = {
  "gemini-2.5-flash": { input: 0.0001, output: 0.0004 },
  "gemini-2.5-pro": { input: 0.0025, output: 0.01 },
  "gemini-2.0-flash": { input: 0.0001, output: 0.0004 },
  "gpt-4o": { input: 0.005, output: 0.015 },
  "gpt-4o-mini": { input: 0.00015, output: 0.0006 },
  "gpt-4-turbo": { input: 0.01, output: 0.03 },
  "deepseek-chat": { input: 0.00027, output: 0.0011 },
  "deepseek-coder": { input: 0.00027, output: 0.0011 },
  "deepseek-reasoner": { input: 0.00055, output: 0.0022 },
};

let cachedSettings: AISettings | null = null;
let settingsLastFetched: number = 0;
const SETTINGS_CACHE_TTL = 60000;

async function getAISettings(): Promise<AISettings> {
  const now = Date.now();
  if (cachedSettings && (now - settingsLastFetched) < SETTINGS_CACHE_TTL) {
    return cachedSettings;
  }

  try {
    const settings = await storage.getAiSettings();
    cachedSettings = {
      provider: (settings?.provider as AIProvider) || "gemini",
      geminiModel: settings?.geminiModel || "gemini-2.5-flash",
      openaiModel: settings?.openaiModel || "gpt-4o",
      deepseekModel: settings?.deepseekModel || "deepseek-chat",
      isActive: settings?.isActive !== false,
    };
    settingsLastFetched = now;
  } catch (err) {
    console.warn("Failed to fetch AI settings, using defaults:", err);
    cachedSettings = {
      provider: "gemini",
      geminiModel: "gemini-2.5-flash",
      openaiModel: "gpt-4o",
      deepseekModel: "deepseek-chat",
      isActive: true,
    };
  }
  
  return cachedSettings;
}

async function getApiKeys(): Promise<CachedKeys> {
  const now = Date.now();
  if (cachedApiKeys && (now - keysLastFetched) < KEYS_CACHE_TTL) {
    return cachedApiKeys;
  }

  try {
    const settings = await storage.getAiSettings();
    cachedApiKeys = {
      gemini: undefined,
      openai: undefined,
      deepseek: undefined,
    };
    
    // Try to get keys from database first (decrypt if stored)
    if (settings?.geminiApiKey) {
      try {
        cachedApiKeys.gemini = decrypt(settings.geminiApiKey);
      } catch (e) {
        console.warn("Failed to decrypt Gemini API key from database");
      }
    }
    if (settings?.openaiApiKey) {
      try {
        cachedApiKeys.openai = decrypt(settings.openaiApiKey);
      } catch (e) {
        console.warn("Failed to decrypt OpenAI API key from database");
      }
    }
    if (settings?.deepseekApiKey) {
      try {
        cachedApiKeys.deepseek = decrypt(settings.deepseekApiKey);
      } catch (e) {
        console.warn("Failed to decrypt DeepSeek API key from database");
      }
    }
    
    // Fall back to environment variables
    if (!cachedApiKeys.gemini) {
      cachedApiKeys.gemini = process.env.AI_INTEGRATIONS_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
    }
    if (!cachedApiKeys.openai) {
      cachedApiKeys.openai = process.env.OPENAI_API_KEY;
    }
    if (!cachedApiKeys.deepseek) {
      cachedApiKeys.deepseek = process.env.DEEPSEEK_API_KEY;
    }
    
    keysLastFetched = now;
  } catch (err) {
    console.warn("Failed to fetch API keys, using env vars:", err);
    cachedApiKeys = {
      gemini: process.env.AI_INTEGRATIONS_GEMINI_API_KEY || process.env.GEMINI_API_KEY,
      openai: process.env.OPENAI_API_KEY,
      deepseek: process.env.DEEPSEEK_API_KEY,
    };
  }
  
  return cachedApiKeys;
}

export function invalidateKeysCache() {
  cachedApiKeys = null;
  keysLastFetched = 0;
}

async function getGeminiClient(customApiKey?: string): Promise<GoogleGenAI> {
  let apiKey = customApiKey;
  
  if (!apiKey) {
    const keys = await getApiKeys();
    apiKey = keys.gemini;
  }
  
  if (!apiKey) {
    throw new Error("Gemini API key not configured");
  }
  
  // If using custom key, don't use the Replit base URL
  const httpOptions = customApiKey 
    ? { apiVersion: "" }
    : { apiVersion: "", baseUrl: process.env.AI_INTEGRATIONS_GEMINI_BASE_URL };
  
  return new GoogleGenAI({
    apiKey,
    httpOptions,
  });
}

async function generateWithGemini(
  model: string,
  options: GenerateOptions,
  customApiKey?: string
): Promise<AIResponse> {
  const client = await getGeminiClient(customApiKey);
  
  const response = await client.models.generateContent({
    model,
    contents: [{ role: "user", parts: options.contents }],
    config: options.systemPrompt ? { systemInstruction: options.systemPrompt } : undefined,
  });

  return {
    text: response.text || "",
    usageMetadata: response.usageMetadata ? {
      promptTokenCount: response.usageMetadata.promptTokenCount || 0,
      candidatesTokenCount: response.usageMetadata.candidatesTokenCount || 0,
      totalTokenCount: response.usageMetadata.totalTokenCount || 0,
    } : undefined,
  };
}

async function generateWithOpenAI(
  model: string,
  options: GenerateOptions,
  customApiKey?: string
): Promise<AIResponse> {
  let apiKey = customApiKey;
  if (!apiKey) {
    const keys = await getApiKeys();
    apiKey = keys.openai;
  }
  if (!apiKey) {
    throw new Error("OpenAI API key not configured");
  }

  const messages: Array<{ role: string; content: any }> = [];
  
  if (options.systemPrompt) {
    messages.push({ role: "system", content: options.systemPrompt });
  }

  const contentParts: any[] = [];
  for (const part of options.contents) {
    if ("text" in part) {
      contentParts.push({ type: "text", text: part.text });
    } else if ("inlineData" in part) {
      // OpenAI only supports image types, skip PDFs and other non-image files
      const mimeType = part.inlineData.mimeType.toLowerCase();
      if (mimeType.startsWith("image/")) {
        contentParts.push({
          type: "image_url",
          image_url: {
            url: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`,
          },
        });
      } else {
        // For non-image files like PDFs, add a note that the file was skipped
        contentParts.push({ 
          type: "text", 
          text: `[Note: A ${mimeType} file was attached but OpenAI doesn't support this file type. Please use Gemini AI provider for PDF analysis.]` 
        });
      }
    }
  }
  
  messages.push({ role: "user", content: contentParts.length === 1 && "text" in options.contents[0] ? options.contents[0].text : contentParts });

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: 4096,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${error}`);
  }

  const data = await response.json();
  return {
    text: data.choices?.[0]?.message?.content || "",
    usageMetadata: data.usage ? {
      promptTokenCount: data.usage.prompt_tokens || 0,
      candidatesTokenCount: data.usage.completion_tokens || 0,
      totalTokenCount: data.usage.total_tokens || 0,
    } : undefined,
  };
}

async function generateWithDeepSeek(
  model: string,
  options: GenerateOptions,
  customApiKey?: string
): Promise<AIResponse> {
  let apiKey = customApiKey;
  if (!apiKey) {
    const keys = await getApiKeys();
    apiKey = keys.deepseek;
  }
  if (!apiKey) {
    throw new Error("DeepSeek API key not configured");
  }

  const messages: Array<{ role: string; content: string }> = [];
  
  if (options.systemPrompt) {
    messages.push({ role: "system", content: options.systemPrompt });
  }

  const textContent = options.contents
    .filter((p): p is { text: string } => "text" in p)
    .map(p => p.text)
    .join("\n\n");
  
  messages.push({ role: "user", content: textContent });

  const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: 4096,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`DeepSeek API error: ${error}`);
  }

  const data = await response.json();
  return {
    text: data.choices?.[0]?.message?.content || "",
    usageMetadata: data.usage ? {
      promptTokenCount: data.usage.prompt_tokens || 0,
      candidatesTokenCount: data.usage.completion_tokens || 0,
      totalTokenCount: data.usage.total_tokens || 0,
    } : undefined,
  };
}

export async function generateContent(options: GenerateOptions & { thinking?: boolean; organizationId?: string }): Promise<{
  response: AIResponse;
  model: string;
  provider: AIProvider;
  usedOrgKey: boolean;
}> {
  const settings = await getAISettings();
  
  if (!settings.isActive) {
    throw new Error("AI features are currently disabled by the administrator");
  }

  let model: string;
  let response: AIResponse;
  let usedOrgKey = false;
  let customApiKey: string | undefined;
  let activeProvider: AIProvider = settings.provider;

  // Check if organization has their own AI key configured
  if (options.organizationId) {
    const orgConfig = await getOrgAIConfig(options.organizationId);
    if (orgConfig && orgConfig.useOwnAiKey && orgConfig.aiApiKey) {
      try {
        // Decrypt the org's API key
        customApiKey = decrypt(orgConfig.aiApiKey);
        activeProvider = orgConfig.aiProvider;
        usedOrgKey = true;
      } catch (err) {
        console.warn("Failed to decrypt org API key, falling back to system key:", err);
      }
    }
  }

  switch (activeProvider) {
    case "openai":
      model = settings.openaiModel || "gpt-4o";
      response = await generateWithOpenAI(model, options, customApiKey);
      break;
    
    case "deepseek":
      model = settings.deepseekModel || "deepseek-chat";
      response = await generateWithDeepSeek(model, options, customApiKey);
      break;
    
    case "gemini":
    default:
      if (options.thinking) {
        model = "gemini-2.5-pro";
      } else {
        model = settings.geminiModel || "gemini-2.5-flash";
      }
      response = await generateWithGemini(model, options, customApiKey);
      break;
  }

  return { response, model, provider: activeProvider, usedOrgKey };
}

export function getPricing(model: string): { input: number; output: number } {
  return TOKEN_PRICING[model] || { input: 0.0001, output: 0.0004 };
}

export function calculateCost(
  model: string,
  promptTokens: number,
  completionTokens: number
): number {
  const pricing = getPricing(model);
  return (promptTokens / 1000 * pricing.input) + (completionTokens / 1000 * pricing.output);
}

export function invalidateSettingsCache(): void {
  cachedSettings = null;
  settingsLastFetched = 0;
}
