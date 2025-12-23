/**
 * Konomi Ignite - Ignition Gateway Handler
 * Tag Providers, UDTs (User Defined Types), and Tags
 */

import { $, escapeHtml, log } from './utils.js';

// Data Types supported by Ignition
export const DATA_TYPES = [
  'Int1', 'Int2', 'Int4', 'Int8',
  'Float4', 'Float8',
  'Boolean', 'String', 'DateTime',
  'DataSet', 'Document'
];

// Tag quality codes
export const QUALITY = {
  GOOD: { code: 192, name: 'Good', class: 'good' },
  BAD: { code: 0, name: 'Bad', class: 'bad' },
  UNCERTAIN: { code: 64, name: 'Uncertain', class: 'uncertain' },
  STALE: { code: 24, name: 'Stale', class: 'uncertain' }
};

// State
export const ignitionState = {
  gateway: null,
  providers: new Map(),
  udts: new Map(),
  tags: new Map(),
  liveSubscriptions: new Map()
};

// ============== Tag Providers ==============

export function createProvider(name, config = {}) {
  const provider = {
    id: `provider-${Date.now()}`,
    name: name.startsWith('[') ? name : `[${name}]`,
    type: config.type || 'standard',
    enabled: true,
    description: config.description || '',
    tagCount: 0,
    created: new Date().toISOString()
  };

  ignitionState.providers.set(provider.name, provider);
  log('success', `Created tag provider: ${provider.name}`, 'IGN');
  renderProviders();
  return provider;
}

export function deleteProvider(name) {
  if (name === '[System]') {
    log('error', 'Cannot delete System provider', 'IGN');
    return false;
  }

  // Delete all tags in this provider
  for (const [path, tag] of ignitionState.tags) {
    if (path.startsWith(name)) {
      ignitionState.tags.delete(path);
    }
  }

  ignitionState.providers.delete(name);
  log('info', `Deleted provider: ${name}`, 'IGN');
  renderProviders();
  renderTagTree();
  return true;
}

export function renderProviders() {
  const container = $('ignitionProviders');
  if (!container) return;

  container.innerHTML = '';

  for (const [name, provider] of ignitionState.providers) {
    const div = document.createElement('div');
    div.className = 'provider-item';
    div.innerHTML = `
      <div class="provider-header" data-provider="${escapeHtml(name)}">
        <span class="provider-icon">${provider.type === 'system' ? '⚙️' : '🗄️'}</span>
        <span class="provider-name">${escapeHtml(name)}</span>
        <span class="provider-count">${provider.tagCount} tags</span>
        <span class="provider-status ${provider.enabled ? 'enabled' : 'disabled'}">
          ${provider.enabled ? '●' : '○'}
        </span>
      </div>
    `;
    div.onclick = () => selectProvider(name);
    container.appendChild(div);
  }
}

function selectProvider(name) {
  document.querySelectorAll('.provider-item').forEach(el => el.classList.remove('active'));
  const item = document.querySelector(`[data-provider="${name}"]`)?.parentElement;
  if (item) item.classList.add('active');

  // Filter tag tree to this provider
  renderTagTree(name);
}

// ============== UDTs (User Defined Types) ==============

export function createUDT(name, members = [], parentType = null) {
  const udt = {
    id: `udt-${Date.now()}`,
    name,
    parentType,
    members: members.map((m, i) => ({
      id: `member-${Date.now()}-${i}`,
      name: m.name,
      dataType: m.dataType || 'Float8',
      defaultValue: m.defaultValue ?? null,
      engUnit: m.engUnit || '',
      description: m.description || ''
    })),
    created: new Date().toISOString(),
    instances: 0
  };

  ignitionState.udts.set(name, udt);
  log('success', `Created UDT: ${name} with ${members.length} members`, 'IGN');
  renderUDTs();
  return udt;
}

export function deleteUDT(name) {
  // Check for instances
  let instanceCount = 0;
  for (const [path, tag] of ignitionState.tags) {
    if (tag.udtType === name) instanceCount++;
  }

  if (instanceCount > 0) {
    log('error', `Cannot delete UDT "${name}" - ${instanceCount} instances exist`, 'IGN');
    return false;
  }

  ignitionState.udts.delete(name);
  log('info', `Deleted UDT: ${name}`, 'IGN');
  renderUDTs();
  return true;
}

