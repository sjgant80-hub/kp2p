/**
 * KonoVPN Widget
 * Tailscale integration + WebRTC P2P fallback
 *
 * Embeddable widget for any Kono app to get VPN capabilities
 */

// Tailscale OAuth config
const TAILSCALE_AUTH_URL = 'https://login.tailscale.com/authorize';
const TAILSCALE_TOKEN_URL = 'https://api.tailscale.com/api/v2/oauth/token';
const TAILSCALE_API_URL = 'https://api.tailscale.com/api/v2';

// State
let tailscaleToken = null;
let tailscaleUser = null;
let tailnet = null;
let devices = [];
let peers = new Map();
let localPeerId = null;

// WebRTC config
const RTC_CONFIG = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ]
};

/**
 * Initialize KonoVPN widget
 */
export async function init(options = {}) {
  localPeerId = crypto.randomUUID().substring(0, 8);

  // Check for stored Tailscale token
  const stored = localStorage.getItem('konovpn-tailscale');
  if (stored) {
    try {
      const data = JSON.parse(stored);
      tailscaleToken = data.token;
      await refreshTailscaleStatus();
    } catch (e) {
      localStorage.removeItem('konovpn-tailscale');
    }
  }

  return {
    peerId: localPeerId,
    connected: !!tailscaleToken,
    tailnet: tailnet?.name || null
  };
}

/**
 * Start Tailscale OAuth flow
 * Requires a registered OAuth client from Tailscale admin console
 */
export function loginWithTailscale(clientId, redirectUri) {
  if (!clientId) {
    throw new Error('Tailscale OAuth client ID required. Get one at https://login.tailscale.com/admin/settings/oauth');
  }

  // Generate state for CSRF protection
  const state = crypto.randomUUID();
  sessionStorage.setItem('konovpn-oauth-state', state);

  // Build auth URL
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri || window.location.origin + '/auth/callback',
    response_type: 'code',
    scope: 'devices:read routes:read',
    state: state
  });

  // Redirect to Tailscale login
  window.location.href = `${TAILSCALE_AUTH_URL}?${params}`;
}

/**
 * Handle OAuth callback
 */
export async function handleOAuthCallback(code, state, clientId, clientSecret) {
  // Verify state
  const storedState = sessionStorage.getItem('konovpn-oauth-state');
  if (state !== storedState) {
    throw new Error('OAuth state mismatch - possible CSRF attack');
  }
  sessionStorage.removeItem('konovpn-oauth-state');

  // Exchange code for token
  // Note: In production, this should happen server-side to protect client_secret
  const response = await fetch(TAILSCALE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code: code,
      client_id: clientId,
      client_secret: clientSecret
    })
  });

  if (!response.ok) {
    throw new Error('Failed to exchange OAuth code for token');
  }

  const data = await response.json();
  tailscaleToken = data.access_token;

  // Store token
  localStorage.setItem('konovpn-tailscale', JSON.stringify({
    token: tailscaleToken,
    expires: Date.now() + (data.expires_in * 1000)
  }));

  // Get initial status
  await refreshTailscaleStatus();

  return { success: true, tailnet: tailnet?.name };
}

/**
 * Login with API key (alternative to OAuth)
 */
export async function loginWithApiKey(apiKey) {
  tailscaleToken = apiKey;

  try {
    await refreshTailscaleStatus();

    localStorage.setItem('konovpn-tailscale', JSON.stringify({
      token: apiKey,
      type: 'api_key'
    }));

    return { success: true, tailnet: tailnet?.name };
  } catch (e) {
    tailscaleToken = null;
    throw e;
  }
}

/**
 * Logout
 */
export function logout() {
  tailscaleToken = null;
  tailscaleUser = null;
  tailnet = null;
  devices = [];
  localStorage.removeItem('konovpn-tailscale');
}

/**
 * Refresh Tailscale status
 */
async function refreshTailscaleStatus() {
  if (!tailscaleToken) return;

  // Get tailnet info
  const tailnetResp = await fetch(`${TAILSCALE_API_URL}/tailnet/-/devices`, {
    headers: { 'Authorization': `Bearer ${tailscaleToken}` }
  });

  if (!tailnetResp.ok) {
    if (tailnetResp.status === 401) {
      logout();
      throw new Error('Tailscale token expired');
    }
    throw new Error(`Tailscale API error: ${tailnetResp.status}`);
  }

  const data = await tailnetResp.json();
  devices = data.devices || [];

  // Extract tailnet name from first device
  if (devices.length > 0 && devices[0].name) {
    const parts = devices[0].name.split('.');
    if (parts.length >= 2) {
      tailnet = { name: parts.slice(1).join('.') };
    }
  }
}

/**
 * Get Tailscale devices
 */
