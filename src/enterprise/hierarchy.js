/**
 * @file src/enterprise/hierarchy.js
 * @desc ISA-95 hierarchy implementation for P2P enterprise communication
 *
 * HIERARCHY:
 * Enterprise → Site → Area → WorkCenter → WorkUnit → Equipment
 *
 * Each node is a P2P peer with:
 * - Identity (path-based addressing)
 * - State machine (PackML-based)
 * - Data pub/sub (Sparkplug-style topics)
 * - Sandboxed execution
 */

/**
 * ISA-95 Levels
 */
export const LEVEL = {
  L4: { id: 4, name: 'Business', scope: 'Planning, ERP', time: 'days-months' },
  L3: { id: 3, name: 'MOM', scope: 'MES, Execution', time: 'shifts-days' },
  L2: { id: 2, name: 'Control', scope: 'Supervision', time: 'sec-hours' },
  L1: { id: 1, name: 'Sensing', scope: 'Direct Control', time: 'ms-sec' },
  L0: { id: 0, name: 'Process', scope: 'Physical', time: 'continuous' },
};

/**
 * Equipment states (PackML subset)
 */
export const STATE = {
  STOPPED: 'stopped',
  IDLE: 'idle',
  STARTING: 'starting',
  EXECUTE: 'execute',
  COMPLETING: 'completing',
  COMPLETE: 'complete',
  RESETTING: 'resetting',
  HOLDING: 'holding',
  HELD: 'held',
  UNHOLDING: 'unholding',
  STOPPING: 'stopping',
  ABORTING: 'aborting',
  ABORTED: 'aborted',
  CLEARING: 'clearing',
};

/**
 * State transitions (PackML)
 */
export const TRANSITIONS = {
  [STATE.STOPPED]: { start: STATE.IDLE, abort: STATE.ABORTING },
  [STATE.IDLE]: { start: STATE.STARTING, stop: STATE.STOPPING, abort: STATE.ABORTING },
  [STATE.STARTING]: { _auto: STATE.EXECUTE, hold: STATE.HOLDING, abort: STATE.ABORTING },
  [STATE.EXECUTE]: { complete: STATE.COMPLETING, hold: STATE.HOLDING, stop: STATE.STOPPING, abort: STATE.ABORTING },
  [STATE.COMPLETING]: { _auto: STATE.COMPLETE, abort: STATE.ABORTING },
  [STATE.COMPLETE]: { reset: STATE.RESETTING, abort: STATE.ABORTING },
  [STATE.RESETTING]: { _auto: STATE.IDLE, abort: STATE.ABORTING },
  [STATE.HOLDING]: { _auto: STATE.HELD, abort: STATE.ABORTING },
  [STATE.HELD]: { unhold: STATE.UNHOLDING, abort: STATE.ABORTING },
  [STATE.UNHOLDING]: { _auto: STATE.EXECUTE, abort: STATE.ABORTING },
  [STATE.STOPPING]: { _auto: STATE.STOPPED, abort: STATE.ABORTING },
  [STATE.ABORTING]: { _auto: STATE.ABORTED },
  [STATE.ABORTED]: { clear: STATE.CLEARING },
  [STATE.CLEARING]: { _auto: STATE.STOPPED },
};

/**
 * Equipment modes
 */
export const MODE = {
  PRODUCTION: 'production',
  MAINTENANCE: 'maintenance',
  MANUAL: 'manual',
  AUTOMATIC: 'automatic',
  SEMIAUTO: 'semiauto',
};

/**
 * Message types (Sparkplug-style)
 */
export const MSG = {
  BIRTH: 'BIRTH',      // Node comes online with metric list
  DEATH: 'DEATH',      // Node goes offline
  DATA: 'DATA',        // Data update
  CMD: 'CMD',          // Command to node
  STATE: 'STATE',      // State change
  ALARM: 'ALARM',      // Alarm event
};

/**
 * Alarm priorities (ISA-18.2)
 */
