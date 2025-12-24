/**
 * KonoBridge - Tunnel local services through P2P
 *
 * Run this in a browser on your Ignition host to expose
 * Perspective to remote clients via KonoVPN tunnel
 *
 * Flow:
 * 1. Bridge connects to KonoVPN (Tailscale or WebRTC)
 * 2. Remote clients request pages through tunnel
 * 3. Bridge fetches from localhost and returns response
 * 4. Client renders the Perspective UI
 */

import * as vpn from '../konovpn/index.js';

// Bridge config
let config = {
  localHost: 'localhost',
  localPort: 8088,
  basePath: '/main/web/perspective',
  protocol: 'http'
};

// Active sessions
const sessions = new Map();
let bridgeId = null;
let isRunning = false;

/**
 * Initialize the bridge
 */
export async function init(options = {}) {
  config = { ...config, ...options };

  // Init VPN
  const vpnStatus = await vpn.init();
  bridgeId = vpnStatus.peerId;

  console.log(`🌉 KonoBridge initialized (ID: ${bridgeId})`);

  return { bridgeId, config };
}

/**
 * Start the bridge - listen for tunnel requests
 */
export function start() {
  if (isRunning) return;
  isRunning = true;

  // Listen for messages on VPN
  // In a full implementation, this hooks into vpn.onMessage
  console.log('🌉 Bridge started, listening for tunnel requests');
  console.log(`   Proxying to ${config.protocol}://${config.localHost}:${config.localPort}${config.basePath}`);

  return { bridgeId, status: 'running' };
}

/**
 * Stop the bridge
 */
export function stop() {
  isRunning = false;
  sessions.clear();
  console.log('🌉 Bridge stopped');
}

/**
 * Handle incoming tunnel request
 */
export async function handleRequest(request) {
  if (!isRunning) {
    return { error: 'Bridge not running' };
  }

  const { method, path, headers, body, sessionId } = request;

  // Build local URL
  const localUrl = `${config.protocol}://${config.localHost}:${config.localPort}${config.basePath}${path || ''}`;

  try {
    // Fetch from local Ignition
    const response = await fetch(localUrl, {
      method: method || 'GET',
      headers: {
        ...headers,
        'X-Forwarded-For': request.clientId || 'unknown',
        'X-Bridge-Session': sessionId || ''
      },
      body: method !== 'GET' && method !== 'HEAD' ? body : undefined,
      credentials: 'include'
    });

    // Get response data
    const contentType = response.headers.get('content-type') || '';
    let responseData;

    if (contentType.includes('text') || contentType.includes('json') || contentType.includes('javascript')) {
      responseData = await response.text();

      // Rewrite URLs in HTML/JS to go through tunnel
      if (contentType.includes('html')) {
        responseData = rewriteHtml(responseData);
      }
    } else {
      // Binary data - base64 encode
      const buffer = await response.arrayBuffer();
      responseData = btoa(String.fromCharCode(...new Uint8Array(buffer)));
    }

    return {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      body: responseData,
      binary: !contentType.includes('text') && !contentType.includes('json')
    };

  } catch (e) {
    console.error('Bridge fetch error:', e);
    return {
      status: 502,
      statusText: 'Bad Gateway',
      error: e.message
    };
  }
}

/**
 * Rewrite HTML to route through tunnel
 */
function rewriteHtml(html) {
  // Rewrite absolute URLs to use tunnel
  // This is simplified - real implementation needs more sophisticated rewriting
  return html
    .replace(/src="\//g, 'src="/__tunnel__/')
    .replace(/href="\//g, 'href="/__tunnel__/')
    .replace(/url\(\//g, 'url(/__tunnel__/');
}

/**
 * Create a WebSocket tunnel for real-time Perspective updates
 */
export function createWebSocketTunnel(path) {
  const wsUrl = `ws://${config.localHost}:${config.localPort}${config.basePath}${path}`;

  return {
    localUrl: wsUrl,
    // In full implementation, this would create a WebSocket and
    // relay messages through the VPN data channel
    connect: () => {
      console.log(`🔌 Would tunnel WebSocket to ${wsUrl}`);
    }
  };
}

/**
 * Get bridge status
 */
export function getStatus() {
  return {
    bridgeId,
    running: isRunning,
    config,
    sessions: sessions.size,
    vpnStatus: vpn.getStatus()
  };
}

/**
 * Test local connection to Ignition
 */
export async function testConnection() {
  const testUrl = `${config.protocol}://${config.localHost}:${config.localPort}/StatusPing`;

  try {
    const response = await fetch(testUrl);
    const data = await response.json();

    return {
      success: true,
      ignitionStatus: data,
      url: testUrl
    };
  } catch (e) {
    return {
      success: false,
      error: e.message,
      url: testUrl
    };
  }
}

// Export for window
if (typeof window !== 'undefined') {
  window.KonoBridge = {
    init,
    start,
    stop,
    handleRequest,
    createWebSocketTunnel,
    getStatus,
    testConnection
  };
}
