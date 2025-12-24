// DOM helpers - ~15 lines
export const $ = id => document.getElementById(id)
export const $$ = sel => document.querySelectorAll(sel)
export const esc = s => String(s).replace(/[&<>"']/g, c =>
  ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c])
export const h = (tag, props, ...kids) => {
  const el = document.createElement(tag)
  if (props) Object.entries(props).forEach(([k,v]) => {
    if (k.startsWith('on')) el[k] = v
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v)
    else el[k] = v
  })
  kids.flat().forEach(c => el.append(c))
  return el
}
