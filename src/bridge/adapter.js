/**
 * Adapter Module
 * Adapt page state to CRDT
 */

/**
 * Form adapter - sync form inputs with CRDT
 */
export class FormAdapter {
  constructor(form, syncMap, options = {}) {
    this.form = typeof form === 'string'
      ? document.querySelector(form)
      : form
    this.syncMap = syncMap
    this.prefix = options.prefix || 'form:'
    this.debounce = options.debounce || 100
    this._handlers = new Map()
    this._timeout = null
    this._started = false
  }

  /**
   * Start syncing form
   */
  start() {
    if (this._started || !this.form) return
    this._started = true

    // Get all form elements
    const elements = this.form.querySelectorAll('input, textarea, select')

    // Load initial values from CRDT
    elements.forEach(el => {
      const key = this._getKey(el)
      if (this.syncMap.has(key)) {
        this._setValue(el, this.syncMap.get(key))
      }
    })

    // Add input listeners
    elements.forEach(el => {
      const handler = this._createHandler(el)
      this._handlers.set(el, handler)

      el.addEventListener('input', handler)
      el.addEventListener('change', handler)
    })

    // Observe CRDT changes
    this._observer = (event) => {
      event.changes.keys.forEach((change, key) => {
        if (!key.startsWith(this.prefix)) return

        const name = key.slice(this.prefix.length)
        const el = this.form.querySelector(`[name="${name}"]`)
        if (el && this.syncMap.has(key)) {
          const value = this.syncMap.get(key)
          if (this._getValue(el) !== value) {
            this._setValue(el, value)
          }
        }
      })
    }
    this.syncMap.observe(this._observer)
  }

  /**
   * Stop syncing
   */
  stop() {
    if (!this._started) return
    this._started = false

    // Remove listeners
    for (const [el, handler] of this._handlers) {
      el.removeEventListener('input', handler)
      el.removeEventListener('change', handler)
    }
    this._handlers.clear()

    // Remove observer
    if (this._observer) {
      this.syncMap.unobserve(this._observer)
    }
  }

  /**
   * Create debounced handler for element
   * @private
   */
  _createHandler(el) {
    return () => {
      if (this._timeout) {
        clearTimeout(this._timeout)
      }

      this._timeout = setTimeout(() => {
        const key = this._getKey(el)
        const value = this._getValue(el)
        this.syncMap.set(key, value)
      }, this.debounce)
    }
  }

  /**
   * Get sync key for element
   * @private
   */
  _getKey(el) {
    return this.prefix + (el.name || el.id || '')
  }

  /**
   * Get value from element
   * @private
   */
  _getValue(el) {
    if (el.type === 'checkbox') {
      return el.checked
    }
    if (el.type === 'radio') {
      return el.checked ? el.value : null
    }
    return el.value
  }

  /**
   * Set value on element
   * @private
   */
  _setValue(el, value) {
    if (el.type === 'checkbox') {
      el.checked = !!value
    } else if (el.type === 'radio') {
      el.checked = el.value === value
    } else {
      el.value = value ?? ''
    }
  }
}

/**
 * Canvas adapter - sync canvas drawings with CRDT
 */
export class CanvasAdapter {
  constructor(canvas, syncArray, options = {}) {
    this.canvas = typeof canvas === 'string'
      ? document.querySelector(canvas)
      : canvas
    this.syncArray = syncArray
    this.color = options.color || '#000000'
    this.lineWidth = options.lineWidth || 2
    this._ctx = null
    this._drawing = false
    this._lastIndex = 0
    this._started = false
  }

  /**
   * Start syncing canvas
   */
  start() {
    if (this._started || !this.canvas) return
    this._started = true

    this._ctx = this.canvas.getContext('2d')

    // Replay existing strokes
    this._replay()

    // Add drawing listeners
    this.canvas.addEventListener('mousedown', this._onMouseDown.bind(this))
    this.canvas.addEventListener('mousemove', this._onMouseMove.bind(this))
    this.canvas.addEventListener('mouseup', this._onMouseUp.bind(this))
    this.canvas.addEventListener('mouseleave', this._onMouseUp.bind(this))

    // Touch support
    this.canvas.addEventListener('touchstart', this._onTouchStart.bind(this))
    this.canvas.addEventListener('touchmove', this._onTouchMove.bind(this))
    this.canvas.addEventListener('touchend', this._onTouchEnd.bind(this))

    // Observe CRDT changes
    this._observer = () => {
      this._replayNew()
    }
    this.syncArray.observe(this._observer)
  }

