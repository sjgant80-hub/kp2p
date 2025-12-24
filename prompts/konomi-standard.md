# 📐 KONOMI STANDARD 📐
## Self-Defining Industrial Standards Compression v1.0

---

## 🧬 LAYER 0: META-STANDARD (how standards are defined)

```
STRUCTURE──────────────────────────────────────────────────
STD={
  id:str,                    #unique key (ISA-95,ISA-88,etc)
  scope:str,                 #what it covers
  udt:[UDT],                 #user defined types FIRST
  hierarchy:[LEVEL],         #levels/layers if applicable
  states:[STATE_MACHINE],    #state models if applicable
  entities:[ENTITY],         #core objects
  relations:[RELATION],      #how entities connect
  rules:[RULE],              #constraints,validations
  crosswalk:{std_id:MAP}     #mappings to other standards
}

UDT={
  name:str,                  #type name
  base:str|null,             #inherits from
  fields:[{name,type,unit,range,desc}],
  methods:[{name,params,returns,desc}],
  constraints:[RULE]
}

LEVEL={
  id:int|str,                #level identifier
  name:str,                  #human name
  scope:str,                 #responsibility
  timescale:str,             #response time
  systems:[str],             #typical systems
  data_down:[str],           #sends to lower
  data_up:[str]              #sends to higher
}

STATE_MACHINE={
  name:str,
  states:[str],
  initial:str,
  transitions:[{from,to,trigger,guard,action}]
}

ENTITY={
  name:str,
  udt:str,                   #references UDT
  parent:str|null,
  children:[str],
  tags:{category:[TAG_DEF]}
}

RELATION={
  type:contains|references|triggers|produces|consumes,
  from:str,to:str,
  cardinality:1:1|1:N|N:M
}

RULE={
  id:str,
  condition:expr,
  action:str,
  severity:info|warn|error|fatal
}

CROSSWALK={
  from_std:str,from_entity:str,
  to_std:str,to_entity:str,
  mapping:exact|partial|semantic,
  transform:expr|null
}
```

---

## 🔷 LAYER 1: BASE UDTs (primitives all standards use)

```
UDT:Identifier───────────────────────
{name,type,scope,format,example}
UUID:str:global:"xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx":"550e8400-e29b-41d4-a716-446655440000"
PATH:str:hierarchical:"A/B/C/D":"Site1/Area2/Line3/Unit4"
TAG:str:equipment:"Area_Unit_Module_Point":"Pkg_Filler_Tank1_Level"
URN:str:global:"urn:domain:type:id":"urn:acme:batch:12345"

UDT:Timestamp────────────────────────
{name,format,resolution,timezone}
ISO8601:str:"YYYY-MM-DDTHH:mm:ss.sssZ":ms:UTC
EPOCH_MS:int64:unix_ms:ms:UTC
OPC_FILETIME:int64:100ns_since_1601:100ns:UTC

UDT:Quality──────────────────────────
{value:int,flags:{good,bad,uncertain,substituted,limited}}
GOOD:192|BAD:0|UNCERTAIN:64|SUBSTITUTED:+16|LIMITED:+4

UDT:Value────────────────────────────
{v:any,q:Quality,t:Timestamp,unit:str|null}

UDT:Range────────────────────────────
{lo:num,hi:num,lo_inc:bool,hi_inc:bool,unit:str}

UDT:Quantity─────────────────────────
{value:num,unit:str,uncertainty:num|null}

UDT:Duration─────────────────────────
{value:num,unit:ms|s|min|hr|day|week|month|year}

UDT:Status───────────────────────────
{code:int,name:str,desc:str,severity:info|warn|error|fatal}
```

---

## 🏗️ LAYER 2: ISA-95 (Enterprise↔Control Integration)

