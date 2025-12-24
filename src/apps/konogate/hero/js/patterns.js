/**
 * API HERO Pattern Recognition
 * Detects patterns in API traffic and maps to musical concepts
 *
 * From the song:
 * - Legato = connected requests (no stops between)
 * - Staccato = sharp, discrete requests
 * - Glissando = linear rate changes
 * - Tremolo = high-frequency oscillation
 * - Time signature = loop count
 * - Fermata = sensor holds
 */

// Pattern types based on the song
export const PATTERNS = {
  PICK_CYCLE: {
    name: 'Pick Cycle',
    description: 'Quarter down, whole hold, eighth lift, half traverse',
    sequence: ['GET', 'POST', 'GET', 'PUT'],
    lyric: 'Quarter note down to the part bin low...'
  },
  WELDING: {
    name: 'Welding Pattern',
    description: 'Legato connected, no stops between',
    sequence: ['POST', 'POST', 'POST', 'PUT'],
    lyric: 'Legato connected, no stops between...'
  },
  COLLISION: {
    name: 'Collision Path',
    description: 'Melody breaks - dissonant chords',
    sequence: ['DELETE', 'DELETE', 'ERROR'],
    lyric: 'When the melody breaks, that\'s a collision path...'
  },
  HARMONY: {
    name: 'Beautiful Harmony',
    description: 'Smooth coordinated flow',
    sequence: ['GET', 'WS', 'EVENT', 'GET'],
    lyric: 'Beautiful harmony, smooth as glass...'
  },
  SINGULARITY: {
    name: 'Singularity Scream',
    description: 'Augmented fourth - axes clash',
    sequence: ['ERROR', 'ERROR', 'DELETE'],
    lyric: 'Augmented fourth, that\'s a singularity scream...'
  },
  REST_HOME: {
    name: 'Return Home',
    description: 'Ritardando slowing, coming to rest',
    sequence: ['GET', 'GET'],
    lyric: 'Ritardando slowing, coming to rest...'
  }
};

// Lyrics for display
export const LYRICS = [
  { section: 'intro', text: 'Six axes spinning, motors align' },
  { section: 'intro', text: 'Joint one rotating, starting the climb' },
  { section: 'intro', text: 'Pitch maps position, rhythm is time' },
  { section: 'intro', text: 'Velocity markings, the motion\'s design' },
  { section: 'verse1', text: 'Quarter note down to the part bin low' },
  { section: 'verse1', text: 'Whole note holding while the gripper\'s closed' },
  { section: 'verse1', text: 'Eighth note lifting, accelerando flow' },
  { section: 'verse1', text: 'Half note traverse to the assembly zone' },
  { section: 'verse1', text: 'When the melody breaks, that\'s a collision path' },
  { section: 'verse1', text: 'When the rhythm stutters, check your math' },
  { section: 'verse1', text: 'Dissonant chords mean the kinematics clash' },
  { section: 'verse1', text: 'Beautiful harmony, smooth as glass' },
  { section: 'chorus', text: 'Motion in music, music in steel' },
  { section: 'chorus', text: 'Every note you write is a move that\'s real' },
  { section: 'chorus', text: 'Forte means faster, piano means slow' },
  { section: 'chorus', text: 'Debug with your ears, watch the robot go' },
  { section: 'chorus', text: 'C Major\'s world frame, G is the tool' },
  { section: 'chorus', text: 'Modulation switches, that\'s the rule' },
  { section: 'chorus', text: 'If it sounds like chaos, your path is screwed' },
  { section: 'chorus', text: 'Motion in music, that\'s how we do' },
  { section: 'verse2', text: 'Legato connected, no stops between' },
  { section: 'verse2', text: 'Staccato marking, sharp points in the seam' },
  { section: 'verse2', text: 'Glissando sliding, linear and clean' },
  { section: 'verse2', text: 'Tremolo vibrates the in-between' },
  { section: 'bridge', text: 'Augmented fourth, that\'s a singularity scream' },
  { section: 'bridge', text: 'Minor seconds clashing, axes extreme' },
  { section: 'bridge', text: 'Diminished seventh, collision warning beam' },
  { section: 'bridge', text: 'Perfect fifths flowing, coordinated team' },
  { section: 'outro', text: 'Ritardando slowing, coming to rest' },
  { section: 'outro', text: 'All axes zeroed, passed every test' },
  { section: 'outro', text: 'The song\'s completed, we did our best' },
  { section: 'outro', text: 'Motion in music, better than the rest' }
];

// State for pattern detection
let requestHistory = [];
let patternBuffer = [];
let currentLyricIndex = 0;
let harmonyScore = 100;
let comboCount = 0;
let lastRequestTime = 0;

// Articulation detection thresholds (ms)
const STACCATO_GAP = 50;
const LEGATO_GAP = 200;
const TREMOLO_THRESHOLD = 30;

/**
 * Record a request for pattern analysis
 */
export function recordRequest(request) {
  const now = Date.now();
  const gap = now - lastRequestTime;
  lastRequestTime = now;

  // Determine articulation
  let articulation = 'normal';
  if (gap < STACCATO_GAP) articulation = 'staccato';
  else if (gap < LEGATO_GAP) articulation = 'legato';

  // Check for tremolo (rapid oscillation)
  const recentMethods = requestHistory.slice(-5).map(r => r.method);
  const isTremolo = recentMethods.length >= 4 &&
    recentMethods.every((m, i) => i % 2 === 0 ? m === recentMethods[0] : m === recentMethods[1]);

  const entry = {
    ...request,
    timestamp: now,
    gap,
    articulation,
    isTremolo
  };

  requestHistory.push(entry);
  patternBuffer.push(request.method);

  // Keep buffers manageable
  if (requestHistory.length > 100) requestHistory.shift();
  if (patternBuffer.length > 10) patternBuffer.shift();

  // Analyze patterns
  const detected = detectPattern();

  // Update harmony score
  updateHarmony(request, detected);

  return { entry, detected, articulation, isTremolo };
}

