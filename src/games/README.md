# GitFox Game Library

Reusable components for building P2P multiplayer games using WebRTC and THREE.js.

## Overview

This library provides a set of components that eliminate boilerplate code when building multiplayer space combat games like GitFox. Originally, each game file contained 300-500 lines of duplicated networking and game engine code. With this library, that's reduced to ~50 lines of setup code.

## Components

### WebTorrentP2P

P2P networking abstraction using WebTorrent tracker protocol for peer discovery and WebRTC for direct peer connections.

```javascript
import { WebTorrentP2P } from './lib/WebTorrentP2P.js';

const p2p = new WebTorrentP2P({
  appPrefix: 'mygame',      // Used for room hashing
  peerIdPrefix: '-MG0001-', // Peer ID prefix
  trackerUrl: 'wss://tracker.openwebtorrent.com'
});

// Join a room
await p2p.join('game-room-1');

// Listen for events
p2p.addEventListener('connected', () => console.log('Connected!'));
p2p.addEventListener('peerconnect', ({ detail }) => {
  console.log('Peer joined:', detail.peerId);
});
p2p.addEventListener('message', ({ detail }) => {
  console.log('Message from', detail.peerId, detail.message);
});

// Send messages
p2p.broadcast({ type: 'state', x: 100, y: 50 });
p2p.send(peerId, { type: 'private', text: 'Hello!' });
```

#### Events

- `connecting` - Connecting to tracker
- `connected` - Connected to tracker
- `disconnected` - Disconnected from tracker
- `peerconnect` - New peer connected
- `peerdisconnect` - Peer disconnected
- `message` - Message received from peer
- `error` - Error occurred

### GameEngine

Base THREE.js game engine for space combat games.

```javascript
import { GameEngine } from './lib/GameEngine.js';

const game = new GameEngine('canvas-id', {
  clearColor: 0x050510,
  cameraPosition: { x: 0, y: 20, z: 40 },
  starCount: 3000
});

// Initialize
game.init();

// Create player ship
game.ship = game.createShip('gitfox'); // or 'amazon' or custom config
game.scene.add(game.ship);

// Create environment
game.createStarfield();
game.createPlanet({ radius: 200, color: 0x2244aa });
game.createArenaGrid();

// Set up callbacks
game.onFire = (bullet, data) => {
  // Broadcast fire event to peers
};

game.onDeath = (killerId) => {
  // Handle player death
};

game.onUpdate = () => {
  // Custom update logic
};

// Start game loop
game.start();
```

#### Ship Presets

```javascript
import { ShipPresets } from './lib/GameEngine.js';

// Available presets: 'gitfox', 'amazon', 'enemy'
const ship = game.createShip('gitfox');

// Or custom config
const customShip = game.createShip({
  bodyColor: 0xcccccc,
  wingColor: 0xff00ff,
  cockpitColor: 0x00ffff,
  engineGlow: 0xff00ff,
  hasVerticalFins: true
});
```

### GameHUD

HUD/UI components for game interfaces.

```javascript
import { GameHUD, ChatHUD, LobbyManager } from './lib/GameHUD.js';

const hud = new GameHUD();

// Update displays
hud.updateShield(75);          // 0-100
hud.updateBoost(50);           // 0-100
hud.updateScore(1500);         // Score
hud.updateKills(3);            // Kill count

// Player list
hud.updatePlayerList({
  myName: 'Player1',
  myTeam: 'gitfox',
  myScore: 100,
  players: remotePlayers // Map of player objects
});

// Kill feed
hud.addKillFeed('Player1 eliminated Player2');

// Messages
hud.showMessage('BATTLE START!', 3000);

// Radio dialog
hud.showRadio({
  face: '🐰',
  text: 'Good luck, pilot!',
  duration: 4000
});

// Connection status
hud.updateConnectionStatus({
  connected: true,
  peerCount: 5
});
```

### ChatHUD

Chat interface for multiplayer games.

```javascript
const chat = new ChatHUD({
  containerId: 'chatMessages',
  inputId: 'chatInput',
  sendButtonId: 'chatSend',
  onSend: (text) => {
    chat.addMessage(myName, text, true); // true = self
    p2p.broadcast({ type: 'chat', name: myName, text });
  }
});

// Add messages
chat.addMessage('OtherPlayer', 'Hello!', false);
chat.addSystemMessage('Player joined');
```

### LobbyManager

Game lobby with team selection.

```javascript
const lobby = new LobbyManager({
  defaultTeam: 'gitfox',
  onJoin: ({ name, room, team }) => {
    startGame(name, room, team);
  }
});

// Control visibility
lobby.show();
lobby.hide();

// Update status
lobby.setStatus('Waiting for players...');
```

### Utilities

Common helper functions.

```javascript
import { T, $, escapeHtml, padNumber, storage } from './lib/utils.js';

// Math utilities
T.v3(x, y, z)      // Create Vector3
T.rnd(0, 100)      // Random float between 0-100
T.clamp(v, 0, 1)   // Clamp value
T.lerp(a, b, 0.5)  // Linear interpolation

// DOM
const el = $('element-id');

// Formatting
escapeHtml('<script>') // &lt;script&gt;
padNumber(42, 5)       // '00042'

// Local storage
storage.set('key', { value: 1 });
storage.get('key', defaultValue);
```

## File Structure

```
src/games/
├── lib/
│   ├── index.js         # Main exports
│   ├── WebTorrentP2P.js # P2P networking
│   ├── GameEngine.js    # THREE.js game engine
│   ├── GameHUD.js       # UI components
│   └── utils.js         # Utilities
└── README.md            # This file
```

## Refactored Examples

See the GitFox demo files for complete examples:

- `src/demo/gitfox/index-refactored.html` - Multiplayer arena
- `src/demo/gitfox/level1-refactored.html` - Single-player level
- `src/demo/gitfox/menu-refactored.html` - Menu with P2P chat

## Message Protocol

Standard message types for P2P games:

```javascript
// Player joined
{ type: 'join', id: peerId, name: 'Player', team: 'gitfox' }

// State sync (send frequently)
{ type: 'state', id: peerId, x, y, z, rx, ry, rz, shield, score }

// Player fired
{ type: 'fire', id: peerId, team, x, y, z, vx, vy, vz }

// Hit notification
{ type: 'hit', targetId, attackerId, damage: 15 }

// Kill notification
{ type: 'kill', victimId, victimName, killerId, killerName }

// Respawn
{ type: 'respawn', id: peerId }

// Chat
{ type: 'chat', id: peerId, name: 'Player', text: 'Hello!' }
```

## Savings

Using this library reduces code duplication significantly:

| Component | Lines Saved Per File |
|-----------|---------------------|
| WebTorrentP2P | ~350 lines |
| GameEngine | ~300 lines |
| GameHUD | ~150 lines |
| Utils | ~50 lines |

**Total savings: ~850 lines per game file**

Before: 8 game files × 1000 lines = 8000 lines
After: 8 game files × 150 lines + 1100 lines library = 2300 lines

**63% code reduction** while improving maintainability.