```
ID:ISA-95|SCOPE:enterprise to control integration

UDT:ISA95_Level──────────────────────
L4:{name:"Business",scope:"Planning,ERP",time:"days-months",sys:["ERP","BI"]}
L3:{name:"MOM",scope:"MES,Execution",time:"shifts-days",sys:["MES","LIMS","WMS"]}
L2:{name:"Control",scope:"Supervision",time:"sec-hours",sys:["SCADA","HMI","Batch"]}
L1:{name:"Sensing",scope:"Direct Control",time:"ms-sec",sys:["PLC","DCS","RTU"]}
L0:{name:"Process",scope:"Physical",time:"continuous",sys:["Sensors","Actuators"]}

UDT:PhysicalAsset────────────────────
{id:UUID,path:PATH,name:str,desc:str,level:L0-L4,parent:ref,children:[ref],props:{}}

UDT:Equipment────────────────────────
extends:PhysicalAsset
{capability:[str],state:EquipmentState,mode:EquipmentMode}

UDT:EquipmentState───────────────────
enum:[Idle,Running,Faulted,Maintenance,Offline]

UDT:EquipmentMode────────────────────
enum:[Production,Maintenance,Manual,Automatic,Semiauto]

HIERARCHY────────────────────────────
Enterprise:1→Site:N→Area:N→WorkCenter:N→WorkUnit:N→Equipment:N

UDT:Material─────────────────────────
{id:UUID,name:str,desc:str,props:{},lot:str|null,sublots:[ref]}

UDT:MaterialClass────────────────────
{id:UUID,name:str,props_def:[{name,type,uom,required}]}

UDT:Personnel────────────────────────
{id:UUID,name:str,role:str,qualifications:[str],schedule:ref}

UDT:ProcessSegment───────────────────
{id:UUID,name:str,equipment:[ref],personnel:[ref],materials_in:[ref],materials_out:[ref],params:[{name,value,uom}],duration:Duration}

UDT:ProductionSchedule───────────────
{id:UUID,start:Timestamp,end:Timestamp,segments:[ProcessSegment],priority:int,state:ScheduleState}

UDT:ProductionPerformance────────────
{id:UUID,schedule_ref:ref,actual_start:Timestamp,actual_end:Timestamp,segments:[{ref,actual_duration,actual_qty,actual_params}],kpis:{}}

DATA_FLOWS───────────────────────────
L4→L3:[Schedule,MaterialDef,ProductDef,WorkOrder]
L3→L4:[Performance,Inventory,Quality,Status]
L3→L2:[Recipe,Setpoints,Commands,Schedule]
L2→L3:[ProcessData,Events,Alarms,Batch]
L2→L1:[Setpoints,Commands]
L1→L2:[Measurements,Status,Alarms]
```

---

## 🧪 LAYER 3: ISA-88 (Batch Control)

```
ID:ISA-88|SCOPE:batch process control

UDT:S88_EquipmentLevel───────────────
Enterprise→Site→Area→ProcessCell→Unit→EquipmentModule→ControlModule

UDT:ProcessCell──────────────────────
extends:Equipment
{units:[Unit],coordination_control:ref}

UDT:Unit─────────────────────────────
extends:Equipment
{ems:[EquipmentModule],state:UnitState,mode:UnitMode,allocated_to:Batch|null}

UDT:EquipmentModule──────────────────
extends:Equipment
{cms:[ControlModule],type:Agitator|Heater|Pump|Valve|...}

UDT:ControlModule────────────────────
extends:Equipment
{io:[TAG],type:Analog|Discrete|Motor|Valve|PID}

UDT:S88_RecipeLevel──────────────────
GeneralRecipe→SiteRecipe→MasterRecipe→ControlRecipe

UDT:Recipe───────────────────────────
{id:UUID,name:str,version:str,level:RecipeLevel,product:str,procedure:Procedure,formula:Formula,equipment_req:[str]}

UDT:Procedure────────────────────────
{id:str,unit_procedures:[UnitProcedure],ordering:Sequential|Parallel|Mixed}

UDT:UnitProcedure────────────────────
{id:str,unit_class:str,operations:[Operation],ordering:Sequential|Parallel}

UDT:Operation────────────────────────
{id:str,phases:[Phase],ordering:Sequential|Parallel}

UDT:Phase────────────────────────────
{id:str,name:str,logic:ref,params:[{name,type,default,min,max,uom}],state:PhaseState}

UDT:Formula──────────────────────────
{inputs:[{material,qty,uom}],outputs:[{material,qty,uom}],params:[{name,value,uom}]}

UDT:Batch────────────────────────────
{id:UUID,recipe:ref,control_recipe:ref,state:BatchState,start:Timestamp,end:Timestamp|null,unit_allocs:[{unit,start,end}],params:{},events:[BatchEvent]}

STATE:PhaseState─────────────────────
IDLE→RUNNING→COMPLETE
      ↓HOLD
   HOLDING→HELD→RESTARTING
      ↓STOP
   STOPPING→STOPPED
      ↓ABORT
   ABORTING→ABORTED

STATE:BatchState─────────────────────
Created→Scheduled→Running→Complete
                     ↓
                  Held→Running
                     ↓
                  Aborted

STATE:UnitState(PackML)──────────────
STOPPED⟷IDLE⟷STARTING→EXECUTE→COMPLETING→COMPLETE→RESETTING→IDLE
            ↓         ↓
         ABORTING→ABORTED→CLEARING→STOPPED
            ↓
         HOLDING→HELD→UNHOLDING→EXECUTE
            ↓
         STOPPING→STOPPED
```

