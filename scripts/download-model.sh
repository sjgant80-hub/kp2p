#!/bin/bash
# Download TinyLlama model for local hosting
# Model: TinyLlama-1.1B-Chat-v1.0-q4f16_1-MLC (~600MB total)

MODEL_DIR="models/tinyllama"
BASE_URL="https://huggingface.co/mlc-ai/TinyLlama-1.1B-Chat-v1.0-q4f16_1-MLC/resolve/main"

mkdir -p "$MODEL_DIR"
cd "$MODEL_DIR"

echo "Downloading TinyLlama-1.1B model files..."

# Config files (small)
curl -L -o mlc-chat-config.json "$BASE_URL/mlc-chat-config.json"
curl -L -o ndarray-cache.json "$BASE_URL/ndarray-cache.json"
curl -L -o tokenizer.json "$BASE_URL/tokenizer.json"
curl -L -o tokenizer_config.json "$BASE_URL/tokenizer_config.json"

# Weight shards (larger files)
# Check ndarray-cache.json for actual shard names
echo "Downloading weight shards..."
for i in $(seq 0 5); do
  SHARD="params_shard_$i.bin"
  echo "  Downloading $SHARD..."
  curl -L -o "$SHARD" "$BASE_URL/$SHARD" 2>/dev/null || echo "  (shard $i not found, skipping)"
done

echo "Done! Model files in $MODEL_DIR"
ls -lh
