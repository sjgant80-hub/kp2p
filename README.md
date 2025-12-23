# 🌐 Konomi P2P

**Peer-to-peer client for GitHub Pages - no server needed.**

Transform any static website into a collaborative, real-time P2P application with just one script tag.

## ✨ Features

- 🔗 **No Server Required** - Pure peer-to-peer, works on GitHub Pages
- 🔍 **Auto Discovery** - Peers find each other via DHT, pubsub, and bootstrap nodes
- 🔄 **Real-time Sync** - CRDTs ensure conflict-free collaboration (Yjs)
- 💾 **Offline First** - Works offline, syncs when back online
- 🔐 **End-to-End Encrypted** - All data encrypted with TweetNaCl
- 📱 **Works Everywhere** - Browser-based, no extensions needed

## 🚀 Quick Start

Add P2P capabilities to any static page with one line:

```html
<script type="module">
  import { injectP2P } from 'https://unpkg.com/konomi-p2p/dist/konomi-p2p.min.js'

  const p2p = await injectP2P()

  // Get shared state - syncs to all peers automatically
  const state = p2p.getSharedMap('app-state')

  // React to changes from any peer
  state.observe(e => {
    console.log('State changed:', state.toJSON())
  })

  // Make changes - automatically synced
  state.set('counter', (state.get('counter') || 0) + 1)

  // Share invite link
  console.log('Invite:', p2p.invite())
</script>
```

## 📦 Installation

### CDN

```html
<script type="module">
  import { injectP2P } from 'https://unpkg.com/konomi-p2p'
</script>
```

### NPM

```bash
npm install konomi-p2p
```

```javascript
import { injectP2P } from 'konomi-p2p'

const p2p = await injectP2P()
```

## 📖 API

### Basic Usage

```javascript
const p2p = await injectP2P({
  // Optional configuration
  user: { name: 'Alice', color: '#FF6B6B' },
  roomId: 'my-room',  // Or use URL hash
  showUI: true        // Show status overlay
})

// Shared data types
const map = p2p.getSharedMap('my-map')      // Key-value store
const array = p2p.getSharedArray('my-list') // Ordered list
const text = p2p.getSharedText('my-doc')    // Collaborative text

// Get connected peers
const peers = p2p.getPeers()

// Get users with presence info
const users = p2p.getUsers()

// Set your cursor position (for presence)
p2p.setCursor({ x: 100, y: 200 })

// Switch rooms
p2p.switchRoom('new-room-id')

// Get invite link
const link = p2p.invite()
```

### Shared Data Types

```javascript
// Map - key-value store
const map = p2p.getSharedMap('state')
map.set('key', 'value')
map.get('key')  // 'value'
map.delete('key')
map.observe(event => { /* handle changes */ })

// Array - ordered list
const arr = p2p.getSharedArray('items')
arr.push(['item1', 'item2'])
arr.insert(0, ['first'])
arr.delete(1, 1)  // delete 1 item at index 1
arr.toArray()     // get as regular array

// Text - collaborative text editing
const text = p2p.getSharedText('document')
text.insert(0, 'Hello ')
text.insert(6, 'World!')
text.toString()   // 'Hello World!'
```

### Adapters

Easily sync existing page elements:

```javascript
import { createAdapters } from 'konomi-p2p'

const adapters = createAdapters(p2p.doc)

// Sync a form with CRDT
const formAdapter = adapters.form('#my-form')
formAdapter.start()

// Sync a canvas for collaborative drawing
const canvasAdapter = adapters.canvas('#whiteboard')
canvasAdapter.start()

// Sync contenteditable element
const textAdapter = adapters.contentEditable('#editor')
textAdapter.start()
```

### Events

```javascript
// Peer connected
p2p.on('peer:connect', (event) => {
  console.log('Peer connected:', event.detail)
})

// Peer disconnected
p2p.on('peer:disconnect', (event) => {
  console.log('Peer disconnected:', event.detail)
})

// Document updated
p2p.on('update', (update) => {
  console.log('Document updated')
})

// Room switched
p2p.on('room:switch', ({ roomId }) => {
  console.log('Switched to room:', roomId)
})
```

### RPC - Call Methods on Peers

```javascript
// Register a method
p2p.registerMethod('greet', async (params, context) => {
  return `Hello from ${p2p.peerId}!`
})

// Call method on a specific peer
const result = await p2p.callPeer(peerId, 'greet', { name: 'Alice' })

// Broadcast to all peers
await p2p.broadcast('notify', { message: 'Hello everyone!' })
```

