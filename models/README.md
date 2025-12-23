# Local Models

Store LLM models here for offline/local use.

## Quick Setup: TinyLlama (~600MB)

```bash
# From repo root:
cd models

# Download TinyLlama-1.1B (q4f16 quantized)
git clone https://huggingface.co/mlc-ai/TinyLlama-1.1B-Chat-v1.0-q4f16_1-MLC tinyllama

# Or manually download from:
# https://huggingface.co/mlc-ai/TinyLlama-1.1B-Chat-v1.0-q4f16_1-MLC/tree/main
```

## Required Files

```
models/tinyllama/
├── mlc-chat-config.json     # Model config
├── ndarray-cache.json       # Weight shard manifest
├── tokenizer.json           # Tokenizer
├── tokenizer_config.json    # Tokenizer config
└── params_shard_*.bin       # Weight files (~100MB each)
```

## Git LFS (for large files)

If committing to repo:

```bash
# Install Git LFS
git lfs install

# Track binary model files
git lfs track "models/**/*.bin"
git add .gitattributes

# Now add model files
git add models/tinyllama/
git commit -m "feat: add TinyLlama model for local inference"
```

## Alternative: Split for GitHub (no LFS)

```bash
# Split large files into <100MB chunks
cd models/tinyllama
split -b 95M params_shard_0.bin params_shard_0.bin.part_

# Reassemble on use
cat params_shard_0.bin.part_* > params_shard_0.bin
```

## Available Models

| Model | Size | HuggingFace Repo |
|-------|------|------------------|
| TinyLlama-1.1B | ~600MB | `mlc-ai/TinyLlama-1.1B-Chat-v1.0-q4f16_1-MLC` |
| Qwen2-1.5B | ~1GB | `mlc-ai/Qwen2-1.5B-Instruct-q4f16_1-MLC` |
| Phi-3-mini | ~2GB | `mlc-ai/Phi-3-mini-4k-instruct-q4f16_1-MLC` |
| Gemma-2B | ~1.5GB | `mlc-ai/gemma-2b-it-q4f16_1-MLC` |
