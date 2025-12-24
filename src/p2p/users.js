// User presence list - ~20 lines
import {h, esc} from './dom.js'

export const users = (el) => {
  const list = new Map()
  const render = () => {
    el.innerHTML = ''
    list.forEach((u, id) => {
      el.append(h('div', {className:'user'},
        h('span', {className:'dot', style:{background:u.color||'#0a0'}}),
        h('span', {className:'name'}, esc(u.name || id.slice(-4)))
      ))
    })
  }
  return {
    add: (id, data) => { list.set(id, data); render() },
    remove: id => { list.delete(id); render() },
    clear: () => { list.clear(); render() },
    get: id => list.get(id),
    count: () => list.size
  }
}
