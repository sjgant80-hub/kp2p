// Minimal UI components
import {t,$,esc} from './tpl.js'

// Status indicator (connected/connecting)
export const status = (el,opts={}) => ({
  set: s => {
    el.className = `status ${s}`
    el.textContent = opts[s] || s
  }
})

// User list with presence
export const userList = (el) => {
  const users = new Map()
  const render = () => {
    el.innerHTML = ''
    users.forEach((u,id) => el.append(
      t`div.user ${[
        t`span.dot ${{style:{background:u.color||'#0a0'}}}`,
        t`span.name ${[esc(u.name||id.slice(-4))]}`
      ]}`
    ))
  }
  return {
    add: (id,data) => { users.set(id,data); render() },
    remove: id => { users.delete(id); render() },
    update: (id,data) => { users.set(id,{...users.get(id),...data}); render() },
    clear: () => { users.clear(); render() }
  }
}

// Chat panel
export const chat = (el,onSend) => {
  const msgs = t`div.msgs`
  const send = () => { if(inp.value.trim()) { onSend(inp.value); inp.value='' } }
  const inp = t`input ${{type:'text',placeholder:'Message...',onkeydown:e=>e.key==='Enter'&&send()}}`
  el.append(msgs, t`div.input-row ${[inp, t`button ${{onclick:send}} ${['Send']}`]}`)

  return {
    add: (name,text,sys) => {
      msgs.append(t`div.msg${sys?'.sys':''} ${[sys?text:`${esc(name)}: ${esc(text)}`]}`)
      msgs.scrollTop = msgs.scrollHeight
    }
  }
}

// Reactions bar
export const reactions = (el,onReact) => {
  const emojis = ['👍','❤️','🎉','💡','🤔','👏']
  const counts = {}
  emojis.forEach(e => counts[e] = 0)

  const render = () => {
    el.innerHTML = ''
    emojis.forEach(e => el.append(
      t`button.react ${{onclick:()=>onReact(e)}} ${[`${e} ${counts[e]||''}`]}`
    ))
  }

  render()
  return {
    add: e => { counts[e] = (counts[e]||0)+1; render() },
    set: (e,n) => { counts[e] = n; render() }
  }
}

// Laser pointer overlay
export const laser = (canvas,color='#f00') => {
  const ctx = canvas.getContext('2d')
  const pointers = new Map()

  const draw = () => {
    ctx.clearRect(0,0,canvas.width,canvas.height)
    pointers.forEach(p => {
      ctx.beginPath()
      ctx.arc(p.x,p.y,8,0,Math.PI*2)
      ctx.fillStyle = p.color || color
      ctx.globalAlpha = 0.7
      ctx.fill()
      ctx.globalAlpha = 1
    })
  }

  return {
    set: (id,x,y,c) => { pointers.set(id,{x,y,color:c}); draw() },
    remove: id => { pointers.delete(id); draw() },
    resize: () => { canvas.width=canvas.offsetWidth; canvas.height=canvas.offsetHeight }
  }
}

// Sticky notes
export const notes = (el,onChange) => {
  const items = new Map()

  const render = () => {
    el.innerHTML = ''
    items.forEach((n,id) => {
      const note = t`div.note ${{style:{left:n.x+'px',top:n.y+'px',background:n.color||'#fef3b0'}}} ${[
        t`div.note-text ${[esc(n.text)]}`
      ]}`
      el.append(note)
    })
  }

  return {
    add: (id,data) => { items.set(id,data); render(); onChange?.('add',id,data) },
    update: (id,data) => { items.set(id,{...items.get(id),...data}); render() },
    remove: id => { items.delete(id); render() },
    all: () => items
  }
}
