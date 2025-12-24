/**
 * Konomerce - Gateway Module
 * Manages tag providers and syncs with GitHub Issues TagDB
 */

import { events, generateId } from './utils.js';
import { UDTs, createFromUDT } from './udts.js';

// Tag Providers - each is like a PLC
export const providers = {
  store: { name: 'Store', icon: '🏪', tags: new Map() },
  inventory: { name: 'Inventory', icon: '📦', tags: new Map() },
  orders: { name: 'Orders', icon: '📋', tags: new Map() },
  customers: { name: 'Customers', icon: '👥', tags: new Map() }
};

// Gateway state
export const gateway = {
  connected: false,
  owner: '',
  repo: '',
  token: '',
  issueNumber: null,
  pollInterval: 5000,
  pollTimer: null,
  lastSync: null,
  syncCount: 0,
  lastEtag: null
};

// Get API headers
function getHeaders() {
  const h = {
    'Accept': 'application/vnd.github.v3+json',
    'Content-Type': 'application/json'
  };
  if (gateway.token) {
    h['Authorization'] = `token ${gateway.token}`;
  }
  if (gateway.lastEtag) {
    h['If-None-Match'] = gateway.lastEtag;
  }
  return h;
}

// Find or create TagDB issue
async function findOrCreateIssue() {
  const apiBase = `https://api.github.com/repos/${gateway.owner}/${gateway.repo}`;
  const label = 'konomerce-db';

  // Search for existing
  const resp = await fetch(`${apiBase}/issues?labels=${label}&state=open`, {
    headers: getHeaders()
  });

  if (!resp.ok) throw new Error(`GitHub API error: ${resp.status}`);

  const issues = await resp.json();
  if (issues.length > 0) {
    gateway.issueNumber = issues[0].number;
    return issues[0];
  }

  // Create new issue with initial data
  const createResp = await fetch(`${apiBase}/issues`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      title: '🛒 Konomerce Database',
      body: serializeState(),
      labels: [label]
    })
  });

  if (!createResp.ok) throw new Error(`Failed to create issue: ${createResp.status}`);

  const newIssue = await createResp.json();
  gateway.issueNumber = newIssue.number;
  return newIssue;
}

// Serialize all providers to JSON
function serializeState() {
  const data = {
    version: 1,
    updated: new Date().toISOString(),
    providers: {}
  };

  for (const [key, provider] of Object.entries(providers)) {
    data.providers[key] = {
      name: provider.name,
      tags: Object.fromEntries(provider.tags)
    };
  }

  return [
    '# Konomerce Database',
    '',
    '> This issue stores the Konomerce tag database. Do not edit manually.',
    '',
    '```json',
    JSON.stringify(data, null, 2),
    '```',
    '',
    `Last sync: ${data.updated}`
  ].join('\n');
}

// Deserialize state from issue body
function deserializeState(body) {
  try {
    const match = body.match(/```json\n([\s\S]*?)\n```/);
    if (!match) return false;

    const data = JSON.parse(match[1]);

    if (data.providers) {
      for (const [key, providerData] of Object.entries(data.providers)) {
        if (providers[key] && providerData.tags) {
          providers[key].tags = new Map(Object.entries(providerData.tags));
        }
      }
    }

    return true;
  } catch (e) {
    console.error('Failed to parse state:', e);
    return false;
  }
}

// Sync to remote
async function syncToRemote() {
  if (!gateway.issueNumber) return;

  const apiBase = `https://api.github.com/repos/${gateway.owner}/${gateway.repo}`;

  const resp = await fetch(`${apiBase}/issues/${gateway.issueNumber}`, {
    method: 'PATCH',
    headers: getHeaders(),
    body: JSON.stringify({
      body: serializeState()
    })
  });

  if (!resp.ok) throw new Error(`Sync failed: ${resp.status}`);

  gateway.lastEtag = resp.headers.get('ETag');
  gateway.lastSync = new Date();
  gateway.syncCount++;
  events.emit('sync', { time: gateway.lastSync, count: gateway.syncCount });
}

// Poll for updates
async function poll() {
  if (!gateway.issueNumber) return;

  const apiBase = `https://api.github.com/repos/${gateway.owner}/${gateway.repo}`;

  const resp = await fetch(`${apiBase}/issues/${gateway.issueNumber}`, {
    headers: getHeaders()
  });

  if (resp.status === 304) return; // Not modified
  if (!resp.ok) throw new Error(`Poll failed: ${resp.status}`);

  gateway.lastEtag = resp.headers.get('ETag');

  const issue = await resp.json();
  deserializeState(issue.body);
  events.emit('update', { providers });
}

