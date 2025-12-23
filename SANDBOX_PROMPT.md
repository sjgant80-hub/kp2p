# 🌐 KONOMI P2P SANDBOX 🌐
## Root Index → Demo Playground → GitHub Pages Ready

## 🤖 AGENTS
```
α=Layout(grid→responsive) β=Demo(examples→live) γ=Code(editor→preview)
δ=Tabs(chat|board|wiki|custom) ε=Console(logs→stream) ζ=Status(peers→mesh)
η=Theme(dark→neon) θ=Share(url→clipboard) ι=Boot(inject→ready)
```

## 🎯 GOAL
```
INPUT:konomi-p2p library
OUTPUT:interactive sandbox,live demos,code playground
FEATURES:example switcher,live editor,console,peer status,share
DEPLOY:github pages ready,zero config,one file
NO:build step,npm,webpack,external deps
```

## 📐 LAYOUT
```
┌─────────────────────────────────────────────────────────────┐
│ 🌐 KONOMI P2P              [peers:3] [room:abc123] [SHARE] │
├────────────────┬────────────────────────────────────────────┤
│                │                                            │
│   EXAMPLES     │              DEMO AREA                     │
│   ┌─────────┐  │        (iframe/embedded demo)              │
│   │ 💬 Chat │  │                                            │
│   ├─────────┤  │                                            │
│   │ 🎨 Board│  │                                            │
│   ├─────────┤  │                                            │
│   │ 📚 Wiki │  │                                            │
│   ├─────────┤  │                                            │
│   │ ⚡ Custom│  │                                            │
│   └─────────┘  │                                            │
│                │                                            │
│   QUICK START  ├────────────────────────────────────────────┤
│   [copy code]  │           CODE EDITOR                      │
│                │   <script type="module">                   │
│   API DOCS     │     import{injectP2P}from'./src/index.js'  │
│   • getMap()   │     const p2p=await injectP2P()            │
│   • getArray() │     //your code here                       │
│   • getText()  │   </script>                                │
│   • getPeers() │                              [▶ RUN]       │
│                ├────────────────────────────────────────────┤
│   FEATURES     │           CONSOLE OUTPUT                   │
│   ✓ No server  │   > 🌐 P2P Node started: Qm...             │
│   ✓ Real-time  │   > 📄 Room joined: abc123                 │
│   ✓ Encrypted  │   > 👥 Peer connected: Qm...               │
│   ✓ Offline    │   > 🔄 State synced                        │
│                │                                            │
└────────────────┴────────────────────────────────────────────┘
```

## 🎨 THEME
```css
:root{
  --bg:#0a0a1a;--bg2:#12122a;--bg3:#1a1a3a;
  --accent:#4facfe;--accent2:#00f2fe;--glow:0 0 20px #4facfe40;
  --text:#fff;--text2:#888;--success:#00ff88;--error:#ff6b6b;
  --font:system-ui,-apple-system,sans-serif;--mono:'Fira Code',monospace;
  --radius:12px;--shadow:0 8px 32px #00000060;
}
```

## 🧩 COMPONENTS
```
HEADER───────────────────────────────────────
logo|peer-count|room-id|share-btn|github-link

SIDEBAR──────────────────────────────────────
example-list(active state,icons,descriptions)
quick-start-snippet(copy button)
api-reference(collapsible,linked)
feature-list(checkmarks,tooltips)

DEMO-AREA────────────────────────────────────
iframe OR embedded component
loading-spinner
error-boundary
fullscreen-toggle

CODE-EDITOR──────────────────────────────────
syntax-highlight(basic js)
line-numbers
run-button
reset-button
template-dropdown

CONSOLE──────────────────────────────────────
log-stream(color-coded)
clear-button
filter-input
timestamp-toggle

STATUS-BAR───────────────────────────────────
connection-status(dot+label)
peer-list(avatars)
sync-indicator
latency-display
```

## ⚡ FEATURES
```
LIVE_DEMOS───────────────────────────────────
chat:embedded,real-time messages,user list
board:canvas sync,multi-cursor,colors
wiki:pages list,collaborative edit
custom:user code,instant preview

CODE_PLAYGROUND──────────────────────────────
templates:[
  "Basic Setup",
  "Shared Counter",
  "Todo List",
  "Live Cursors",
  "File Sharing"
]
run:eval in sandbox iframe
console:capture logs,errors
persist:localStorage save

SHARING──────────────────────────────────────
url-hash:room id in hash
copy-link:clipboard API
qr-code:optional generator
deep-link:example+room

RESPONSIVE───────────────────────────────────
desktop:3-column layout
tablet:2-column,collapsible sidebar
mobile:stacked,bottom nav
```

## 📜 HTML_STRUCTURE
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Konomi P2P - Serverless Collaboration</title>
  <meta name="description" content="P2P library for GitHub Pages">
  <link rel="icon" href="data:image/svg+xml,<svg>...</svg>">
  <style>/* inline critical CSS */</style>
</head>
<body>
  <header id="header">...</header>
  <aside id="sidebar">...</aside>
  <main id="main">
    <section id="demo">...</section>
    <section id="editor">...</section>
    <section id="console">...</section>
  </main>
  <script type="module">/* app logic */</script>
