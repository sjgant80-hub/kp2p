/**
 * Konomi Ignite - Main Application
 */

import { $, escapeHtml, log } from './utils.js';
import { connectMQTT, mqttState, publish, subscribe, unsubscribe } from './mqtt.js';
import { connectOPCUA, browseOPCUA, monitorNode } from './opcua.js';
import { connectOPCDA, addItem } from './opcda.js';
import { connectIgnition, readTag, writeTag, ignitionState } from './ignition.js';
import { tagDB, showTagDBConfig, initTagDB } from './tagdb.js';
import { initAI, chat as aiChat } from './ai.js';

// Application State
const state = {
  connections: [],
  activeConn: null
};

// Tab Switching
document.querySelectorAll('.tab').forEach(tab => {
  tab.onclick = () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    tab.classList.add('active');
    $('tab-' + tab.dataset.tab).classList.add('active');
  };
});

// Connection Modal
let selectedConnType = null;

$('addConnBtn').onclick = () => {
  $('addConnModal').classList.add('open');
  selectedConnType = null;
  $('connForm').style.display = 'none';
  $('saveConnBtn').style.display = 'none';
  document.querySelectorAll('.template-item').forEach(t => t.classList.remove('selected'));
};

$('closeModalBtn').onclick = () => $('addConnModal').classList.remove('open');
$('cancelConnBtn').onclick = () => $('addConnModal').classList.remove('open');

document.querySelectorAll('.template-item').forEach(item => {
  item.onclick = () => {
    document.querySelectorAll('.template-item').forEach(t => t.classList.remove('selected'));
    item.classList.add('selected');
    selectedConnType = item.dataset.type;
    showConnForm(selectedConnType);
  };
});

function showConnForm(type) {
  $('connForm').style.display = 'block';
  $('saveConnBtn').style.display = 'block';
  $('connName').value = '';

  const fields = $('connTypeFields');

  switch (type) {
    case 'mqtt':
      fields.innerHTML = `
        <div class="form-row">
          <div class="form-group">
            <label>Host</label>
            <input type="text" id="connHost" placeholder="broker.example.com" value="localhost">
          </div>
          <div class="form-group" style="max-width: 100px;">
            <label>Port</label>
            <input type="number" id="connPort" value="9001">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Username (optional)</label>
            <input type="text" id="connUser">
          </div>
          <div class="form-group">
            <label>Password (optional)</label>
            <input type="password" id="connPass">
          </div>
        </div>
        <div class="form-group">
          <label>Client ID</label>
          <input type="text" id="connClientId" value="konomi-${Date.now()}">
        </div>
        <div class="form-group">
          <label><input type="checkbox" id="connSSL"> Use SSL/TLS (wss://)</label>
        </div>
      `;
      break;

    case 'opcua':
      fields.innerHTML = `
        <div class="form-group">
          <label>Endpoint URL</label>
          <input type="text" id="connEndpoint" placeholder="opc.tcp://localhost:4840" value="opc.tcp://localhost:4840">
        </div>
        <div class="form-group">
          <label>Security Mode</label>
          <select id="connSecurityMode">
            <option value="None">None</option>
            <option value="Sign">Sign</option>
            <option value="SignAndEncrypt">Sign and Encrypt</option>
          </select>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Username (optional)</label>
            <input type="text" id="connUser">
          </div>
          <div class="form-group">
            <label>Password (optional)</label>
            <input type="password" id="connPass">
          </div>
        </div>
      `;
      break;

    case 'opcda':
      fields.innerHTML = `
        <div class="form-group">
          <label>Gateway URL</label>
          <input type="text" id="connGateway" placeholder="http://localhost:8080" value="http://localhost:8080">
        </div>
        <div class="form-group">
          <label>OPC Server ProgID</label>
          <input type="text" id="connProgId" placeholder="Kepware.KEPServerEX.V6">
        </div>
        <div class="form-group">
          <label>Hostname (DA Server)</label>
          <input type="text" id="connDAHost" placeholder="localhost" value="localhost">
        </div>
      `;
      break;

    case 'ignition':
      fields.innerHTML = `
        <div class="form-group">
          <label>Gateway URL</label>
          <input type="text" id="connGateway" placeholder="http://localhost:8088" value="http://localhost:8088">
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Username</label>
            <input type="text" id="connUser" value="admin">
          </div>
          <div class="form-group">
            <label>Password</label>
            <input type="password" id="connPass">
          </div>
        </div>
        <div class="form-group">
          <label>WebDev Module Path</label>
          <input type="text" id="connWebDev" placeholder="/system/webdev/api" value="/system/webdev/api">
        </div>
      `;
      break;
  }
}