// Connect to gateway
export async function connect(config) {
  gateway.owner = config.owner;
  gateway.repo = config.repo;
  gateway.token = config.token;
  gateway.pollInterval = config.pollInterval || 5000;

  await findOrCreateIssue();
  await poll();

  gateway.connected = true;
  gateway.pollTimer = setInterval(poll, gateway.pollInterval);

  events.emit('connected', { issueNumber: gateway.issueNumber });
  return true;
}

// Disconnect
export function disconnect() {
  if (gateway.pollTimer) {
    clearInterval(gateway.pollTimer);
    gateway.pollTimer = null;
  }
  gateway.connected = false;
  events.emit('disconnected');
}

// Write a tag value
export async function writeTag(provider, path, value, quality = 'Good') {
  const p = providers[provider];
  if (!p) throw new Error(`Unknown provider: ${provider}`);

  const tagData = {
    value,
    quality,
    timestamp: new Date().toISOString(),
    source: 'local'
  };

  p.tags.set(path, tagData);
  await syncToRemote();
  events.emit('tagWrite', { provider, path, value });
  return tagData;
}

// Read a tag
export function readTag(provider, path) {
  const p = providers[provider];
  if (!p) return null;
  return p.tags.get(path);
}

// Create entity from UDT (product, customer, order, etc.)
export async function createEntity(provider, udtName, data) {
  const id = data.ID || data.SKU || generateId(udtName.charAt(0));
  const instance = createFromUDT(udtName, { ...data, CreatedAt: new Date().toISOString() });

  // Store each field as a tag
  for (const [key, value] of Object.entries(instance)) {
    await writeTag(provider, `${id}/${key}`, value);
  }

  return id;
}

// Get all entities of a type
export function getEntities(provider) {
  const p = providers[provider];
  if (!p) return [];

  const entities = new Map();

  for (const [path, data] of p.tags) {
    const [id, field] = path.split('/');
    if (!entities.has(id)) {
      entities.set(id, { _id: id });
    }
    entities.get(id)[field] = data.value;
  }

  return Array.from(entities.values());
}

// Get a single entity
export function getEntity(provider, id) {
  const p = providers[provider];
  if (!p) return null;

  const entity = { _id: id };
  for (const [path, data] of p.tags) {
    if (path.startsWith(id + '/')) {
      const field = path.split('/')[1];
      entity[field] = data.value;
    }
  }

  return Object.keys(entity).length > 1 ? entity : null;
}

// Delete an entity
export async function deleteEntity(provider, id) {
  const p = providers[provider];
  if (!p) return;

  for (const path of p.tags.keys()) {
    if (path.startsWith(id + '/')) {
      p.tags.delete(path);
    }
  }

  await syncToRemote();
  events.emit('entityDelete', { provider, id });
}

// Get provider stats
export function getStats() {
  return {
    products: getEntities('store').length,
    inventory: getEntities('inventory').length,
    orders: getEntities('orders').length,
    customers: getEntities('customers').length,
    connected: gateway.connected,
    lastSync: gateway.lastSync,
    syncCount: gateway.syncCount
  };
}

// Create demo data
export async function createDemoData() {
  // Demo products
  const products = [
    { SKU: 'WIDGET-001', Name: 'Premium Widget', Price: 29.99, Category: 'Widgets', Active: true },
    { SKU: 'GADGET-002', Name: 'Super Gadget', Price: 49.99, Category: 'Gadgets', Active: true },
    { SKU: 'GIZMO-003', Name: 'Mega Gizmo', Price: 79.99, Category: 'Gizmos', Active: true }
  ];

  for (const prod of products) {
    await createEntity('store', 'Product', prod);
    await createEntity('inventory', 'Inventory', {
      ProductSKU: prod.SKU,
      Quantity: Math.floor(Math.random() * 100) + 10,
      Available: Math.floor(Math.random() * 100),
      ReorderPoint: 10
    });
  }

  // Demo customers
  const customers = [
    { ID: 'CUST-001', Email: 'john@example.com', FirstName: 'John', LastName: 'Doe' },
    { ID: 'CUST-002', Email: 'jane@example.com', FirstName: 'Jane', LastName: 'Smith' }
  ];

  for (const cust of customers) {
    await createEntity('customers', 'Customer', cust);
  }

  // Demo order
  await createEntity('orders', 'Order', {
    ID: 'ORD-001',
    CustomerID: 'CUST-001',
    Status: 'processing',
    ItemCount: 2,
    Total: 79.98
  });

  events.emit('demoCreated');
}

// Export for window access
if (typeof window !== 'undefined') {
  window.konomerce = {
    gateway,
    providers,
    connect,
    disconnect,
    writeTag,
    readTag,
    createEntity,
    getEntities,
    getEntity,
    deleteEntity,
    getStats,
    createDemoData
  };
}
