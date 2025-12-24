/**
 * Perspective Graphics Exporter
 * Converts between minified tag format and Ignition JSON
 */

import { TYPE_MAP, TYPE_REVERSE, STYLE_MAP, STYLE_REVERSE } from './udts.js';
import { expandTag, minifyView } from './builder.js';

// Export formats
export const FORMAT = {
  TAG: 'tag',           // Minified tag structure
  IGNITION: 'ignition', // Full Ignition JSON
  MINI_JSON: 'mini',    // Minified JSON string
  FULL_JSON: 'full'     // Full JSON string (pretty)
};

/**
 * Export a view/component to specified format
 */
export function exportView(view, format = FORMAT.IGNITION) {
  const tagForm = view.T ? view : minifyView(view);
  const ignitionForm = view.type ? view : expandTag(view);

  switch (format) {
    case FORMAT.TAG:
      return tagForm;

    case FORMAT.IGNITION:
      return ignitionForm;

    case FORMAT.MINI_JSON:
      return JSON.stringify(tagForm);

    case FORMAT.FULL_JSON:
      return JSON.stringify(ignitionForm, null, 2);

    default:
      throw new Error(`Unknown format: ${format}`);
  }
}

/**
 * Import from Ignition JSON to tag format
 */
export function importView(json) {
  const parsed = typeof json === 'string' ? JSON.parse(json) : json;
  return minifyView(parsed);
}

/**
 * Calculate size savings from minification
 */
export function calculateSavings(ignitionJson) {
  const fullSize = JSON.stringify(ignitionJson).length;
  const miniSize = JSON.stringify(minifyView(ignitionJson)).length;
  const saved = fullSize - miniSize;
  const percent = ((saved / fullSize) * 100).toFixed(1);

  return {
    full: fullSize,
    mini: miniSize,
    saved,
    percent: `${percent}%`
  };
}

/**
 * Validate a tag structure
 */
