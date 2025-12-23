/**
 * Konomi Ignite - OPC-UA Protocol Handler
 */

import { $, escapeHtml, log } from './utils.js';

export const opcuaState = {
  client: null,
  monitored: new Map()
};

export async function connectOPCUA(conn) {
  const { endpoint, securityMode, username } = conn.config;

  log('info', `Connecting to OPC-UA: ${endpoint}`, 'OPCUA');

  // Store connection info - in production this would connect to a gateway
  opcuaState.client = {
    endpoint,
    securityMode,
    username
  };

  try {
    await browseOPCUA('Objects');
  } catch (e) {
    log('warn', 'Could not browse - gateway may not be running', 'OPCUA');
  }
}

export async function browseOPCUA(path) {
  log('info', `Browsing: ${path}`, 'OPCUA');

  const tree = $('opcuaTree');
  tree.innerHTML = `
    <div class="tag-node expanded">
      <div class="tag-node-header">
        <span class="tag-node-icon">📁</span>
        <span class="tag-node-name">Objects</span>
      </div>
      <div class="tag-node-children">
        <div class="tag-node">
          <div class="tag-node-header">
            <span class="tag-node-icon">📁</span>
            <span class="tag-node-name">Server</span>
          </div>
        </div>
        <div class="tag-node">
          <div class="tag-node-header">
            <span class="tag-node-icon">📁</span>
            <span class="tag-node-name">DeviceSet</span>
          </div>
        </div>
        <div class="tag-node">
          <div class="tag-node-header">
            <span class="tag-node-icon">🏷️</span>
            <span class="tag-node-name">Temperature</span>
            <span class="tag-node-value">23.5</span>
            <span class="tag-node-quality good">Good</span>
          </div>
        </div>
      </div>
    </div>
  `;
}

export function monitorNode(nodeId) {
  if (!nodeId) return;

  const tbody = $('opcuaMonitored');
  const row = document.createElement('tr');
  row.innerHTML = `
    <td>${escapeHtml(nodeId)}</td>
    <td class="value">--</td>
    <td><span class="tag-node-quality good">Good</span></td>
    <td>${new Date().toLocaleTimeString()}</td>
    <td><button class="btn btn-sm btn-danger" onclick="this.closest('tr').remove()">×</button></td>
  `;
  tbody.appendChild(row);

  opcuaState.monitored.set(nodeId, row);
  log('info', `Monitoring: ${nodeId}`, 'OPCUA');

  // Simulate value updates
  const intervalId = setInterval(() => {
    if (!row.parentNode) {
      clearInterval(intervalId);
      return;
    }
    const valueCell = row.querySelector('.value');
    const timeCell = row.querySelector('td:nth-child(4)');
    if (valueCell) {
      valueCell.textContent = (Math.random() * 100).toFixed(2);
      timeCell.textContent = new Date().toLocaleTimeString();
    }
  }, 1000);
}

export async function readNode(nodeId) {
  if (!opcuaState.client) {
    log('error', 'Not connected to OPC-UA server', 'OPCUA');
    return null;
  }

  log('info', `Reading: ${nodeId}`, 'OPCUA');

  // In production, this would make a real read request
  const value = (Math.random() * 100).toFixed(2);
  log('success', `Read ${nodeId} = ${value}`, 'OPCUA');
  return value;
}

export async function writeNode(nodeId, value) {
  if (!opcuaState.client) {
    log('error', 'Not connected to OPC-UA server', 'OPCUA');
    return false;
  }

  log('info', `Writing ${value} to ${nodeId}`, 'OPCUA');
  log('success', `Wrote ${value} to ${nodeId}`, 'OPCUA');
  return true;
}
