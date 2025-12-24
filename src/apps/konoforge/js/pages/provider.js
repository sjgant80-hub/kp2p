/**
 * KonoForge Pages Provider
 * Static site hosting from browser storage
 * Content-addressed, P2P distribution ready
 */

import * as ns from '../namespace/provider.js';
import * as git from '../git/provider.js';
import { UDTs, buildPath } from '../namespace/udts.js';

// Service worker for serving pages
let sw = null;

/**
 * Initialize pages provider
 */
export async function initPages() {
  // Register service worker for serving pages
  if ('serviceWorker' in navigator) {
    try {
      sw = await navigator.serviceWorker.register('/konoforge-sw.js');
      console.log('📄 Pages service worker registered');
    } catch (e) {
      console.warn('Service worker registration failed:', e);
    }
  }
}

/**
 * Deploy a site from a repo
 */
export async function deploySite(repoPath, options = {}) {
  const workspace = repoPath.split('/')[1];
  const projectName = repoPath.split('/')[2];

  const sitePath = `${repoPath}/_site`;
  const now = new Date().toISOString();

  // Get files from repo
  const files = await git.listFiles(repoPath, options.branch || 'main');
  const outputDir = options.outputDir || '';

  // Build file manifest
  const manifest = {
    files: [],
    totalSize: 0
  };

  for (const file of files) {
    if (file.type === 'blob') {
      manifest.files.push({
        path: file.name,
        hash: file.hash,
        type: getMimeType(file.name)
      });
    }
  }

  // Calculate root hash (hash of manifest)
  const manifestContent = JSON.stringify(manifest);
  const rootHash = await ns.storeBlob(manifestContent);

  // Create site tag
  await ns.writeTag(sitePath, ns.createInstance(UDTs.Site, {
    Domain: `${projectName}.${workspace}.konoforge.local`,
    CustomDomain: options.customDomain || '',
    RootHash: rootHash,
    EntryPoint: options.entryPoint || 'index.html',
    DeployedAt: now,
    DeployedBy: options.deployedBy || 'anonymous',
    BuildCommand: options.buildCommand || '',
    OutputDir: outputDir
  }));

  // Update repo
  const repo = ns.readValue(repoPath);
  if (repo) {
    repo.Updated = now;
    await ns.writeTag(repoPath, repo);
  }

  return {
    sitePath,
    domain: `${projectName}.${workspace}.konoforge.local`,
    rootHash,
    files: manifest.files.length
  };
}

/**
 * Get site info
 */
export function getSite(repoPath) {
  return ns.readValue(`${repoPath}/_site`);
}

/**
 * Serve a file from a site
 */
export async function serveFile(sitePath, filePath) {
  const site = ns.readValue(sitePath);
  if (!site) return null;

  // Get manifest
  const manifestData = await ns.getBlob(site.RootHash);
  if (!manifestData) return null;

  const manifest = JSON.parse(new TextDecoder().decode(manifestData));

  // Find file
  const normalizedPath = filePath.replace(/^\//, '') || site.EntryPoint;
  const file = manifest.files.find(f =>
    f.path === normalizedPath ||
    f.path === `${normalizedPath}/index.html`
  );

  if (!file) return null;

  // Get content
  const content = await ns.getBlob(file.hash);
  if (!content) return null;

  return {
    content,
    mimeType: file.type,
    hash: file.hash
  };
}

/**
 * List all deployed sites
 */
export function listSites(workspace) {
  const path = buildPath('forge', workspace);
  const projects = ns.getChildren(path);

  return projects
    .map(p => {
      const site = ns.readValue(`${p.path}/_site`);
      return site ? { project: p.value, site } : null;
    })
    .filter(Boolean);
}

/**
 * Create static file for pages
 */
export async function createStaticFile(sitePath, filePath, content, mimeType) {
  const hash = await ns.storeBlob(content);

  const fileTagPath = `${sitePath}/_files/${filePath.replace(/\//g, '_')}`;
  await ns.writeTag(fileTagPath, {
    _type: 'StaticFile',
    path: filePath,
    hash,
    mimeType,
    size: content.length,
    created: new Date().toISOString()
  });

  return hash;
}

/**
 * Build site from source (simple bundler)
 */
export async function buildSite(repoPath, options = {}) {
  const branch = options.branch || 'main';
  const outputDir = options.outputDir || 'dist';

  // Get all source files
  const files = await git.listFiles(repoPath, branch);

  // For now, just copy files as-is (no build step)
  // Future: Add esbuild/rollup WASM for actual bundling

  const output = [];
  for (const file of files) {
    if (file.type === 'blob') {
      const content = await git.readFile(repoPath, branch, file.name);
      if (content !== null) {
        output.push({
          name: file.name,
          content,
          hash: file.hash
        });
      }
    }
  }

  return output;
}

/**
 * Get MIME type from filename
 */
function getMimeType(filename) {
  const ext = filename.split('.').pop()?.toLowerCase();
  const types = {
    'html': 'text/html',
    'htm': 'text/html',
    'css': 'text/css',
    'js': 'application/javascript',
    'mjs': 'application/javascript',
    'json': 'application/json',
    'png': 'image/png',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'gif': 'image/gif',
    'svg': 'image/svg+xml',
    'ico': 'image/x-icon',
    'woff': 'font/woff',
    'woff2': 'font/woff2',
    'ttf': 'font/ttf',
    'eot': 'application/vnd.ms-fontobject',
    'txt': 'text/plain',
    'md': 'text/markdown',
    'xml': 'application/xml',
    'wasm': 'application/wasm'
  };
  return types[ext] || 'application/octet-stream';
}

/**
 * Generate HTML preview
 */
export function generatePreview(files) {
  const index = files.find(f => f.name === 'index.html');
  if (index) {
    return index.content;
  }

  // Generate directory listing
  return `<!DOCTYPE html>
<html>
<head>
  <title>Site Files</title>
  <style>
    body { font-family: system-ui; max-width: 800px; margin: 40px auto; padding: 0 20px; }
    h1 { color: #333; }
    ul { list-style: none; padding: 0; }
    li { padding: 8px; border-bottom: 1px solid #eee; }
    a { color: #0066cc; text-decoration: none; }
    a:hover { text-decoration: underline; }
    .size { color: #888; font-size: 0.9em; margin-left: 10px; }
  </style>
</head>
<body>
  <h1>📁 Site Files</h1>
  <ul>
    ${files.map(f => `<li><a href="${f.name}">${f.name}</a><span class="size">${formatSize(f.content?.length || 0)}</span></li>`).join('\n    ')}
  </ul>
</body>
</html>`;
}

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
