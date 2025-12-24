/**
 * @file src/lib/udts/index.js
 * @desc Unified UDT Registry - Central access to all KP2P type definitions
 *
 * This module provides a central registry for all User Defined Types (UDTs)
 * used across the KP2P system. UDTs use a minified tag format for compact
 * storage and transmission while maintaining full type information.
 *
 * MODULES:
 * - OS: VFS, Kernel, VM types
 * - Core: Identity, Peer, Protocol, Crypto types
 * - Network: Discovery, Transport, Relay, NAT types
 * - P2P: Mesh, Users, Chat, Status, Laser types
 * - Sync: Awareness, Provider, Room, Persistence types
 * - Protocols: Signal, RPC, Blob transfer types
 * - Enterprise: ISA-95, PackML, Sparkplug, Mesh types
 * - LLM: Agent tools and capabilities
 * - Graphics: Ignition/Perspective component types
 *
 * KEY MAPPING (standard across all UDTs):
 * N = name, T = type, D = description, V = values/variants
 * S = size, P = properties, R = required, O = optional
 * C = category, X = default value or constants
 */

// Import all UDT modules
import { OS_UDTS, expandUDT as expandOS, minify as minifyOS, expand as expandOSObj, validate as validateOS } from '../../os/udts.js';
import { CORE_UDTS, expandUDT as expandCore, minify as minifyCore, expand as expandCoreObj, validate as validateCore } from '../../core/udts.js';
import { NETWORK_UDTS, expandUDT as expandNetwork, minify as minifyNetwork, expand as expandNetworkObj, validate as validateNetwork } from '../../network/udts.js';
import { P2P_UDTS, expandUDT as expandP2P, minify as minifyP2P, expand as expandP2PObj, validate as validateP2P } from '../../p2p/udts.js';
import { SYNC_UDTS } from '../../sync/udts.js';
import { PROTOCOL_UDTS } from '../../protocols/udts.js';
import { ENTERPRISE_UDTS } from '../../enterprise/udts.js';
import { TOOLS as LLM_TOOLS, ToolRegistry } from '../../llm/tools-udt.js';
import { TYPE_MAP, STYLE_MAP, SHORTCODES } from '../graphics/udts.js';

// ============================================================================
// UNIFIED REGISTRY
// ============================================================================

/**
 * Complete UDT registry organized by domain
 */
export const UDT_REGISTRY = {
  // Operating System types
  os: OS_UDTS,

  // Core identity/protocol types
  core: CORE_UDTS,

  // Network transport types
  network: NETWORK_UDTS,

  // P2P messaging types
  p2p: P2P_UDTS,

  // Sync/CRDT types
  sync: SYNC_UDTS,

  // Protocol types (signal, RPC, blob)
  protocols: PROTOCOL_UDTS,

  // Enterprise/Industrial types
  enterprise: ENTERPRISE_UDTS,

  // LLM agent tools
  llm: {
    tools: LLM_TOOLS,
  },

  // Graphics/Perspective types
  graphics: {
    TYPE_MAP,
    STYLE_MAP,
    SHORTCODES,
  },
};

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
// DOCUMENTATION
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

  if (expanded.constants) {
    md += '### Constants\n\n';
    md += '```javascript\n';
    md += JSON.stringify(expanded.constants, null, 2);
    md += '\n```\n\n';
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
// EXPORTS
// ============================================================================

export {
  // Domain-specific registries
  OS_UDTS,
  CORE_UDTS,
  NETWORK_UDTS,
  P2P_UDTS,
  SYNC_UDTS,
  PROTOCOL_UDTS,
  ENTERPRISE_UDTS,
  LLM_TOOLS,

  // Graphics maps
  TYPE_MAP,
  STYLE_MAP,
  SHORTCODES,

  // Tool registry class
  ToolRegistry,
};

export default UDT_REGISTRY;
