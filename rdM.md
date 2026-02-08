# kp2p — Konomi P2P (Compressed Reference)

**Peer-to-peer collaboration framework. One `<script>` tag turns any static page into a real-time, encrypted, serverless app.**

## Stack

| Layer | Tech | Purpose |
|-------|------|---------|
| Network | libp2p, WebRTC, WebSockets, Circuit Relay | P2P transport & NAT traversal |
| Sync | Yjs (CRDTs) | Conflict-free real-time state |
| Crypto | TweetNaCl (Ed25519/X25519), Noise | E2E encryption & identity |
| Storage | IndexedDB + LRU cache | Offline-first persistence |
| Build | Rollup, Terser | ESM/UMD bundles |
| Test | Custom state-machine runner, Playwright | Unit + E2E |

**Runtime deps (5):** `@roamhq/wrtc`, `trystero`, `tweetnacl`, `ws`, `yjs`

## Architecture

```
Apps / Examples / Widgets (500+)
─────────────────────────────────
KonomiP2P API  (inject.js)
  SharedMap | SharedArray | SharedText | RPC | Blob | Events
─────────────────────────────────
Sync  (Yjs CRDT provider + awareness + offline queue)
─────────────────────────────────
Protocols  (signal | sync | blob | rpc)
─────────────────────────────────
Network  (libp2p: GossipSub, Kademlia DHT, WebRTC/WS/Relay)
─────────────────────────────────
Core  (crypto · identity · peer · store)
```

## Directory Map

```
src/
  index.js            Main entry — exports ~200 symbols
  config.js           Bootstrap peers, protocol IDs, timeouts
  core/               Crypto, identity (keypair), IndexedDB store
  network/            libp2p node creation & transport config
  sync/               Room, KonomiP2PProvider, awareness, persistence
  protocols/          signal, sync, blob, rpc protocol handlers
  bridge/             injectP2P(), adapters, UI overlay, interceptors
  enterprise/         ISA-95 hierarchy, Sparkplug-style mesh
  llm/                LLM integration, MCP server
  agent/              AI agent v1-v4, tool registry, sandbox
  apps/               13+ apps (demo, ignite, 3DLand, konoforge, …)
  games/              Game engine, Genesis framework
  widgets/            500+ reusable UI components
  lib/                Graphics, UDT registry
  sw/                 Service worker & sync management
examples/             chat/ whiteboard/ wiki/ — quick-start demos
test/                 State-machine runner, CSV cases, Playwright E2E
docs/business/        Strategy, financials, roadmap, verticals
```

## Key APIs

```js
import { injectP2P } from 'konomi-p2p'
const p2p = await injectP2P({ user: { name, color }, roomId: 'r1' })

p2p.getSharedMap('state')        // key-value CRDT
p2p.getSharedArray('items')      // ordered list CRDT
p2p.getSharedText('doc')         // collaborative text CRDT

p2p.getPeers()                   // connected peer IDs
p2p.getUsers()                   // presence map
p2p.setCursor({ x, y })         // cursor awareness

p2p.callPeer(id, 'method', {})  // RPC
p2p.broadcast('event', data)    // pub/sub
p2p.shareBlob(data)             // file transfer

p2p.on('peer:connect' | 'update' | 'awareness', fn)
```

Granular imports: `konomi-p2p/network`, `/sync`, `/core`, `/udts`, etc.

## Config Highlights (`src/config.js`)

- 3 public bootstrap peers (libp2p)
- GossipSub: D=6, Dlo=4, Dhi=12
- Connections: min 5, max 50
- IndexedDB stores: identity, peers, rooms, messages, blobs
- Awareness interval: configurable debounce

## Protocols

| Protocol | Path | Role |
|----------|------|------|
| Signal | `/konomi/signal/1.0.0` | WebRTC signaling |
| Sync | `/konomi/sync/1.0.0` | State-vector exchange |
| Blob | `/konomi/blob/1.0.0` | Chunked file transfer |
| RPC | `/konomi/rpc/1.0.0` | Remote procedure calls |

## Security Model

- **Identity:** Ed25519 keypair per device, persisted in IndexedDB
- **Transport:** Noise protocol encryption on all connections
- **Messages:** TweetNaCl box (X25519) for E2E encryption
- **Signatures:** All messages signed, verified on receive
- **AI Agents:** Sandboxed execution with capability-scoped tool registry

## Build & Scripts

```bash
npm run build      # → dist/{konomi-p2p.js, .min.js, .umd.js, service-worker.js}
npm run dev        # watch mode
npm run test       # unit + E2E
npm run serve      # localhost:3000
```

## Target Markets

| Vertical | TAM | Play |
|----------|-----|------|
| Collaboration | $17.8B | No-server Figma/Notion alternative |
| AI Agents | $47B | Safe sandboxed LLM deployment |
| Industrial IoT | $321B | ISA-95 mesh (Sparkplug compat) |
| Gaming | $187B | P2P multiplayer |

**Model:** Free core lib → Enterprise tiers ($99-$2.5K/mo) → Marketplace (30% rev share)

## Roadmap (condensed)

1. **Seed** — core + audit + design partners (6 mo, $5-15M)
2. **Series A** — production hardening, SOC2/HIPAA/GDPR (18 mo, $30-80M)
3. **Scale** — platform leader, 50+ edge PoPs ($500M+)

## Quick Start

```html
<script type="module">
  import { injectP2P } from 'https://unpkg.com/konomi-p2p'
  const p2p = await injectP2P()
</script>
```

Zero servers. Works on GitHub Pages.
