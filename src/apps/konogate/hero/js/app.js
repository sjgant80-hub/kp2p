/**
 * API HERO - Main Application
 * The Song of Your APIs
 *
 * Orchestrates audio, patterns, and visualization
 * for the ultimate API symphony experience
 */

import * as audio from './audio.js';
import * as patterns from './patterns.js';
import * as visualizer from './visualizer.js';

// DOM elements
let scoreEl, comboEl, bpmEl, harmonyEl;
let patternDisplay, lyricsDisplay;
let btnStart, btnStop, btnDemo;

// State
let isRunning = false;
let score = 0;
let demoInterval = null;

// Key mapping for manual play
const KEY_TO_LANE = {
  'a': 0, 'A': 0,  // GET
  's': 1, 'S': 1,  // POST
  'd': 2, 'D': 2,  // PUT
  'f': 3, 'F': 3,  // DELETE
  'g': 4, 'G': 4,  // WS
  'h': 5, 'H': 5   // EVENT
};

const LANE_TO_METHOD = ['GET', 'POST', 'PUT', 'DELETE', 'WS', 'EVENT'];

/**
 * Initialize the app
 */
function init() {
  // Get DOM elements
  scoreEl = document.getElementById('score');
  comboEl = document.getElementById('combo');
  bpmEl = document.getElementById('bpm');
  harmonyEl = document.getElementById('harmony');
  patternDisplay = document.getElementById('pattern-display');
  lyricsDisplay = document.getElementById('lyrics-display');
  btnStart = document.getElementById('btn-start');
  btnStop = document.getElementById('btn-stop');
  btnDemo = document.getElementById('btn-demo');

  // Initialize canvas
  const canvas = document.getElementById('highway');
  visualizer.initVisualizer(canvas);

  // Load lyrics
  loadLyrics();

  // Setup event listeners
  setupEventListeners();

  console.log('🎸 API HERO initialized');
}

/**
 * Load lyrics into the display
 */
function loadLyrics() {
  const lyrics = patterns.getAllLyrics();
  lyricsDisplay.innerHTML = lyrics
    .map((l, i) => `<p class="verse" data-index="${i}">${l.text}</p>`)
    .join('');
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
  btnStart.addEventListener('click', startSymphony);
  btnStop.addEventListener('click', stopSymphony);
  btnDemo.addEventListener('click', toggleDemo);

  // Keyboard input
  document.addEventListener('keydown', handleKeyDown);
  document.addEventListener('keyup', handleKeyUp);

  // Lane click
  document.querySelectorAll('.hit-zone .lane').forEach(lane => {
    lane.addEventListener('mousedown', () => {
      const laneNum = parseInt(lane.dataset.lane);
      hitLane(laneNum);
    });
  });

  // Tempo control
  document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowUp') {
      const newBpm = audio.setTempo(audio.getTempo() + 5);
      bpmEl.textContent = newBpm;
    } else if (e.key === 'ArrowDown') {
      const newBpm = audio.setTempo(audio.getTempo() - 5);
      bpmEl.textContent = newBpm;
    }
  });

  // Listen for API events from parent KonoGate (if embedded)
  window.addEventListener('message', handleParentMessage);

  // Also listen on window for direct calls
  window.apiHero = {
    ingestRequest: ingestAPIRequest,
    start: startSymphony,
    stop: stopSymphony
  };
}

/**
 * Handle messages from parent window (KonoGate)
 */
function handleParentMessage(event) {
  if (event.data?.type === 'api-request') {
    ingestAPIRequest(event.data.request);
  }
}

/**
 * Ingest an API request from KonoGate
 */
function ingestAPIRequest(request) {
  if (!isRunning) return;

  const { method = 'GET', status = 200, endpoint = '/' } = request;

  // Record for pattern analysis
  const result = patterns.recordRequest({ method, status, endpoint });

  // Get musical properties
  const dynamics = patterns.getDynamics();
  const duration = patterns.getNoteDuration(request, result.articulation);
  const isError = status >= 400;

  // Spawn visual note
  visualizer.spawnNote(method, status, duration);

  // Play audio
  audio.playNote(method, status, duration, 0.3 + dynamics * 0.5, isError);

  // Handle pattern detection
  if (result.detected) {
    handlePatternDetected(result.detected);
  }

  // Update displays
  updateDisplays();

  // Adjust tempo based on traffic
  const tempoAdj = patterns.getTempoAdjustment();
  if (Math.abs(tempoAdj) > 5) {
    const newBpm = audio.setTempo(audio.getTempo() + tempoAdj * 0.1);
    bpmEl.textContent = Math.round(newBpm);
  }
}

/**
 * Handle detected pattern
 */
function handlePatternDetected(detected) {
  score += 100 * detected.combo;
  scoreEl.textContent = score;

  // Show pattern notification
  const patternEl = patternDisplay.querySelector('.current-pattern');
  patternEl.textContent = `🎵 ${detected.name}! (${detected.combo}x)`;
  patternEl.style.color = '#22c55e';
  setTimeout(() => {
    patternEl.style.color = '';
  }, 500);

  // Play harmony sound for good patterns
  if (!detected.name.includes('Collision') && !detected.name.includes('Singularity')) {
    audio.playHarmony();
  }
}

