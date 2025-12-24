/**
 * KonoForge - P2P Developer Platform
 * Main application
 */

import * as ns from './namespace/provider.js';
import * as git from './git/provider.js';
import * as pages from './pages/provider.js';
import * as ci from './ci/runner.js';
import { KonoVM, EXAMPLE_PROGRAM } from './asm/konoasm.js';
import { UDTs } from './namespace/udts.js';

const $ = id => document.getElementById(id);

// App state
const state = {
  currentWorkspace: null,
  currentProject: null,
  vm: null
};

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  await init();
});

async function init() {
  // Initialize namespace
  const { peerId, tagCount } = await ns.initNamespace();
  $('peerId').textContent = peerId;
  $('tagCount').textContent = tagCount;

  // Create default workspace if needed
  await ensureWorkspace('local');

  setupEventListeners();
  setupTabs();
  refreshUI();

  console.log('🔨 KonoForge initialized');
}

async function ensureWorkspace(name) {
  const path = `forge/${name}`;
  if (!ns.readTag(path)) {
    await ns.writeTag(path, ns.createInstance(UDTs.Workspace, {
      ID: crypto.randomUUID(),
      Name: name,
      Type: 'user',
      Created: new Date().toISOString()
    }));
  }
  state.currentWorkspace = name;
}

function setupEventListeners() {
  $('createRepoBtn')?.addEventListener('click', showCreateRepoModal);
  $('runAsmBtn')?.addEventListener('click', runAssembly);
  $('deployBtn')?.addEventListener('click', deploySite);
  $('runCiBtn')?.addEventListener('click', runCI);
}

function setupTabs() {
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      tab.classList.add('active');
      $(`tab-${tab.dataset.tab}`).classList.add('active');
    });
  });
}

function refreshUI() {
  renderRepos();
  renderNamespace();
  renderStats();
}

function renderRepos() {
  const repos = git.listRepos(state.currentWorkspace);
  const container = $('repoList');

  if (repos.length === 0) {
    container.innerHTML = '<div class="empty">No repositories yet. Create one to get started!</div>';
    return;
  }

  container.innerHTML = repos.map(repo => `
    <div class="repo-card" data-path="forge/${state.currentWorkspace}/${repo.Name}">
      <div class="repo-header">
        <span class="repo-name">${repo.Name}</span>
        <span class="repo-visibility ${repo.Visibility}">${repo.Visibility}</span>
      </div>
      <div class="repo-desc">${repo.Description || 'No description'}</div>
      <div class="repo-meta">
        <span>📝 ${repo.CommitCount} commits</span>
        <span>🌿 ${repo.BranchCount} branches</span>
        <span>📁 ${repo.Size_KB} KB</span>
      </div>
    </div>
  `).join('');

  // Add click handlers
  container.querySelectorAll('.repo-card').forEach(card => {
    card.addEventListener('click', () => selectRepo(card.dataset.path));
  });
}

function renderNamespace() {
  const stats = ns.getStats();
  const tags = ns.queryTags('forge/*', { limit: 50 });

  $('nsBrowser').innerHTML = tags.map(tag => `
    <div class="ns-item">
      <span class="ns-path">${tag.path}</span>
      <span class="ns-type">${tag.type}</span>
    </div>
  `).join('') || '<div class="empty">Namespace empty</div>';
}

function renderStats() {
  const stats = ns.getStats();
  $('tagCount').textContent = stats.tagCount;
  $('peerCount').textContent = stats.peerCount;
}

async function selectRepo(path) {
  state.currentProject = path;

  // Load repo details
  const repo = ns.readValue(path);
  const files = await git.listFiles(path);
  const commits = git.getLog(path, 'main', 10);

  $('repoDetail').innerHTML = `
    <h3>${repo.Name}</h3>
    <p>${repo.Description || 'No description'}</p>

    <div class="section">
      <h4>Files</h4>
      <div class="file-list">
        ${files.map(f => `<div class="file-item">${f.name}</div>`).join('') || '<div class="empty">No files</div>'}
      </div>
    </div>

    <div class="section">
      <h4>Commits</h4>
      <div class="commit-list">
        ${commits.map(c => `
          <div class="commit-item">
            <span class="commit-sha">${c.SHA.substring(0, 7)}</span>
            <span class="commit-msg">${c.Message}</span>
            <span class="commit-author">${c.Author}</span>
          </div>
        `).join('') || '<div class="empty">No commits</div>'}
      </div>
    </div>
  `;

  $('repoDetail').style.display = 'block';
}

function showCreateRepoModal() {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal">
      <h3>Create Repository</h3>
      <div class="form-group">
        <label>Name</label>
        <input type="text" id="repoName" placeholder="my-project">
      </div>
      <div class="form-group">
        <label>Description</label>
        <input type="text" id="repoDesc" placeholder="Optional description">
      </div>
      <div class="form-group">
        <label>Visibility</label>
        <select id="repoVis">
          <option value="public">Public</option>
          <option value="private">Private</option>
        </select>
      </div>
      <div class="modal-actions">
        <button class="btn" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
        <button class="btn btn-primary" id="createRepoSubmit">Create</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  $('createRepoSubmit').onclick = async () => {
    const name = $('repoName').value.trim();
    if (!name) return;

    await git.createRepo(state.currentWorkspace, name, {
      description: $('repoDesc').value,
      visibility: $('repoVis').value,
      author: 'local-user'
    });

    modal.remove();
    refreshUI();
  };
}

async function runAssembly() {
  const source = $('asmSource').value || EXAMPLE_PROGRAM;
  const vm = new KonoVM(ns);

  try {
    const count = vm.assemble(source);
    $('asmOutput').textContent = `Assembled ${count} instructions\n\n`;
    $('asmOutput').textContent += vm.disassemble() + '\n\n';

    const result = await vm.execute();
    $('asmOutput').textContent += `--- Execution ---\n`;
    $('asmOutput').textContent += result.output || '(no output)\n';
    $('asmOutput').textContent += `\nCycles: ${result.cycles}`;
    $('asmOutput').textContent += `\nRegisters: ${result.registers.join(', ')}`;
  } catch (e) {
    $('asmOutput').textContent = `Error: ${e.message}`;
  }
}

async function deploySite() {
  if (!state.currentProject) {
    alert('Select a repository first');
    return;
  }

  const result = await pages.deploySite(state.currentProject, {
    deployedBy: 'local-user'
  });

  alert(`Deployed to ${result.domain}\n${result.files} files`);
}

async function runCI() {
  if (!state.currentProject) {
    alert('Select a repository first');
    return;
  }

  const workflow = ci.createDefaultWorkflow();
  $('ciOutput').textContent = 'Running workflow...\n';

  const result = await ci.runWorkflow(state.currentProject, workflow);

  $('ciOutput').textContent = result.logs;
  $('ciOutput').textContent += `\n--- Result: ${result.status} (${result.duration}ms) ---`;
}

// Expose for debugging
window.konoforge = { ns, git, pages, ci, state };
