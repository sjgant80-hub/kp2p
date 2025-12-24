// Laser pointer overlay - ~20 lines
export const laser = (canvas) => {
  const ctx = canvas.getContext('2d')
  const pts = new Map()

  const draw = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    pts.forEach(p => {
      ctx.beginPath()
      ctx.arc(p.x, p.y, 8, 0, Math.PI * 2)
      ctx.fillStyle = p.color || '#f00'
      ctx.globalAlpha = 0.7
      ctx.fill()
    })
  }

  return {
    set: (id, x, y, color) => { pts.set(id, {x, y, color}); draw() },
    remove: id => { pts.delete(id); draw() },
    resize: () => { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight }
  }
}
