/**
 * llmService.ts — 3-Tier LLM Failover for Kalam Spark Mobile
 *
 * Tier 1: OpenRouter API (Gemma 4 31B) — cloud, fast
 * Tier 2: Google AI Studio (Gemma 4 31B) — cloud, backup
 * Tier 3: Cactus on-device (Gemma 4 Q2_K GGUF) — offline, local
 *
 * The service automatically falls through tiers when one fails.
 */

import { initLlama, LlamaContext } from 'llama.rn';
import RNFS from 'react-native-fs';
import axios from 'axios';

// ── Config ──
const OPENROUTER_API_KEY = ''; // Set via app settings or .env
const GEMINI_API_KEY = '';     // Set via app settings or .env
const BACKEND_URL = 'http://10.0.2.2:8000'; // Android emulator → host machine

const OPENROUTER_MODEL = 'google/gemma-4-31b-it:free';
const OPENROUTER_FALLBACK = 'google/gemma-4-26b-it:free';
const GEMINI_MODEL = 'gemma-4-31b-it';

// ── Cactus (on-device) config ──
const MODEL_FILENAME = 'google_gemma-4-E2B-it-Q2_K.gguf';
const MODEL_PATH = `${RNFS.DocumentDirectoryPath}/models/${MODEL_FILENAME}`;

let cachedContext: LlamaContext | null = null;
let apiKeys = { openrouter: OPENROUTER_API_KEY, gemini: GEMINI_API_KEY };

// ──────────────────────────────────────────────
// Public API
// ──────────────────────────────────────────────

/**
 * Set API keys at runtime (from app settings screen)
 */
export function setApiKeys(openrouter: string, gemini: string) {
  apiKeys = { openrouter, gemini };
}

/**
 * Set the backend URL at runtime
 */
let backendUrl = BACKEND_URL;
export function setBackendUrl(url: string) {
  backendUrl = url;
}

/**
 * Check if the GGUF model file exists on-device
 */
export async function isModelDownloaded(): Promise<boolean> {
  return await RNFS.exists(MODEL_PATH);
}

/**
 * Get the expected model path for manual copy
 */
export function getModelPath(): string {
  return MODEL_PATH;
}

/**
 * Copy a GGUF model file from a source path to the app's model directory.
 * Use this after the user selects the file via a document picker.
 */
export async function importModel(sourcePath: string): Promise<void> {
  const modelsDir = `${RNFS.DocumentDirectoryPath}/models`;
  if (!(await RNFS.exists(modelsDir))) {
    await RNFS.mkdir(modelsDir);
  }
  await RNFS.copyFile(sourcePath, MODEL_PATH);
  console.log(`[Cactus] Model imported to ${MODEL_PATH}`);
}

/**
 * Initialize the Cactus llama.cpp context (loads model into memory).
 * Call once during app startup or when switching to offline mode.
 */
export async function initCactusModel(): Promise<boolean> {
  try {
    if (cachedContext) return true;

    const exists = await isModelDownloaded();
    if (!exists) {
      console.warn('[Cactus] Model file not found at:', MODEL_PATH);
      return false;
    }

    console.log('[Cactus] Loading Gemma 4 Q2_K model...');
    cachedContext = await initLlama({
      model: MODEL_PATH,
      n_ctx: 2048,       // Context window
      n_threads: 4,       // Use 4 CPU threads (good for 8GB RAM phones)
      n_gpu_layers: 0,    // CPU-only for maximum compatibility
      use_mlock: false,   // Don't lock memory (avoids OOM on constrained devices)
    });

    console.log('[Cactus] ✓ Model loaded successfully');
    return true;
  } catch (err) {
    console.error('[Cactus] Failed to load model:', err);
    cachedContext = null;
    return false;
  }
}

/**
 * Release the Cactus context to free memory.
 */
export async function releaseCactusModel(): Promise<void> {
  if (cachedContext) {
    await cachedContext.release();
    cachedContext = null;
    console.log('[Cactus] Model released from memory');
  }
}

// ──────────────────────────────────────────────
// Core: 3-Tier LLM Call
// ──────────────────────────────────────────────

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * Main entry point: send messages through the 3-tier failover pipeline.
 *
 * Flow: OpenRouter → Google AI Studio → Cactus (on-device)
 */
export async function callLLM(
  messages: ChatMessage[],
  options: {
    maxTokens?: number;
    temperature?: number;
    jsonMode?: boolean;
  } = {}
): Promise<string> {
  const { maxTokens = 1500, temperature = 0.7, jsonMode = false } = options;

  // ── Tier 1: OpenRouter ──
  if (apiKeys.openrouter) {
    try {
      const result = await callOpenRouter(messages, maxTokens, temperature, jsonMode);
      if (result) return result;
    } catch (err) {
      console.warn('[LLM] OpenRouter failed:', err);
    }
  }

  // ── Tier 2: Google AI Studio ──
  if (apiKeys.gemini) {
    try {
      const result = await callGemini(messages, maxTokens, temperature, jsonMode);
      if (result) return result;
    } catch (err) {
      console.warn('[LLM] Google AI Studio failed:', err);
    }
  }

  // ── Tier 3: Cactus (on-device Gemma 4 Q2_K) ──
  try {
    const result = await callCactus(messages, maxTokens, temperature);
    if (result) return result;
  } catch (err) {
    console.error('[LLM] Cactus on-device failed:', err);
  }

  throw new Error(
    'All AI providers failed. Check your API keys or ensure the Gemma 4 GGUF model is loaded.'
  );
}

