/**
 * API HERO Audio Engine
 * Web Audio API synthesizer for API orchestra
 *
 * Mapping from the song:
 * - Pitch → Endpoint/response code
 * - Tempo → Request rate
 * - Dynamics (forte/piano) → Payload size / importance
 * - Notes (quarter, whole, etc) → Request duration
 * - Chords → Concurrent requests
 * - Dissonance → Errors
 * - Harmony → Smooth operation
 */

// Musical scales (C Major = world frame, G = tool frame)
const SCALES = {
  C_MAJOR: [261.63, 293.66, 329.63, 349.23, 392.00, 440.00, 493.88, 523.25],
  G_MAJOR: [392.00, 440.00, 493.88, 523.25, 587.33, 659.25, 739.99, 783.99],
  A_MINOR: [220.00, 246.94, 261.63, 293.66, 329.63, 349.23, 392.00, 440.00],
  // Error states - dissonant
  DIMINISHED: [261.63, 311.13, 369.99, 440.00],
  AUGMENTED: [261.63, 329.63, 415.30, 523.25]
};

// Voice configurations per method type
const VOICES = {
  GET: {
    type: 'sine',
    scale: 'C_MAJOR',
    baseOctave: 0,
    envelope: { attack: 0.02, decay: 0.1, sustain: 0.3, release: 0.3 }
  },
  POST: {
    type: 'sawtooth',
    scale: 'G_MAJOR',
    baseOctave: 0,
    envelope: { attack: 0.01, decay: 0.15, sustain: 0.5, release: 0.2 }
  },
  PUT: {
    type: 'square',
    scale: 'C_MAJOR',
    baseOctave: -1,
    envelope: { attack: 0.005, decay: 0.05, sustain: 0.1, release: 0.1 }
  },
  DELETE: {
    type: 'triangle',
    scale: 'A_MINOR',
    baseOctave: 0,
    envelope: { attack: 0.01, decay: 0.2, sustain: 0.2, release: 0.4 }
  },
  WS: {
    type: 'sine',
    scale: 'C_MAJOR',
    baseOctave: 1,
    envelope: { attack: 0.1, decay: 0.2, sustain: 0.6, release: 0.5 }
  },
  EVENT: {
    type: 'triangle',
    scale: 'G_MAJOR',
    baseOctave: 1,
    envelope: { attack: 0.001, decay: 0.1, sustain: 0.1, release: 0.2 }
  }
};

let audioCtx = null;
let masterGain = null;
let compressor = null;
let reverb = null;
let isInitialized = false;

// Active notes for tracking
const activeNotes = new Map();

// BPM and timing
let bpm = 120;
let beatDuration = 60 / bpm;

/**
 * Initialize the audio context
 */
export function initAudio() {
  if (isInitialized) return true;

  try {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();

    // Create master chain: compressor -> gain -> destination
    compressor = audioCtx.createDynamicsCompressor();
    compressor.threshold.value = -24;
    compressor.knee.value = 30;
    compressor.ratio.value = 12;
    compressor.attack.value = 0.003;
    compressor.release.value = 0.25;

    masterGain = audioCtx.createGain();
    masterGain.gain.value = 0.5;

    // Create simple reverb
    reverb = createReverb();

    // Connect chain
    compressor.connect(masterGain);
    masterGain.connect(audioCtx.destination);

    isInitialized = true;
    return true;
  } catch (e) {
    console.error('Failed to init audio:', e);
    return false;
  }
}

/**
 * Create a simple reverb effect
 */
function createReverb() {
  const convolver = audioCtx.createConvolver();
  const rate = audioCtx.sampleRate;
  const length = rate * 1.5;
  const impulse = audioCtx.createBuffer(2, length, rate);

  for (let channel = 0; channel < 2; channel++) {
    const data = impulse.getChannelData(channel);
    for (let i = 0; i < length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2);
    }
  }

  convolver.buffer = impulse;

  const reverbGain = audioCtx.createGain();
  reverbGain.gain.value = 0.2;

  convolver.connect(reverbGain);
  reverbGain.connect(masterGain);

  return convolver;
}

/**
 * Set the tempo (BPM)
 */
export function setTempo(newBpm) {
  bpm = Math.max(60, Math.min(200, newBpm));
  beatDuration = 60 / bpm;
  return bpm;
}

export function getTempo() {
  return bpm;
}

/**
 * Play a note for an API request
 * @param {string} method - HTTP method (GET, POST, etc)
 * @param {number} statusCode - Response status code (maps to pitch)
 * @param {number} duration - Note duration in beats (0.25=16th, 0.5=8th, 1=quarter, 2=half, 4=whole)
 * @param {number} velocity - Volume 0-1 (piano to forte)
 * @param {boolean} isError - Whether this is an error (dissonant)
 */
