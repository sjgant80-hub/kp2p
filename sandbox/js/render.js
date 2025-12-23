/**
 * @file sandbox/js/render.js
 * @desc DOM rendering functions
 * @size ~100 tokens
 * @deps state, config
 * @exports renderExampleList, renderConsole, renderStatus, renderUsers
 */

import { state } from './state.js'
import { EXAMPLES } from './config.js'

export function escapeHtml(text) {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

export function renderExampleList(container, onSelect) {
  container.innerHTML = EXAMPLES.map(ex => `
    <div class="example-item ${state.activeExample === ex.id ? 'active' : ''}" data-id="${ex.id}">
      <span class="example-icon">${ex.icon}</span>
      <div class="example-info">
        <div class="example-name">${ex.name}</div>
        <div class="example-desc">${ex.desc}</div>
      </div>
    </div>
  `).join('')

  container.querySelectorAll('.example-item').forEach(el => {
    el.onclick = () => onSelect(el.dataset.id)
  })
}

export function renderConsole(container) {
  container.innerHTML = state.logs.map(log => `
    <div class="log-entry ${log.level}">
      <span class="log-time">${new Date(log.ts).toLocaleTimeString()}</span>
      <span class="log-msg">${escapeHtml(log.msg)}</span>
    </div>
  `).join('')
  container.scrollTop = container.scrollHeight
}

export function renderStatus(els) {
  els.statusDot.className = 'status-dot ' + (state.connected ? 'online' : '')
  els.peerCount.textContent = state.peers.length + ' peer' + (state.peers.length !== 1 ? 's' : '')
  els.roomDisplay.textContent = state.roomId.slice(0, 8) + '...'
  els.connectionStatus.textContent = state.connected ? 'Connected' : 'Connecting...'
}

export function renderUsers(container) {
  if (!state.p2p) return
  const users = state.p2p.getUsers().slice(0, 5)
  container.innerHTML = users.map(u => `
    <div class="user-avatar" style="background:${u.color}" title="${u.name}">${u.name[0].toUpperCase()}</div>
  `).join('')
}