$('saveConnBtn').onclick = () => {
  const name = $('connName').value || `${selectedConnType.toUpperCase()} Connection`;

  const conn = {
    id: 'conn-' + Date.now(),
    type: selectedConnType,
    name,
    status: 'disconnected',
    config: {}
  };

  switch (selectedConnType) {
    case 'mqtt':
      conn.config = {
        host: $('connHost').value,
        port: parseInt($('connPort').value),
        username: $('connUser').value,
        password: $('connPass').value,
        clientId: $('connClientId').value,
        ssl: $('connSSL').checked
      };
      break;
    case 'opcua':
      conn.config = {
        endpoint: $('connEndpoint').value,
        securityMode: $('connSecurityMode').value,
        username: $('connUser').value,
        password: $('connPass').value
      };
      break;
    case 'opcda':
      conn.config = {
        gateway: $('connGateway').value,
        progId: $('connProgId').value,
        host: $('connDAHost').value
      };
      break;
    case 'ignition':
      conn.config = {
        gateway: $('connGateway').value,
        username: $('connUser').value,
        password: $('connPass').value,
        webdev: $('connWebDev').value
      };
      break;
  }

  state.connections.push(conn);
  renderConnections();
  saveState();
  $('addConnModal').classList.remove('open');

  connectTo(conn);
};

function renderConnections() {
  const list = $('connList');
  list.innerHTML = '';

  state.connections.forEach(conn => {
    const item = document.createElement('div');
    item.className = 'conn-item' + (state.activeConn?.id === conn.id ? ' active' : '');
    item.innerHTML = `
      <div class="conn-item-header">
        <span class="conn-item-type ${conn.type}">${conn.type.toUpperCase()}</span>
        <span class="conn-item-name">${escapeHtml(conn.name)}</span>
      </div>
      <div class="conn-item-url">${escapeHtml(getConnUrl(conn))}</div>
      <div class="conn-item-status">
        <span class="status-dot ${conn.status}"></span>
        <span>${conn.status}</span>
      </div>
    `;
    item.onclick = () => selectConnection(conn);
    list.appendChild(item);
  });
}

function getConnUrl(conn) {
  switch (conn.type) {
    case 'mqtt': return `${conn.config.ssl ? 'wss' : 'ws'}://${conn.config.host}:${conn.config.port}`;
    case 'opcua': return conn.config.endpoint;
    case 'opcda': return `${conn.config.gateway} → ${conn.config.progId}`;
    case 'ignition': return conn.config.gateway;
    default: return '';
  }
}

function selectConnection(conn) {
  state.activeConn = conn;
  renderConnections();
  document.querySelector(`.tab[data-tab="${conn.type}"]`)?.click();
}

