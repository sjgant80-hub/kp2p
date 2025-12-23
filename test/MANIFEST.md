# 🧪 TEST FRAMEWORK MANIFEST
## State Machine + CSV Parameterized Tests

```
UDT:TestHeader────────────────────────────
{file:path,desc:str,size:tokens,deps:[],exports:[]}
```

## 📁 STRUCTURE
```
test/
├─ index.html ────── Test runner UI (~100 tok)
├─ MANIFEST.md ───── This file
├─ core/
│  ├─ state-machine.js ── FSM impl (~120 tok)
│  ├─ csv-loader.js ───── CSV parser (~80 tok)
│  ├─ runner.js ────────── Test executor (~150 tok)
│  └─ assertions.js ────── Assert helpers (~60 tok)
├─ templates/
│  ├─ state.tpl.js ─────── State definition (~40 tok)
│  ├─ suite.tpl.js ─────── Suite wrapper (~50 tok)
│  └─ test.tpl.js ──────── Test case (~40 tok)
├─ cases/
│  ├─ crypto.csv ───────── Crypto test params
│  ├─ store.csv ────────── Store test params
│  ├─ sync.csv ─────────── Sync test params
│  └─ network.csv ──────── Network test params
├─ suites/
│  ├─ crypto.suite.js ──── Crypto tests (~100 tok)
│  ├─ store.suite.js ───── Store tests (~100 tok)
│  ├─ sync.suite.js ────── Sync tests (~100 tok)
│  └─ network.suite.js ─── Network tests (~100 tok)
└─ css/
   └─ runner.css ───────── Runner styles (~60 tok)
```

## 🔗 DEPENDENCY GRAPH
```
index.html
  └─► runner.js
       ├─► state-machine.js
       ├─► csv-loader.js
       ├─► assertions.js
       └─► suites/*.js
            └─► templates/*.tpl.js
```

## 🔄 STATE MACHINE STATES
```
     ┌─────────────────────────────────┐
     │                                 │
     ▼                                 │
  [IDLE] ──load──► [LOADING] ──────────┤
     │                 │               │
     │                 ▼               │
     │            [READY]              │
     │                 │               │
     │              run│               │
     │                 ▼               │
     │           [RUNNING]             │
     │            │     │              │
     │       pass │     │ fail         │
     │            ▼     ▼              │
     │        [PASSED] [FAILED]        │
     │            │     │              │
     └────────────┴─────┴──► reset ────┘
```

## 📊 CSV FORMAT
```csv
id,input,expected,timeout,skip
crypto_sign_01,"hello",true,1000,false
crypto_verify_01,"signed_data",true,1000,false
```

## 📝 CHANGELOG
```
v1.0.0 ─ Initial test framework
  - State machine for test lifecycle
  - CSV parameterized tests
  - Template-based suite generation
  - Browser-based runner UI
```

## 🎯 AGENT INSTRUCTIONS
```
TO_ADD_TEST:
  1. Add row to cases/{module}.csv
  2. Params auto-load into suite
  3. Runner executes all cases

TO_ADD_SUITE:
  1. Create cases/{name}.csv
  2. Create suites/{name}.suite.js
  3. Import suite in runner.js
  4. Update MANIFEST
```
