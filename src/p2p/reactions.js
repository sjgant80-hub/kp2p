// Emoji reactions - ~20 lines
import {h} from './dom.js'

export const reactions = (el, onReact, emojis = ['👍','❤️','🎉','💡','🤔','👏']) => {
  const counts = {}
  emojis.forEach(e => counts[e] = 0)

  const render = () => {
    el.innerHTML = ''
    emojis.forEach(e => {
      el.append(h('button', {
        className: 'react',
        onclick: () => onReact(e)
      }, e + (counts[e] ? ' ' + counts[e] : '')))
    })
  }

  render()
  return {
    add: e => { counts[e] = (counts[e]||0) + 1; render() },
    set: (e, n) => { counts[e] = n; render() }
  }
}
