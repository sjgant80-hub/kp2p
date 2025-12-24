/**
 * Perspective Graphics Builder
 * Fluent API for building Perspective views as minified tag structures
 */

import { TYPE_MAP, STYLE_MAP, STYLE_REVERSE } from './udts.js';

// Component builder class
export class GBuilder {
  constructor(type) {
    this._type = TYPE_MAP[type] || type;
    this._props = {};
    this._style = {};
    this._meta = {};
    this._position = {};
    this._children = [];
    this._events = {};
    this._custom = {};
  }

  // Set properties
  props(p) {
    Object.assign(this._props, p);
    return this;
  }

  // Set a single prop
  prop(key, value) {
    this._props[key] = value;
    return this;
  }

  // Set style (accepts minified or full keys)
  style(s) {
    for (const [k, v] of Object.entries(s)) {
      const key = STYLE_REVERSE[k] ? k : (Object.entries(STYLE_MAP).find(([_, n]) => n === k)?.[0] || k);
      this._style[key] = v;
    }
    return this;
  }

  // Common style shortcuts
  size(w, h) {
    this._style.W = w;
    this._style.H = h || w;
    return this;
  }

  bg(color) {
    this._style.BG = color;
    return this;
  }

  color(c) {
    this._style.C = c;
    return this;
  }

  padding(p) {
    this._style.P = typeof p === 'number' ? `${p}px` : p;
    return this;
  }

  margin(m) {
    this._style.M = typeof m === 'number' ? `${m}px` : m;
    return this;
  }

  flex(dir = 'column', justify = 'flex-start', align = 'stretch') {
    this._style.D = 'flex';
    this._style.FD = dir;
    this._style.JC = justify;
    this._style.AI = align;
    return this;
  }

  gap(g) {
    this._style.G = typeof g === 'number' ? `${g}px` : g;
    return this;
  }

  border(b) {
    this._style.B = b;
    return this;
  }

  radius(r) {
    this._style.BR = typeof r === 'number' ? `${r}px` : r;
    return this;
  }

  shadow(s) {
    this._style.BS = s;
    return this;
  }

  font(size, weight, family) {
    if (size) this._style.FS = typeof size === 'number' ? `${size}px` : size;
    if (weight) this._style.FT = weight;
    if (family) this._style.FF = family;
    return this;
  }

  // Meta (name, visible, etc)
  name(n) {
    this._meta.name = n;
    return this;
  }

  visible(expr) {
    this._meta.visible = expr;
    return this;
  }

  // Position (for flex or coord)
  position(pos) {
    Object.assign(this._position, pos);
    return this;
  }

  basis(b) {
    this._position.basis = b;
    return this;
  }

  grow(g = 1) {
    this._position.grow = g;
    return this;
  }

  shrink(s = 1) {
    this._position.shrink = s;
    return this;
  }

  // For coordinate containers
  at(x, y, w, h) {
    this._position.x = x;
    this._position.y = y;
    if (w !== undefined) this._position.width = w;
    if (h !== undefined) this._position.height = h;
    return this;
  }

  // Add children
  add(...children) {
    for (const child of children) {
      if (child instanceof GBuilder) {
        this._children.push(child.build());
      } else if (Array.isArray(child)) {
        this._children.push(...child.map(c => c instanceof GBuilder ? c.build() : c));
      } else {
        this._children.push(child);
      }
    }
    return this;
  }

  // Add event handler
  on(event, ...actions) {
    this._events[event] = {
      events: actions.map(a => a instanceof ActionBuilder ? a.build() : a)
    };
    return this;
  }

  // Custom properties
  custom(c) {
    Object.assign(this._custom, c);
    return this;
  }