### File Sharing

```javascript
// Share a file
const hash = await p2p.shareBlob(fileData)

// Request from peer
const data = await p2p.requestBlob(peerId, hash, (progress) => {
  console.log(`${progress * 100}% complete`)
})
```

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Your Static Page                        │
├─────────────────────────────────────────────────────────────┤
│  Konomi P2P API                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Shared State (Yjs CRDTs)                           │   │
│  │  Map | Array | Text | XML                           │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌───────────────┐ ┌──────────────┐ ┌────────────────┐    │
│  │  Awareness    │ │  Persistence │ │  Adapters      │    │
│  │  (presence)   │ │  (IndexedDB) │ │  (forms, etc)  │    │
│  └───────────────┘ └──────────────┘ └────────────────┘    │
├─────────────────────────────────────────────────────────────┤
│  libp2p Network                                             │
│  ┌──────────┐ ┌───────────┐ ┌──────────┐ ┌───────────┐   │
│  │ GossipSub│ │ Kad-DHT   │ │ WebRTC   │ │ Relay     │   │
│  │ (pubsub) │ │ (routing) │ │ (direct) │ │ (fallback)│   │
│  └──────────┘ └───────────┘ └──────────┘ └───────────┘   │
└─────────────────────────────────────────────────────────────┘
         ↑                    ↑                    ↑
         │      P2P Mesh      │                    │
         ↓                    ↓                    ↓
┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│   Peer A    │◄────►│   Peer B    │◄────►│   Peer C    │
└─────────────┘      └─────────────┘      └─────────────┘
```

## 🔧 Configuration

```javascript
const p2p = await injectP2P({
  // Your display info
  user: {
    name: 'Your Name',
    color: '#FF6B6B',
    avatar: 'https://...'
  },

  // Room ID (defaults to URL hash)
  roomId: 'my-room',

  // Show status UI
  showUI: true,

  // Bootstrap peers
  bootstrap: [
    '/dns4/bootstrap.libp2p.io/tcp/443/wss/p2p/QmNnooDu7...'
  ],

  // Connection limits
  minConnections: 5,
  maxConnections: 50
})
```

## 🔐 Security

- **Identity**: Ed25519 keypairs stored in IndexedDB
- **Transport**: Noise protocol encryption
- **Messages**: Can be encrypted with shared room keys
- **Signatures**: All messages can be signed and verified

## 📱 Browser Support

- ✅ Chrome 80+
- ✅ Firefox 75+
- ✅ Safari 14+
- ✅ Edge 80+

Requires WebRTC and ES Modules support.

## 📚 Examples

### Chat Room

```html
<div id="messages"></div>
<input id="input" placeholder="Type a message...">

<script type="module">
  import { injectP2P } from 'konomi-p2p'

  const p2p = await injectP2P()
  const messages = p2p.getSharedArray('messages')

  messages.observe(() => {
    document.getElementById('messages').innerHTML =
      messages.toArray().map(m => `<p><b>${m.user}:</b> ${m.text}</p>`).join('')
  })

  document.getElementById('input').onkeydown = (e) => {
    if (e.key === 'Enter') {
      messages.push([{
        user: p2p.getUsers().find(u => u.clientId === p2p.doc.clientID)?.name || 'Anonymous',
        text: e.target.value,
        time: Date.now()
      }])
      e.target.value = ''
    }
  }
</script>
```

### Collaborative Whiteboard

```html
<canvas id="canvas" width="800" height="600"></canvas>

<script type="module">
  import { injectP2P, createAdapters } from 'konomi-p2p'

  const p2p = await injectP2P()
  const adapters = createAdapters(p2p.doc)

  const canvas = adapters.canvas('#canvas', 'drawings')
  canvas.start()

  // Change color
  document.getElementById('color').onchange = (e) => {
    canvas.setColor(e.target.value)
  }
</script>
```

## 🛠️ Development

```bash
# Clone
git clone https://github.com/konomi/kp2p

# Install
npm install

# Development build with watch
npm run dev

# Production build
npm run build
```

## 📄 License

MIT

## 🙏 Credits

Built with:
- [libp2p](https://libp2p.io/) - P2P networking
- [Yjs](https://yjs.dev/) - CRDTs
- [TweetNaCl](https://tweetnacl.js.org/) - Cryptography
- [idb](https://github.com/jakearchibald/idb) - IndexedDB wrapper

---

**Made with 🌐 for the decentralized web**