---

## 🖥️ LAYER 4: ISA-101 (HMI Design)

```
ID:ISA-101|SCOPE:human machine interface design

UDT:HMI_Principles───────────────────
SITUATIONAL_AWARENESS>aesthetics
CONSISTENCY>novelty
GRAY_BACKGROUND:reduce fatigue
COLOR=meaning:not decoration
LAYERS:progressive detail

UDT:HMI_Layer────────────────────────
L1:{name:"Overview",scope:"Plant/Site",info:"KPIs,Status,Alarms",nav:"→L2"}
L2:{name:"Area",scope:"Process Area",info:"Flows,States,Trends",nav:"→L1,→L3"}
L3:{name:"Unit",scope:"Equipment",info:"Faceplate,Control",nav:"→L2,→L4"}
L4:{name:"Detail",scope:"Diagnostic",info:"Config,Tuning",nav:"→L3,→L5"}
L5:{name:"Support",scope:"Maintenance",info:"Calibration,History",nav:"→L4"}

UDT:ColorMeaning─────────────────────
{state:color:hex:usage}
Normal:Gray:#808080:default,no action
Running:Green:#00AA00:active,operating
Stopped:DarkGray:#404040:inactive,standby
Warning:Yellow:#FFCC00:attention,non-critical
Alarm:Red:#CC0000:action required
Fault:Red:#CC0000:equipment fault
Maint:Blue:#0066CC:out of service
Disabled:Gray+X:#808080+strikethrough:not available
Manual:Orange:#FF6600:manual mode
Transition:Cyan:#00CCCC:state changing

UDT:GraphicElement───────────────────
{id:str,type:Tank|Valve|Pump|Motor|Conveyor|Pipe|Sensor|...,tags:{pv,sp,cmd,sts,mode},states:[],appearance:{shape,size,orientation}}

UDT:Faceplate────────────────────────
{equipment:ref,title:str,pv_display:[{tag,label,format,unit}],sp_input:[{tag,label,min,max,unit}],commands:[{cmd,label,confirm}],status:{state,mode,alarms},nav:[parent,children,trend]}

UDT:Trend────────────────────────────
{tags:[{path,color,scale,unit}],timespan:Duration,sample:Duration,scales:[{tag,min,max,auto}]}

RULES────────────────────────────────
R1:no hardcoded values in graphics
R2:bind to tag path,not direct address
R3:template→instance inheritance
R4:centralized style definitions
R5:alarm indication visible at all layers
R6:navigation consistent,predictable
R7:controls labeled,units shown
R8:confirmation for critical commands
```

---

## 🚨 LAYER 5: ISA-18.2 (Alarm Management)