export async function getDevices() {
  if (!tailscaleToken) return [];

  await refreshTailscaleStatus();

  return devices.map(d => ({
    id: d.id,
    name: d.name?.split('.')[0] || d.hostname,
    hostname: d.hostname,
    addresses: d.addresses || [],
    os: d.os,
    online: d.online,
    lastSeen: d.lastSeen,
    tags: d.tags || []
  }));
}

/**
 * Get connection status
 */
export function getStatus() {
  return {
    connected: !!tailscaleToken,
    tailnet: tailnet?.name || null,
    deviceCount: devices.length,
    onlineCount: devices.filter(d => d.online).length,
    peerId: localPeerId,
    webrtcPeers: peers.size
  };
}

/**
 * Get current tailnet name
 */
export function getTailnet() {
  return tailnet?.name || null;
}

// ============================================
// WebRTC P2P Layer (fallback / browser-only)
// ============================================

/**
 * Create WebRTC peer connection
 */
export async function connectToPeer(remotePeerId, signalChannel) {
  const pc = new RTCPeerConnection(RTC_CONFIG);
  const dataChannel = pc.createDataChannel('konovpn');

  // Handle ICE candidates
  pc.onicecandidate = (e) => {
    if (e.candidate) {
      signalChannel.send({
        type: 'ice-candidate',
        from: localPeerId,
        to: remotePeerId,
        candidate: e.candidate
      });
    }
  };

  // Handle connection state
  pc.onconnectionstatechange = () => {
    if (pc.connectionState === 'connected') {
      peers.set(remotePeerId, { pc, dataChannel, connected: true });
    } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
      peers.delete(remotePeerId);
    }
  };

  // Create offer
  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);

  signalChannel.send({
    type: 'offer',
    from: localPeerId,
    to: remotePeerId,
    sdp: offer
  });

  peers.set(remotePeerId, { pc, dataChannel, connected: false });

  return { peerId: remotePeerId };
}

/**
 * Handle incoming WebRTC signal
 */
export async function handleSignal(signal, signalChannel) {
  const { type, from, sdp, candidate } = signal;

  if (type === 'offer') {
    const pc = new RTCPeerConnection(RTC_CONFIG);

    pc.ondatachannel = (e) => {
      const dc = e.channel;
      dc.onmessage = handleDataChannelMessage;
      peers.set(from, { pc, dataChannel: dc, connected: true });
    };

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        signalChannel.send({
          type: 'ice-candidate',
          from: localPeerId,
          to: from,
          candidate: e.candidate
        });
      }
    };

    await pc.setRemoteDescription(new RTCSessionDescription(sdp));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    signalChannel.send({
      type: 'answer',
      from: localPeerId,
      to: from,
      sdp: answer
    });

  } else if (type === 'answer') {
    const peer = peers.get(from);
    if (peer) {
      await peer.pc.setRemoteDescription(new RTCSessionDescription(sdp));
    }

  } else if (type === 'ice-candidate') {
    const peer = peers.get(from);
    if (peer) {
      await peer.pc.addIceCandidate(new RTCIceCandidate(candidate));
    }
  }
}

/**
 * Handle data channel message
 */
function handleDataChannelMessage(event) {
  try {
    const message = JSON.parse(event.data);
    // Handle tunneled messages
    console.log('KonoVPN received:', message);
  } catch (e) {
    console.error('Invalid message:', e);
  }
}

/**
 * Send data through VPN tunnel
 */
export function send(peerId, data) {
  const peer = peers.get(peerId);
  if (peer?.dataChannel?.readyState === 'open') {
    peer.dataChannel.send(JSON.stringify(data));
    return true;
  }
  return false;
}

/**
 * Broadcast to all peers
 */
export function broadcast(data) {
  const payload = JSON.stringify(data);
  let sent = 0;

  for (const [id, peer] of peers) {
    if (peer.dataChannel?.readyState === 'open') {
      peer.dataChannel.send(payload);
      sent++;
    }
  }

  return sent;
}

/**
 * Get connected WebRTC peers
 */
export function getPeers() {
  return Array.from(peers.entries()).map(([id, peer]) => ({
    id,
    connected: peer.connected,
    channelState: peer.dataChannel?.readyState
  }));
}

/**
 * Disconnect from peer
 */
export function disconnectPeer(peerId) {
  const peer = peers.get(peerId);
  if (peer) {
    peer.dataChannel?.close();
    peer.pc?.close();
    peers.delete(peerId);
  }
}

/**
 * Disconnect all
 */
export function disconnectAll() {
  for (const [id] of peers) {
    disconnectPeer(id);
  }
}

// Export for window access
if (typeof window !== 'undefined') {
  window.KonoVPN = {
    init,
    loginWithTailscale,
    loginWithApiKey,
    handleOAuthCallback,
    logout,
    getDevices,
    getStatus,
    getTailnet,
    connectToPeer,
    handleSignal,
    send,
    broadcast,
    getPeers,
    disconnectPeer,
    disconnectAll
  };
}
