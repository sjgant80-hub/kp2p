/**
 * API HERO Visualizer
 * Guitar Hero style falling notes highway
 *
 * Six lanes for six "axes":
 * GET, POST, PUT, DELETE, WS, EVENT
 */

// Lane colors
const LANE_COLORS = {
  0: '#4ecdc4', // GET - teal
  1: '#ffe66d', // POST - yellow
  2: '#a855f7', // PUT - purple
  3: '#ff6b6b', // DELETE - red
  4: '#38bdf8', // WS - blue
  5: '#22c55e'  // EVENT - green
};

const METHOD_TO_LANE = {
  GET: 0,
  POST: 1,
  PUT: 2,
  DELETE: 3,
  WS: 4,
  EVENT: 5
};

// Note pool for object reuse
const notePool = [];
const activeNotes = [];
const particles = [];

// Canvas state
let canvas = null;
let ctx = null;
let width = 0;
let height = 0;
let laneWidth = 0;

// Animation
let animationId = null;
let lastTime = 0;
let speed = 200; // Pixels per second

// Hit zone position
const HIT_ZONE_Y = 0.9; // 90% down the screen

/**
 * Initialize the visualizer
 */
export function initVisualizer(canvasElement) {
  canvas = canvasElement;
  ctx = canvas.getContext('2d');

  resize();
  window.addEventListener('resize', resize);

  return true;
}

/**
 * Handle resize
 */
function resize() {
  const rect = canvas.parentElement.getBoundingClientRect();
  width = rect.width;
  height = rect.height - 60; // Account for hit zone

  canvas.width = width;
  canvas.height = height;

  laneWidth = width / 6;
}

/**
 * Spawn a note for an incoming request
 */
export function spawnNote(method, status, duration = 1) {
  const lane = METHOD_TO_LANE[method] ?? 0;
  const isError = status >= 400;

  // Get or create note object
  let note = notePool.pop() || {};

  note.x = lane * laneWidth + laneWidth / 2;
  note.y = 0;
  note.lane = lane;
  note.method = method;
  note.status = status;
  note.duration = duration;
  note.isError = isError;
  note.hit = false;
  note.missed = false;
  note.alpha = 1;

  // Note size based on duration
  note.height = Math.min(100, duration * 30);
  note.width = laneWidth * 0.7;

  activeNotes.push(note);
  return note;
}

/**
 * Check for hits in the hit zone
 */
export function checkHit(lane) {
  const hitY = height * HIT_ZONE_Y;
  const tolerance = 40;

  for (const note of activeNotes) {
    if (note.lane === lane && !note.hit && !note.missed) {
      if (Math.abs(note.y + note.height - hitY) < tolerance) {
        note.hit = true;
        spawnHitParticles(note);
        return { hit: true, note, perfect: Math.abs(note.y + note.height - hitY) < 15 };
      }
    }
  }

  return { hit: false };
}

/**
 * Spawn particles for a hit
 */
function spawnHitParticles(note) {
  const color = LANE_COLORS[note.lane];
  for (let i = 0; i < 10; i++) {
    particles.push({
      x: note.x,
      y: height * HIT_ZONE_Y,
      vx: (Math.random() - 0.5) * 200,
      vy: -Math.random() * 150 - 50,
      color,
      size: Math.random() * 6 + 2,
      life: 1
    });
  }
}

/**
 * Update and render frame
 */
export function render(timestamp) {
  const dt = (timestamp - lastTime) / 1000;
  lastTime = timestamp;

  // Clear
  ctx.fillStyle = 'rgba(10, 10, 15, 0.3)';
  ctx.fillRect(0, 0, width, height);

  // Draw lane lines
  drawLanes();

  // Update and draw notes
  updateNotes(dt);
  drawNotes();

  // Update and draw particles
  updateParticles(dt);
  drawParticles();

  // Draw hit zone indicator
  drawHitZone();

  animationId = requestAnimationFrame(render);
}

/**
 * Draw lane separators and guides
 */
function drawLanes() {
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.lineWidth = 1;

  for (let i = 0; i <= 6; i++) {
    const x = i * laneWidth;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }

  // Perspective grid lines
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
  for (let y = 0; y < height; y += 50) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
}

/**
 * Update note positions
 */
