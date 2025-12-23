/**
 * @file src/games/lib/index.js
 * @desc GitFox Game Library - Reusable components for P2P multiplayer games
 *
 * This library provides:
 * - WebTorrentP2P: P2P networking via WebTorrent tracker protocol
 * - GameEngine: Base THREE.js game engine for space combat
 * - GameHUD: UI/HUD components (shields, scores, player lists, etc.)
 * - ChatHUD: Chat interface for multiplayer games
 * - LobbyManager: Game lobby management
 * - Utilities: Common helper functions
 */

export { WebTorrentP2P } from './WebTorrentP2P.js';
export { GameEngine, ShipPresets } from './GameEngine.js';
export { GameHUD, ChatHUD, LobbyManager, HUDThemes } from './GameHUD.js';
export {
  T,
  $,
  escapeHtml,
  padNumber,
  formatTime,
  randomColor,
  debounce,
  throttle,
  sleep,
  uuid,
  storage,
  isMobile,
  createEmitter
} from './utils.js';

/**
 * Quick start factory for creating a multiplayer game
 * @param {Object} options
 * @returns {Object} Game instance with all components
 */
export function createMultiplayerGame(options = {}) {
  const {
    canvasId = 'c',
    trackerUrl = 'wss://tracker.openwebtorrent.com',
    appPrefix = 'gitfox',
    defaultRoom = 'arena',
    ...gameOptions
  } = options;

  // Import dynamically to avoid issues when THREE.js isn't loaded
  const { WebTorrentP2P } = require('./WebTorrentP2P.js');
  const { GameEngine } = require('./GameEngine.js');
  const { GameHUD, LobbyManager } = require('./GameHUD.js');

  const p2p = new WebTorrentP2P({
    trackerUrl,
    appPrefix,
    peerIdPrefix: `-${appPrefix.toUpperCase().slice(0, 2)}01-`
  });

  const engine = new GameEngine(canvasId, gameOptions);
  const hud = new GameHUD();
  const lobby = new LobbyManager();

  return {
    p2p,
    engine,
    hud,
    lobby,

    async start(roomName) {
      await p2p.join(roomName || defaultRoom);
      engine.init();
      engine.start();
    }
  };
}

/**
 * Message type constants for P2P games
 */
export const MessageTypes = {
  JOIN: 'join',
  LEAVE: 'leave',
  STATE: 'state',
  FIRE: 'fire',
  HIT: 'hit',
  KILL: 'kill',
  RESPAWN: 'respawn',
  CHAT: 'chat',
  READY: 'ready',
  START: 'start',
  PAUSE: 'pause',
  SYNC: 'sync'
};

/**
 * Team identifiers
 */
export const Teams = {
  GITFOX: 'gitfox',
  AMAZON: 'amazon',
  NEUTRAL: 'neutral'
};

export default {
  WebTorrentP2P: require('./WebTorrentP2P.js').WebTorrentP2P,
  GameEngine: require('./GameEngine.js').GameEngine,
  GameHUD: require('./GameHUD.js').GameHUD,
  ChatHUD: require('./GameHUD.js').ChatHUD,
  LobbyManager: require('./GameHUD.js').LobbyManager,
  MessageTypes,
  Teams
};