  // Build to minified tag structure
  build() {
    const tag = { T: this._type };

    if (Object.keys(this._props).length) tag.P = this._props;
    if (Object.keys(this._style).length) tag.S = this._style;
    if (Object.keys(this._meta).length) tag.M = this._meta;
    if (Object.keys(this._position).length) tag.X = this._position;
    if (this._children.length) tag.C = this._children;
    if (Object.keys(this._events).length) tag.E = this._events;
    if (Object.keys(this._custom).length) tag.U = this._custom;

    return tag;
  }

  // Build to full Ignition JSON
  toIgnition() {
    return expandTag(this.build());
  }

  // Build to minified JSON string
  toJSON() {
    return JSON.stringify(this.build());
  }
}

// Action builder for events
export class ActionBuilder {
  constructor(type) {
    this._type = type;
    this._config = {};
  }

  config(c) {
    Object.assign(this._config, c);
    return this;
  }

  // Navigation shortcuts
  page(path, params = {}) {
    this._type = 'perspective/navigate';
    this._config = { page: { path }, params };
    return this;
  }

  popup(viewPath, params = {}, opts = {}) {
    this._type = 'perspective/open-popup';
    this._config = { viewPath, params, ...opts };
    return this;
  }

  write(tagPath, value) {
    this._type = 'perspective/write-to-tag';
    this._config = { tagPath, value };
    return this;
  }

  script(code) {
    this._type = 'perspective/run-script';
    this._config = { script: code };
    return this;
  }

  message(msgType, payload = {}) {
    this._type = 'perspective/send-message';
    this._config = { messageType: msgType, payload };
    return this;
  }

  build() {
    return {
      type: this._type,
      config: this._config
    };
  }
}

// View builder (root container)
export class ViewBuilder {
  constructor(path) {
    this._path = path;
    this._params = {};
    this._root = null;
    this._resources = {};
    this._permissions = {};
  }

  params(p) {
    Object.assign(this._params, p);
    return this;
  }

  param(key, type = 'value', def = null) {
    this._params[key] = { type, default: def };
    return this;
  }

  root(component) {
    this._root = component instanceof GBuilder ? component.build() : component;
    return this;
  }

  script(name, code) {
    if (!this._resources.scripts) this._resources.scripts = {};
    this._resources.scripts[name] = code;
    return this;
  }

  style(css) {
    this._resources.styles = css;
    return this;
  }

  permissions(p) {
    Object.assign(this._permissions, p);
    return this;
  }

  build() {
    return {
      path: this._path,
      params: this._params,
      root: this._root,
      resources: this._resources,
      permissions: this._permissions
    };
  }

  toIgnition() {
    const built = this.build();
    return {
      ...expandTag(built.root),
      params: built.params,
      resources: built.resources,
      custom: {}
    };
  }

  toJSON() {
    return JSON.stringify(this.build());
  }
}

// Factory functions for cleaner API
export function g(type) {
  return new GBuilder(type);
}

export function view(path) {
  return new ViewBuilder(path);
}

export function action(type) {
  return new ActionBuilder(type);
}

// Common component shortcuts
export const G = {
  // Containers
  flex: () => g('flex'),
  col: () => g('col'),
  row: () => g('row'),
  coord: () => g('coord'),
  card: () => g('card'),
  scroll: () => g('scroll'),

  // Inputs
  textField: (label) => g('tf').prop('label', label),
  textArea: (label) => g('ta').prop('label', label),
  numeric: (label) => g('num').prop('label', label),
  dropdown: (opts) => g('dd').prop('options', opts),
  checkbox: (text) => g('cb').prop('text', text),
  toggle: (text) => g('tog').prop('text', text),
  slider: (min, max) => g('sl').props({ min, max }),
  datePicker: () => g('dt'),

  // Display
  label: (text) => g('lbl').prop('text', text),
  image: (src) => g('img').prop('source', src),
  icon: (path, color) => g('icon').props({ path, color }),
  markdown: (md) => g('md').prop('source', md),
  html: (src) => g('html').prop('source', src),
  progress: (value) => g('prog').prop('value', value),

  // Charts
  xyChart: () => g('xy'),
  pieChart: () => g('pie'),
  barChart: () => g('bar'),
  timeSeries: () => g('ts'),
  gauge: (value) => g('gauge').prop('value', value),

  // Tables
  table: (data) => g('tbl').prop('data', data),
  powerTable: (data) => g('pwr').prop('data', data),

  // Nav
  button: (text) => g('btn').prop('text', text),
  link: (text, href) => g('link').props({ text, href }),

  // Embed
  embed: (viewPath) => g('view').prop('path', viewPath),
  iframe: (src) => g('iframe').prop('source', src)
};

