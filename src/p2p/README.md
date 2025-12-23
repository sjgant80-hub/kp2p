# P2P Micro Components

Minimal, composable P2P components. Each file < 50 lines.

## Files

| File | Tokens | Description |
|------|--------|-------------|
| `tpl.js` | ~80 | Template engine + reactive state |
| `mesh.js` | ~100 | WebRTC P2P via WebTorrent tracker |
| `ui.js` | ~120 | UI components (chat, laser, notes) |

## Usage

```js
import {mesh} from './mesh.js'
import {t,$} from './tpl.js'
import {chat,laser} from './ui.js'

const net = mesh('room-name', {
  open: () => console.log('connected'),
  peer: id => net.send({type:'hi'}),
  msg: (m,id) => console.log(m)
})
net.connect()
```

## Template System

```js
// Create elements
t`div.card ${{id:'x', onclick:fn}} ${[child1, 'text']}`

// Layer configs
layer({a:1}, {b:2}, r => r.c = 3) // {a:1,b:2,c:3}

// Reactive state
const count = state(0)
count.sub(v => console.log(v))
count.set(n => n + 1)
```

## UI Components

- `status(el)` - connection indicator
- `userList(el)` - participant list
- `chat(el, onSend)` - chat panel
- `reactions(el, onReact)` - emoji reactions
- `laser(canvas)` - pointer overlay
- `notes(el)` - sticky notes

## Demo

See `demo/linkedin/workspace.html` - collaborative workspace with:
- Laser pointers
- Sticky notes
- Team chat
- Emoji reactions
- Quick polls
- Topic shortcuts
