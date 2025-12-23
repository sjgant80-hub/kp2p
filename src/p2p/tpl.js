// Micro template engine - compose HTML with params
// Usage: t`div.card ${{id:'x'}} ${[child1, child2]}`
export const t = (s,...v) => {
  let tag='div',cls='',attr={},kids=[]
  const p = s[0].trim().split(/\s+/)
  if(p[0]){const[tg,...c]=p[0].split('.');tag=tg||'div';cls=c.join(' ')}
  v.forEach(x=>{
    if(Array.isArray(x))kids.push(...x)
    else if(typeof x==='object'&&x!==null&&!x.tagName)Object.assign(attr,x)
    else if(x)kids.push(x)
  })
  const el=document.createElement(tag)
  if(cls)el.className=cls
  Object.entries(attr).forEach(([k,v])=>{
    if(k.startsWith('on'))el[k]=v
    else if(k==='style'&&typeof v==='object')Object.assign(el.style,v)
    else el.setAttribute(k,v)
  })
  kids.forEach(c=>el.append(typeof c==='string'?c:c))
  return el
}

// Template composer - layer templates with overrides
export const layer = (base, ...mods) => {
  const r = {...base}
  mods.forEach(m => typeof m==='function' ? m(r) : Object.assign(r,m))
  return r
}

// Reactive state
export const state = (init) => {
  let v=init, subs=[]
  return {
    get:()=>v,
    set:(n)=>{v=typeof n==='function'?n(v):n;subs.forEach(f=>f(v))},
    sub:(f)=>{subs.push(f);return()=>subs=subs.filter(x=>x!==f)}
  }
}

export const $=id=>document.getElementById(id)
export const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))
