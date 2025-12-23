/**
 * Konomi Ignite - OPC-DA Protocol Handler
 */

import { $, escapeHtml, log } from './utils.js';

export const opcdaState = {
  gateway: null,
  items: new Map()
};

export async function connectOPCDA(conn) {
  const { gateway, progId, host } = conn.config;

  log('info', `Connecting to OPC-DA via gateway: ${gateway}`, 'OPCDA');
  log('info', `Server: ${progId} on ${host}`, 'OPCDA');

  opcdaState.gateway = { gateway, progId, host };

  // Populate tag tree with demo structure
  const tree = $('opcdaTree');
  tree.innerHTML = `
    <div class="tag-node expanded">
      <div class="tag-node-header">
        <span class="tag-node-icon">📁</span>
        <span class="tag-node-name">Channel1</span>
      </div>
      <div class="tag-node-children">
        <div class="tag-node expanded">
          <div class="tag-node-header">
            <span class="tag-node-icon">📁</span>
            <span class="tag-node-name">Device1</span>
          </div>
          <div class="tag-node-children">
            <div class="tag-node">
              <div class="tag-node-header" data-itemid="Channel1.Device1.Tag1">
                <span class="tag-node-icon">🏷️</span>
                <span class="tag-node-name">Tag1</span>
                <span class="tag-node-value">42</span>
              </div>
            </div>
            <div class="tag-node">
              <div class="tag-node-header" data-itemid="Channel1.Device1.Tag2">
                <span class="tag-node-icon">🏷️</span>
                <span class="tag-node-name">Tag2</span>
                <span class="tag-node-value">3.14</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  // Add click handlers to tag nodes
  tree.querySelectorAll('[data-itemid]').forEach(node => {
    node.onclick = () => {
      $('opcdaItemId').value = node.dataset.itemid;
    };
  });
}

export function addItem(itemId) {
  if (!itemId) return;

  const tbody = $('opcdaItems');
  const row = document.createElement('tr');
  row.innerHTML = `
    <td>${escapeHtml(itemId)}</td>
    <td class="value">--</td>
    <td><span class="tag-node-quality good">Good</span></td>
    <td>${new Date().toLocaleTimeString()}</td>
    <td><button class="btn btn-sm btn-danger" onclick="this.closest('tr').remove()">×</button></td>
  `;
  tbody.appendChild(row);

  opcdaState.items.set(itemId, row);
  log('info', `Added item: ${itemId}`, 'OPCDA');

  // Simulate updates
  const intervalId = setInterval(() => {
    if (!row.parentNode) {
      clearInterval(intervalId);
      opcdaState.items.delete(itemId);
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

export async function readItem(itemId) {
  if (!opcdaState.gateway) {
    log('error', 'Not connected to OPC-DA gateway', 'OPCDA');
    return null;
  }

  log('info', `Reading: ${itemId}`, 'OPCDA');
  const value = (Math.random() * 100).toFixed(2);
  log('success', `Read ${itemId} = ${value}`, 'OPCDA');
  return value;
}

export async function writeItem(itemId, value) {
  if (!opcdaState.gateway) {
    log('error', 'Not connected to OPC-DA gateway', 'OPCDA');
    return false;
  }

  log('info', `Writing ${value} to ${itemId}`, 'OPCDA');
  log('success', `Wrote ${value} to ${itemId}`, 'OPCDA');
  return true;
}
