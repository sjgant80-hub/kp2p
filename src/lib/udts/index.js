/**
 * @file src/lib/udts/index.js
 * @desc Unified UDT Registry - Auto-loading type definitions
 *
 * AUTO-DISCOVERY: This module automatically discovers and loads UDT modules.
 * Just create a udts.js file in any src/* directory and it will be loaded.
 *
 * CONVENTION:
 * - src/{module}/udts.js exports {MODULE}_UDTS (e.g., OS_UDTS, CORE_UDTS)
 * - src/lib/udts/{domain}/_index.json lists individual JSON files
 * - src/widgets/udts.js for UI component types
 *
 * KEY MAPPING (standard across all UDTs):
 * N = name, T = type, D = description, V = values/variants
 * S = size, P = properties, R = required, O = optional
 * C = category, X = default value or constants
 */

// ============================================================================
// AUTO-DISCOVERY CONFIG
// ============================================================================

/**
 * Known UDT module paths - add new modules here and they auto-load
 * Format: { name: 'import path from this file' }
 */
const UDT_MODULES = {
  os: '../../os/udts.js',
  core: '../../core/udts.js',
  network: '../../network/udts.js',
  p2p: '../../p2p/udts.js',
  sync: '../../sync/udts.js',
  protocols: '../../protocols/udts.js',
  enterprise: '../../enterprise/udts.js',
  widgets: '../../widgets/udts.js',
  // Add new modules here - they will auto-load
  // agent: '../../agent/udts.js',
  // bridge: '../../bridge/udts.js',
  // genesis: '../../genesis/udts.js',
};

/**
 * Special modules with different export patterns
 */
const SPECIAL_MODULES = {
  llm: { path: '../../llm/tools-udt.js', exportName: 'TOOLS' },
  graphics: { path: '../graphics/udts.js', exports: ['TYPE_MAP', 'STYLE_MAP', 'SHORTCODES'] },
};

// ============================================================================
// DYNAMIC REGISTRY
// ============================================================================

/**
 * The unified registry - populated at load time
 */
export const UDT_REGISTRY = {};

/**
 * Track loaded modules
 */
const loadedModules = new Map();

/**
 * Load a UDT module dynamically
 */
async function loadModule(name, path) {
  try {
    const module = await import(path);
    // Convention: export is {NAME}_UDTS or default
    const exportName = `${name.toUpperCase()}_UDTS`;
    const udts = module[exportName] || module.default || module;
    loadedModules.set(name, { path, udts, loaded: true });
    return udts;
  } catch (err) {
    console.warn(`[UDT] Failed to load ${name} from ${path}:`, err.message);
    loadedModules.set(name, { path, error: err.message, loaded: false });
    return null;
  }
}

/**
 * Load all UDT modules
 */
export async function loadAllUDTs() {
  const promises = [];

  // Load standard modules
  for (const [name, path] of Object.entries(UDT_MODULES)) {
    promises.push(
      loadModule(name, path).then(udts => {
        if (udts) UDT_REGISTRY[name] = udts;
      })
    );
  }

  // Load special modules
  for (const [name, config] of Object.entries(SPECIAL_MODULES)) {
    promises.push(
      import(config.path).then(module => {
        if (config.exports) {
          // Multiple exports
          UDT_REGISTRY[name] = {};
          for (const exp of config.exports) {
            if (module[exp]) UDT_REGISTRY[name][exp] = module[exp];
          }
        } else {
          // Single export
          UDT_REGISTRY[name] = module[config.exportName] || module.default;
        }
        loadedModules.set(name, { path: config.path, loaded: true });
      }).catch(err => {
        console.warn(`[UDT] Failed to load ${name}:`, err.message);
        loadedModules.set(name, { path: config.path, error: err.message, loaded: false });
      })
    );
  }

  await Promise.allSettled(promises);
  return UDT_REGISTRY;
}

/**
 * Get load status for all modules
 */
export function getLoadStatus() {
  return Object.fromEntries(loadedModules);
}

/**
 * Register a new UDT module at runtime
 */
export function registerModule(name, udts) {
  UDT_REGISTRY[name] = udts;
  loadedModules.set(name, { runtime: true, loaded: true });
}

// ============================================================================
// SYNCHRONOUS STATIC IMPORTS (for bundlers that don't support top-level await)
// ============================================================================

// Static imports for immediate availability
import * as osModule from '../../os/udts.js';
import * as coreModule from '../../core/udts.js';
import * as networkModule from '../../network/udts.js';
import * as p2pModule from '../../p2p/udts.js';
import * as syncModule from '../../sync/udts.js';
import * as protocolsModule from '../../protocols/udts.js';
import * as enterpriseModule from '../../enterprise/udts.js';
import * as llmModule from '../../llm/tools-udt.js';
import * as graphicsModule from '../graphics/udts.js';

// Try to load widgets (may not exist yet)
let widgetsModule = null;
try {
  widgetsModule = await import('../../widgets/udts.js');
} catch (e) {
  // widgets/udts.js doesn't exist yet, that's fine
}