export function addUDTMember(udtName, member) {
  const udt = ignitionState.udts.get(udtName);
  if (!udt) return false;

  udt.members.push({
    id: `member-${Date.now()}`,
    name: member.name,
    dataType: member.dataType || 'Float8',
    defaultValue: member.defaultValue ?? null,
    engUnit: member.engUnit || '',
    description: member.description || ''
  });

  log('info', `Added member "${member.name}" to UDT "${udtName}"`, 'IGN');
  renderUDTs();
  return true;
}

export function renderUDTs() {
  const container = $('ignitionUDTs');
  if (!container) return;

  container.innerHTML = '';

  if (ignitionState.udts.size === 0) {
    container.innerHTML = '<div class="empty-state">No UDTs defined</div>';
    return;
  }

  for (const [name, udt] of ignitionState.udts) {
    const div = document.createElement('div');
    div.className = 'udt-item';
    div.innerHTML = `
      <div class="udt-header" data-udt="${escapeHtml(name)}">
        <span class="udt-icon">📦</span>
        <span class="udt-name">${escapeHtml(name)}</span>
        <span class="udt-members">${udt.members.length} members</span>
        <span class="udt-instances">${udt.instances} instances</span>
        <button class="btn btn-sm btn-danger udt-delete" data-udt="${escapeHtml(name)}">×</button>
      </div>
      <div class="udt-members-list">
        ${udt.members.map(m => `
          <div class="udt-member">
            <span class="member-icon">${getTypeIcon(m.dataType)}</span>
            <span class="member-name">${escapeHtml(m.name)}</span>
            <span class="member-type">${m.dataType}</span>
            ${m.engUnit ? `<span class="member-unit">${escapeHtml(m.engUnit)}</span>` : ''}
          </div>
        `).join('')}
      </div>
    `;

    div.querySelector('.udt-header').onclick = () => {
      div.classList.toggle('expanded');
    };

    div.querySelector('.udt-delete').onclick = (e) => {
      e.stopPropagation();
      deleteUDT(name);
    };

    container.appendChild(div);
  }
}

function getTypeIcon(dataType) {
  const icons = {
    'Int1': '1️⃣', 'Int2': '2️⃣', 'Int4': '4️⃣', 'Int8': '8️⃣',
    'Float4': '🔢', 'Float8': '🔢',
    'Boolean': '✓', 'String': '📝', 'DateTime': '📅',
    'DataSet': '📊', 'Document': '📄'
  };
  return icons[dataType] || '🏷️';
}

// ============== Tags ==============

export function createTag(path, config = {}) {
  const provider = path.match(/^\[([^\]]+)\]/)?.[0] || '[default]';

  const tag = {
    id: `tag-${Date.now()}`,
    path,
    name: path.split('/').pop(),
    dataType: config.dataType || 'Float8',
    udtType: config.udtType || null,
    value: config.value ?? (config.udtType ? {} : 0),
    quality: QUALITY.GOOD,
    timestamp: new Date(),
    engUnit: config.engUnit || '',
    engLow: config.engLow ?? 0,
    engHigh: config.engHigh ?? 100,
    description: config.description || '',
    readOnly: config.readOnly || false,
    historicalEnabled: config.historicalEnabled || false,
    scanClass: config.scanClass || 'Default'
  };

  // If UDT, populate member values
  if (config.udtType) {
    const udt = ignitionState.udts.get(config.udtType);
    if (udt) {
      tag.value = {};
      udt.members.forEach(m => {
        tag.value[m.name] = m.defaultValue ?? getDefaultValue(m.dataType);
      });
      udt.instances++;
    }
  }

  ignitionState.tags.set(path, tag);

  // Update provider tag count
  const prov = ignitionState.providers.get(provider);
  if (prov) prov.tagCount++;

  log('success', `Created tag: ${path}`, 'IGN');
  renderTagTree();
  renderProviders();
  return tag;
}

export function createFolder(path) {
  const folder = {
    id: `folder-${Date.now()}`,
    path,
    name: path.split('/').pop(),
    type: 'folder',
    created: new Date().toISOString()
  };

  ignitionState.tags.set(path, folder);
  log('info', `Created folder: ${path}`, 'IGN');
  renderTagTree();
  return folder;
}

export function deleteTag(path) {
  const tag = ignitionState.tags.get(path);
  if (!tag) return false;

  // If folder, delete all children
  if (tag.type === 'folder') {
    for (const [p] of ignitionState.tags) {
      if (p.startsWith(path + '/')) {
        ignitionState.tags.delete(p);
      }
    }
  }

  // Update UDT instance count
  if (tag.udtType) {
    const udt = ignitionState.udts.get(tag.udtType);
    if (udt) udt.instances--;
  }

  // Update provider count
  const provider = path.match(/^\[([^\]]+)\]/)?.[0];
  const prov = ignitionState.providers.get(provider);
  if (prov && !tag.type) prov.tagCount--;

  ignitionState.tags.delete(path);
  log('info', `Deleted: ${path}`, 'IGN');
  renderTagTree();
  renderProviders();
  return true;
}

