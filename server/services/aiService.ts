import { GoogleGenAI } from "@google/genai";
import { storage } from "../storage";

type AIProvider = "gemini" | "openai" | "deepseek";

interface AISettings {
  provider: AIProvider;
  geminiModel: string;
  openaiModel: string;
  deepseekModel: string;
  isActive: boolean;
}

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

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.AI_INTEGRATIONS_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Gemini API key not configured");
  }
  
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      apiVersion: "",
      baseUrl: process.env.AI_INTEGRATIONS_GEMINI_BASE_URL,
    },
  });
}

async function generateWithGemini(
  model: string,
  options: GenerateOptions
): Promise<AIResponse> {
  const client = getGeminiClient();
  
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
  options: GenerateOptions
): Promise<AIResponse> {
  const apiKey = process.env.OPENAI_API_KEY;
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
      contentParts.push({
        type: "image_url",
        image_url: {
          url: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`,
        },
      });
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
  options: GenerateOptions
): Promise<AIResponse> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
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

export async function generateContent(options: GenerateOptions & { thinking?: boolean }): Promise<{
  response: AIResponse;
  model: string;
  provider: AIProvider;
}> {
  const settings = await getAISettings();
  
  if (!settings.isActive) {
    throw new Error("AI features are currently disabled by the administrator");
  }

  let model: string;
  let response: AIResponse;

  switch (settings.provider) {
    case "openai":
      model = settings.openaiModel || "gpt-4o";
      response = await generateWithOpenAI(model, options);
      break;
    
    case "deepseek":
      model = settings.deepseekModel || "deepseek-chat";
      response = await generateWithDeepSeek(model, options);
      break;
    
    case "gemini":
    default:
      if (options.thinking) {
        model = "gemini-2.5-pro";
      } else {
        model = settings.geminiModel || "gemini-2.5-flash";
      }
      response = await generateWithGemini(model, options);
      break;
  }

  return { response, model, provider: settings.provider };
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
