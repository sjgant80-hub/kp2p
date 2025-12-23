# Enterprise Core Build Prompt

## Goal
ISA-95 industrial hierarchy over P2P sandbox mesh.

## Architecture
```
┌─────────────────────────────────────────────────┐
│              ENTERPRISE HIERARCHY               │
│  Enterprise → Site → Area → WorkCenter → Unit   │
└─────────────────────────────────────────────────┘
                        │
                 HierarchyNode
                        │
              ┌─────────┴─────────┐
              │                   │
         State Machine      Event Emitter
         (PackML)           (DATA/STATE/ALARM)
              │                   │
              └─────────┬─────────┘
                        │
                    MeshNode
                        │
              ┌─────────┴─────────┐
              │                   │
           Protocol            Sandbox
           (msg envelope)      (isolation)
              │                   │
              └─────────┬─────────┘
                        │
                  P2P DataChannel
                    (WebRTC)
```

## ISA-95 Levels
```
L4 Business     days-months    [ERP, BI]
L3 Operations   shifts-days    [MES, LIMS, WMS]
L2 Control      sec-hours      [SCADA, HMI, Batch]
L1 Sensing      ms-sec         [PLC, DCS, RTU]
L0 Process      continuous     [Sensors, Actuators]
```

## PackML States (hierarchy.js)
```
STOPPED ⟷ IDLE ⟷ STARTING → EXECUTE → COMPLETING → COMPLETE → RESETTING → IDLE
              ↓          ↓
           ABORTING → ABORTED → CLEARING → STOPPED
              ↓
           HOLDING → HELD → UNHOLDING → EXECUTE
              ↓
           STOPPING → STOPPED
```

## Message Types (Sparkplug-style)
```
BIRTH  → Node online, full state
DEATH  → Node offline
DATA   → Metric update
CMD    → Command to node
STATE  → State change
ALARM  → Alarm event
```

## Alarm Priorities (ISA-18.2)
```
P1 Emergency   <1min    #CC0000
P2 High        <10min   #FF6600
P3 Medium      <1hr     #FFCC00
P4 Low         Shift    #00CCCC
```

## Topic Format
```
{namespace}/{group}/{msgtype}/{path}
kp2p/plant1/DATA/Line1/Filler/LevelSensor
```

## Files
```
src/enterprise/
├─ hierarchy.js   # ISA-95 nodes, PackML states
└─ mesh.js        # P2P mesh, Sparkplug-style pub/sub

src/demo/
└─ enterprise-demo.html  # Interactive demo
```

## Usage
```javascript
import { Enterprise, STATE, MSG } from './hierarchy.js';
import { EnterpriseMesh, MeshNode } from './mesh.js';

// Create hierarchy
const enterprise = new Enterprise('Acme Corp');
const plant = enterprise.addSite('Plant1');
const area = plant.addArea('Packaging');
const line = area.addWorkCenter('Line1');
const filler = line.addWorkUnit('Filler');
filler.addEquipment('Tank1', 'Tank');

// State transitions
filler.transition('start');  // STOPPED → IDLE → STARTING → EXECUTE
filler.transition('hold');   // EXECUTE → HOLDING → HELD
filler.transition('unhold'); // HELD → UNHOLDING → EXECUTE

// Metrics
filler.setMetric('Level', 75.5, QUALITY.GOOD, '%');

// Alarms
filler.raiseAlarm('ALM001', 'High level', 'P2');
filler.ackAlarm('ALM001', 'operator');

// Events
enterprise.on(MSG.STATE, e => console.log(e));
enterprise.on(MSG.DATA, e => console.log(e));
enterprise.on(MSG.ALARM, e => console.log(e));

// P2P Mesh
const mesh = new EnterpriseMesh({ namespace: 'acme', group: 'plant1' });
const node = await mesh.addNode(filler);
node.addPeer(peerId, dataChannel);
```

## Crosswalks
```
ISA-95              ISA-88
────────────────────────────
WorkCenter      =   ProcessCell
WorkUnit        =   Unit
ProcessSegment  =   Operation
Equipment       =   ControlModule
```