export function validateTag(tag, errors = []) {
  if (!tag || typeof tag !== 'object') {
    errors.push('Tag must be an object');
    return { valid: false, errors };
  }

  if (!tag.T) {
    errors.push('Tag must have type (T)');
  } else if (!TYPE_MAP[tag.T] && !tag.T.startsWith('ia.')) {
    errors.push(`Unknown component type: ${tag.T}`);
  }

  // Validate children recursively
  if (tag.C) {
    if (!Array.isArray(tag.C)) {
      errors.push('Children (C) must be an array');
    } else {
      tag.C.forEach((child, i) => {
        validateTag(child, errors);
      });
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Deep clone a tag structure
 */
export function cloneTag(tag) {
  return JSON.parse(JSON.stringify(tag));
}

/**
 * Merge two tag structures
 */
export function mergeTags(base, override) {
  const result = cloneTag(base);

  if (override.P) result.P = { ...result.P, ...override.P };
  if (override.S) result.S = { ...result.S, ...override.S };
  if (override.M) result.M = { ...result.M, ...override.M };
  if (override.X) result.X = { ...result.X, ...override.X };
  if (override.U) result.U = { ...result.U, ...override.U };
  if (override.E) result.E = { ...result.E, ...override.E };
  if (override.C) result.C = override.C;

  return result;
}

/**
 * Find all components of a specific type
 */
export function findByType(tag, type, results = []) {
  const fullType = TYPE_MAP[type] || type;

  if (tag.T === type || tag.T === fullType) {
    results.push(tag);
  }

  if (tag.C) {
    tag.C.forEach(child => findByType(child, type, results));
  }

  return results;
}

/**
 * Find component by name in meta
 */
export function findByName(tag, name) {
  if (tag.M?.name === name) return tag;

  if (tag.C) {
    for (const child of tag.C) {
      const found = findByName(child, name);
      if (found) return found;
    }
  }

  return null;
}

/**
 * Transform all components with a function
 */
export function transformTag(tag, fn) {
  const transformed = fn(cloneTag(tag));

  if (transformed.C) {
    transformed.C = transformed.C.map(child => transformTag(child, fn));
  }

  return transformed;
}

/**
 * Extract all bindings from a view
 */
export function extractBindings(tag, bindings = []) {
  // Check props for binding expressions
  if (tag.P) {
    for (const [key, value] of Object.entries(tag.P)) {
      if (typeof value === 'object' && value?.binding) {
        bindings.push({
          component: tag.M?.name || 'unnamed',
          property: key,
          binding: value.binding
        });
      }
    }
  }

  if (tag.C) {
    tag.C.forEach(child => extractBindings(child, bindings));
  }

  return bindings;
}

/**
 * Create a binding object
 */
export function binding(type, config) {
  switch (type) {
    case 'tag':
      return {
        binding: {
          type: 'tag',
          config: {
            tagPath: config.path,
            mode: config.mode || 'direct',
            bidirectional: config.bidirectional || false
          }
        }
      };

    case 'expr':
      return {
        binding: {
          type: 'expr',
          config: {
            expression: config.expression
          }
        }
      };

    case 'prop':
      return {
        binding: {
          type: 'property',
          config: {
            path: config.path
          }
        }
      };

    case 'query':
      return {
        binding: {
          type: 'query',
          config: {
            queryPath: config.path,
            parameters: config.params || {}
          }
        }
      };

    default:
      return { binding: { type, config } };
  }
}

/**
 * Generate TypeScript/JS type definitions from UDTs
 */
export function generateTypes(udts) {
  const lines = ['// Auto-generated Perspective component types\n'];

  for (const [name, udt] of Object.entries(udts)) {
    lines.push(`export interface ${name} {`);

    if (udt.members) {
      for (const [member, def] of Object.entries(udt.members)) {
        const tsType = mapType(def.type);
        lines.push(`  ${member}: ${tsType};`);
      }
    }

    lines.push('}\n');
  }

  return lines.join('\n');
}

function mapType(ignitionType) {
  const map = {
    'String': 'string',
    'Int4': 'number',
    'Int8': 'number',
    'Float4': 'number',
    'Float8': 'number',
    'Boolean': 'boolean',
    'Bool': 'boolean',
    'DateTime': 'Date | string',
    'JSON': 'Record<string, any>',
    'Array': 'any[]',
    'Component': 'TagComponent'
  };
  return map[ignitionType] || 'any';
}

/**
 * Compress tag for storage/transmission
 */
export function compress(tag) {
  const json = JSON.stringify(tag);
  // Use base64 encoding for simple compression
  // In a real implementation, use LZ-string or similar
  return btoa(json);
}

/**
 * Decompress tag
 */
export function decompress(compressed) {
  const json = atob(compressed);
  return JSON.parse(json);
}

/**
 * Create a view resource bundle (for Ignition project export)
 */
export function createViewBundle(view, path) {
  const ignitionView = view.T ? expandTag(view) : view;

  return {
    path: path,
    'view.json': JSON.stringify(ignitionView, null, 2),
    'resource.json': JSON.stringify({
      scope: 'G',
      version: 1,
      documentation: '',
      locked: false,
      attributes: {
        lastModification: {
          actor: 'kp2p',
          timestamp: new Date().toISOString()
        }
      }
    }, null, 2)
  };
}

/**
 * Parse a view bundle back to tag format
 */
export function parseViewBundle(bundle) {
  const viewJson = JSON.parse(bundle['view.json']);
  return minifyView(viewJson);
}

/**
 * Diff two tag structures
 */
export function diffTags(a, b, path = '') {
  const diffs = [];

  // Compare type
  if (a.T !== b.T) {
    diffs.push({ path: `${path}.T`, from: a.T, to: b.T });
  }

  // Compare objects
  for (const key of ['P', 'S', 'M', 'X', 'U', 'E']) {
    const aVal = a[key] || {};
    const bVal = b[key] || {};

    for (const prop of new Set([...Object.keys(aVal), ...Object.keys(bVal)])) {
      if (JSON.stringify(aVal[prop]) !== JSON.stringify(bVal[prop])) {
        diffs.push({
          path: `${path}.${key}.${prop}`,
          from: aVal[prop],
          to: bVal[prop]
        });
      }
    }
  }

  // Compare children
  const maxChildren = Math.max(a.C?.length || 0, b.C?.length || 0);
  for (let i = 0; i < maxChildren; i++) {
    if (!a.C?.[i]) {
      diffs.push({ path: `${path}.C[${i}]`, from: undefined, to: b.C[i] });
    } else if (!b.C?.[i]) {
      diffs.push({ path: `${path}.C[${i}]`, from: a.C[i], to: undefined });
    } else {
      diffs.push(...diffTags(a.C[i], b.C[i], `${path}.C[${i}]`));
    }
  }

  return diffs;
}