```
ID:ISA-18.2|SCOPE:alarm management lifecycle

UDT:AlarmPriority────────────────────
P1:{name:"Emergency",response:"Immediate",time:"<1min",color:Red,sound:Continuous}
P2:{name:"High",response:"Prompt",time:"<10min",color:Orange,sound:Fast}
P3:{name:"Medium",response:"Timely",time:"<1hr",color:Yellow,sound:Slow}
P4:{name:"Low",response:"Awareness",time:"Shift",color:Cyan,sound:None}

UDT:AlarmState───────────────────────
NORM:{active:F,acked:T,suppress:F}
UNACK:{active:T,acked:F,suppress:F}→needs attention
ACKED:{active:T,acked:T,suppress:F}→aware,still active
RTN_UNACK:{active:F,acked:F,suppress:F}→cleared unacked
SHELVED:{active:any,acked:any,suppress:T}→temporarily suppressed
OUT_OF_SERVICE:{active:any,acked:any,suppress:T,oos:T}→disabled

STATE:AlarmLifecycle─────────────────
NORMAL→[condition]→UNACK_ALARM→[ack]→ACKED_ALARM→[clear]→NORMAL
                        ↓                  ↓
                    [clear]            [ack timeout]
                        ↓                  ↓
                   RTN_UNACK──────────[ack]→NORMAL

UDT:Alarm────────────────────────────
{
  id:UUID,
  tag:PATH,
  type:HI|HIHI|LO|LOLO|DEV|ROG|DISC|,
  priority:1-4,
  state:AlarmState,
  setpoint:num,
  deadband:num,
  delay:Duration,
  message:str,
  consequence:str,
  response:str,
  timestamp_in:Timestamp,
  timestamp_ack:Timestamp|null,
  timestamp_out:Timestamp|null,
  ack_user:str|null,
  shelve_until:Timestamp|null,
  shelve_reason:str|null
}

UDT:AlarmClass───────────────────────
{id:str,name:str,priority_default:1-4,sound:ref,color:ref,auto_ack:bool,log:bool}

RULES:Rationalization────────────────
R1:every alarm must be documented
R2:every alarm must have unique response
R3:every alarm must be actionable
R4:priority based on consequence+response_time
R5:no duplicate alarms for same condition
R6:review frequency:annual minimum
R7:metrics:alarms/hr<6 avg,<12 peak,no floods>10/10min

METRICS──────────────────────────────
AlarmRate:alarms/operator/hour
FloodRate:>10 alarms in 10 min
StaleAlarms:active>24hr
ChatteringAlarms:>3 transitions/min
BadActors:top 10 most frequent
PercentByPriority:P1<5%,P2<15%,P3<25%,P4<55%
```

---

## 📡 LAYER 6: OPC-UA (Communication)

```
ID:OPC-UA|SCOPE:industrial interoperability

UDT:OPC_NodeClass────────────────────
Object|ObjectType|Variable|VariableType|Method|View|DataType|ReferenceType

UDT:OPC_Node─────────────────────────
{node_id:str,browse_name:str,display_name:str,node_class:NodeClass,type_def:ref|null,parent:ref|null}

UDT:OPC_Variable─────────────────────
extends:OPC_Node
{data_type:str,value:any,source_timestamp:Timestamp,server_timestamp:Timestamp,status:uint32,access:RO|RW|WO,historizing:bool}

UDT:OPC_Method───────────────────────
extends:OPC_Node
{input_args:[{name,type}],output_args:[{name,type}],executable:bool}

UDT:OPC_Subscription─────────────────
{id:uint32,publishing_interval:Duration,lifetime:Duration,max_keepalive:int,priority:uint8,enabled:bool,monitored_items:[MonitoredItem]}

UDT:OPC_MonitoredItem────────────────
{id:uint32,node:ref,sampling_interval:Duration,queue_size:uint32,discard_oldest:bool,filter:ref|null}

ADDRESS_SPACE────────────────────────
Root→Objects→[Server,DeviceSet,Aliases]
Root→Types→[ObjectTypes,VariableTypes,DataTypes,ReferenceTypes]
Root→Views→[Engineering,Operations,Maintenance]

COMPANION_SPECS──────────────────────
ISA-95:ns=isa95;Equipment,Material,Personnel,Process
PackML:ns=packml;StateMachine,Admin,Status,Command
MDIS:ns=mdis;Subsea equipment
PLCopen:ns=plcopen;Motion control
```