  /**
   * Stop syncing
   */
  stop() {
    if (!this._started) return
    this._started = false

    this.canvas.removeEventListener('mousedown', this._onMouseDown)
    this.canvas.removeEventListener('mousemove', this._onMouseMove)
    this.canvas.removeEventListener('mouseup', this._onMouseUp)
    this.canvas.removeEventListener('mouseleave', this._onMouseUp)
    this.canvas.removeEventListener('touchstart', this._onTouchStart)
    this.canvas.removeEventListener('touchmove', this._onTouchMove)
    this.canvas.removeEventListener('touchend', this._onTouchEnd)

    if (this._observer) {
      this.syncArray.unobserve(this._observer)
    }
  }

  /**
   * Set drawing color
   */
  setColor(color) {
    this.color = color
  }

  /**
   * Set line width
   */
  setLineWidth(width) {
    this.lineWidth = width
  }

  /**
   * Clear canvas
   */
  clear() {
    this._ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    // Clear array
    while (this.syncArray.length > 0) {
      this.syncArray.delete(0)
    }
    this._lastIndex = 0
  }

  /**
   * Replay all strokes
   * @private
   */
  _replay() {
    const strokes = this.syncArray.toArray()
    this._ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)

    for (const stroke of strokes) {
      this._drawStroke(stroke)
    }

    this._lastIndex = strokes.length
  }

  /**
   * Replay new strokes only
   * @private
   */
  _replayNew() {
    const strokes = this.syncArray.toArray()

    for (let i = this._lastIndex; i < strokes.length; i++) {
      this._drawStroke(strokes[i])
    }

    this._lastIndex = strokes.length
  }

  /**
   * Draw a stroke
   * @private
   */
  _drawStroke(stroke) {
    this._ctx.beginPath()
    this._ctx.strokeStyle = stroke.color
    this._ctx.lineWidth = stroke.width
    this._ctx.lineCap = 'round'
    this._ctx.lineJoin = 'round'

    if (stroke.points.length > 0) {
      this._ctx.moveTo(stroke.points[0].x, stroke.points[0].y)
      for (let i = 1; i < stroke.points.length; i++) {
        this._ctx.lineTo(stroke.points[i].x, stroke.points[i].y)
      }
    }

    this._ctx.stroke()
  }

  // Mouse handlers
  _onMouseDown(e) {
    this._drawing = true
    this._currentStroke = {
      color: this.color,
      width: this.lineWidth,
      points: [{ x: e.offsetX, y: e.offsetY }]
    }
  }

  _onMouseMove(e) {
    if (!this._drawing) return
    this._currentStroke.points.push({ x: e.offsetX, y: e.offsetY })
    this._drawStroke(this._currentStroke)
  }

  _onMouseUp() {
    if (!this._drawing) return
    this._drawing = false
    if (this._currentStroke && this._currentStroke.points.length > 1) {
      this.syncArray.push([this._currentStroke])
    }
    this._currentStroke = null
  }

  // Touch handlers
  _onTouchStart(e) {
    e.preventDefault()
    const touch = e.touches[0]
    const rect = this.canvas.getBoundingClientRect()
    this._drawing = true
    this._currentStroke = {
      color: this.color,
      width: this.lineWidth,
      points: [{
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top
      }]
    }
  }

  _onTouchMove(e) {
    if (!this._drawing) return
    e.preventDefault()
    const touch = e.touches[0]
    const rect = this.canvas.getBoundingClientRect()
    this._currentStroke.points.push({
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top
    })
    this._drawStroke(this._currentStroke)
  }

  _onTouchEnd() {
    this._onMouseUp()
  }
}

