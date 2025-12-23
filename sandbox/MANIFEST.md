# 📦 SANDBOX MANIFEST
## File Structure & Prompt Headers

```
UDT:FileHeader────────────────────────────
{file:path,desc:str,size:tokens,deps:[],exports:[]}
```

## 📁 STRUCTURE
```
sandbox/
├─ index.html ─────── entry point (~120 tok)
├─ css/
│  ├─ theme.css ───── variables,base (~40 tok)
│  ├─ layout.css ──── header,sidebar,main (~80 tok)
│  ├─ components.css ─ examples,api,features (~100 tok)
│  ├─ editor.css ──── demo,code,console (~80 tok)
│  └─ responsive.css ─ breakpoints (~40 tok)
└─ js/
   ├─ state.js ────── global state (~40 tok)
   ├─ config.js ───── examples,templates (~120 tok)
   ├─ render.js ───── DOM rendering (~100 tok)
   ├─ actions.js ──── event handlers (~120 tok)
   ├─ p2p.js ──────── P2P init (~50 tok)
   └─ app.js ──────── main boot (~100 tok)
```

## 🔗 DEPENDENCY GRAPH
```
index.html
    └─► app.js
         ├─► state.js
         ├─► config.js
         ├─► render.js ──► state,config
         ├─► actions.js ─► state,config,render
         └─► p2p.js ─────► state,actions
```

## 📊 TOKEN BUDGET
```
CSS:  ~340 tokens total
JS:   ~530 tokens total
HTML: ~120 tokens
─────────────────────────
TOTAL: ~990 tokens (was ~2000)
```

## 📝 CHANGELOG
```
v2.0.0 ─ Modular refactor
  - Split monolithic index.html into modules
  - CSS: 5 files by concern
  - JS: 6 modules with ES imports
  - File headers with @desc,@size,@deps,@exports
  - Max file size: ~120 tokens

v1.1.0 ─ Script tag fix
  - Escape </script> in template literals

v1.0.0 ─ Initial sandbox
  - Single file implementation
```

## 🎯 AGENT REBUILD INSTRUCTIONS
```
TO_REBUILD:sandbox
  1.Read MANIFEST.md for structure
  2.Each file has @file header with metadata
  3.Respect dependency order
  4.Keep files under 250 tokens
  5.CSS→JS→HTML order

TO_ADD_FEATURE:
  1.Identify module (state|config|render|actions|p2p|app)
  2.Add to appropriate file
  3.Update exports
  4.Update MANIFEST token counts
```