/**
 * Handle key press
 */
function handleKeyDown(e) {
  const lane = KEY_TO_LANE[e.key];
  if (lane !== undefined && !e.repeat) {
    hitLane(lane);
  }
}

/**
 * Handle key release
 */
function handleKeyUp(e) {
  const lane = KEY_TO_LANE[e.key];
  if (lane !== undefined) {
    const laneEl = document.querySelector(`.hit-zone .lane[data-lane="${lane}"]`);
    if (laneEl) laneEl.classList.remove('active');
  }
}

/**
 * Hit a lane (keyboard or click)
 */
function hitLane(lane) {
  if (!isRunning) return;

  // Visual feedback
  const laneEl = document.querySelector(`.hit-zone .lane[data-lane="${lane}"]`);
  if (laneEl) {
    laneEl.classList.add('active');
    visualizer.flashLane(lane);
  }

  // Check for note hit
  const result = visualizer.checkHit(lane);
  if (result.hit) {
    const method = LANE_TO_METHOD[lane];
    score += result.perfect ? 100 : 50;
    scoreEl.textContent = score;

    // Play corresponding note
    audio.playNote(method, 200, 0.25, 0.5);
  }
}

/**
 * Start the symphony
 */
function startSymphony() {
  if (isRunning) return;

  // Initialize audio (requires user gesture)
  if (!audio.initAudio()) {
    console.error('Failed to init audio');
    return;
  }

  isRunning = true;
  btnStart.disabled = true;
  btnStop.disabled = false;

  // Start visualizer
  visualizer.start();

  // Reset state
  patterns.resetPatterns();
  score = 0;
  scoreEl.textContent = '0';

  console.log('🎵 Symphony started');
}

/**
 * Stop the symphony
 */
function stopSymphony() {
  if (!isRunning) return;

  isRunning = false;
  btnStart.disabled = false;
  btnStop.disabled = true;

  // Stop visualizer
  visualizer.stop();

  // Stop demo if running
  if (demoInterval) {
    clearInterval(demoInterval);
    demoInterval = null;
    btnDemo.textContent = '🎭 Demo Traffic';
  }

  // Stop audio
  audio.stopAll();

  console.log('⏹️ Symphony stopped');
}

/**
 * Toggle demo traffic
 */
function toggleDemo() {
  if (demoInterval) {
    clearInterval(demoInterval);
    demoInterval = null;
    btnDemo.textContent = '🎭 Demo Traffic';
    return;
  }

  // Start demo
  if (!isRunning) startSymphony();

  btnDemo.textContent = '⏹️ Stop Demo';

  const methods = ['GET', 'POST', 'PUT', 'DELETE', 'WS', 'EVENT'];
  const endpoints = ['/api/users', '/api/products', '/api/orders', '/ws/live', '/events/notify'];

  demoInterval = setInterval(() => {
    // Generate semi-random but musical traffic
    const pattern = Math.random();
    let method, status;

    if (pattern < 0.5) {
      // Normal GET/POST rhythm
      method = Math.random() < 0.7 ? 'GET' : 'POST';
      status = 200;
    } else if (pattern < 0.8) {
      // PUT/DELETE staccato
      method = Math.random() < 0.5 ? 'PUT' : 'DELETE';
      status = Math.random() < 0.9 ? 200 : 404;
    } else if (pattern < 0.95) {
      // WebSocket/Event legato
      method = Math.random() < 0.5 ? 'WS' : 'EVENT';
      status = 200;
    } else {
      // Occasional error for dissonance
      method = 'DELETE';
      status = Math.random() < 0.5 ? 500 : 503;
    }

    const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];

    ingestAPIRequest({ method, status, endpoint });
  }, 250); // 240 BPM base (4 notes per second)
}

/**
 * Update all displays
 */
function updateDisplays() {
  const state = patterns.getPatternState();

  // Update harmony
  harmonyEl.textContent = `${Math.round(state.harmony)}%`;

  // Update combo
  comboEl.textContent = state.combo;

  // Update pattern display
  const harmonyValue = patternDisplay.querySelector('.harmony-value');
  if (harmonyValue) {
    harmonyValue.textContent = `${Math.round(state.harmony)}%`;
    harmonyValue.style.color = state.harmony > 70 ? '#22c55e' :
                               state.harmony > 40 ? '#ffe66d' : '#ff6b6b';
  }

  // Highlight current lyric
  const lyrics = lyricsDisplay.querySelectorAll('.verse');
  lyrics.forEach((verse, i) => {
    verse.classList.toggle('active', i === state.lyricIndex);
    if (i === state.lyricIndex) {
      verse.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  });

  // Update instrument meters
  const levels = audio.getActiveLevels();
  Object.entries(levels).forEach(([method, level]) => {
    const lane = KEY_TO_LANE[method.toLowerCase()[0]];
    // This is approximate - we'd need a proper mapping
    document.querySelectorAll('.instrument').forEach((inst, i) => {
      const fill = inst.querySelector('.fill');
      if (fill && i === (['GET', 'POST', 'PUT', 'DELETE', 'WS', 'EVENT'].indexOf(method))) {
        fill.style.width = `${level * 100}%`;
      }
    });
  });
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', init);