/**
 * Check if we can run offline (model is loaded in memory)
 */
export function isOfflineReady(): boolean {
  return cachedContext !== null;
}

// ──────────────────────────────────────────────
// Tier 1: OpenRouter
// ──────────────────────────────────────────────

async function callOpenRouter(
  messages: ChatMessage[],
  maxTokens: number,
  temperature: number,
  jsonMode: boolean
): Promise<string> {
  const body: any = {
    model: OPENROUTER_MODEL,
    messages,
    max_tokens: maxTokens,
    temperature,
  };
  if (jsonMode) {
    body.response_format = { type: 'json_object' };
  }

  try {
    const resp = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      body,
      {
        headers: {
          Authorization: `Bearer ${apiKeys.openrouter}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://kalam-spark.app',
          'X-Title': 'Kalam Spark Mobile',
        },
        timeout: 60000,
      }
    );
    const text = resp.data.choices[0].message.content.trim();
    console.log(`[LLM] OpenRouter ✓ (${text.length} chars)`);
    return text;
  } catch (err) {
    // Try fallback model
    console.warn('[LLM] OpenRouter primary failed, trying fallback...');
    body.model = OPENROUTER_FALLBACK;
    const resp = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      body,
      {
        headers: {
          Authorization: `Bearer ${apiKeys.openrouter}`,
          'Content-Type': 'application/json',
        },
        timeout: 60000,
      }
    );
    const text = resp.data.choices[0].message.content.trim();
    console.log(`[LLM] OpenRouter fallback ✓ (${text.length} chars)`);
    return text;
  }
}

// ──────────────────────────────────────────────
// Tier 2: Google AI Studio
// ──────────────────────────────────────────────

async function callGemini(
  messages: ChatMessage[],
  maxTokens: number,
  temperature: number,
  jsonMode: boolean
): Promise<string> {
  // Separate system and conversation messages for Gemini format
  let systemMessage = '';
  const contents: any[] = [];

  for (const m of messages) {
    if (m.role === 'system') {
      systemMessage = m.content;
    } else {
      contents.push({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }],
      });
    }
  }

  const genConfig: any = { maxOutputTokens: maxTokens, temperature };
  if (jsonMode) {
    genConfig.responseMimeType = 'application/json';
  }

  const body: any = { contents, generationConfig: genConfig };
  if (systemMessage) {
    body.systemInstruction = { role: 'system', parts: [{ text: systemMessage }] };
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKeys.gemini}`;
  const resp = await axios.post(url, body, { timeout: 60000 });
  const text = resp.data.candidates[0].content.parts[0].text.trim();
  console.log(`[LLM] Google AI Studio ✓ (${text.length} chars)`);
  return text;
}

// ──────────────────────────────────────────────
// Tier 3: Cactus (On-Device Gemma 4 Q2_K)
// ──────────────────────────────────────────────

async function callCactus(
  messages: ChatMessage[],
  maxTokens: number,
  temperature: number
): Promise<string> {
  if (!cachedContext) {
    const loaded = await initCactusModel();
    if (!loaded) {
      throw new Error('Cactus model not available');
    }
  }

  console.log('[LLM] Using on-device Gemma 4 Q2_K via Cactus...');

  // Build a flat prompt from the messages (Gemma chat template)
  const prompt = messages
    .map((m) => {
      if (m.role === 'system') return `<start_of_turn>user\nSystem: ${m.content}<end_of_turn>`;
      if (m.role === 'user') return `<start_of_turn>user\n${m.content}<end_of_turn>`;
      return `<start_of_turn>model\n${m.content}<end_of_turn>`;
    })
    .join('\n') + '\n<start_of_turn>model\n';

  const result = await cachedContext!.completion({
    prompt,
    n_predict: maxTokens,
    temperature,
    top_p: 0.9,
    stop: ['<end_of_turn>', '<start_of_turn>'],
  });

  const text = result.text.trim();
  console.log(`[LLM] Cactus on-device ✓ (${text.length} chars)`);
  return text;
}

// ──────────────────────────────────────────────
// Backend API Proxy (for features needing server: RAG, TTS, crawling)
// ──────────────────────────────────────────────

/**
 * Call the FastAPI backend for server-side features.
 * Used for: roadmap generation (needs web crawling), File Speaker (needs TTS), etc.
 */
export async function callBackendAPI(
  endpoint: string,
  params: Record<string, string> = {},
  method: 'GET' | 'POST' = 'GET',
  body?: any
): Promise<any> {
  const url = `${backendUrl}${endpoint}`;
  try {
    const resp =
      method === 'GET'
        ? await axios.get(url, { params, timeout: 120000 })
        : await axios.post(url, body, { params, timeout: 120000 });
    return resp.data;
  } catch (err) {
    console.error(`[API] Backend call failed: ${endpoint}`, err);
    throw err;
  }
}
