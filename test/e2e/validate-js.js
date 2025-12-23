/**
 * @file test/e2e/validate-js.js
 * @desc Validate JS modules load without syntax errors using dynamic import
 */

import { readdirSync, statSync } from 'fs';
import { join } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = join(__dirname, '../..');

const jsFiles = [];

function findJS(dir, skip = []) {
  for (const file of readdirSync(dir)) {
    if (skip.includes(file)) continue;
    const path = join(dir, file);
    const stat = statSync(path);
    if (stat.isDirectory() && !file.includes('node_modules')) {
      findJS(path, skip);
    } else if (file.endsWith('.js') && !file.includes('playwright')) {
      jsFiles.push(path);
    }
  }
}

// Find all JS in test/ and sandbox/ (skip e2e for now as it has test scripts)
findJS(join(ROOT, 'test'), ['e2e']);
findJS(join(ROOT, 'sandbox'));

console.log(`🔍 Validating ${jsFiles.length} JS modules...\n`);

let passed = 0, failed = 0;

for (const file of jsFiles) {
  const rel = file.replace(ROOT + '/', '');
  try {
    // Dynamic import to check module syntax
    await import(pathToFileURL(file).href);
    console.log(`\x1b[32m✓\x1b[0m ${rel}`);
    passed++;
  } catch (e) {
    // Check if it's a syntax error vs import error
    if (e instanceof SyntaxError) {
      console.log(`\x1b[31m✗\x1b[0m ${rel}`);
      console.log(`  └─ Syntax: ${e.message}`);
      failed++;
    } else if (e.code === 'ERR_MODULE_NOT_FOUND') {
      // Missing dependency is OK for validation
      console.log(`\x1b[33m⚠\x1b[0m ${rel} (missing dep: ${e.message.split("'")[1] || 'unknown'})`);
      passed++;
    } else {
      console.log(`\x1b[32m✓\x1b[0m ${rel} (runtime error OK)`);
      passed++;
    }
  }
}

console.log(`\n${'─'.repeat(40)}`);
console.log(`\x1b[32m${passed} valid\x1b[0m, \x1b[31m${failed} syntax errors\x1b[0m`);

process.exit(failed > 0 ? 1 : 0);
