/**
 * @file sandbox/js/config.js
 * @desc Examples and templates configuration
 * @size ~120 tokens
 * @deps none
 * @exports EXAMPLES, TEMPLATES
 */

export const EXAMPLES = [
  { id: 'chat', icon: '💬', name: 'Chat Room', desc: 'Real-time messaging', path: './examples/chat/index.html' },
  { id: 'board', icon: '🎨', name: 'Whiteboard', desc: 'Collaborative drawing', path: './examples/whiteboard/index.html' },
  { id: 'wiki', icon: '📚', name: 'Wiki', desc: 'Shared documents', path: './examples/wiki/index.html' },
  { id: 'custom', icon: '⚡', name: 'Custom', desc: 'Run your own code', path: null }
]

export const TEMPLATES = {
  basic: `// Basic P2P Setup
import { injectP2P } from './src/index.js'

const p2p = await injectP2P()
console.log('🌐 Peer ID:', p2p.peerId)
console.log('🔗 Invite:', p2p.invite())

const state = p2p.getSharedMap('demo')
state.observe(() => console.log('📦 State:', state.toJSON()))
state.set('hello', 'world')`,

  counter: `// Shared Counter
import { injectP2P } from './src/index.js'

const p2p = await injectP2P()
const counter = p2p.getSharedMap('counter')

counter.observe(() => console.log('🔢 Count:', counter.get('n') || 0))
setInterval(() => counter.set('n', (counter.get('n') || 0) + 1), 2000)`,

  cursors: `// Live Cursors
import { injectP2P } from './src/index.js'

const p2p = await injectP2P({ user: { name: 'User' + ~~(Math.random()*1000), color: '#4facfe' } })
document.onmousemove = e => p2p.setCursor({ x: e.clientX, y: e.clientY })
setInterval(() => console.log('👥 Users:', p2p.getUsers().length), 3000)`,

  todo: `// Shared Todo List
import { injectP2P } from './src/index.js'

const p2p = await injectP2P()
const todos = p2p.getSharedArray('todos')

todos.observe(() => {
  console.clear()
  todos.toArray().forEach((t, i) => console.log((i+1) + '. [' + (t.done ? '✓' : ' ') + '] ' + t.text))
})
todos.push([{ text: 'Learn P2P', done: false }])`
}
