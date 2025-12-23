/**
 * @file sandbox/js/app.js
 * @desc Main application entry point
 * @size ~100 tokens
 * @deps state, config, render, actions, p2p
 * @exports boot
 */

import { state } from './state.js'
import { TEMPLATES, EXAMPLES } from './config.js'
import { renderExampleList, renderConsole, renderStatus, renderUsers } from './render.js'
import { selectExample, runCode, addLog, clearLogs } from './actions.js'
import { initP2PStatus, updatePeerStatus } from './p2p.js'

export function boot(els) {
  // Parse URL params
  const params = new URLSearchParams(location.search)
  const demoParam = params.get('demo')
  if (demoParam && EXAMPLES.find(e => e.id === demoParam)) {
    state.activeExample = demoParam
  }

  // Set room in URL
  if (!location.hash) {
    history.replaceState(null, '', '#' + state.roomId)
  }

  // Initial render
  renderExampleList(els.exampleList, id => {
    selectExample(id, els)
    renderExampleList(els.exampleList, id => selectExample(id, els))
    els.sidebar.classList.remove('open')
  })
  renderStatus(els)
  els.codeEditor.value = TEMPLATES.basic

  // Load initial example
  selectExample(state.activeExample, els)

  // Bind events
  els.menuToggle.onclick = () => els.sidebar.classList.toggle('open')
  els.templateSelect.onchange = e => { els.codeEditor.value = TEMPLATES[e.target.value] || '' }
  els.runBtn.onclick = () => runCode(els.codeEditor.value, els.demoArea)
  els.clearConsole.onclick = () => { clearLogs(); renderConsole(els.consoleOutput) }
  els.shareBtn.onclick = () => {
    navigator.clipboard.writeText(location.origin + location.pathname + '#' + state.roomId)
    els.shareBtn.textContent = 'Copied!'
    setTimeout(() => els.shareBtn.textContent = 'Share', 2000)
  }
  els.fullscreenBtn.onclick = () => {
    const demo = els.demoArea.querySelector('iframe') || els.demoArea
    if (demo.requestFullscreen) demo.requestFullscreen()
  }
  els.reloadBtn.onclick = () => {
    const iframe = els.demoArea.querySelector('iframe')
    if (iframe) iframe.src = iframe.src
  }

  // Console messages from iframes
  window.addEventListener('message', e => {
    if (e.data.type === 'log') { addLog(e.data.level, e.data.args); renderConsole(els.consoleOutput) }
    if (e.data.type === 'clear') { clearLogs(); renderConsole(els.consoleOutput) }
  })

  // Keyboard shortcuts
  document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault()
      runCode(els.codeEditor.value, els.demoArea)
    }
  })

  // Status updates
  setInterval(() => {
    updatePeerStatus()
    renderStatus(els)
    renderUsers(els.userAvatars)
  }, 1000)

  // Init P2P
  initP2PStatus()

  addLog('info', '🚀 Sandbox ready!')
  addLog('info', '📋 Room: ' + state.roomId)
}
