/**
 * KonoVPN Management App
 */

import * as vpn from '../../widgets/konovpn/index.js';

const $ = id => document.getElementById(id);

// State
let refreshInterval = null;

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  const status = await vpn.init();
  $('localPeerId').textContent = status.peerId;

  if (status.connected) {
    showConnectedPanel();
    await refreshUI();
  }

  setupEventListeners();
});

function setupEventListeners() {
  // API Key login
  $('loginApiKeyBtn').addEventListener('click', async () => {
    const apiKey = $('apiKey').value.trim();
    if (!apiKey) {
      alert('Please enter a Tailscale API key');
      return;
    }

    try {
      $('loginApiKeyBtn').textContent = 'Connecting...';
      $('loginApiKeyBtn').disabled = true;

      await vpn.loginWithApiKey(apiKey);
      showConnectedPanel();
      await refreshUI();
    } catch (e) {
      alert('Login failed: ' + e.message);
    } finally {
      $('loginApiKeyBtn').textContent = 'Connect with API Key';
      $('loginApiKeyBtn').disabled = false;
    }
  });

  // OAuth login
  $('loginOAuthBtn').addEventListener('click', () => {
    const clientId = $('clientId').value.trim();
    if (!clientId) {
      alert('Please enter your OAuth Client ID');
      return;
    }

    try {
      vpn.loginWithTailscale(clientId);
    } catch (e) {
      alert('OAuth error: ' + e.message);
    }
  });

  // WebRTC only mode
  $('webrtcOnlyBtn').addEventListener('click', () => {
    showConnectedPanel();
    updateStatus({ connected: true, mode: 'webrtc' });
  });

  // Refresh devices
  $('refreshDevicesBtn').addEventListener('click', refreshDevices);

  // Add peer
  $('addPeerBtn').addEventListener('click', showAddPeerModal);

  // Disconnect
  $('disconnectBtn').addEventListener('click', () => {
    vpn.logout();
    vpn.disconnectAll();
    showLoginPanel();
  });

  // Copy peer ID
  $('copyPeerIdBtn').addEventListener('click', () => {
    const peerId = $('localPeerId').textContent;
    navigator.clipboard.writeText(peerId);
    $('copyPeerIdBtn').textContent = 'Copied!';
    setTimeout(() => {
      $('copyPeerIdBtn').textContent = 'Copy';
    }, 1500);
  });

  // Handle OAuth callback
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.has('code')) {
    handleOAuthCallback(urlParams);
  }
}

async function handleOAuthCallback(params) {
  const code = params.get('code');
  const state = params.get('state');

  // Clear URL
  window.history.replaceState({}, '', window.location.pathname);

  // Note: In production, client_secret should be handled server-side
  const clientId = localStorage.getItem('konovpn-oauth-clientid') || '';
  const clientSecret = prompt('Enter your OAuth Client Secret (for demo only - use server-side in production):');

  if (!clientSecret) return;

  try {
    await vpn.handleOAuthCallback(code, state, clientId, clientSecret);
    showConnectedPanel();
    await refreshUI();
  } catch (e) {
    alert('OAuth callback failed: ' + e.message);
  }
}

function showLoginPanel() {
  $('loginPanel').style.display = 'block';
  $('connectedPanel').style.display = 'none';
  updateStatus({ connected: false });

  if (refreshInterval) {
    clearInterval(refreshInterval);
    refreshInterval = null;
  }
}

function showConnectedPanel() {
  $('loginPanel').style.display = 'none';
  $('connectedPanel').style.display = 'block';

  // Start refresh interval
  refreshInterval = setInterval(refreshUI, 5000);
}

async function refreshUI() {
  const status = vpn.getStatus();
  updateStatus(status);

  $('tailnetName').textContent = status.tailnet || 'WebRTC Only';
  $('deviceCount').textContent = status.deviceCount;
  $('onlineCount').textContent = status.onlineCount;
  $('peerCount').textContent = status.webrtcPeers;

  await refreshDevices();
  refreshPeers();
}

function updateStatus(status) {
  const statusEl = $('connectionStatus');
  const dot = statusEl.querySelector('.status-dot');
  const text = statusEl.querySelector('span:last-child');

  if (status.connected) {
    dot.className = 'status-dot connected';
    text.textContent = status.tailnet ? `Connected to ${status.tailnet}` : 'P2P Mode';
  } else {
    dot.className = 'status-dot disconnected';
    text.textContent = 'Disconnected';
  }
}

async function refreshDevices() {
  const devices = await vpn.getDevices();
  const list = $('deviceList');

  if (devices.length === 0) {
    list.innerHTML = '<div class="empty">No devices in tailnet</div>';
    return;
  }

  list.innerHTML = devices.map(d => `
    <div class="device-item ${d.online ? 'online' : 'offline'}">
      <div class="device-icon">${getDeviceIcon(d.os)}</div>
      <div class="device-info">
        <div class="device-name">${d.name}</div>
        <div class="device-meta">
          <span>${d.os || 'Unknown OS'}</span>
          <span>${d.addresses[0] || 'No IP'}</span>
        </div>
      </div>
      <div class="device-status">
        <span class="status-indicator ${d.online ? 'online' : 'offline'}"></span>
        ${d.online ? 'Online' : 'Offline'}
      </div>
    </div>
  `).join('');
}

function refreshPeers() {
  const peers = vpn.getPeers();
  const list = $('peerList');

  if (peers.length === 0) {
    list.innerHTML = '<div class="empty">No P2P peers connected</div>';
    return;
  }

  list.innerHTML = peers.map(p => `
    <div class="peer-item ${p.connected ? 'connected' : 'connecting'}">
      <div class="peer-id">${p.id}</div>
      <div class="peer-status">${p.connected ? '🟢 Connected' : '🟡 Connecting'}</div>
      <button class="btn btn-sm btn-danger" onclick="disconnectPeer('${p.id}')">×</button>
    </div>
  `).join('');
}

function showAddPeerModal() {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal">
      <h3>Add P2P Peer</h3>
      <p>Enter the Peer ID of another KonoVPN user to connect directly.</p>
      <div class="form-group">
        <input type="text" id="remotePeerId" placeholder="Peer ID (e.g., abc123)">
      </div>
      <div class="modal-actions">
        <button class="btn" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
        <button class="btn btn-primary" id="connectPeerBtn">Connect</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  $('connectPeerBtn').addEventListener('click', async () => {
    const peerId = $('remotePeerId').value.trim();
    if (!peerId) return;

    // For demo, we'd need a signaling server
    // In production, this could use the Tailscale network or a shared channel
    alert(`To connect to peer ${peerId}, you need a signaling channel.\n\nIn a full implementation, peers would exchange signals via:\n- Tailscale DERP servers\n- A shared TagDB channel\n- Direct IP (if known)`);

    modal.remove();
  });
}

function getDeviceIcon(os) {
  if (!os) return '💻';
  const lower = os.toLowerCase();
  if (lower.includes('mac') || lower.includes('darwin')) return '🍎';
  if (lower.includes('windows')) return '🪟';
  if (lower.includes('linux')) return '🐧';
  if (lower.includes('ios') || lower.includes('iphone')) return '📱';
  if (lower.includes('android')) return '🤖';
  return '💻';
}

// Expose for inline handlers
window.disconnectPeer = (id) => {
  vpn.disconnectPeer(id);
  refreshPeers();
};