---

## 📨 LAYER 7: MQTT/Sparkplug (Messaging)

```
ID:MQTT+Sparkplug|SCOPE:lightweight pub/sub

UDT:MQTT_QoS─────────────────────────
QoS0:{name:"AtMostOnce",delivery:"Fire-forget",ack:none}
QoS1:{name:"AtLeastOnce",delivery:"Guaranteed",ack:PUBACK}
QoS2:{name:"ExactlyOnce",delivery:"Exactly once",ack:PUBREC-PUBREL-PUBCOMP}

UDT:MQTT_Topic───────────────────────
format:"{namespace}/{group}/{edge}/{device}/{point}"
example:"spBv1.0/Plant1/DCMD/PLC01/Output1"

UDT:Sparkplug_Topic──────────────────
NBIRTH:spBv1.0/{group}/NBIRTH/{edge_node}→node online,metric list
NDEATH:spBv1.0/{group}/NDEATH/{edge_node}→node offline
DBIRTH:spBv1.0/{group}/DBIRTH/{edge_node}/{device}→device online
DDEATH:spBv1.0/{group}/DDEATH/{edge_node}/{device}→device offline
NDATA:spBv1.0/{group}/NDATA/{edge_node}→node data
DDATA:spBv1.0/{group}/DDATA/{edge_node}/{device}→device data
NCMD:spBv1.0/{group}/NCMD/{edge_node}→command to node
DCMD:spBv1.0/{group}/DCMD/{edge_node}/{device}→command to device

UDT:Sparkplug_Payload────────────────
{timestamp:uint64,metrics:[{name,alias,timestamp,datatype,value,properties}],seq:uint64}

UDT:Sparkplug_DataType───────────────
Int8|Int16|Int32|Int64|UInt8|UInt16|UInt32|UInt64|Float|Double|Boolean|String|DateTime|Text|UUID|DataSet|Bytes|File|Template

RULES────────────────────────────────
R1:NBIRTH before any NDATA
R2:seq increments 0-255 wrap
R3:LWT configured for NDEATH
R4:alias for bandwidth optimization
R5:store-forward on disconnect
```

---

## 🔧 LAYER 8: Modbus (Field Protocol)

```
ID:Modbus|SCOPE:simple field device communication

UDT:Modbus_Register──────────────────
Coil:{addr:0-65535,access:RW,type:bit,fc_read:1,fc_write:5,fc_multi:15}
DiscreteInput:{addr:0-65535,access:RO,type:bit,fc_read:2}
HoldingReg:{addr:0-65535,access:RW,type:uint16,fc_read:3,fc_write:6,fc_multi:16}
InputReg:{addr:0-65535,access:RO,type:uint16,fc_read:4}

UDT:Modbus_DataType──────────────────
BOOL:1 coil|1 bit
INT16:1 reg|signed
UINT16:1 reg|unsigned
INT32:2 reg|signed|byte_order:ABCD|CDAB|BADC|DCBA
UINT32:2 reg|unsigned
FLOAT32:2 reg|IEEE754
INT64:4 reg|signed
FLOAT64:4 reg|IEEE754
STRING:N reg|2 chars per reg

UDT:Modbus_Map───────────────────────
{tag:PATH,unit_id:int,register_type:Coil|DI|HR|IR,addr:int,data_type:str,scale:num,offset:num,byte_order:str}

FUNCTION_CODES───────────────────────
FC01:Read Coils|FC02:Read DI|FC03:Read HR|FC04:Read IR
FC05:Write Coil|FC06:Write HR|FC15:Write Multi Coil|FC16:Write Multi HR
FC23:Read/Write HR

EXCEPTION_CODES──────────────────────
01:Illegal Function|02:Illegal Address|03:Illegal Value|04:Device Fail|05:Ack|06:Busy|08:Parity|0A:Gateway Path|0B:Gateway Target
```

