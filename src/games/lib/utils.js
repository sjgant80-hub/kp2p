/**
 * @file src/games/lib/utils.js
 * @desc Shared utilities for GitFox games
 */

/**
 * Math and vector utilities
 */
export const T = {
  /**
   * Create a THREE.Vector3
   */
  v3: (x, y, z) => new THREE.Vector3(x, y, z),

  /**
   * Random float between a and b
   */
  rnd: (a, b) => a + Math.random() * (b - a),

  /**
   * Random integer between a and b (inclusive)
   */
  rndInt: (a, b) => Math.floor(a + Math.random() * (b - a + 1)),

  /**
   * Clamp value between min and max
   */
  clamp: (v, a, b) => Math.max(a, Math.min(b, v)),

  /**
   * Linear interpolation
   */
  lerp: (a, b, t) => a + (b - a) * t,

  /**
   * Distance between two 3D points
   */
  dist3: (a, b) => Math.sqrt(
    (a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.z - b.z) ** 2
  ),

  /**
   * Degrees to radians
   */
  deg2rad: (d) => d * Math.PI / 180,

  /**
   * Radians to degrees
   */
  rad2deg: (r) => r * 180 / Math.PI
};

/**
 * DOM selector shorthand
 * @param {string} id - Element ID
 * @returns {HTMLElement}
 */
export const $ = (id) => document.getElementById(id);

/**
 * Escape HTML special characters
 * @param {string} str - String to escape
 * @returns {string}
 */
export function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Format number with leading zeros
 * @param {number} n - Number to format
 * @param {number} width - Total width
 * @returns {string}
 */
export function padNumber(n, width = 5) {
  return String(n).padStart(width, '0');
}

/**
 * Format time as MM:SS
 * @param {number} seconds - Time in seconds
 * @returns {string}
 */
export function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/**
 * Generate a random color
 * @returns {number}
 */
export function randomColor() {
  return Math.floor(Math.random() * 0xffffff);
}

/**
 * Debounce a function
 * @param {Function} fn - Function to debounce
 * @param {number} delay - Delay in ms
 * @returns {Function}
 */
export function debounce(fn, delay) {
  let timer = null;
  return (...args) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

/**
 * Throttle a function
 * @param {Function} fn - Function to throttle
 * @param {number} limit - Time limit in ms
 * @returns {Function}
 */
export function throttle(fn, limit) {
  let lastCall = 0;
  return (...args) => {
    const now = Date.now();
    if (now - lastCall >= limit) {
      lastCall = now;
      return fn(...args);
    }
  };
}

/**
 * Wait for a specified time
 * @param {number} ms - Milliseconds to wait
 * @returns {Promise}
 */
export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Check if arrays are equal
 * @param {Array} a
 * @param {Array} b
 * @returns {boolean}
 */
export function arraysEqual(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

/**
 * Deep clone an object
 * @param {Object} obj - Object to clone
 * @returns {Object}
 */
export function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Generate UUID v4
 * @returns {string}
 */
export function uuid() {
  return crypto.randomUUID?.() ||
    'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
}

/**
 * Parse URL query parameters
 * @returns {Object}
 */
export function getQueryParams() {
  const params = {};
  new URLSearchParams(window.location.search).forEach((v, k) => {
    params[k] = v;
  });
  return params;
}

/**
 * Storage utilities with fallback
 */
export const storage = {
  get(key, defaultValue = null) {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch {
      return defaultValue;
    }
  },

  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  },

  remove(key) {
    try {
      localStorage.removeItem(key);
      return true;
    } catch {
      return false;
    }
  }
};

/**
 * Check if device is mobile
 * @returns {boolean}
 */
export function isMobile() {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
}

/**
 * Create a simple event emitter
 * @returns {Object}
 */
export function createEmitter() {
  const events = new Map();

  return {
    on(event, callback) {
      if (!events.has(event)) events.set(event, []);
      events.get(event).push(callback);
      return () => this.off(event, callback);
    },

    off(event, callback) {
      if (!events.has(event)) return;
      const listeners = events.get(event);
      const idx = listeners.indexOf(callback);
      if (idx !== -1) listeners.splice(idx, 1);
    },

    emit(event, ...args) {
      if (!events.has(event)) return;
      events.get(event).forEach(cb => cb(...args));
    },

    once(event, callback) {
      const wrapper = (...args) => {
        callback(...args);
        this.off(event, wrapper);
      };
      return this.on(event, wrapper);
    }
  };
}

export default { T, $, escapeHtml, padNumber, formatTime, storage };