// Populate registry with static imports
UDT_REGISTRY.os = osModule.OS_UDTS || osModule.default;
UDT_REGISTRY.core = coreModule.CORE_UDTS || coreModule.default;
UDT_REGISTRY.network = networkModule.NETWORK_UDTS || networkModule.default;
UDT_REGISTRY.p2p = p2pModule.P2P_UDTS || p2pModule.default;
UDT_REGISTRY.sync = syncModule.SYNC_UDTS || syncModule.default;
UDT_REGISTRY.protocols = protocolsModule.PROTOCOL_UDTS || protocolsModule.default;
UDT_REGISTRY.enterprise = enterpriseModule.ENTERPRISE_UDTS || enterpriseModule.default;
UDT_REGISTRY.llm = { tools: llmModule.TOOLS };
UDT_REGISTRY.graphics = {
  TYPE_MAP: graphicsModule.TYPE_MAP,
  STYLE_MAP: graphicsModule.STYLE_MAP,
  SHORTCODES: graphicsModule.SHORTCODES,
};
if (widgetsModule) {
  UDT_REGISTRY.widgets = widgetsModule.TELEPHONY_UDTS || widgetsModule.default;
}

// ============================================================================
// LOOKUP UTILITIES
// ============================================================================

/**
 * Get a UDT by path (e.g., "os.vfs.FileType" or "core.identity.Identity")
 */
export function getUDT(path) {
  const parts = path.split('.');
  let current = UDT_REGISTRY;

  for (const part of parts) {
    if (!current || typeof current !== 'object') {
      return null;
    }
    current = current[part];
  }

  return current;
}

/**
 * List all available UDT paths
 */
export function listUDTs(domain = null) {
  const paths = [];

  function traverse(obj, prefix = '') {
    for (const [key, value] of Object.entries(obj)) {
      const path = prefix ? `${prefix}.${key}` : key;

      // Check if this is a UDT (has N, C, D properties)
      if (value && typeof value === 'object' && value.N && value.C && value.D) {
        paths.push(path);
      } else if (value && typeof value === 'object' && !Array.isArray(value)) {
        traverse(value, path);
      }
    }
  }

  if (domain && UDT_REGISTRY[domain]) {
    traverse(UDT_REGISTRY[domain], domain);
  } else if (!domain) {
    traverse(UDT_REGISTRY);
  }

  return paths;
}

/**
 * List all loaded domains
 */
export function listDomains() {
  return Object.keys(UDT_REGISTRY);
}

/**
 * Search UDTs by name or description
 */
export function searchUDTs(query, options = {}) {
  const results = [];
  const q = query.toLowerCase();

  function traverse(obj, prefix = '') {
    for (const [key, value] of Object.entries(obj)) {
      const path = prefix ? `${prefix}.${key}` : key;

      if (value && typeof value === 'object' && value.N && value.C && value.D) {
        const nameMatch = value.N.toLowerCase().includes(q);
        const descMatch = value.D.toLowerCase().includes(q);
        const categoryMatch = value.C.toLowerCase().includes(q);

        if (nameMatch || descMatch || categoryMatch) {
          results.push({
            path,
            udt: value,
            matchType: nameMatch ? 'name' : (descMatch ? 'description' : 'category'),
          });
        }
      } else if (value && typeof value === 'object' && !Array.isArray(value)) {
        traverse(value, path);
      }
    }
  }

  traverse(UDT_REGISTRY);

  // Sort by relevance (name matches first)
  results.sort((a, b) => {
    if (a.matchType === 'name' && b.matchType !== 'name') return -1;
    if (a.matchType !== 'name' && b.matchType === 'name') return 1;
    return 0;
  });

  return options.limit ? results.slice(0, options.limit) : results;
}

// ============================================================================
// UNIFIED UTILITIES
// ============================================================================

/**
 * Expand any minified UDT to full form
 */
export function expandUDT(udt) {
  const result = {
    name: udt.N,
    category: udt.C,
    description: udt.D,
  };

  if (udt.V) {
    result.values = {};
    for (const [k, v] of Object.entries(udt.V)) {
      result.values[v.N] = {
        shortcode: k,
        description: v.D,
        value: v.V,
      };
    }
  }

  if (udt.P) {
    result.properties = {};
    for (const [k, p] of Object.entries(udt.P)) {
      result.properties[p.N] = {
        shortcode: k,
        type: p.T,
        description: p.D,
        required: !!p.R,
        default: p.X,
      };
    }
  }

  if (udt.X) {
    result.constants = udt.X;
  }

  return result;
}

/**
 * Minify an object using UDT property shortcodes
 */
export function minify(obj, udt) {
  if (!udt.P) return obj;

  const result = {};
  for (const [shortcode, prop] of Object.entries(udt.P)) {
    if (obj[prop.N] !== undefined) {
      result[shortcode] = obj[prop.N];
    }
  }
  return result;
}