export function playNote(method, statusCode = 200, duration = 1, velocity = 0.7, isError = false) {
  if (!isInitialized || !audioCtx) return null;

  // Resume if suspended
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }

  const voice = VOICES[method] || VOICES.GET;
  const scale = isError ? SCALES.DIMINISHED : SCALES[voice.scale];

  // Map status code to pitch (2xx = higher, 4xx/5xx = lower)
  const pitchIndex = statusCodeToPitch(statusCode, scale.length);
  let freq = scale[pitchIndex];

  // Apply octave shift
  freq *= Math.pow(2, voice.baseOctave);

  // Create oscillator
  const osc = audioCtx.createOscillator();
  osc.type = voice.type;
  osc.frequency.value = freq;

  // Create gain envelope
  const gainNode = audioCtx.createGain();
  const now = audioCtx.currentTime;
  const noteDuration = duration * beatDuration;
  const env = voice.envelope;

  // ADSR envelope
  gainNode.gain.setValueAtTime(0, now);
  gainNode.gain.linearRampToValueAtTime(velocity * 0.3, now + env.attack);
  gainNode.gain.linearRampToValueAtTime(velocity * env.sustain * 0.3, now + env.attack + env.decay);
  gainNode.gain.setValueAtTime(velocity * env.sustain * 0.3, now + noteDuration - env.release);
  gainNode.gain.linearRampToValueAtTime(0, now + noteDuration);

  // Connect: osc -> gain -> compressor + reverb
  osc.connect(gainNode);
  gainNode.connect(compressor);
  if (!isError) {
    gainNode.connect(reverb);
  }

  // Start and stop
  osc.start(now);
  osc.stop(now + noteDuration + 0.1);

  // Track active note
  const noteId = `${method}-${Date.now()}`;
  activeNotes.set(noteId, { osc, gainNode, method });

  osc.onended = () => {
    activeNotes.delete(noteId);
    gainNode.disconnect();
  };

  return { noteId, freq, duration: noteDuration };
}

/**
 * Play a chord (multiple concurrent requests)
 */
export function playChord(methods, statusCodes, duration = 1, velocity = 0.5) {
  if (!Array.isArray(methods)) methods = [methods];
  if (!Array.isArray(statusCodes)) statusCodes = [statusCodes];

  const notes = [];
  for (let i = 0; i < methods.length; i++) {
    const note = playNote(
      methods[i],
      statusCodes[i] || 200,
      duration,
      velocity / Math.sqrt(methods.length), // Reduce volume for chords
      statusCodes[i] >= 400
    );
    if (note) notes.push(note);
  }
  return notes;
}

/**
 * Play an error/collision sound
 */
export function playError(severity = 'warning') {
  if (!isInitialized) return;

  const now = audioCtx.currentTime;

  if (severity === 'critical') {
    // Augmented fourth - singularity scream
    playNote('DELETE', 500, 0.5, 0.8, true);
    setTimeout(() => playNote('PUT', 503, 0.5, 0.8, true), 50);
  } else {
    // Minor second clash
    playNote('DELETE', 400, 0.25, 0.5, true);
  }
}

/**
 * Play success/harmony sound
 */
export function playHarmony() {
  if (!isInitialized) return;

  // Perfect fifth - coordinated team
  playChord(['GET', 'WS'], [200, 200], 2, 0.4);
}

/**
 * Map HTTP status code to pitch index
 */
function statusCodeToPitch(code, scaleLength) {
  if (code >= 200 && code < 300) {
    // Success - higher pitches
    return Math.min(scaleLength - 1, Math.floor((code - 200) / 12));
  } else if (code >= 300 && code < 400) {
    // Redirect - middle pitches
    return Math.floor(scaleLength / 2);
  } else if (code >= 400 && code < 500) {
    // Client error - lower pitches
    return Math.max(0, Math.floor((500 - code) / 25));
  } else {
    // Server error - lowest
    return 0;
  }
}

/**
 * Get current audio levels for visualization
 */
export function getActiveLevels() {
  const levels = {
    GET: 0, POST: 0, PUT: 0, DELETE: 0, WS: 0, EVENT: 0
  };

  activeNotes.forEach(({ method }) => {
    if (levels[method] !== undefined) {
      levels[method] = Math.min(1, levels[method] + 0.5);
    }
  });

  return levels;
}

/**
 * Stop all sounds
 */
export function stopAll() {
  activeNotes.forEach(({ osc, gainNode }) => {
    try {
      gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
      osc.stop();
    } catch (e) {}
  });
  activeNotes.clear();
}

/**
 * Set master volume
 */
export function setVolume(vol) {
  if (masterGain) {
    masterGain.gain.value = Math.max(0, Math.min(1, vol));
  }
}
