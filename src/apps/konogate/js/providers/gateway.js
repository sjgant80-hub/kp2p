/**
 * KonoGate - Gateway Tag Provider
 * Manages gateway state as tags (ISA-95 style)
 */

import { createInstance, GatewayUDT, ProviderUDT, EndpointUDT, RequestUDT, RateLimitUDT, AlertUDT } from '../udts/api.js';

// Tag storage
const tags = new Map();
const listeners = new Map();

// Gateway state
const state = {
  gateway: null,
  providers: new Map(),
  endpoints: new Map(),
  requests: [],
  rateLimits: new Map(),
  alerts: []
};

// Initialize gateway
export function initGateway(config = {}) {
  state.gateway = createInstance(GatewayUDT, {
    ID: 'GW-001',
    Name: config.name || 'KonoGate',
    Status: 'running',
    StartTime: new Date().toISOString()
  });

  writeTag('Gateway/Status', 'running');
  writeTag('Gateway/StartTime', state.gateway.StartTime);
  writeTag('Gateway/TotalRequests', 0);
  writeTag('Gateway/BlockedRequests', 0);

  return state.gateway;
}

// Write a tag
export function writeTag(path, value, quality = 'Good') {
  const tag = {
    path,
    value,
    quality,
    timestamp: new Date().toISOString()
  };
  tags.set(path, tag);
  notifyListeners(path, tag);
  return tag;
}

// Read a tag
export function readTag(path) {
  return tags.get(path) || null;
}

// Subscribe to tag changes
export function subscribe(path, callback) {
  if (!listeners.has(path)) listeners.set(path, []);
  listeners.get(path).push(callback);
  return () => {
    const arr = listeners.get(path);
    const idx = arr.indexOf(callback);
    if (idx >= 0) arr.splice(idx, 1);
  };
}

// Notify listeners
function notifyListeners(path, tag) {
  // Exact match
  if (listeners.has(path)) {
    listeners.get(path).forEach(cb => cb(tag));
  }
  // Wildcard match
  listeners.forEach((cbs, pattern) => {
    if (pattern.endsWith('/*') && path.startsWith(pattern.slice(0, -1))) {
      cbs.forEach(cb => cb(tag));
    }
  });
}

// Add a provider
export function addProvider(config) {
  const provider = createInstance(ProviderUDT, {
    ID: `PRV-${Date.now()}`,
    ...config
  });
  state.providers.set(provider.ID, provider);

  writeTag(`Providers/${provider.ID}/Name`, provider.Name);
  writeTag(`Providers/${provider.ID}/BaseURL`, provider.BaseURL);
  writeTag(`Providers/${provider.ID}/Enabled`, provider.Enabled);
  writeTag(`Providers/${provider.ID}/RequestCount`, 0);

  return provider;
}

// Add an endpoint
export function addEndpoint(config) {
  const endpoint = createInstance(EndpointUDT, {
    ID: `EP-${Date.now()}`,
    ...config
  });
  state.endpoints.set(endpoint.ID, endpoint);

  const path = `Endpoints/${endpoint.ID}`;
  writeTag(`${path}/Method`, endpoint.Method);
  writeTag(`${path}/Path`, endpoint.Path);
  writeTag(`${path}/RateLimit`, endpoint.RateLimit);
  writeTag(`${path}/RequestCount`, 0);

  return endpoint;
}

// Record a request
export function recordRequest(req) {
  const request = createInstance(RequestUDT, {
    ID: `REQ-${Date.now()}`,
    Timestamp: new Date().toISOString(),
    ...req
  });

  state.requests.push(request);
  if (state.requests.length > 1000) state.requests.shift();

  // Update gateway stats
  const total = (readTag('Gateway/TotalRequests')?.value || 0) + 1;
  writeTag('Gateway/TotalRequests', total);

  if (request.Blocked) {
    const blocked = (readTag('Gateway/BlockedRequests')?.value || 0) + 1;
    writeTag('Gateway/BlockedRequests', blocked);
  }

  return request;
}

// Check rate limit
export function checkRateLimit(target, targetId = '') {
  const key = `${target}:${targetId}`;
  let limit = state.rateLimits.get(key);

  if (!limit) {
    limit = createInstance(RateLimitUDT, {
      ID: key,
      Target: target,
      TargetID: targetId,
      WindowStart: new Date().toISOString()
    });
    state.rateLimits.set(key, limit);
  }

  // Check window
  const windowStart = new Date(limit.WindowStart);
  const now = new Date();
  const elapsed = (now - windowStart) / 1000;

  if (elapsed >= limit.WindowSeconds) {
    // Reset window
    limit.CurrentCount = 0;
    limit.WindowStart = now.toISOString();
  }

  limit.CurrentCount++;

  if (limit.CurrentCount > limit.MaxRequests) {
    return { allowed: false, remaining: 0, resetIn: limit.WindowSeconds - elapsed };
  }

  return { allowed: true, remaining: limit.MaxRequests - limit.CurrentCount };
}

// Add an alert
export function addAlert(severity, type, message, source = '') {
  const alert = createInstance(AlertUDT, {
    ID: `ALT-${Date.now()}`,
    Severity: severity,
    Type: type,
    Message: message,
    Source: source,
    Timestamp: new Date().toISOString()
  });

  state.alerts.push(alert);
  writeTag('Gateway/AlertCount', state.alerts.filter(a => !a.Acknowledged).length);

  return alert;
}

// Get all tags
export function getAllTags() {
  return Array.from(tags.entries()).map(([path, tag]) => ({ path, ...tag }));
}

// Get stats
export function getStats() {
  const now = Date.now();
  const recentRequests = state.requests.filter(r => now - new Date(r.Timestamp) < 60000);

  return {
    totalRequests: readTag('Gateway/TotalRequests')?.value || 0,
    blockedRequests: readTag('Gateway/BlockedRequests')?.value || 0,
    requestRate: recentRequests.length,
    alertCount: state.alerts.filter(a => !a.Acknowledged).length,
    providerCount: state.providers.size,
    endpointCount: state.endpoints.size
  };
}

// Export state for debugging
export function getState() { return state; }
