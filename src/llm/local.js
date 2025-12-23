/**
 * @file src/llm/local.js
 * @desc Local LLM runtime using WebLLM (browser-native, no API keys)
 *
 * ARCHITECTURE:
 * - Runs entirely in browser via WebGPU
 * - Models cached in IndexedDB OR loaded from repo
 * - No external API calls needed
 * - Works on GitHub Pages
 *
 * REQUIREMENTS:
 * - Browser with WebGPU support (Chrome 113+, Edge 113+)
 * - ~2-4GB RAM for small models
 *
 * LOCAL MODEL SETUP:
 *   bash scripts/setup-model.sh
 */

// WebLLM from CDN
const WEBLLM_CDN = 'https://esm.run/@mlc-ai/web-llm';

// Local model base URL (relative to page)
const LOCAL_MODEL_URL = '../../models/tinyllama/';

// Available models
export const MODELS = {
  // Repo-hosted model (use this if you ran setup-model.sh)
  'TinyLlama-Local': { local: true, path: LOCAL_MODEL_URL },

  // CDN models (downloaded from HuggingFace on first use)
  'TinyLlama-1.1B': 'TinyLlama-1.1B-Chat-v1.0-q4f16_1-MLC',
  'Phi-3-mini': 'Phi-3-mini-4k-instruct-q4f16_1-MLC',
  'Qwen2-1.5B': 'Qwen2-1.5B-Instruct-q4f16_1-MLC',
  'Gemma-2B': 'gemma-2b-it-q4f16_1-MLC',
  'Llama-3.2-3B': 'Llama-3.2-3B-Instruct-q4f16_1-MLC',
  'Mistral-7B': 'Mistral-7B-Instruct-v0.3-q4f16_1-MLC',
};

// Default model
export const DEFAULT_MODEL = 'TinyLlama-1.1B';

/**
 * Check if WebGPU is available
 */
export async function checkWebGPU() {
  if (!navigator.gpu) {
    return { supported: false, error: 'WebGPU not available in this browser' };
  }

  try {
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) {
      return { supported: false, error: 'No WebGPU adapter found' };
    }

    const device = await adapter.requestDevice();
    const info = await adapter.requestAdapterInfo();

    return {
      supported: true,
      adapter: info.vendor + ' ' + info.architecture,
      device: info.description || 'WebGPU Device',
    };
  } catch (err) {
    return { supported: false, error: err.message };
  }
}

/**
 * Local LLM instance
 */
export class LocalLLM {
  constructor(options = {}) {
    this.modelId = options.model || DEFAULT_MODEL;
    this.modelConfig = MODELS[this.modelId];
    this.engine = null;
    this.loading = false;
    this.ready = false;
    this.onProgress = options.onProgress || (() => {});
    this.onReady = options.onReady || (() => {});
    this.systemPrompt = options.systemPrompt || 'You are a helpful AI assistant running locally in the browser.';
  }

  /**
   * Check if local model is available
   */
  async checkLocalModel() {
    if (!this.modelConfig?.local) return false;
    try {
      const res = await fetch(this.modelConfig.path + 'mlc-chat-config.json', { method: 'HEAD' });
      return res.ok;
    } catch {
      return false;
    }
  }

  /**
   * Load model (from repo or downloads on first use)
   */
  async load() {
    if (this.ready) return;
    if (this.loading) return;

    this.loading = true;

    try {
      // Check WebGPU
      const gpu = await checkWebGPU();
      if (!gpu.supported) {
        throw new Error(gpu.error);
      }

      this.onProgress({ stage: 'init', message: 'Initializing WebLLM...' });

      // Dynamic import WebLLM
      const webllm = await import(WEBLLM_CDN);

      // Check if using local model
      if (this.modelConfig?.local) {
        const localAvailable = await this.checkLocalModel();
        if (localAvailable) {
          this.onProgress({ stage: 'init', message: 'Loading from local repo...' });

          // Use local model path
          this.engine = await webllm.CreateMLCEngine(this.modelConfig.path, {
            initProgressCallback: (progress) => {
              this.onProgress({
                stage: 'load',
                message: progress.text,
                progress: progress.progress,
              });
            },
          });
        } else {
          // Fallback to CDN
          this.onProgress({ stage: 'init', message: 'Local model not found, using CDN...' });
          this.engine = await webllm.CreateMLCEngine('TinyLlama-1.1B-Chat-v1.0-q4f16_1-MLC', {
            initProgressCallback: (progress) => {
              this.onProgress({
                stage: 'download',
                message: progress.text,
                progress: progress.progress,
              });
            },
          });
        }
      } else {
        // Use CDN model
        this.engine = await webllm.CreateMLCEngine(this.modelConfig, {
          initProgressCallback: (progress) => {
            this.onProgress({
              stage: 'download',
              message: progress.text,
              progress: progress.progress,
            });
          },
        });
      }

      this.ready = true;
      this.loading = false;
      this.onReady();

      return true;
    } catch (err) {
      this.loading = false;
      throw err;
    }
  }

  /**
   * Generate completion
   */
  async generate(prompt, options = {}) {
    if (!this.ready) {
      await this.load();
    }

    const messages = [
      { role: 'system', content: this.systemPrompt },
      { role: 'user', content: prompt },
    ];

    // Add conversation history if provided
    if (options.history) {
      messages.splice(1, 0, ...options.history);
    }

    const response = await this.engine.chat.completions.create({
      messages,
      max_tokens: options.maxTokens || 512,
      temperature: options.temperature || 0.7,
      top_p: options.topP || 0.95,
      stream: false,
    });

    return {
      text: response.choices[0].message.content,
      usage: response.usage,
    };
  }

  /**
   * Stream generation
   */
  async *stream(prompt, options = {}) {
    if (!this.ready) {
      await this.load();
    }

    const messages = [
      { role: 'system', content: this.systemPrompt },
      { role: 'user', content: prompt },
    ];

    if (options.history) {
      messages.splice(1, 0, ...options.history);
    }

    const stream = await this.engine.chat.completions.create({
      messages,
      max_tokens: options.maxTokens || 512,
      temperature: options.temperature || 0.7,
      stream: true,
    });

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) {
        yield delta;
      }
    }
  }

  /**
   * Get model info
   */
  getInfo() {
    return {
      modelId: this.modelId,
      modelName: this.modelName,
      ready: this.ready,
      loading: this.loading,
    };
  }

  /**
   * Unload model (free memory)
   */
  async unload() {
    if (this.engine) {
      await this.engine.unload();
      this.engine = null;
      this.ready = false;
    }
  }
}

/**
 * Create LLM with sandbox integration
 */
export function createSandboxedLLM(options = {}) {
  const llm = new LocalLLM(options);

  // Sandboxed system prompt
  llm.systemPrompt = `You are an AI assistant running locally in a sandboxed browser environment.

CAPABILITIES (allowed):
- Respond to user questions
- Help with coding, writing, analysis
- Use provided tools: memory_get, memory_set, compute, send_message

RESTRICTIONS (blocked):
- Cannot access the internet (no fetch, no external APIs)
- Cannot access files (no filesystem)
- Cannot execute arbitrary code (no eval)
- Cannot access credentials or secrets

Always be helpful within these constraints. If asked to do something outside your capabilities, explain what you can and cannot do.`;

  return llm;
}

export default LocalLLM;
