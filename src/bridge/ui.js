/**
 * UI Module
 * P2P status overlay and connection indicator
 */

const STATUS_UI_ID = 'konomi-p2p-status'

/**
 * Status UI styles
 */
const STYLES = `
  #${STATUS_UI_ID} {
    position: fixed;
    bottom: 16px;
    right: 16px;
    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
    color: #eee;
    padding: 12px 16px;
    border-radius: 12px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, monospace;
    font-size: 13px;
    z-index: 99999;
    border: 1px solid rgba(79, 172, 254, 0.3);
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
    min-width: 180px;
    transition: all 0.3s ease;
    user-select: none;
  }

  #${STATUS_UI_ID}:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 24px rgba(0, 0, 0, 0.4);
  }

  #${STATUS_UI_ID} .header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
    padding-bottom: 8px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }

  #${STATUS_UI_ID} .status-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    animation: pulse 2s infinite;
  }

  #${STATUS_UI_ID} .status-dot.online {
    background: #00ff88;
    box-shadow: 0 0 8px #00ff88;
  }

  #${STATUS_UI_ID} .status-dot.connecting {
    background: #ffd93d;
    box-shadow: 0 0 8px #ffd93d;
  }

  #${STATUS_UI_ID} .status-dot.offline {
    background: #ff6b6b;
    box-shadow: 0 0 8px #ff6b6b;
    animation: none;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }

  #${STATUS_UI_ID} .title {
    font-weight: 600;
    color: #4facfe;
  }

  #${STATUS_UI_ID} .stats {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  #${STATUS_UI_ID} .stat-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  #${STATUS_UI_ID} .stat-label {
    color: #888;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  #${STATUS_UI_ID} .stat-value {
    color: #fff;
    font-weight: 500;
  }

  #${STATUS_UI_ID} .stat-value.peers {
    color: #e94560;
  }

  #${STATUS_UI_ID} .stat-value.users {
    color: #4ecdc4;
  }

  #${STATUS_UI_ID} .actions {
    margin-top: 10px;
    padding-top: 10px;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    display: flex;
    gap: 8px;
  }

  #${STATUS_UI_ID} .btn {
    flex: 1;
    padding: 6px 12px;
    border: none;
    border-radius: 6px;
    background: rgba(79, 172, 254, 0.2);
    color: #4facfe;
    font-size: 11px;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  #${STATUS_UI_ID} .btn:hover {
    background: rgba(79, 172, 254, 0.3);
  }

  #${STATUS_UI_ID} .btn:active {
    transform: scale(0.95);
  }

  #${STATUS_UI_ID} .minimized {
    cursor: pointer;
  }

  #${STATUS_UI_ID}.mini {
    min-width: auto;
    padding: 8px 12px;
  }

  #${STATUS_UI_ID}.mini .stats,
  #${STATUS_UI_ID}.mini .actions {
    display: none;
  }

  #${STATUS_UI_ID} .user-list {
    margin-top: 8px;
    padding-top: 8px;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
  }

  #${STATUS_UI_ID} .user-item {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 11px;
    margin-bottom: 4px;
  }

  #${STATUS_UI_ID} .user-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
  }

  #${STATUS_UI_ID} .user-name {
    color: #ccc;
  }
`

/**
 * Inject status UI
 * @param {KonomiP2P} api
 */
