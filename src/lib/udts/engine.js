/**
 * @t 250|UDT Template Engine|v1.0
 * @h {A:"engine",C:"2024-12",L:"MIT",S:"stable"}
 * @p loads/renders UDT JSON files with param injection
 * @a validate→expand→inject→emit
 */

// Cache for loaded UDTs
const cache = new Map();

/**
 * Load UDT from JSON file
 * @param {string} path - Path to UDT JSON
 */
export async function load(path) {
  if (cache.has(path)) return cache.get(path);
  try {
    const res = await fetch(path);
    const udt = await res.json();
    cache.set(path, udt);
    return udt;
  } catch (e) {
    console.warn('UDT load fail:', path, e);
    return null;
  }
}

/**
 * Load all UDTs from index
 * @param {string} indexPath - Path to _index.json
 */
export async function loadAll(indexPath) {
  const idx = await load(indexPath);
  if (!idx?.files) return {};
  const base = indexPath.replace('_index.json', '');
  const all = {};
  await Promise.all(
    idx.files.map(async f => {
      const u = await load(base + f);
      if (u) all[u.N] = u;
    })
  );
  return all;
}

/**
 * Inject params into UDT template
 * @param {object} udt - UDT definition
 * @param {object} params - Values to inject
 */
export function inject(udt, params = {}) {
  const out = { ...udt };
  if (out.P) {
    out.P = { ...out.P };
    for (const [k, p] of Object.entries(out.P)) {
      if (params[p.N] !== undefined) {
        out.P[k] = { ...p, V: params[p.N] };
      } else if (params[k] !== undefined) {
        out.P[k] = { ...p, V: params[k] };
      }
    }
  }
  return out;
}

/**
 * Create instance from UDT with defaults
 * @param {object} udt - UDT definition
 * @param {object} overrides - Override values
 */
export function create(udt, overrides = {}) {
  const obj = {};
  if (udt.P) {
    for (const [k, p] of Object.entries(udt.P)) {
      if (overrides[p.N] !== undefined) {
        obj[k] = overrides[p.N];
      } else if (overrides[k] !== undefined) {
        obj[k] = overrides[k];
      } else if (p.X !== undefined) {
        obj[k] = p.X;
      }
    }
  }
  return obj;
}

/**
 * Expand minified obj to full names
 */
export function expand(obj, udt) {
  if (!udt.P) return obj;
  const out = {};
  for (const [k, p] of Object.entries(udt.P)) {
    if (obj[k] !== undefined) out[p.N] = obj[k];
  }
  return out;
}

/**
 * Minify full obj to shortcodes
 */
export function minify(obj, udt) {
  if (!udt.P) return obj;
  const out = {};
  for (const [k, p] of Object.entries(udt.P)) {
    if (obj[p.N] !== undefined) out[k] = obj[p.N];
  }
  return out;
}

/**
 * Validate obj against UDT
 */
export function validate(obj, udt) {
  const err = [];
  if (udt.P) {
    for (const [k, p] of Object.entries(udt.P)) {
      const v = obj[p.N] ?? obj[k];
      if (p.R && v === undefined) err.push(k);
    }
  }
  return { ok: !err.length, missing: err };
}

/**
 * Parse UDT header comment
 * @param {string} header - Header string
 */
export function parseHeader(header) {
  const h = {};
  // @t tokens|name|version
  const t = header.match(/@t\s+(\d+)\|([^|]+)\|([^\n]+)/);
  if (t) { h.tokens = +t[1]; h.name = t[2]; h.version = t[3]; }
  // @h {json}
  const hm = header.match(/@h\s+(\{[^}]+\})/);
  if (hm) try { h.meta = JSON.parse(hm[1]); } catch (e) {}
  // @p purpose
  const p = header.match(/@p\s+([^\n]+)/);
  if (p) h.purpose = p[1];
  // @a action flow
  const a = header.match(/@a\s+([^\n]+)/);
  if (a) h.actions = a[1].split('→');
  return h;
}

/**
 * Generate header for UDT file
 */
export function genHeader(opts) {
  let h = `/**\n`;
  h += ` * @t ${opts.tokens || 250}|${opts.name}|${opts.version || 'v1.0'}\n`;
  h += ` * @h ${JSON.stringify(opts.meta || {})}\n`;
  if (opts.purpose) h += ` * @p ${opts.purpose}\n`;
  if (opts.actions) h += ` * @a ${opts.actions.join('→')}\n`;
  h += ` */\n`;
  return h;
}

export default { load, loadAll, inject, create, expand, minify, validate, parseHeader, genHeader };
