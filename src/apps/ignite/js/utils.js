/**
 * Konomi Ignite - Utility Functions
 */

export const $ = id => document.getElementById(id);

export function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function log(level, msg, protocol = 'SYS') {
  const console = $('logsConsole');
  const time = new Date().toLocaleTimeString();
  const line = document.createElement('div');
  line.className = 'console-line';
  line.innerHTML = `
    <span class="console-time">[${time}]</span>
    <span class="console-level ${level}">[${protocol}]</span>
    <span class="console-msg">${escapeHtml(msg)}</span>
  `;
  console.appendChild(line);
  console.scrollTop = console.scrollHeight;
}
