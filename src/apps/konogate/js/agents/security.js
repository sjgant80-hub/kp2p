/**
 * KonoGate - Security Agent
 * LLM-powered anomaly detection and security monitoring
 */

import { addAlert, getStats, getState } from '../providers/gateway.js';

const SECURITY_PROMPT = `You are a security agent monitoring an API gateway.
Analyze traffic patterns and detect anomalies. Respond with JSON:
{
  "anomalies": [{"severity": "warn|critical", "type": "string", "message": "string"}],
  "summary": "brief analysis"
}

Look for: unusual request patterns, error spikes, potential DDoS, auth failures, suspicious paths.`;

// Agent state
const state = {
  engine: null,
  enabled: true,
  analysisInterval: 30000, // 30s
  lastAnalysis: null,
  metrics: {
    requestsPerMinute: [],
    errorRates: [],
    uniqueIPs: new Set()
  }
};

// Initialize with LLM engine
export function initSecurityAgent(engine = null) {
  state.engine = engine;
  startMonitoring();
  return { enabled: true, llmReady: !!engine };
}

// Record metrics for analysis
export function recordMetric(request) {
  const now = Date.now();

  // Track request rate
  state.metrics.requestsPerMinute.push(now);
  state.metrics.requestsPerMinute = state.metrics.requestsPerMinute.filter(t => now - t < 60000);

  // Track errors
  if (request.Status >= 400) {
    state.metrics.errorRates.push({ time: now, status: request.Status });
  }
  state.metrics.errorRates = state.metrics.errorRates.filter(e => now - e.time < 60000);

  // Track IPs
  if (request.ClientIP) {
    state.metrics.uniqueIPs.add(request.ClientIP);
  }

  // Quick anomaly checks (non-LLM)
  checkQuickAnomalies();
}

// Quick rule-based anomaly checks
function checkQuickAnomalies() {
  const rpm = state.metrics.requestsPerMinute.length;
  const errorRate = state.metrics.errorRates.length / Math.max(rpm, 1);

  // High request rate
  if (rpm > 500) {
    addAlert('warn', 'high_traffic', `High traffic detected: ${rpm} req/min`, 'SecurityAgent');
  }

  // Error spike
  if (errorRate > 0.3 && rpm > 10) {
    addAlert('warn', 'error_spike', `Error rate spike: ${(errorRate * 100).toFixed(1)}%`, 'SecurityAgent');
  }

  // Potential DDoS (many unique IPs + high rate)
  if (state.metrics.uniqueIPs.size > 100 && rpm > 300) {
    addAlert('critical', 'potential_ddos', 'Potential DDoS: Many IPs + high rate', 'SecurityAgent');
  }
}

// Start periodic LLM analysis
function startMonitoring() {
  setInterval(() => {
    if (state.enabled && state.engine) {
      runLLMAnalysis();
    }
  }, state.analysisInterval);
}

// Run LLM-powered analysis
async function runLLMAnalysis() {
  const gwState = getState();
  const stats = getStats();

  // Build context for LLM
  const context = {
    requestsPerMinute: state.metrics.requestsPerMinute.length,
    errorCount: state.metrics.errorRates.length,
    uniqueIPs: state.metrics.uniqueIPs.size,
    totalRequests: stats.totalRequests,
    blockedRequests: stats.blockedRequests,
    recentRequests: gwState.requests.slice(-20).map(r => ({
      method: r.Method,
      path: r.Path,
      status: r.Status,
      blocked: r.Blocked
    }))
  };

  const prompt = `Analyze this API gateway traffic for the last minute:
${JSON.stringify(context, null, 2)}

Any security concerns or anomalies?`;

  try {
    const response = await state.engine.chat.completions.create({
      messages: [
        { role: 'system', content: SECURITY_PROMPT },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3,
      max_tokens: 500
    });

    const result = parseAnalysis(response.choices[0].message.content);

    if (result.anomalies && result.anomalies.length > 0) {
      for (const anomaly of result.anomalies) {
        addAlert(anomaly.severity, anomaly.type, anomaly.message, 'LLM-SecurityAgent');
      }
    }

    state.lastAnalysis = {
      time: new Date().toISOString(),
      summary: result.summary,
      anomalyCount: result.anomalies?.length || 0
    };

  } catch (e) {
    console.error('LLM analysis failed:', e);
  }
}

// Parse LLM response
function parseAnalysis(content) {
  try {
    const match = content.match(/```json?\s*([\s\S]*?)\s*```/);
    return JSON.parse(match ? match[1] : content);
  } catch (e) {
    return { anomalies: [], summary: content };
  }
}

// Get agent status
export function getAgentStatus() {
  return {
    enabled: state.enabled,
    llmReady: !!state.engine,
    lastAnalysis: state.lastAnalysis,
    metrics: {
      requestsPerMinute: state.metrics.requestsPerMinute.length,
      errorCount: state.metrics.errorRates.length,
      uniqueIPs: state.metrics.uniqueIPs.size
    }
  };
}

// Enable/disable agent
export function setEnabled(enabled) {
  state.enabled = enabled;
}

// Force analysis
export async function forceAnalysis() {
  if (state.engine) {
    await runLLMAnalysis();
    return state.lastAnalysis;
  }
  return null;
}