function updateNotes(dt) {
  const hitY = height * HIT_ZONE_Y;

  for (let i = activeNotes.length - 1; i >= 0; i--) {
    const note = activeNotes[i];

    // Move down
    note.y += speed * dt;

    // Check if missed
    if (!note.hit && note.y > hitY + 50) {
      note.missed = true;
    }

    // Fade out hit/missed notes
    if (note.hit || note.missed) {
      note.alpha -= dt * 3;
    }

    // Remove dead notes
    if (note.alpha <= 0 || note.y > height + note.height) {
      activeNotes.splice(i, 1);
      notePool.push(note);
    }
  }
}

/**
 * Draw all active notes
 */
function drawNotes() {
  for (const note of activeNotes) {
    ctx.save();
    ctx.globalAlpha = note.alpha;

    const x = note.x - note.width / 2;
    const y = note.y;
    const color = LANE_COLORS[note.lane];

    // Glow effect
    ctx.shadowColor = color;
    ctx.shadowBlur = note.hit ? 30 : 15;

    // Note body
    if (note.isError) {
      // Error notes are jagged
      ctx.fillStyle = '#ff0000';
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + note.width * 0.3, y + note.height * 0.3);
      ctx.lineTo(x, y + note.height * 0.5);
      ctx.lineTo(x + note.width * 0.4, y + note.height * 0.7);
      ctx.lineTo(x, y + note.height);
      ctx.lineTo(x + note.width, y + note.height);
      ctx.lineTo(x + note.width * 0.6, y + note.height * 0.6);
      ctx.lineTo(x + note.width, y + note.height * 0.4);
      ctx.lineTo(x + note.width * 0.7, y + note.height * 0.2);
      ctx.lineTo(x + note.width, y);
      ctx.closePath();
      ctx.fill();
    } else {
      // Normal rounded note
      const radius = 8;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.roundRect(x, y, note.width, note.height, radius);
      ctx.fill();

      // Inner gradient
      const gradient = ctx.createLinearGradient(x, y, x, y + note.height);
      gradient.addColorStop(0, 'rgba(255,255,255,0.3)');
      gradient.addColorStop(0.5, 'rgba(255,255,255,0)');
      gradient.addColorStop(1, 'rgba(0,0,0,0.2)');
      ctx.fillStyle = gradient;
      ctx.fill();
    }

    // Method label
    ctx.fillStyle = note.isError ? '#fff' : '#000';
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(note.method, note.x, y + note.height / 2);

    // Status code
    ctx.font = '10px monospace';
    ctx.fillText(note.status, note.x, y + note.height / 2 + 14);

    ctx.restore();
  }
}

/**
 * Update particles
 */
function updateParticles(dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += 300 * dt; // Gravity
    p.life -= dt * 2;

    if (p.life <= 0) {
      particles.splice(i, 1);
    }
  }
}

/**
 * Draw particles
 */
function drawParticles() {
  for (const p of particles) {
    ctx.save();
    ctx.globalAlpha = p.life;
    ctx.fillStyle = p.color;
    ctx.shadowColor = p.color;
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

/**
 * Draw the hit zone line
 */
function drawHitZone() {
  const y = height * HIT_ZONE_Y;

  // Glowing line
  ctx.save();
  ctx.strokeStyle = '#ff6b35';
  ctx.shadowColor = '#ff6b35';
  ctx.shadowBlur = 20;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, y);
  ctx.lineTo(width, y);
  ctx.stroke();
  ctx.restore();
}

/**
 * Start rendering
 */
export function start() {
  if (!animationId) {
    lastTime = performance.now();
    animationId = requestAnimationFrame(render);
  }
}

/**
 * Stop rendering
 */
export function stop() {
  if (animationId) {
    cancelAnimationFrame(animationId);
    animationId = null;
  }
}

/**
 * Set note fall speed
 */
export function setSpeed(newSpeed) {
  speed = Math.max(100, Math.min(500, newSpeed));
}

/**
 * Flash lane for hit feedback
 */
export function flashLane(lane) {
  const laneElement = document.querySelector(`.hit-zone .lane[data-lane="${lane}"]`);
  if (laneElement) {
    laneElement.classList.add('hit');
    setTimeout(() => laneElement.classList.remove('hit'), 200);
  }
}

/**
 * Get count of active notes
 */
export function getActiveNoteCount() {
  return activeNotes.length;
}

/**
 * Clear all notes
 */
export function clearNotes() {
  while (activeNotes.length) {
    notePool.push(activeNotes.pop());
  }
  particles.length = 0;
}
