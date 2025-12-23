/**
 * @file sandbox/js/actions.js
 * @desc User actions and event handlers
 * @size ~120 tokens
 * @deps state, config, render
 * @exports selectExample, loadDemo, runCode, addLog, clearLogs
 */

import { state } from './state.js'
import { EXAMPLES, TEMPLATES } from './config.js'
import { renderConsole } from './render.js'

export function addLog(level, msg) {
  state.logs.push({ level, msg, ts: Date.now() })
  if (state.logs.length > 100) state.logs.shift()
}

export function clearLogs() {
  state.logs = []
}

export function loadDemo(container, path) {
  const oldIframe = container.querySelector('iframe')
  if (oldIframe) oldIframe.remove()

  const iframe = document.createElement('iframe')
  iframe.src = path + '#' + state.roomId
  container.insertBefore(iframe, container.firstChild)
  return iframe
}

export function showCustomEditor(container, editor) {
  const oldIframe = container.querySelector('iframe')
  if (oldIframe) oldIframe.remove()

  const sandbox = document.createElement('div')
  sandbox.id = 'customSandbox'
  sandbox.className = 'custom-placeholder'
  sandbox.innerHTML = '<div>⚡<br>Write code and click <b>Run</b></div>'
  container.insertBefore(sandbox, container.firstChild)

  editor.value = TEMPLATES.basic
}

export function runCode(code, container) {
  addLog('info', '▶ Running code...')

  const oldSandbox = document.getElementById('customSandbox')
  if (oldSandbox) oldSandbox.remove()

  const iframe = document.createElement('iframe')
  iframe.id = 'customSandbox'
  iframe.sandbox = 'allow-scripts allow-same-origin'
  iframe.style.cssText = 'width:100%;height:100%;border:none;background:#1a1a2e'

  const html = '<!DOCTYPE html><html><head><style>body{font-family:system-ui;padding:20px;background:#1a1a2e;color:#fff}</style></head><body>' +
    '<scr' + 'ipt type="module">' +
    'const _log=console.log.bind(console);' +
    'console.log=(...a)=>{parent.postMessage({type:"log",level:"info",args:a.map(x=>typeof x==="object"?JSON.stringify(x):String(x)).join(" ")},"*");_log(...a)};' +
    'console.error=(...a)=>{parent.postMessage({type:"log",level:"error",args:a.join(" ")},"*")};' +
    'console.warn=(...a)=>{parent.postMessage({type:"log",level:"warn",args:a.join(" ")},"*")};' +
    'console.clear=()=>parent.postMessage({type:"clear"},"*");' +
    'try{' + code + '}catch(e){console.error("Error:",e.message)}' +
    '</scr' + 'ipt></body></html>'

  iframe.srcdoc = html
  container.insertBefore(iframe, container.firstChild)
}

export function selectExample(id, els) {
  state.activeExample = id
  const example = EXAMPLES.find(e => e.id === id)

  if (example.path) {
    loadDemo(els.demoArea, example.path)
  } else {
    showCustomEditor(els.demoArea, els.codeEditor)
  }
}