export const ALARM_PRIORITY = {
  P1: { id: 1, name: 'Emergency', response: '<1min', color: '#CC0000' },
  P2: { id: 2, name: 'High', response: '<10min', color: '#FF6600' },
  P3: { id: 3, name: 'Medium', response: '<1hr', color: '#FFCC00' },
  P4: { id: 4, name: 'Low', response: 'Shift', color: '#00CCCC' },
};

/**
 * Quality codes (OPC-UA style)
 */
export const QUALITY = {
  GOOD: 192,
  BAD: 0,
  UNCERTAIN: 64,
};

/**
 * Value with quality and timestamp
 */
export function createValue(v, q = QUALITY.GOOD, unit = null) {
  return { v, q, t: Date.now(), unit };
}

/**
 * Base class for all hierarchy nodes
 */
export class HierarchyNode {
  constructor(options) {
    this.id = options.id || crypto.randomUUID();
    this.name = options.name;
    this.path = options.path || this.name;
    this.level = options.level || LEVEL.L2;
    this.parent = options.parent || null;
    this.children = new Map();
    this.state = STATE.STOPPED;
    this.mode = MODE.AUTOMATIC;
    this.metrics = new Map();
    this.alarms = new Map();
    this.listeners = new Map();
    this.props = options.props || {};
  }

  /**
   * Get full path
   */
  getPath() {
    if (this.parent) {
      return `${this.parent.getPath()}/${this.name}`;
    }
    return this.name;
  }

  /**
   * Add child node
   */
  addChild(node) {
    node.parent = this;
    node.path = `${this.getPath()}/${node.name}`;
    this.children.set(node.name, node);
    return node;
  }

  /**
   * Get child by name
   */
  getChild(name) {
    return this.children.get(name);
  }

  /**
   * Navigate to node by path
   */
  navigate(path) {
    const parts = path.split('/').filter(p => p);
    let node = this;
    for (const part of parts) {
      node = node.getChild(part);
      if (!node) return null;
    }
    return node;
  }

  /**
   * Set metric value
   */
  setMetric(name, value, quality = QUALITY.GOOD, unit = null) {
    const metric = createValue(value, quality, unit);
    this.metrics.set(name, metric);
    this._emit(MSG.DATA, { metric: name, ...metric });
    return metric;
  }

  /**
   * Get metric value
   */
  getMetric(name) {
    return this.metrics.get(name);
  }

  /**
   * Execute state transition
   */
  transition(command) {
    const transitions = TRANSITIONS[this.state];
    if (!transitions) return false;

    const nextState = transitions[command];
    if (!nextState) return false;

    const prevState = this.state;
    this.state = nextState;
    this._emit(MSG.STATE, { from: prevState, to: nextState, command });

    // Handle auto-transitions
    this._checkAutoTransition();

    return true;
  }

  /**
   * Check for automatic transitions
   */
  _checkAutoTransition() {
    const transitions = TRANSITIONS[this.state];
    if (transitions?._auto) {
      // Simulate async completion
      setTimeout(() => {
        const nextState = transitions._auto;
        const prevState = this.state;
        this.state = nextState;
        this._emit(MSG.STATE, { from: prevState, to: nextState, command: '_auto' });
        this._checkAutoTransition();
      }, 100);
    }
  }

  /**
   * Raise alarm
   */
  raiseAlarm(id, message, priority = 'P3') {
    const alarm = {
      id,
      message,
      priority: ALARM_PRIORITY[priority],
      state: 'UNACK',
      timestamp: Date.now(),
      ackTime: null,
      ackUser: null,
    };
    this.alarms.set(id, alarm);
    this._emit(MSG.ALARM, alarm);
    return alarm;
  }

  /**
   * Acknowledge alarm
   */
  ackAlarm(id, user = 'system') {
    const alarm = this.alarms.get(id);
    if (alarm) {
      alarm.state = 'ACKED';
      alarm.ackTime = Date.now();
      alarm.ackUser = user;
      this._emit(MSG.ALARM, alarm);
    }
    return alarm;
  }

  /**
   * Clear alarm
   */
  clearAlarm(id) {
    const alarm = this.alarms.get(id);
    if (alarm) {
      alarm.state = 'CLEAR';
      this.alarms.delete(id);
      this._emit(MSG.ALARM, { ...alarm, state: 'CLEAR' });
    }
  }