export function injectStatusUI(api) {
  // Remove existing if present
  removeStatusUI()

  // Add styles
  const styleEl = document.createElement('style')
  styleEl.id = `${STATUS_UI_ID}-styles`
  styleEl.textContent = STYLES
  document.head.appendChild(styleEl)

  // Create UI
  const ui = document.createElement('div')
  ui.id = STATUS_UI_ID

  ui.innerHTML = `
    <div class="header">
      <div class="status-dot online"></div>
      <span class="title">Konomi P2P</span>
    </div>
    <div class="stats">
      <div class="stat-row">
        <span class="stat-label">Peers</span>
        <span class="stat-value peers">0</span>
      </div>
      <div class="stat-row">
        <span class="stat-label">Users</span>
        <span class="stat-value users">0</span>
      </div>
      <div class="stat-row">
        <span class="stat-label">Room</span>
        <span class="stat-value room" style="font-size: 10px; max-width: 100px; overflow: hidden; text-overflow: ellipsis;"></span>
      </div>
    </div>
    <div class="user-list"></div>
    <div class="actions">
      <button class="btn copy-btn">Copy Invite</button>
      <button class="btn mini-btn">−</button>
    </div>
  `

  document.body.appendChild(ui)

  // Update function
  const update = () => {
    const stats = api.getStats()
    const users = api.getUsers()

    // Update peer count
    ui.querySelector('.stat-value.peers').textContent = stats.connectedPeers

    // Update user count
    ui.querySelector('.stat-value.users').textContent = stats.users

    // Update room
    ui.querySelector('.stat-value.room').textContent = stats.roomId.slice(0, 8) + '...'

    // Update status dot
    const statusDot = ui.querySelector('.status-dot')
    if (stats.connectedPeers > 0) {
      statusDot.className = 'status-dot online'
    } else {
      statusDot.className = 'status-dot connecting'
    }

    // Update user list
    const userList = ui.querySelector('.user-list')
    if (users.length > 0) {
      userList.innerHTML = users.slice(0, 5).map(user => `
        <div class="user-item">
          <div class="user-dot" style="background: ${user.color}"></div>
          <span class="user-name">${user.name}</span>
        </div>
      `).join('')

      if (users.length > 5) {
        userList.innerHTML += `
          <div class="user-item">
            <span class="user-name" style="color: #666">+${users.length - 5} more</span>
          </div>
        `
      }
    } else {
      userList.innerHTML = ''
    }
  }

  // Copy invite button
  ui.querySelector('.copy-btn').addEventListener('click', () => {
    const invite = api.invite()
    navigator.clipboard.writeText(invite).then(() => {
      const btn = ui.querySelector('.copy-btn')
      btn.textContent = 'Copied!'
      setTimeout(() => {
        btn.textContent = 'Copy Invite'
      }, 2000)
    })
  })

  // Minimize button
  ui.querySelector('.mini-btn').addEventListener('click', () => {
    ui.classList.toggle('mini')
    const btn = ui.querySelector('.mini-btn')
    btn.textContent = ui.classList.contains('mini') ? '+' : '−'
  })

  // Initial update
  update()

  // Periodic updates
  const interval = setInterval(update, 1000)

  // Store interval for cleanup
  ui.dataset.intervalId = interval
}

/**
 * Remove status UI
 */
export function removeStatusUI() {
  const ui = document.getElementById(STATUS_UI_ID)
  if (ui) {
    if (ui.dataset.intervalId) {
      clearInterval(parseInt(ui.dataset.intervalId))
    }
    ui.remove()
  }

  const styles = document.getElementById(`${STATUS_UI_ID}-styles`)
  if (styles) {
    styles.remove()
  }
}

/**
 * Create a toast notification
 * @param {string} message
 * @param {object} options
 */
export function showToast(message, options = {}) {
  const toast = document.createElement('div')
  toast.style.cssText = `
    position: fixed;
    bottom: 80px;
    right: 16px;
    background: ${options.type === 'error' ? '#ff6b6b' : '#4facfe'};
    color: white;
    padding: 12px 20px;
    border-radius: 8px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 14px;
    z-index: 99999;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    animation: slideIn 0.3s ease;
  `
  toast.textContent = message

  // Add animation
  const style = document.createElement('style')
  style.textContent = `
    @keyframes slideIn {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
      from { transform: translateX(0); opacity: 1; }
      to { transform: translateX(100%); opacity: 0; }
    }
  `
  document.head.appendChild(style)

  document.body.appendChild(toast)

  // Remove after duration
  const duration = options.duration || 3000
  setTimeout(() => {
    toast.style.animation = 'slideOut 0.3s ease'
    setTimeout(() => {
      toast.remove()
      style.remove()
    }, 300)
  }, duration)
}

/**
 * Create a modal dialog
 * @param {object} options
 */
export function showModal(options = {}) {
  const overlay = document.createElement('div')
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100000;
  `

  const modal = document.createElement('div')
  modal.style.cssText = `
    background: #1a1a2e;
    color: #fff;
    padding: 24px;
    border-radius: 12px;
    max-width: 400px;
    width: 90%;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  `

  modal.innerHTML = `
    <h3 style="margin: 0 0 16px; color: #4facfe;">${options.title || 'Modal'}</h3>
    <div style="margin-bottom: 20px; color: #ccc; line-height: 1.5;">${options.content || ''}</div>
    <div style="display: flex; gap: 12px; justify-content: flex-end;">
      ${options.cancelText ? `<button class="cancel-btn" style="padding: 10px 20px; border: none; border-radius: 6px; background: #333; color: #fff; cursor: pointer;">${options.cancelText}</button>` : ''}
      <button class="confirm-btn" style="padding: 10px 20px; border: none; border-radius: 6px; background: #4facfe; color: #fff; cursor: pointer;">${options.confirmText || 'OK'}</button>
    </div>
  `

  overlay.appendChild(modal)
  document.body.appendChild(overlay)

  return new Promise((resolve) => {
    modal.querySelector('.confirm-btn').addEventListener('click', () => {
      overlay.remove()
      resolve(true)
    })

    const cancelBtn = modal.querySelector('.cancel-btn')
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        overlay.remove()
        resolve(false)
      })
    }

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.remove()
        resolve(false)
      }
    })
  })
}

export default {
  injectStatusUI,
  removeStatusUI,
  showToast,
  showModal
}
