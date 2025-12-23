# Sandbox Core Build Prompt

## Goal
Isolate AI agents in Web Worker sandbox with P2P-only communication.

## Architecture
```
┌─────────────────────────────────────┐
│           BLOCKED ZONE              │
│  fetch, WebSocket, eval, fs, etc    │
└─────────────────────────────────────┘
              ✖ DENIED
                 │
┌─────────────────────────────────────┐
│      SANDBOX (Web Worker)           │
│  Memory (k/v)  │  Compute (math)    │
└─────────────────────────────────────┘
                 │
            postMessage
                 │
┌─────────────────────────────────────┐
│      BRIDGE (Main Thread)           │
│  LLM Adapter  │  Protocol Handler   │
└─────────────────────────────────────┘
         │              │
      API Call      P2P Message
         │              │
    ┌────┴────┐   ┌─────┴─────┐
    │ LLM API │   │   Peers   │
    └─────────┘   └───────────┘
```

## Sandbox Lockdown (sandbox.js)
```javascript
// Block on worker init - IMMEDIATELY
self.fetch = undefined;
self.XMLHttpRequest = undefined;
self.WebSocket = undefined;
self.eval = undefined;
self.Function = blocked;
self.importScripts = undefined;
self.indexedDB = undefined;
```

## Allowed Operations
```
ping       → echo test
get/set    → sandboxed memory
compute    → validated math only
keys       → list memory keys
stats      → uptime, msg count
```

## Agent Tools (bridge.js)
```
send_message  → P2P peer only
broadcast     → all peers
list_peers    → connected peers
memory_*      → sandbox memory
compute       → sandbox compute
status        → sandbox stats
```

## Protocol (protocol.js)
```javascript
Message = {
  id: uuid,
  v: 1,
  type: req|res|stream|event,
  from: peerId,
  to: peerId|null,
  action: string,
  payload: any,
  replyTo: msgId|null,
  ts: epoch_ms,
  sig: nacl.sign|null
}
```

## Files
```
src/
├─ core/
│  ├─ sandbox.js    # Worker isolation
│  └─ protocol.js   # Message envelope
├─ agent/
│  └─ bridge.js     # LLM ↔ Sandbox
└─ demo/
   └─ sandbox-demo.html
```

## Test
```javascript
const sb = new Sandbox({ id: 'test' });
await sb.start();
await sb.ping('hello');      // { pong: 'hello', ts: ... }
await sb.set('x', 42);       // true
await sb.get('x');           // 42
await sb.compute('2+3*4');   // 14
await sb.stop();
```