// Expand minified tag to full Ignition JSON
export function expandTag(tag) {
  if (!tag || typeof tag !== 'object') return tag;

  const result = {
    type: tag.T,
    version: 0,
    props: expandProps(tag.P || {}),
    meta: tag.M || {},
    position: expandPosition(tag.X || {}),
    custom: tag.U || {}
  };

  // Expand style
  if (tag.S && Object.keys(tag.S).length) {
    result.props.style = expandStyle(tag.S);
  }

  // Expand children
  if (tag.C && tag.C.length) {
    result.children = tag.C.map(expandTag);
  }

  // Expand events
  if (tag.E && Object.keys(tag.E).length) {
    result.events = tag.E;
  }

  return result;
}

// Expand minified props
function expandProps(props) {
  // Most props pass through directly
  return { ...props };
}

// Expand minified style to full CSS property names
function expandStyle(style) {
  const expanded = { classes: '' };

  for (const [k, v] of Object.entries(style)) {
    const fullKey = STYLE_MAP[k] || k;
    expanded[fullKey] = v;
  }

  return expanded;
}

// Expand position
function expandPosition(pos) {
  return {
    basis: pos.basis ?? 'auto',
    grow: pos.grow ?? 0,
    shrink: pos.shrink ?? 1,
    ...(pos.x !== undefined && {
      x: pos.x,
      y: pos.y,
      width: pos.width,
      height: pos.height
    })
  };
}

// Minify Ignition JSON to tag structure
export function minifyView(ignitionJson) {
  return minifyComponent(ignitionJson);
}

function minifyComponent(comp) {
  if (!comp || typeof comp !== 'object') return comp;

  // Reverse lookup for type
  const typeShort = Object.entries(TYPE_MAP).find(([_, v]) => v === comp.type)?.[0] || comp.type;

  const tag = { T: typeShort };

  // Minify props (extract style separately)
  if (comp.props) {
    const { style, ...restProps } = comp.props;
    if (Object.keys(restProps).length) tag.P = restProps;
    if (style) tag.S = minifyStyle(style);
  }

  // Meta
  if (comp.meta && Object.keys(comp.meta).length) {
    tag.M = comp.meta;
  }

  // Position (only if non-default)
  if (comp.position) {
    const pos = {};
    if (comp.position.basis !== 'auto') pos.basis = comp.position.basis;
    if (comp.position.grow) pos.grow = comp.position.grow;
    if (comp.position.shrink !== 1) pos.shrink = comp.position.shrink;
    if (comp.position.x !== undefined) {
      pos.x = comp.position.x;
      pos.y = comp.position.y;
      pos.width = comp.position.width;
      pos.height = comp.position.height;
    }
    if (Object.keys(pos).length) tag.X = pos;
  }

  // Children
  if (comp.children && comp.children.length) {
    tag.C = comp.children.map(minifyComponent);
  }

  // Events
  if (comp.events && Object.keys(comp.events).length) {
    tag.E = comp.events;
  }

  // Custom
  if (comp.custom && Object.keys(comp.custom).length) {
    tag.U = comp.custom;
  }

  return tag;
}

// Minify style object
function minifyStyle(style) {
  const mini = {};

  for (const [k, v] of Object.entries(style)) {
    if (k === 'classes' && !v) continue; // Skip empty classes
    const shortKey = STYLE_REVERSE[k] || k;
    mini[shortKey] = v;
  }

  return mini;
}