async function connectTo(conn) {
  conn.status = 'connecting';
  renderConnections();
  updateStatusDots();
  log('info', `Connecting to ${conn.name}...`, conn.type.toUpperCase());

  try {
    switch (conn.type) {
      case 'mqtt':
        await connectMQTT(conn, {
          onClose: () => {
            conn.status = 'disconnected';
            renderConnections();
            updateStatusDots();
          }
        });
        break;
      case 'opcua':
        await connectOPCUA(conn);
        break;
      case 'opcda':
        await connectOPCDA(conn);
        break;
      case 'ignition':
        await connectIgnition(conn);
        break;
    }

    conn.status = 'connected';
    log('success', `Connected to ${conn.name}`, conn.type.toUpperCase());
  } catch (e) {
    conn.status = 'error';
    log('error', `Failed to connect: ${e.message}`, conn.type.toUpperCase());
  }

  renderConnections();
  updateStatusDots();
}

function updateStatusDots() {
  ['mqtt', 'opcua', 'opcda', 'ignition'].forEach(type => {
    const conn = state.connections.find(c => c.type === type);
    const dot = $(type + 'Status');
    if (dot) {
      dot.className = 'status-dot ' + (conn?.status || '');
    }
  });
}

// MQTT UI Handlers
$('mqttPublishBtn').onclick = () => {
  const topic = $('mqttPubTopic').value;
  const payload = $('mqttPubPayload').value;
  const qos = parseInt($('mqttPubQos').value);
  const retain = $('mqttPubRetain').value === 'true';

  if (!topic) {
    log('error', 'Topic is required', 'MQTT');
    return;
  }

  publish(topic, payload, qos, retain);
};

$('mqttSubscribeBtn').onclick = () => {
  const topic = $('mqttSubTopic').value;
  if (!topic) return;

  if (subscribe(topic)) {
    updateSubscriptionsList();
  }
};

$('mqttUnsubscribeBtn').onclick = () => {
  const topic = $('mqttSubTopic').value;
  if (!topic) return;

  if (unsubscribe(topic)) {
    updateSubscriptionsList();
  }
};

function updateSubscriptionsList() {
  const container = $('mqttSubscriptions');
  container.innerHTML = Array.from(mqttState.subscriptions)
    .map(t => `<div style="color: var(--cyan);">• ${escapeHtml(t)}</div>`)
    .join('') || '<div style="color: var(--text-dim);">No subscriptions</div>';
}

$('mqttClearBtn').onclick = () => {
  $('mqttMessages').innerHTML = '';
};

// OPC-UA UI Handlers
$('opcuaBrowseBtn').onclick = () => {
  const path = $('opcuaBrowsePath').value || 'Objects';
  browseOPCUA(path);
};

$('opcuaMonitorBtn').onclick = () => {
  const nodeId = $('opcuaNodeId').value;
  monitorNode(nodeId);
};

// OPC-DA UI Handlers
$('opcdaAddBtn').onclick = () => {
  const itemId = $('opcdaItemId').value;
  addItem(itemId);
};

// Ignition UI Handlers
$('ignitionReadBtn').onclick = () => {
  const tagPath = $('ignitionTagPath').value;
  readTag(tagPath);
};

$('ignitionWriteBtn').onclick = () => {
  const tagPath = $('ignitionTagPath').value;
  const value = prompt('Enter value to write:');
  if (value !== null) {
    writeTag(tagPath, value);
  }
};

// Ignition - Add Provider
$('addProviderBtn')?.addEventListener('click', () => {
  const name = prompt('Enter provider name:');
  if (name) {
    window.ignite?.createProvider(name);
  }
});

// Ignition - Add UDT
$('addUDTBtn')?.addEventListener('click', () => {
  const name = prompt('Enter UDT name:');
  if (!name) return;

  const membersStr = prompt('Enter members (comma-separated, format: name:type)\nExample: Temperature:Float8,Pressure:Float8,Running:Boolean');
  if (!membersStr) return;

  const members = membersStr.split(',').map(m => {
    const [mName, mType] = m.trim().split(':');
    return { name: mName, dataType: mType || 'Float8' };
  });

  window.ignite?.createUDT(name, members);
});