function getDefaultValue(dataType) {
  switch (dataType) {
    case 'Boolean': return false;
    case 'String': return '';
    case 'DateTime': return new Date().toISOString();
    case 'Int1': case 'Int2': case 'Int4': case 'Int8': return 0;
    case 'Float4': case 'Float8': return 0.0;
    default: return null;
  }
}

export function renderTagTree(filterProvider = null) {
  const container = $('ignitionTree');
  if (!container) return;

  container.innerHTML = '';

  // Build tree structure
  const tree = {};

  for (const [path, tag] of ignitionState.tags) {
    if (filterProvider && !path.startsWith(filterProvider)) continue;

    const parts = path.split('/');
    let current = tree;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (!current[part]) {
        current[part] = { _children: {}, _tag: null };
      }
      if (i === parts.length - 1) {
        current[part]._tag = tag;
      }
      current = current[part]._children;
    }
  }

  // Render tree
  function renderNode(name, node, path, level = 0) {
    const div = document.createElement('div');
    div.className = 'tag-node';
    if (level === 0) div.classList.add('expanded');

    const tag = node._tag;
    const hasChildren = Object.keys(node._children).length > 0;
    const isFolder = tag?.type === 'folder' || hasChildren;
    const isUDT = tag?.udtType;

    let icon = '🏷️';
    if (isFolder) icon = '📁';
    else if (isUDT) icon = '📦';
    else if (tag) icon = getTypeIcon(tag.dataType);

    const fullPath = path ? `${path}/${name}` : name;

    div.innerHTML = `
      <div class="tag-node-header" data-tagpath="${escapeHtml(fullPath)}">
        ${hasChildren ? '<span class="tag-expand">▶</span>' : '<span class="tag-expand"></span>'}
        <span class="tag-node-icon">${icon}</span>
        <span class="tag-node-name">${escapeHtml(name)}</span>
        ${tag && !isFolder ? `
          <span class="tag-node-value">${formatValue(tag.value)}</span>
          <span class="tag-node-quality ${tag.quality.class}">${tag.quality.name}</span>
        ` : ''}
        ${isUDT ? `<span class="tag-udt-type">${escapeHtml(tag.udtType)}</span>` : ''}
      </div>
      ${hasChildren ? '<div class="tag-node-children"></div>' : ''}
    `;

    const header = div.querySelector('.tag-node-header');
    header.onclick = (e) => {
      if (e.target.classList.contains('tag-expand')) {
        div.classList.toggle('expanded');
      } else {
        selectTag(fullPath, tag);
      }
    };

    if (hasChildren) {
      const childContainer = div.querySelector('.tag-node-children');
      const sortedKeys = Object.keys(node._children).sort((a, b) => {
        const aTag = node._children[a]._tag;
        const bTag = node._children[b]._tag;
        const aIsFolder = aTag?.type === 'folder' || Object.keys(node._children[a]._children).length > 0;
        const bIsFolder = bTag?.type === 'folder' || Object.keys(node._children[b]._children).length > 0;
        if (aIsFolder && !bIsFolder) return -1;
        if (!aIsFolder && bIsFolder) return 1;
        return a.localeCompare(b);
      });

      sortedKeys.forEach(key => {
        childContainer.appendChild(renderNode(key, node._children[key], fullPath, level + 1));
      });
    }

    return div;
  }

  Object.keys(tree).sort().forEach(key => {
    container.appendChild(renderNode(key, tree[key], '', 0));
  });

  if (container.children.length === 0) {
    container.innerHTML = '<div class="empty-state">No tags. Click "+ Tag" to create one.</div>';
  }
}

function formatValue(value) {
  if (value === null || value === undefined) return '--';
  if (typeof value === 'object') return '{...}';
  if (typeof value === 'number') return value.toFixed(2);
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  return String(value).substring(0, 20);
}

function selectTag(path, tag) {
  document.querySelectorAll('.tag-node-header').forEach(el => el.classList.remove('selected'));
  const header = document.querySelector(`[data-tagpath="${path}"]`);
  if (header) header.classList.add('selected');

  $('ignitionTagPath').value = path;

  // Show tag details
  showTagDetails(path, tag);
}

