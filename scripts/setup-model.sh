#!/bin/bash
# One-liner to download TinyLlama and set up Git LFS
# Run this from repo root: bash scripts/setup-model.sh

set -e

echo "=== KP2P Model Setup ==="

# Install Git LFS if needed
if ! command -v git-lfs &> /dev/null; then
    echo "Installing Git LFS..."
    if command -v apt-get &> /dev/null; then
        sudo apt-get install -y git-lfs
    elif command -v brew &> /dev/null; then
        brew install git-lfs
    else
        echo "Please install Git LFS: https://git-lfs.com"
        exit 1
    fi
fi

# Initialize LFS
git lfs install

# Create models directory
mkdir -p models/tinyllama
cd models/tinyllama

echo "Downloading TinyLlama-1.1B (~600MB)..."

# Download all model files from HuggingFace
BASE="https://huggingface.co/mlc-ai/TinyLlama-1.1B-Chat-v1.0-q4f16_1-MLC/resolve/main"

# Config files
wget -q --show-progress "$BASE/mlc-chat-config.json" -O mlc-chat-config.json
wget -q --show-progress "$BASE/ndarray-cache.json" -O ndarray-cache.json
wget -q --show-progress "$BASE/tokenizer.json" -O tokenizer.json
wget -q --show-progress "$BASE/tokenizer_config.json" -O tokenizer_config.json

# Weight shards (these are the big files)
wget -q --show-progress "$BASE/params_shard_0.bin" -O params_shard_0.bin
wget -q --show-progress "$BASE/params_shard_1.bin" -O params_shard_1.bin
wget -q --show-progress "$BASE/params_shard_2.bin" -O params_shard_2.bin
wget -q --show-progress "$BASE/params_shard_3.bin" -O params_shard_3.bin
wget -q --show-progress "$BASE/params_shard_4.bin" -O params_shard_4.bin
wget -q --show-progress "$BASE/params_shard_5.bin" -O params_shard_5.bin

cd ../..

# Track with LFS
git lfs track "models/**/*.bin"
git add .gitattributes
git add models/

echo ""
echo "=== Done! ==="
echo "Model downloaded to: models/tinyllama/"
echo ""
echo "To commit to repo:"
echo "  git commit -m 'feat: add TinyLlama model for local inference'"
echo "  git push"
