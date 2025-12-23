/**
 * @file src/llm/local.js
 * @desc Local LLM runtime using WebLLM (browser-native, no API keys)
 *
 * Uses WebLLM's prebuilt model list dynamically - no hardcoding needed.
 * Models are downloaded from HuggingFace on first use and cached.
 *
 * REQUIREMENTS:
 * - Browser with WebGPU support (Chrome 113+, Edge 113+)
 * - HTTPS (for Cache API)
 */

// WebLLM from CDN
const WEBLLM_CDN = 'https://esm.run/@mlc-ai/web-llm';

// Cache for WebLLM module
let webllmModule = null;

/**
 * Get WebLLM module (cached)
 */
async function getWebLLM() {
  if (!webllmModule) {
    webllmModule = await import(WEBLLM_CDN);
  }
  return webllmModule;
}

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

    let adapterInfo = 'WebGPU Adapter';
    try {
      if (adapter.requestAdapterInfo) {
        const info = await adapter.requestAdapterInfo();
        adapterInfo = (info.vendor || '') + ' ' + (info.architecture || '');
      }
    } catch (e) {}

    return {
      supported: true,
      adapter: adapterInfo.trim() || 'WebGPU Adapter',
    };
  } catch (err) {
    return { supported: false, error: err.message };
  }
}

/**
 * Get list of available models from WebLLM
 */
export async function getAvailableModels() {
  try {
    const webllm = await getWebLLM();
    const config = webllm.prebuiltAppConfig;

    if (!config || !config.model_list) {
      throw new Error('Could not load model list');
    }

    // Filter and categorize models
    const models = config.model_list
      .filter(m => m.model_id && !m.model_id.includes('embed')) // Skip embedding models
      .map(m => ({
        id: m.model_id,
        name: m.model_id.replace(/-MLC.*$/, '').replace(/-q[0-9].*$/, ''),
        size: estimateSize(m.model_id),
        vram: m.vram_required_MB || 0,
      }));

    // Group by size
    return {
      tiny: models.filter(m => m.size === 'tiny'),
      small: models.filter(m => m.size === 'small'),
      medium: models.filter(m => m.size === 'medium'),
      large: models.filter(m => m.size === 'large'),
      all: models,
    };
  } catch (e) {
    console.error('Failed to get models:', e);
    return { tiny: [], small: [], medium: [], large: [], all: [] };
  }
}

/**
 * Estimate model size category
 */
function estimateSize(modelId) {
  const id = modelId.toLowerCase();
  if (id.includes('135m') || id.includes('360m') || id.includes('0.5b') || id.includes('0.6b')) return 'tiny';
  if (id.includes('1b') || id.includes('1.1b') || id.includes('1.5b') || id.includes('1.6b') || id.includes('1.7b') || id.includes('2b')) return 'small';
  if (id.includes('3b') || id.includes('4b')) return 'medium';
  return 'large';
}

/**
 * Recommended models (known to work well)
 */
export const RECOMMENDED_MODELS = [
  { id: 'SmolLM2-360M-Instruct-q4f16_1-MLC', name: 'SmolLM2 360M', size: 'tiny' },
  { id: 'Qwen2.5-0.5B-Instruct-q4f16_1-MLC', name: 'Qwen2.5 0.5B', size: 'tiny' },
  { id: 'TinyLlama-1.1B-Chat-v1.0-q4f16_1-MLC', name: 'TinyLlama 1.1B', size: 'small' },
  { id: 'Qwen2.5-1.5B-Instruct-q4f16_1-MLC', name: 'Qwen2.5 1.5B', size: 'small' },
  { id: 'Llama-3.2-1B-Instruct-q4f16_1-MLC', name: 'Llama 3.2 1B', size: 'small' },
  { id: 'Llama-3.2-3B-Instruct-q4f16_1-MLC', name: 'Llama 3.2 3B', size: 'medium' },
  { id: 'Phi-3.5-mini-instruct-q4f16_1-MLC', name: 'Phi 3.5 Mini', size: 'medium' },
  { id: 'Mistral-7B-Instruct-v0.3-q4f16_1-MLC', name: 'Mistral 7B', size: 'large' },
];

export const DEFAULT_MODEL = 'SmolLM2-360M-Instruct-q4f16_1-MLC';

/**
 * Local LLM instance
 */
export class LocalLLM {
  constructor(options = {}) {
    this.modelId = options.model || DEFAULT_MODEL;
    this.engine = null;
    this.loading = false;
    this.ready = false;
    this.onProgress = options.onProgress || (() => {});
    this.onReady = options.onReady || (() => {});
    this.systemPrompt = options.systemPrompt || 'You are a helpful AI assistant.';
  }

  /**
   * Load model
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

      this.onProgress({ stage: 'init', message: 'Initializing WebLLM...', progress: 0 });

      const webllm = await getWebLLM();

      this.onProgress({ stage: 'init', message: `Loading ${this.modelId}...`, progress: 0.1 });

      // Create engine with the model ID directly
      this.engine = await webllm.CreateMLCEngine(this.modelId, {
        initProgressCallback: (progress) => {
          this.onProgress({
            stage: 'download',
            message: progress.text || 'Loading...',
            progress: progress.progress || 0,
            text: progress.text,
          });
        },
      });

      this.ready = true;
      this.loading = false;
      this.onProgress({ stage: 'ready', message: 'Ready', progress: 1 });
      this.onReady();

      return true;
    } catch (err) {
      this.loading = false;
      console.error('Model load error:', err);
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

    if (options.history) {
      messages.splice(1, 0, ...options.history);
    }

    const response = await this.engine.chat.completions.create({
      messages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 512,
      stream: false,
    });

    return response.choices[0]?.message?.content || '';
  }

  /**
   * Chat with message history
   */
  async chat(messages, options = {}) {
    if (!this.ready) {
      await this.load();
    }

    const response = await this.engine.chat.completions.create({
      messages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 512,
      stream: false,
    });

    return response.choices[0]?.message?.content || '';
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

    const stream = await this.engine.chat.completions.create({
      messages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 512,
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) yield content;
    }
  }

  /**
   * Unload model
   */
  async unload() {
    if (this.engine) {
      try {
        await this.engine.unload();
      } catch (e) {}
      this.engine = null;
    }
    this.ready = false;
  }
}

export default LocalLLM;