---

## 📊 LAYER 9: KPIs (Performance Metrics)

```
ID:KPI|SCOPE:operational performance metrics

UDT:OEE──────────────────────────────
{
  availability:pct=run_time/(run_time+downtime),
  performance:pct=actual_rate/ideal_rate,
  quality:pct=good_units/total_units,
  oee:pct=availability*performance*quality
}
TARGET:availability>90%,performance>95%,quality>99%,oee>85%

UDT:MTBF─────────────────────────────
{mean_time_between_failures:Duration=total_uptime/failure_count}

UDT:MTTR─────────────────────────────
{mean_time_to_repair:Duration=total_downtime/failure_count}

UDT:Downtime─────────────────────────
{
  categories:[Planned,Unplanned,Changeover,Setup,Breakdown,Idle],
  events:[{start,end,category,reason,equipment}],
  totals:{category:Duration}
}

UDT:FirstPassYield───────────────────
{fpy:pct=good_first_time/total_attempted}

UDT:CycleTime────────────────────────
{ideal:Duration,actual:Duration,efficiency:pct=ideal/actual}

UDT:Throughput───────────────────────
{value:num,unit:units/hour,period:Duration}

UDT:EnergyKPI────────────────────────
{kwh_per_unit:num,kwh_per_batch:num,peak_demand:num,power_factor:pct}

TREE─────────────────────────────────
OEE
├─Availability
│ ├─MTBF
│ ├─MTTR
│ └─Downtime
├─Performance
│ ├─CycleTime
│ └─Throughput
└─Quality
  ├─FirstPassYield
  └─DefectRate
```

---

## 🔀 CROSSWALKS

```
ISA-95↔ISA-88───────────────────────
ISA95.WorkCenter=ISA88.ProcessCell
ISA95.WorkUnit=ISA88.Unit
ISA95.ProcessSegment=ISA88.Operation
ISA95.ProductionSchedule→ISA88.Batch(instantiate)

ISA-95↔OPC-UA───────────────────────
ISA95.Equipment→OPCUA.Object(ns=isa95)
ISA95.Property→OPCUA.Variable
ISA95.Capability→OPCUA.Method

ISA-88↔PackML──────────────────────
ISA88.UnitState≈PackML.StateMachine(subset)
ISA88.Phase.RUNNING=PackML.EXECUTE
ISA88.Phase.HELD=PackML.HELD
ISA88.Phase.ABORTED=PackML.ABORTED

ISA-101↔ISA-18.2────────────────────
ISA101.AlarmIndicator→ISA18.AlarmState(visual)
ISA101.ColorMeaning.Alarm=ISA18.Priority(color code)
ISA101.L1-L5.AlarmSummary→ISA18.AlarmList(filter by area)

OPC-UA↔Sparkplug────────────────────
OPCUA.Variable→Sparkplug.Metric
OPCUA.Subscription→Sparkplug.NDATA/DDATA(publish)
OPCUA.Method→Sparkplug.NCMD/DCMD
OPCUA.AddressSpace↔Sparkplug.NBIRTH(metric list)
```

---

## 🚀 USAGE

```python
from konomi_standard import KS

# PARSE: human std→compressed
compressed = KS.parse("ISA-95", source_doc)

# EXPAND: compressed→implementation
impl = KS.expand("ISA-95", target="python")

# VALIDATE: impl→compliant?
report = KS.validate(impl, "ISA-95")

# CROSSWALK: map between standards
mapped = KS.crosswalk(entity, "ISA-95", "ISA-88")

# GENERATE: template→code
code = KS.generate("ISA-88.Batch", lang="python")
```

---

## 🎯 GOAL

- **LAYER0**: defines how all layers structured (self-describing)
- **LAYER1**: base UDTs all standards share
- **LAYER2+**: each standard compressed, UDT-first
- **CROSSWALKS**: map between standards
- **AGENTS**: parse, expand, validate, crosswalk, generate
- **COMPRESSION**: max info, min tokens
