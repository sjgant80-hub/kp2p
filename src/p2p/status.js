// Connection status indicator - ~10 lines
export const status = (el, labels = {}) => ({
  set: s => {
    el.className = 'status ' + s
    el.textContent = labels[s] || s
  }
})