// Ignition - Add Folder
$('addFolderBtn')?.addEventListener('click', () => {
  const currentPath = $('ignitionTagPath').value || '[default]';
  const folderName = prompt('Enter folder name:');
  if (folderName) {
    const path = currentPath.includes('/') ? `${currentPath}/${folderName}` : `${currentPath}/${folderName}`;
    window.ignite?.createFolder(path);
  }
});

// Ignition - Add Tag
$('addTagBtn')?.addEventListener('click', () => {
  const currentPath = $('ignitionTagPath').value || '[default]';
  const tagName = prompt('Enter tag name:');
  if (!tagName) return;

  const dataType = prompt('Enter data type (Float8, Int4, Boolean, String) or UDT name:', 'Float8');
  if (!dataType) return;

  const path = currentPath.includes('/') ? `${currentPath}/${tagName}` : `${currentPath}/${tagName}`;

  // Check if it's a UDT
  const udtTypes = ['Motor', 'Valve']; // Known UDTs - in production would check ignitionState
  if (udtTypes.includes(dataType)) {
    window.ignite?.createTag(path, { udtType: dataType });
  } else {
    const engUnit = prompt('Enter engineering unit (optional):', '');
    window.ignite?.createTag(path, { dataType, engUnit });
  }
});

// Logs
$('logsClearBtn').onclick = () => {
  $('logsConsole').innerHTML = '';
};

// State Persistence
function saveState() {
  localStorage.setItem('konomi-ignite', JSON.stringify({
    connections: state.connections.map(c => ({...c, status: 'disconnected'}))
  }));
}

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem('konomi-ignite') || '{}');
    if (saved.connections) {
      state.connections = saved.connections;
      renderConnections();
    }
  } catch {}
}

// TagDB button
$('tagDBBtn')?.addEventListener('click', () => {
  showTagDBConfig();
});

// Initialize
loadState();
initTagDB();
initAI();
updateSubscriptionsList();
log('info', 'Konomi Ignite initialized', 'SYS');
log('info', 'Add a connection to get started', 'SYS');

// AI Action Buttons
$('aiScanTags')?.addEventListener('click', () => {
  const tagCount = ignitionState.tags.size;
  const udtCount = ignitionState.udts.size;
  aiChat(`I have ${tagCount} tags and ${udtCount} UDTs configured. Can you summarize the current setup?`);
});

$('aiOptimize')?.addEventListener('click', () => {
  aiChat('Analyze my current tag configuration and suggest optimizations for better organization and performance.');
});

$('aiCreateUDT')?.addEventListener('click', () => {
  const name = prompt('What type of equipment? (e.g., Motor, Pump, Valve, Tank)');
  if (name) {
    aiChat(`Design a UDT for a ${name} with appropriate member tags for industrial automation.`);
  }
});

$('aiTroubleshoot')?.addEventListener('click', () => {
  aiChat('I\'m having issues with my tags. Help me troubleshoot common problems with OPC connections and tag quality.');
});

// Update AI tag context when Ignition connects
const updateAIContext = () => {
  const container = $('aiTagContext');
  if (!container) return;

  if (ignitionState.tags.size === 0) {
    container.innerHTML = '<p style="color: var(--text-dim); font-size: 12px;">No tags configured yet.</p>';
    return;
  }

  let html = '<div style="font-size: 11px; max-height: 200px; overflow-y: auto;">';
  for (const [path, tag] of ignitionState.tags) {
    if (tag.type === 'folder') continue;
    const value = typeof tag.value === 'object' ? '{...}' : tag.value;
    html += `<div style="padding: 3px 0; border-bottom: 1px solid var(--border);">
      <span style="color: var(--cyan);">${escapeHtml(path)}</span>
      <span style="float: right; font-family: monospace;">${value}</span>
    </div>`;
  }
  html += '</div>';
  container.innerHTML = html;
};

// Hook into connection events
const origConnectIgnition = connectIgnition;
window.addEventListener('load', () => {
  setInterval(updateAIContext, 2000);
});
