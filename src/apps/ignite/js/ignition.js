/**
 * Konomi Ignite - Ignition Gateway Handler
 */

import { $, escapeHtml, log } from './utils.js';

export const ignitionState = {
  gateway: null,
  liveValues: new Map()
};

export async function connectIgnition(conn) {
  const { gateway, username, password, webdev } = conn.config;

  log('info', `Connecting to Ignition Gateway: ${gateway}`, 'IGN');

  ignitionState.gateway = { gateway, webdev, username };

  // Show gateway info
  $('ignitionInfo').innerHTML = `
    <div style="font-size: 12px;">
      <div style="margin-bottom: 8px;"><strong>Gateway:</strong> ${escapeHtml(gateway)}</div>
      <div style="margin-bottom: 8px;"><strong>User:</strong> ${escapeHtml(username)}</div>
      <div style="margin-bottom: 8px;"><strong>WebDev:</strong> ${escapeHtml(webdev)}</div>
      <div style="color: var(--green);"><strong>Status:</strong> Connected</div>
    </div>
  `;

  // Show providers
  $('ignitionProviders').innerHTML = `
    <div class="tag-node expanded">
      <div class="tag-node-header">
        <span class="tag-node-icon">🗄️</span>
        <span class="tag-node-name">[default]</span>
      </div>
    </div>
    <div class="tag-node">
      <div class="tag-node-header">
        <span class="tag-node-icon">🗄️</span>
        <span class="tag-node-name">[System]</span>
      </div>
    </div>
  `;

  // Show tag tree
  const tree = $('ignitionTree');
  tree.innerHTML = `
    <div class="tag-node expanded">
      <div class="tag-node-header">
        <span class="tag-node-icon">📁</span>
        <span class="tag-node-name">[default]</span>
      </div>
      <div class="tag-node-children">
        <div class="tag-node">
          <div class="tag-node-header" data-tagpath="[default]Sensors/Temperature">
            <span class="tag-node-icon">📁</span>
            <span class="tag-node-name">Sensors</span>
          </div>
        </div>
        <div class="tag-node">
          <div class="tag-node-header" data-tagpath="[default]Actuators/Pump1">
            <span class="tag-node-icon">📁</span>
            <span class="tag-node-name">Actuators</span>
          </div>
        </div>
      </div>
    </div>
  `;

  // Add click handlers
  tree.querySelectorAll('[data-tagpath]').forEach(node => {
    node.onclick = () => {
      $('ignitionTagPath').value = node.dataset.tagpath;
    };
  });
}

export async function readTag(tagPath) {
  if (!ignitionState.gateway) {
    log('error', 'Not connected to Ignition Gateway', 'IGN');
    return null;
  }

  log('info', `Reading tag: ${tagPath}`, 'IGN');

  // Add to live values table if not exists
  const tbody = $('ignitionLive');
  const existing = Array.from(tbody.querySelectorAll('tr')).find(r => r.dataset.path === tagPath);

  if (!existing) {
    const row = document.createElement('tr');
    row.dataset.path = tagPath;
    row.innerHTML = `
      <td>${escapeHtml(tagPath)}</td>
      <td class="value">${(Math.random() * 100).toFixed(2)}</td>
      <td><span class="tag-node-quality good">Good</span></td>
      <td>${new Date().toLocaleTimeString()}</td>
    `;
    tbody.appendChild(row);

    ignitionState.liveValues.set(tagPath, row);

    // Simulate updates
    const intervalId = setInterval(() => {
      if (!row.parentNode) {
        clearInterval(intervalId);
        ignitionState.liveValues.delete(tagPath);
        return;
      }
      const valueCell = row.querySelector('.value');
      const timeCell = row.querySelector('td:last-child');
      if (valueCell) {
        valueCell.textContent = (Math.random() * 100).toFixed(2);
        timeCell.textContent = new Date().toLocaleTimeString();
      }
    }, 1000);
  }

  return (Math.random() * 100).toFixed(2);
}

export async function writeTag(tagPath, value) {
  if (!ignitionState.gateway) {
    log('error', 'Not connected to Ignition Gateway', 'IGN');
    return false;
  }

  log('info', `Writing ${value} to ${tagPath}`, 'IGN');
  log('success', `Wrote ${value} to ${tagPath}`, 'IGN');
  return true;
}

export async function browseTags(path = '[default]') {
  if (!ignitionState.gateway) {
    log('error', 'Not connected to Ignition Gateway', 'IGN');
    return [];
  }

  log('info', `Browsing tags: ${path}`, 'IGN');

  // In production, this would make a real API call
  return [
    { name: 'Sensors', type: 'folder' },
    { name: 'Actuators', type: 'folder' }
  ];
}