function showTagDetails(path, tag) {
  const container = $('ignitionTagDetails');
  if (!container || !tag) return;

  if (tag.type === 'folder') {
    container.innerHTML = `
      <div class="tag-detail-header">📁 ${escapeHtml(tag.name)}</div>
      <div class="tag-detail-row"><label>Path:</label><span>${escapeHtml(path)}</span></div>
      <div class="tag-detail-row"><label>Type:</label><span>Folder</span></div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="tag-detail-header">${getTypeIcon(tag.dataType)} ${escapeHtml(tag.name)}</div>
    <div class="tag-detail-row"><label>Path:</label><span>${escapeHtml(path)}</span></div>
    <div class="tag-detail-row"><label>Data Type:</label><span>${tag.udtType || tag.dataType}</span></div>
    <div class="tag-detail-row"><label>Value:</label><span class="tag-value">${formatValue(tag.value)}</span></div>
    <div class="tag-detail-row"><label>Quality:</label><span class="quality-${tag.quality.class}">${tag.quality.name}</span></div>
    <div class="tag-detail-row"><label>Timestamp:</label><span>${tag.timestamp.toLocaleString()}</span></div>
    ${tag.engUnit ? `<div class="tag-detail-row"><label>Eng Unit:</label><span>${escapeHtml(tag.engUnit)}</span></div>` : ''}
    ${tag.description ? `<div class="tag-detail-row"><label>Description:</label><span>${escapeHtml(tag.description)}</span></div>` : ''}
    <div class="tag-detail-actions">
      <button class="btn btn-sm" onclick="window.ignite.readTag('${escapeHtml(path)}')">Read</button>
      <button class="btn btn-sm" onclick="window.ignite.writeTagPrompt('${escapeHtml(path)}')">Write</button>
      <button class="btn btn-sm" onclick="window.ignite.subscribeTag('${escapeHtml(path)}')">Subscribe</button>
      <button class="btn btn-sm btn-danger" onclick="window.ignite.deleteTag('${escapeHtml(path)}')">Delete</button>
    </div>
  `;

  // If UDT, show members
  if (tag.udtType && typeof tag.value === 'object') {
    const membersHtml = Object.entries(tag.value).map(([k, v]) => `
      <div class="tag-detail-member">
        <span class="member-name">${escapeHtml(k)}</span>
        <span class="member-value">${formatValue(v)}</span>
      </div>
    `).join('');

    container.innerHTML += `
      <div class="tag-detail-section">
        <div class="section-header">UDT Members</div>
        ${membersHtml}
      </div>
    `;
  }
}

// ============== Tag Operations ==============

export async function readTag(tagPath) {
  const tag = ignitionState.tags.get(tagPath);
  if (!tag) {
    log('error', `Tag not found: ${tagPath}`, 'IGN');
    return null;
  }

  // Simulate read - in production would call gateway API
  tag.timestamp = new Date();
  log('info', `Read tag: ${tagPath} = ${formatValue(tag.value)}`, 'IGN');

  renderTagTree();
  showTagDetails(tagPath, tag);
  return tag.value;
}

export async function writeTag(tagPath, value) {
  const tag = ignitionState.tags.get(tagPath);
  if (!tag) {
    log('error', `Tag not found: ${tagPath}`, 'IGN');
    return false;
  }

  if (tag.readOnly) {
    log('error', `Tag is read-only: ${tagPath}`, 'IGN');
    return false;
  }

  // Type conversion
  if (tag.dataType.startsWith('Int') || tag.dataType.startsWith('Float')) {
    value = Number(value);
  } else if (tag.dataType === 'Boolean') {
    value = value === 'true' || value === true || value === 1;
  }

  tag.value = value;
  tag.timestamp = new Date();

  log('success', `Wrote ${formatValue(value)} to ${tagPath}`, 'IGN');
  renderTagTree();
  showTagDetails(tagPath, tag);
  return true;
}

export function writeTagPrompt(tagPath) {
  const tag = ignitionState.tags.get(tagPath);
  if (!tag) return;

  const value = prompt(`Enter value for ${tagPath}:`, String(tag.value));
  if (value !== null) {
    writeTag(tagPath, value);
  }
}

export function subscribeTag(tagPath) {
  const tag = ignitionState.tags.get(tagPath);
  if (!tag) return;

  if (ignitionState.liveSubscriptions.has(tagPath)) {
    log('warn', `Already subscribed to: ${tagPath}`, 'IGN');
    return;
  }

  // Add to live values table
  const tbody = $('ignitionLive');
  const row = document.createElement('tr');
  row.dataset.path = tagPath;
  row.innerHTML = `
    <td>${escapeHtml(tagPath)}</td>
    <td class="value">${formatValue(tag.value)}</td>
    <td><span class="tag-node-quality ${tag.quality.class}">${tag.quality.name}</span></td>
    <td>${tag.timestamp.toLocaleTimeString()}</td>
    <td><button class="btn btn-sm btn-danger" onclick="window.ignite.unsubscribeTag('${escapeHtml(tagPath)}')">×</button></td>
  `;
  tbody.appendChild(row);

  // Simulate updates
  const intervalId = setInterval(() => {
    if (!row.parentNode) {
      clearInterval(intervalId);
      return;
    }

    // Simulate value change
    if (typeof tag.value === 'number') {
      tag.value = tag.value + (Math.random() - 0.5) * 2;
      tag.value = Math.max(tag.engLow, Math.min(tag.engHigh, tag.value));
    }
    tag.timestamp = new Date();

    row.querySelector('.value').textContent = formatValue(tag.value);
    row.querySelector('td:nth-child(4)').textContent = tag.timestamp.toLocaleTimeString();
  }, 1000);

  ignitionState.liveSubscriptions.set(tagPath, { row, intervalId });
  log('info', `Subscribed to: ${tagPath}`, 'IGN');
}

export function unsubscribeTag(tagPath) {
  const sub = ignitionState.liveSubscriptions.get(tagPath);
  if (sub) {
    clearInterval(sub.intervalId);
    sub.row.remove();
    ignitionState.liveSubscriptions.delete(tagPath);
    log('info', `Unsubscribed from: ${tagPath}`, 'IGN');
  }
}

// ============== Connection ==============

export async function connectIgnition(conn) {
  const { gateway, username, webdev } = conn.config;

  log('info', `Connecting to Ignition Gateway: ${gateway}`, 'IGN');

  ignitionState.gateway = { gateway, webdev, username };

  // Initialize default providers
  createProvider('default', { description: 'Default Tag Provider' });
  createProvider('System', { type: 'system', description: 'System Tags' });

  // Create some demo UDTs
  createUDT('Motor', [
    { name: 'Running', dataType: 'Boolean' },
    { name: 'Speed', dataType: 'Float8', engUnit: 'RPM' },
    { name: 'Current', dataType: 'Float8', engUnit: 'A' },
    { name: 'Temperature', dataType: 'Float8', engUnit: '°C' },
    { name: 'Fault', dataType: 'Boolean' }
  ]);

  createUDT('Valve', [
    { name: 'Open', dataType: 'Boolean' },
    { name: 'Closed', dataType: 'Boolean' },
    { name: 'Position', dataType: 'Float8', engUnit: '%' },
    { name: 'Fault', dataType: 'Boolean' }
  ]);

  // Create demo tags
  createFolder('[default]/Pumps');
  createFolder('[default]/Valves');
  createFolder('[default]/Sensors');

  createTag('[default]/Pumps/Pump1', { udtType: 'Motor' });
  createTag('[default]/Pumps/Pump2', { udtType: 'Motor' });
  createTag('[default]/Valves/FV-101', { udtType: 'Valve' });
  createTag('[default]/Sensors/TT-101', { dataType: 'Float8', engUnit: '°C', value: 25.5 });
  createTag('[default]/Sensors/PT-101', { dataType: 'Float8', engUnit: 'PSI', value: 14.7 });
  createTag('[default]/Sensors/LT-101', { dataType: 'Float8', engUnit: '%', value: 75.0 });

  // Show gateway info
  $('ignitionInfo').innerHTML = `
    <div style="font-size: 12px;">
      <div style="margin-bottom: 8px;"><strong>Gateway:</strong> ${escapeHtml(gateway)}</div>
      <div style="margin-bottom: 8px;"><strong>User:</strong> ${escapeHtml(username)}</div>
      <div style="margin-bottom: 8px;"><strong>WebDev:</strong> ${escapeHtml(webdev)}</div>
      <div style="color: var(--green);"><strong>Status:</strong> Connected</div>
    </div>
  `;

  renderProviders();
  renderUDTs();
  renderTagTree();
}

// Export for window access
if (typeof window !== 'undefined') {
  window.ignite = {
    readTag,
    writeTag,
    writeTagPrompt,
    subscribeTag,
    unsubscribeTag,
    deleteTag,
    createTag,
    createFolder,
    createUDT,
    createProvider
  };
}
