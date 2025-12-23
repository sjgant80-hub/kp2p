# Local LLM Build Prompt

## Goal
Browser-native LLM that runs entirely on GitHub Pages. No API keys, no servers.

## Architecture
```
┌─────────────────────────────────────┐
│         GitHub Pages Host           │
│  (static files only, no backend)    │
└─────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────┐
│            Browser                  │
│  ┌─────────────────────────────┐   │
│  │         WebLLM              │   │
│  │  ┌───────────────────────┐  │   │
│  │  │    WebGPU Runtime     │  │   │
│  │  │  (GPU acceleration)   │  │   │
│  │  └───────────────────────┘  │   │
│  │  ┌───────────────────────┐  │   │
│  │  │   Quantized Model     │  │   │
│  │  │  (q4f16, ~500MB-2GB)  │  │   │
│  │  └───────────────────────┘  │   │
│  └─────────────────────────────┘   │
│                 │                   │
│          IndexedDB Cache            │
│    (model stored after 1st load)    │
└─────────────────────────────────────┘
```

## Technology
```
Runtime:   WebLLM (MLC AI)
Inference: WebGPU
Models:    Quantized (q4f16_1)
Cache:     IndexedDB
Size:      500MB - 2GB per model
```

## Available Models
```
TinyLlama-1.1B   ~500MB   Fast, basic
Qwen2-1.5B       ~1GB     Good quality
Phi-3-mini       ~2GB     Strong reasoning
Gemma-2B         ~1.5GB   Google's model
Llama-3.2-3B     ~2GB     Meta's latest
Mistral-7B       ~4GB     Best quality (needs RAM)
```

## Requirements
```
Browser:   Chrome 113+, Edge 113+ (WebGPU)
GPU:       Any modern GPU (integrated works)
RAM:       4-8GB minimum
Storage:   Space for model cache
```

## Usage
```javascript
import { LocalLLM, checkWebGPU } from './llm/local.js';

// Check GPU support
const gpu = await checkWebGPU();
if (!gpu.supported) throw new Error(gpu.error);

// Create LLM
const llm = new LocalLLM({
  model: 'TinyLlama-1.1B',
  onProgress: (p) => console.log(p.message),
  onReady: () => console.log('Ready!'),
});

// Load (downloads on first use)
await llm.load();

// Generate
const response = await llm.generate('Hello!');
console.log(response.text);

// Stream
for await (const chunk of llm.stream('Tell me a story')) {
  process.stdout.write(chunk);
}

// Unload (free memory)
await llm.unload();
```

## Sandbox Integration
```javascript
import { createSandboxedLLM } from './llm/local.js';
import { Sandbox } from './core/sandbox.js';

// LLM with sandboxed system prompt
const llm = createSandboxedLLM({ model: 'Phi-3-mini' });

// Sandbox for tool execution
const sandbox = new Sandbox({ id: 'agent' });
await sandbox.start();

// LLM can only use sandbox tools
// Cannot access: fetch, fs, eval, credentials
```

## Files
```
src/llm/
└─ local.js           # WebLLM wrapper

src/demo/
└─ local-llm-demo.html  # Interactive demo
```

## Why This Works on GitHub Pages
```
1. No server needed (static hosting)
2. Model downloaded from CDN (Hugging Face)
3. Cached in browser IndexedDB
4. Inference runs on user's GPU
5. Zero backend, zero API keys
```