/**
 * Expand a minified object to full property names
 */
export function expand(obj, udt) {
  if (!udt.P) return obj;

  const result = {};
  for (const [shortcode, prop] of Object.entries(udt.P)) {
    if (obj[shortcode] !== undefined) {
      result[prop.N] = obj[shortcode];
    }
  }
  return result;
}

/**
 * Validate object against UDT
 */
export function validate(obj, udt) {
  const errors = [];

  if (udt.P) {
    for (const [shortcode, prop] of Object.entries(udt.P)) {
      const value = obj[prop.N] ?? obj[shortcode];
      if (prop.R && value === undefined) {
        errors.push(`Missing required property: ${prop.N} (${shortcode})`);
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Get enum value by shortcode
 */
export function getEnumValue(udt, shortcode) {
  return udt.V?.[shortcode]?.V;
}

/**
 * Get enum shortcode by value
 */
export function getEnumShortcode(udt, value) {
  for (const [k, v] of Object.entries(udt.V || {})) {
    if (v.V === value) return k;
  }
  return null;
}

/**
 * Get all enum values from a UDT
 */
export function getEnumValues(udt) {
  if (!udt.V) return [];
  return Object.values(udt.V).map(v => v.V);
}

/**
 * Get all property names from a UDT
 */
export function getPropertyNames(udt) {
  if (!udt.P) return [];
  return Object.values(udt.P).map(p => p.N);
}

/**
 * Create a default object from UDT definition
 */
export function createDefault(udt) {
  if (!udt.P) return {};

  const result = {};
  for (const [, prop] of Object.entries(udt.P)) {
    if (prop.X !== undefined) {
      result[prop.N] = prop.X;
    }
  }
  return result;
}

// ============================================================================
// DOCUMENTATION GENERATION
// ============================================================================

/**
 * Generate markdown documentation for a UDT
 */
export function generateDocs(udt, options = {}) {
  const expanded = expandUDT(udt);
  let md = '';

  md += `## ${expanded.name}\n\n`;
  md += `**Category:** ${expanded.category}\n\n`;
  md += `${expanded.description}\n\n`;

  if (expanded.values) {
    md += '### Values\n\n';
    md += '| Shortcode | Name | Value | Description |\n';
    md += '|-----------|------|-------|-------------|\n';
    for (const [name, info] of Object.entries(expanded.values)) {
      md += `| \`${info.shortcode}\` | ${name} | \`${info.value}\` | ${info.description} |\n`;
    }
    md += '\n';
  }

  if (expanded.properties) {
    md += '### Properties\n\n';
    md += '| Shortcode | Name | Type | Required | Default | Description |\n';
    md += '|-----------|------|------|----------|---------|-------------|\n';
    for (const [name, info] of Object.entries(expanded.properties)) {
      const req = info.required ? '✓' : '';
      const def = info.default !== undefined ? `\`${JSON.stringify(info.default)}\`` : '';
      md += `| \`${info.shortcode}\` | ${name} | ${info.type} | ${req} | ${def} | ${info.description} |\n`;
    }
    md += '\n';
  }

  return md;
}

/**
 * Generate documentation for all UDTs in a domain
 */
export function generateDomainDocs(domain) {
  const udts = UDT_REGISTRY[domain];
  if (!udts) return '';

  let md = `# ${domain.toUpperCase()} UDTs\n\n`;

  function traverse(obj, prefix = '') {
    for (const [key, value] of Object.entries(obj)) {
      if (value && typeof value === 'object' && value.N && value.C && value.D) {
        md += generateDocs(value);
        md += '---\n\n';
      } else if (value && typeof value === 'object' && !Array.isArray(value)) {
        if (prefix) {
          md += `## ${key}\n\n`;
        }
        traverse(value, key);
      }
    }
  }

  traverse(udts);
  return md;
}

// ============================================================================
// NAMED EXPORTS (for backwards compatibility)
// ============================================================================

export const OS_UDTS = UDT_REGISTRY.os;
export const CORE_UDTS = UDT_REGISTRY.core;
export const NETWORK_UDTS = UDT_REGISTRY.network;
export const P2P_UDTS = UDT_REGISTRY.p2p;
export const SYNC_UDTS = UDT_REGISTRY.sync;
export const PROTOCOL_UDTS = UDT_REGISTRY.protocols;
export const ENTERPRISE_UDTS = UDT_REGISTRY.enterprise;
export const LLM_TOOLS = UDT_REGISTRY.llm?.tools;
export const TELEPHONY_UDTS = UDT_REGISTRY.widgets;
export const { TYPE_MAP, STYLE_MAP, SHORTCODES } = UDT_REGISTRY.graphics || {};

// Re-export ToolRegistry
export { ToolRegistry } from '../../llm/tools-udt.js';

// ============================================================================
// DEFAULT EXPORT
// ============================================================================

export default UDT_REGISTRY;