/**
 * Content editable adapter - sync contenteditable with CRDT text
 */
export class ContentEditableAdapter {
  constructor(element, syncText, options = {}) {
    this.element = typeof element === 'string'
      ? document.querySelector(element)
      : element
    this.syncText = syncText
    this.debounce = options.debounce || 100
    this._timeout = null
    this._updating = false
    this._started = false
  }

  /**
   * Start syncing
   */
  start() {
    if (this._started || !this.element) return
    this._started = true

    // Load initial content
    if (this.syncText.length > 0) {
      this.element.textContent = this.syncText.toString()
    }

    // Listen for input
    this._onInput = () => {
      if (this._updating) return

      if (this._timeout) {
        clearTimeout(this._timeout)
      }

      this._timeout = setTimeout(() => {
        this._syncToYjs()
      }, this.debounce)
    }
    this.element.addEventListener('input', this._onInput)

    // Observe CRDT changes
    this._observer = () => {
      if (this._updating) return
      this._updating = true
      this.element.textContent = this.syncText.toString()
      this._updating = false
    }
    this.syncText.observe(this._observer)
  }

  /**
   * Stop syncing
   */
  stop() {
    if (!this._started) return
    this._started = false

    this.element.removeEventListener('input', this._onInput)

    if (this._observer) {
      this.syncText.unobserve(this._observer)
    }
  }

  /**
   * Sync content to Yjs
   * @private
   */
  _syncToYjs() {
    this._updating = true

    const newContent = this.element.textContent
    const oldContent = this.syncText.toString()

    // Simple diff - delete all and insert new
    // For better performance, a proper diff algorithm should be used
    if (newContent !== oldContent) {
      this.syncText.delete(0, this.syncText.length)
      this.syncText.insert(0, newContent)
    }

    this._updating = false
  }
}

/**
 * List adapter - sync a list element with CRDT array
 */
export class ListAdapter {
  constructor(listElement, syncArray, options = {}) {
    this.list = typeof listElement === 'string'
      ? document.querySelector(listElement)
      : listElement
    this.syncArray = syncArray
    this.renderItem = options.renderItem || ((item) => {
      const li = document.createElement('li')
      li.textContent = typeof item === 'string' ? item : JSON.stringify(item)
      return li
    })
    this._started = false
  }

  /**
   * Start syncing
   */
  start() {
    if (this._started || !this.list) return
    this._started = true

    // Render initial items
    this._render()

    // Observe changes
    this._observer = () => {
      this._render()
    }
    this.syncArray.observe(this._observer)
  }

  /**
   * Stop syncing
   */
  stop() {
    if (!this._started) return
    this._started = false

    if (this._observer) {
      this.syncArray.unobserve(this._observer)
    }
  }

  /**
   * Add item
   */
  add(item) {
    this.syncArray.push([item])
  }

  /**
   * Remove item at index
   */
  remove(index) {
    this.syncArray.delete(index)
  }

  /**
   * Render list
   * @private
   */
  _render() {
    this.list.innerHTML = ''
    const items = this.syncArray.toArray()

    items.forEach((item, index) => {
      const el = this.renderItem(item, index)
      this.list.appendChild(el)
    })
  }
}

/**
 * Create adapters for common page elements
 */
export function createAdapters(doc) {
  return {
    /**
     * Create form adapter
     */
    form(selector, mapName = 'form') {
      return new FormAdapter(selector, doc.getMap(mapName))
    },

    /**
     * Create canvas adapter
     */
    canvas(selector, arrayName = 'canvas') {
      return new CanvasAdapter(selector, doc.getArray(arrayName))
    },

    /**
     * Create content editable adapter
     */
    contentEditable(selector, textName = 'content') {
      return new ContentEditableAdapter(selector, doc.getText(textName))
    },

    /**
     * Create list adapter
     */
    list(selector, arrayName = 'list', options = {}) {
      return new ListAdapter(selector, doc.getArray(arrayName), options)
    }
  }
}

export default {
  FormAdapter,
  CanvasAdapter,
  ContentEditableAdapter,
  ListAdapter,
  createAdapters
}