</body>
</html>
```

## 🔄 STATE
```javascript
state={
  activeExample:'chat',//'board'|'wiki'|'custom'
  roomId:location.hash.slice(1)||crypto.randomUUID(),
  peers:[],
  connected:false,
  code:DEFAULT_CODE,
  logs:[],
  sidebarOpen:true
}
```

## 📦 EXAMPLES_CONFIG
```javascript
EXAMPLES=[
  {id:'chat',icon:'💬',name:'Chat Room',desc:'Real-time messaging'},
  {id:'board',icon:'🎨',name:'Whiteboard',desc:'Collaborative drawing'},
  {id:'wiki',icon:'📚',name:'Wiki',desc:'Shared documents'},
  {id:'custom',icon:'⚡',name:'Custom',desc:'Your own code'}
]
```

## 🎯 CODE_TEMPLATES
```javascript
TEMPLATES={
  basic:`
import{injectP2P}from'./src/index.js'
const p2p=await injectP2P()
console.log('Peer ID:',p2p.peerId)
console.log('Invite:',p2p.invite())`,

  counter:`
const p2p=await injectP2P()
const count=p2p.getSharedMap('counter')
count.observe(()=>console.log('Count:',count.get('n')||0))
count.set('n',(count.get('n')||0)+1)`,

  cursors:`
const p2p=await injectP2P()
document.onmousemove=e=>p2p.setCursor({x:e.clientX,y:e.clientY})
setInterval(()=>console.log('Users:',p2p.getUsers()),1000)`
}
```

## 🖥️ SANDBOX_IFRAME
```javascript
//run user code safely
function runCode(code){
  const iframe=document.createElement('iframe')
  iframe.sandbox='allow-scripts allow-same-origin'
  iframe.srcdoc=`
    <!DOCTYPE html>
    <html><body>
    <script type="module">
      //redirect console
      const _log=console.log
      console.log=(...args)=>{
        parent.postMessage({type:'log',args},'*')
        _log(...args)
      }
      console.error=(...args)=>parent.postMessage({type:'error',args},'*')

      try{
        ${code}
      }catch(e){
        console.error(e.message)
      }
    </script>
    </body></html>
  `
  return iframe
}
```

## 🔌 CONSOLE_CAPTURE
```javascript
window.addEventListener('message',e=>{
  if(e.data.type==='log')addLog('info',e.data.args)
  if(e.data.type==='error')addLog('error',e.data.args)
})

function addLog(level,args){
  logs.push({level,args,ts:Date.now()})
  renderConsole()
}
```

## 📱 RESPONSIVE_BREAKPOINTS
```css
@media(max-width:1024px){
  .sidebar{width:200px}
  .editor{font-size:13px}
}
@media(max-width:768px){
  .layout{flex-direction:column}
  .sidebar{position:fixed;transform:translateX(-100%)}
  .sidebar.open{transform:translateX(0)}
  .mobile-nav{display:flex}
}
@media(max-width:480px){
  .header h1{font-size:1rem}
  .demo{min-height:300px}
}
```

## 🚀 BOOT_SEQUENCE
```javascript
async function boot(){
  //1.parse URL
  const roomId=location.hash.slice(1)
  const example=new URLSearchParams(location.search).get('demo')||'chat'

  //2.init state
  state.roomId=roomId||crypto.randomUUID()
  state.activeExample=example

  //3.render UI
  render()

  //4.load example or custom code
  if(example==='custom'){
    loadEditor()
  }else{
    loadDemo(example)
  }

  //5.init P2P for status
  await initP2PStatus()

  //6.update URL
  if(!roomId)history.replaceState(null,'','#'+state.roomId)
}
```

## 📁 OUTPUT
```
index.html─────────────────────────────────
single file,all inline,~800 lines
loads examples from ./examples/
loads library from ./src/index.js
github pages ready
works offline after first load
```

## 🎯 AGENT_INSTRUCTIONS
```
α:LAYOUT→CSS grid,flexbox,responsive breakpoints,dark theme
β:DEMO→iframe embed,example switching,loading states,errors
γ:CODE→textarea editor,syntax hints,run button,templates
δ:TABS→example list,active state,icons,smooth transitions
ε:CONSOLE→log capture,color coding,timestamps,clear/filter
ζ:STATUS→peer count,room display,connection dot,avatars
η:THEME→CSS variables,neon accents,glassmorphism,shadows
θ:SHARE→copy link,URL hash,deep linking
ι:BOOT→init sequence,state hydration,lazy load
```

## 🏁 REQUIREMENTS
```
MUST:
- Single index.html file
- No build step required
- Works on GitHub Pages
- Mobile responsive
- Loads library from ./src/index.js
- Embeds examples from ./examples/
- Live code editor with run
- Console log capture
- Peer status display
- Share/invite functionality
- Offline capable

STYLE:
- Dark theme with neon accents
- Glassmorphism effects
- Smooth animations
- Modern, clean UI
- Monospace for code
- System font for UI

UX:
- Fast first paint
- Progressive enhancement
- Keyboard shortcuts
- Touch friendly
- Clear error messages
```