/**
 * Detect known patterns in the buffer
 */
function detectPattern() {
  for (const [key, pattern] of Object.entries(PATTERNS)) {
    const seq = pattern.sequence;
    const bufEnd = patternBuffer.slice(-seq.length);

    if (bufEnd.length === seq.length) {
      let match = true;
      for (let i = 0; i < seq.length; i++) {
        if (seq[i] !== 'ERROR' && bufEnd[i] !== seq[i]) {
          match = false;
          break;
        }
        if (seq[i] === 'ERROR' && bufEnd[i] !== 'DELETE' && !bufEnd[i].includes('5')) {
          match = false;
          break;
        }
      }

      if (match) {
        comboCount++;
        advanceLyric(pattern);
        return { pattern: key, ...pattern, combo: comboCount };
      }
    }
  }

  return null;
}

/**
 * Update harmony score based on request
 */
function updateHarmony(request, detected) {
  const isError = request.status >= 400;

  if (isError) {
    harmonyScore = Math.max(0, harmonyScore - 5);
    comboCount = 0;
  } else if (detected) {
    harmonyScore = Math.min(100, harmonyScore + 2);
  } else {
    // Slight decay without patterns
    harmonyScore = Math.max(0, harmonyScore - 0.1);
  }
}

/**
 * Advance to the next lyric line
 */
function advanceLyric(pattern) {
  // Find lyric matching pattern
  const matchingLyric = LYRICS.findIndex(l =>
    pattern.lyric && l.text.includes(pattern.lyric.substring(0, 20))
  );

  if (matchingLyric >= 0) {
    currentLyricIndex = matchingLyric;
  } else {
    currentLyricIndex = (currentLyricIndex + 1) % LYRICS.length;
  }
}

/**
 * Get current state for display
 */
export function getPatternState() {
  const recentRequests = requestHistory.slice(-10);
  const methodCounts = {};
  recentRequests.forEach(r => {
    methodCounts[r.method] = (methodCounts[r.method] || 0) + 1;
  });

  // Determine current "movement" based on dominant method
  let movement = 'Idle';
  const dominant = Object.entries(methodCounts)
    .sort((a, b) => b[1] - a[1])[0];

  if (dominant) {
    switch (dominant[0]) {
      case 'GET': movement = 'Observation'; break;
      case 'POST': movement = 'Creation'; break;
      case 'PUT': movement = 'Transformation'; break;
      case 'DELETE': movement = 'Destruction'; break;
      case 'WS': movement = 'Connection'; break;
      case 'EVENT': movement = 'Notification'; break;
    }
  }

  return {
    harmony: harmonyScore,
    combo: comboCount,
    currentLyric: LYRICS[currentLyricIndex],
    lyricIndex: currentLyricIndex,
    movement,
    recentMethods: recentRequests.map(r => r.method),
    patternBuffer: [...patternBuffer]
  };
}

/**
 * Calculate dynamics based on traffic rate
 * Returns 0-1 where 0=piano, 1=forte
 */
export function getDynamics() {
  const recent = requestHistory.filter(r =>
    Date.now() - r.timestamp < 1000
  );

  // 0-10 requests/sec = piano to forte
  return Math.min(1, recent.length / 10);
}

/**
 * Calculate tempo adjustment based on traffic
 */
export function getTempoAdjustment() {
  const recent = requestHistory.filter(r =>
    Date.now() - r.timestamp < 5000
  );

  if (recent.length < 2) return 0;

  // Calculate average gap
  let totalGap = 0;
  for (let i = 1; i < recent.length; i++) {
    totalGap += recent[i].timestamp - recent[i - 1].timestamp;
  }
  const avgGap = totalGap / (recent.length - 1);

  // Map gap to tempo adjustment (-20 to +20 BPM)
  if (avgGap < 100) return 20; // Very fast = speed up
  if (avgGap > 1000) return -20; // Very slow = slow down
  return Math.round(20 - (avgGap / 50));
}

/**
 * Get note duration based on request type/pattern
 * Returns duration in beats
 */
export function getNoteDuration(request, articulation) {
  // From the song: quarter=down, whole=hold, eighth=lift, half=traverse
  if (articulation === 'staccato') return 0.25; // 16th note
  if (articulation === 'legato') return 1; // Quarter note

  switch (request.method) {
    case 'GET': return 0.5; // Eighth note - quick fetch
    case 'POST': return 2; // Half note - creating takes time
    case 'PUT': return 1; // Quarter note - updating
    case 'DELETE': return 0.25; // 16th note - quick removal
    case 'WS': return 4; // Whole note - sustained connection
    case 'EVENT': return 0.125; // 32nd note - quick ping
    default: return 0.5;
  }
}

/**
 * Reset pattern state
 */
export function resetPatterns() {
  requestHistory = [];
  patternBuffer = [];
  currentLyricIndex = 0;
  harmonyScore = 100;
  comboCount = 0;
  lastRequestTime = 0;
}

/**
 * Get all lyrics for display
 */
export function getAllLyrics() {
  return LYRICS;
}