  /**
   * Subscribe to events
   */
  on(type, callback) {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type).add(callback);
    return () => this.listeners.get(type).delete(callback);
  }

  /**
   * Emit event
   */
  _emit(type, data) {
    const event = {
      type,
      source: this.getPath(),
      timestamp: Date.now(),
      data,
    };

    // Local listeners
    const listeners = this.listeners.get(type);
    if (listeners) {
      for (const cb of listeners) {
        try { cb(event); } catch (e) { console.error(e); }
      }
    }

    // Bubble to parent
    if (this.parent) {
      this.parent._emit(type, data);
    }
  }

  /**
   * Get BIRTH message (full state)
   */
  toBirth() {
    return {
      type: MSG.BIRTH,
      id: this.id,
      name: this.name,
      path: this.getPath(),
      level: this.level,
      state: this.state,
      mode: this.mode,
      metrics: Object.fromEntries(this.metrics),
      alarms: Object.fromEntries(this.alarms),
      children: Array.from(this.children.keys()),
      props: this.props,
      timestamp: Date.now(),
    };
  }

  /**
   * Serialize to JSON
   */
  toJSON() {
    return {
      id: this.id,
      name: this.name,
      path: this.getPath(),
      level: this.level,
      state: this.state,
      mode: this.mode,
      children: Array.from(this.children.values()).map(c => c.toJSON()),
    };
  }
}

/**
 * Enterprise (top level)
 */
export class Enterprise extends HierarchyNode {
  constructor(name, props = {}) {
    super({ name, level: LEVEL.L4, props });
  }

  addSite(name, props = {}) {
    return this.addChild(new Site(name, props));
  }
}

/**
 * Site
 */
export class Site extends HierarchyNode {
  constructor(name, props = {}) {
    super({ name, level: LEVEL.L4, props });
  }

  addArea(name, props = {}) {
    return this.addChild(new Area(name, props));
  }
}

/**
 * Area
 */
export class Area extends HierarchyNode {
  constructor(name, props = {}) {
    super({ name, level: LEVEL.L3, props });
  }

  addWorkCenter(name, props = {}) {
    return this.addChild(new WorkCenter(name, props));
  }
}

/**
 * Work Center (ISA-88: Process Cell)
 */
export class WorkCenter extends HierarchyNode {
  constructor(name, props = {}) {
    super({ name, level: LEVEL.L2, props });
  }

  addWorkUnit(name, props = {}) {
    return this.addChild(new WorkUnit(name, props));
  }
}

/**
 * Work Unit (ISA-88: Unit)
 */
export class WorkUnit extends HierarchyNode {
  constructor(name, props = {}) {
    super({ name, level: LEVEL.L2, props });
  }

  addEquipment(name, type, props = {}) {
    return this.addChild(new Equipment(name, type, props));
  }
}

/**
 * Equipment (leaf node)
 */
export class Equipment extends HierarchyNode {
  constructor(name, type, props = {}) {
    super({ name, level: LEVEL.L1, props });
    this.type = type; // Motor, Valve, Pump, Tank, Sensor, etc.
  }

  toJSON() {
    return { ...super.toJSON(), type: this.type };
  }
}

/**
 * Create example hierarchy
 */
export function createExampleHierarchy() {
  const enterprise = new Enterprise('Acme Corp');

  const plant1 = enterprise.addSite('Plant1');
  const packaging = plant1.addArea('Packaging');
  const line1 = packaging.addWorkCenter('Line1');
  const filler = line1.addWorkUnit('Filler');

  filler.addEquipment('InfeedConveyor', 'Conveyor');
  filler.addEquipment('FillerHead', 'Filler');
  filler.addEquipment('OutfeedConveyor', 'Conveyor');
  filler.addEquipment('LevelSensor', 'Sensor');

  const capper = line1.addWorkUnit('Capper');
  capper.addEquipment('CapperHead', 'Capper');
  capper.addEquipment('TorqueSensor', 'Sensor');

  return enterprise;
}

export default HierarchyNode;
