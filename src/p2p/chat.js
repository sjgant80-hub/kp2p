// Chat panel - ~20 lines
import {h, esc} from './dom.js'

export const chat = (el, onSend) => {
  const msgs = h('div', {className:'msgs'})
  const inp = h('input', {type:'text', placeholder:'Message...'})
  const send = () => {
    const t = inp.value.trim()
    if (t) { onSend(t); inp.value = '' }
  }
  inp.onkeydown = e => e.key === 'Enter' && send()
  el.append(msgs, h('div', {className:'input-row'},
    inp, h('button', {onclick:send}, 'Send')
  ))
  return {
    add: (name, text, sys) => {
      const m = h('div', {className:'msg' + (sys?' sys':'')},
        sys ? text : esc(name) + ': ' + esc(text))
      msgs.append(m)
      msgs.scrollTop = msgs.scrollHeight
    }
  }
}
