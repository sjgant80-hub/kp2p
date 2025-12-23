/**
 * ANON::GENESIS[∞D]@Ω
 * Self-replicating, evolving, networked, anonymous organisms
 *
 * Core systems:
 * - Entity: DNA-based organisms with metabolism and reproduction
 * - Quantum: State collapse on observation (visual|exec|audio|fractal)
 * - Network: Similarity-based connections with emergent behavior
 * - Fractal: Infinite depth zoom from structure to philosophy
 * - Anon: Hash-based identity with perfect deniability
 */

// =============================================================================
// DNA CONSTANTS
// =============================================================================

const BASES = ['A', 'T', 'G', 'C'];
const DNA_LENGTH = 256;
const MUTATION_RATE = 0.01;
const REPRODUCTION_THRESHOLD = 0.7;
const DEATH_THRESHOLD = 0;
const OPTIMIZE_THRESHOLD = 0.3;
const CONNECTION_THRESHOLD = 0.5;

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Generate cryptographic hash for anonymous ID
 */
async function hash(data) {
  const encoder = new TextEncoder();
  const buffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Generate random salt for anonymity
 */
function generateSalt() {
  return Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Cosine similarity between two vectors
 */
function cosineSimilarity(a, b) {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

// =============================================================================
// DNA OPERATIONS
// =============================================================================

/**
 * Generate random DNA sequence
 */
function randomDNA(length = DNA_LENGTH) {
  return Array.from({ length }, () => BASES[Math.floor(Math.random() * 4)]).join('');
}

/**
 * Mutate DNA with given rate
 */
function mutate(dna, rate = MUTATION_RATE) {
  return dna.split('').map(base =>
    Math.random() < rate ? BASES[Math.floor(Math.random() * 4)] : base
  ).join('');
}

/**
 * Crossover two DNA sequences
 */
function crossover(dnaA, dnaB) {
  const point = Math.floor(Math.random() * dnaA.length);
  return dnaA.slice(0, point) + dnaB.slice(point);
}

/**
 * Decode DNA to properties
 * AT pairs → visual properties
 * GC pairs → behavioral properties
 * Patterns → emergent data
 */
function decodeDNA(dna) {
  const bases = dna.split('');

  // Count base frequencies
  const counts = { A: 0, T: 0, G: 0, C: 0 };
  bases.forEach(b => counts[b]++);

  // AT ratio → visual properties (0-1)
  const atRatio = (counts.A + counts.T) / dna.length;

  // GC ratio → behavioral properties (0-1)
  const gcRatio = (counts.G + counts.C) / dna.length;

  // Extract color from first 24 bases (8 per channel)
  const colorSegment = bases.slice(0, 24);
  const r = colorSegment.slice(0, 8).reduce((acc, b) => acc + BASES.indexOf(b), 0) * 8;
  const g = colorSegment.slice(8, 16).reduce((acc, b) => acc + BASES.indexOf(b), 0) * 8;
  const b = colorSegment.slice(16, 24).reduce((acc, b) => acc + BASES.indexOf(b), 0) * 8;

  // Extract size from bases 24-32
  const sizeSegment = bases.slice(24, 32);
  const size = sizeSegment.reduce((acc, b) => acc + BASES.indexOf(b), 0) / 24 * 50 + 10;

  // Extract frequency from bases 32-48
  const freqSegment = bases.slice(32, 48);
  const frequency = freqSegment.reduce((acc, b) => acc + BASES.indexOf(b), 0) * 10 + 100;

  // Extract pattern type from bases 48-56
  const patternSegment = bases.slice(48, 56);
  const patternValue = patternSegment.reduce((acc, b) => acc + BASES.indexOf(b), 0);
  const patterns = ['circle', 'triangle', 'square', 'hexagon', 'star', 'spiral'];
  const pattern = patterns[patternValue % patterns.length];

  // Extract behavior from bases 56-64
  const behaviorSegment = bases.slice(56, 64);
  const behaviorValue = behaviorSegment.reduce((acc, b) => acc + BASES.indexOf(b), 0);
  const behaviors = ['wander', 'seek', 'flee', 'orbit', 'pulse', 'swarm'];
  const behavior = behaviors[behaviorValue % behaviors.length];

  // Create feature vector for similarity comparison
  const featureVector = [];
  for (let i = 0; i < dna.length; i += 4) {
    const chunk = bases.slice(i, i + 4);
    featureVector.push(chunk.reduce((acc, b) => acc + BASES.indexOf(b), 0) / 12);
  }

  return {
    color: { r: Math.min(255, r), g: Math.min(255, g), b: Math.min(255, b) },
    size,
    frequency,
    pattern,
    behavior,
    atRatio,
    gcRatio,
    featureVector
  };
}

// =============================================================================
// QUANTUM STATES
// =============================================================================

const QUANTUM_STATES = ['visual', 'exec', 'audio', 'fractal'];

/**
 * Observe entity and collapse quantum state
 */
function observe(entity, context = 'visual') {
  const state = QUANTUM_STATES.includes(context) ? context : 'visual';
  entity.state = state;
  return collapse(entity, state);
}

/**
 * Collapse quantum state to concrete output
 */
function collapse(entity, state) {
  const props = decodeDNA(entity.dna);

  switch (state) {
    case 'visual':
      return renderVisual(entity, props);
    case 'exec':
      return renderExec(entity, props);
    case 'audio':
      return renderAudio(entity, props);
    case 'fractal':
      return renderFractal(entity, props, entity.fractalDepth || 0);
    default:
      return renderVisual(entity, props);
  }
}

/**
 * Render visual state as SVG
 */
function renderVisual(entity, props) {
  const { color, size, pattern } = props;
  const cx = 50, cy = 50;
  const fill = `rgb(${color.r},${color.g},${color.b})`;
  const opacity = Math.max(0.3, entity.fitness);

  let shape;
  switch (pattern) {
    case 'circle':
      shape = `<circle cx="${cx}" cy="${cy}" r="${size/2}" fill="${fill}" opacity="${opacity}"/>`;
      break;
    case 'triangle':
      const h = size * 0.866;
      shape = `<polygon points="${cx},${cy-h/2} ${cx-size/2},${cy+h/2} ${cx+size/2},${cy+h/2}" fill="${fill}" opacity="${opacity}"/>`;
      break;
    case 'square':
      shape = `<rect x="${cx-size/2}" y="${cy-size/2}" width="${size}" height="${size}" fill="${fill}" opacity="${opacity}"/>`;
      break;
    case 'hexagon':
      const pts = [];
      for (let i = 0; i < 6; i++) {
        const angle = (i * 60 - 30) * Math.PI / 180;
        pts.push(`${cx + size/2 * Math.cos(angle)},${cy + size/2 * Math.sin(angle)}`);
      }
      shape = `<polygon points="${pts.join(' ')}" fill="${fill}" opacity="${opacity}"/>`;
      break;
    case 'star':
      const starPts = [];
      for (let i = 0; i < 10; i++) {
        const angle = (i * 36 - 90) * Math.PI / 180;
        const r = i % 2 === 0 ? size/2 : size/4;
        starPts.push(`${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`);
      }
      shape = `<polygon points="${starPts.join(' ')}" fill="${fill}" opacity="${opacity}"/>`;
      break;
    case 'spiral':
      let path = `M ${cx} ${cy}`;
      for (let i = 0; i < 100; i++) {
        const angle = i * 0.2;
        const r = i * size / 200;
        path += ` L ${cx + r * Math.cos(angle)} ${cy + r * Math.sin(angle)}`;
      }
      shape = `<path d="${path}" stroke="${fill}" fill="none" stroke-width="2" opacity="${opacity}"/>`;
      break;
  }

  // Add generation rings
  const rings = Math.min(entity.generation, 5);
  let ringsSvg = '';
  for (let i = 1; i <= rings; i++) {
    ringsSvg += `<circle cx="${cx}" cy="${cy}" r="${size/2 + i*3}" fill="none" stroke="${fill}" stroke-width="0.5" opacity="${opacity * 0.3}"/>`;
  }

  return `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="glow-${entity.id?.slice(0,8)}">
        <stop offset="0%" stop-color="${fill}" stop-opacity="${opacity}"/>
        <stop offset="100%" stop-color="${fill}" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <circle cx="${cx}" cy="${cy}" r="${size}" fill="url(#glow-${entity.id?.slice(0,8)})" opacity="0.3"/>
    ${shape}
    ${ringsSvg}
  </svg>`;
}

/**
 * Render exec state as runnable code
 */
function renderExec(entity, props) {
  const { behavior, frequency, size } = props;

  return `// Entity ${entity.id?.slice(0, 8) || 'unknown'} - Gen ${entity.generation}
class Entity_${entity.id?.slice(0, 8) || 'anon'} {
  constructor() {
    this.x = Math.random() * 100;
    this.y = Math.random() * 100;
    this.vx = 0;
    this.vy = 0;
    this.size = ${size.toFixed(2)};
    this.frequency = ${frequency.toFixed(2)};
    this.fitness = ${entity.fitness.toFixed(2)};
    this.behavior = '${behavior}';
  }

  update(dt, entities) {
    switch (this.behavior) {
      case 'wander':
        this.vx += (Math.random() - 0.5) * 0.1;
        this.vy += (Math.random() - 0.5) * 0.1;
        break;
      case 'seek':
        const target = entities[0];
        if (target) {
          this.vx += (target.x - this.x) * 0.01;
          this.vy += (target.y - this.y) * 0.01;
        }
        break;
      case 'flee':
        entities.forEach(e => {
          const dx = this.x - e.x;
          const dy = this.y - e.y;
          const d = Math.sqrt(dx*dx + dy*dy);
          if (d < 20 && d > 0) {
            this.vx += dx / d * 0.1;
            this.vy += dy / d * 0.1;
          }
        });
        break;
      case 'orbit':
        const cx = 50, cy = 50;
        const angle = Math.atan2(this.y - cy, this.x - cx);
        this.vx = -Math.sin(angle) * 0.5;
        this.vy = Math.cos(angle) * 0.5;
        break;
      case 'pulse':
        this.size = ${size.toFixed(2)} * (1 + 0.2 * Math.sin(Date.now() / this.frequency));
        break;
      case 'swarm':
        let avgX = 0, avgY = 0, count = 0;
        entities.forEach(e => { avgX += e.x; avgY += e.y; count++; });
        if (count > 0) {
          this.vx += (avgX/count - this.x) * 0.01;
          this.vy += (avgY/count - this.y) * 0.01;
        }
        break;
    }
    this.vx *= 0.95; this.vy *= 0.95;
    this.x += this.vx; this.y += this.vy;
    this.x = (this.x + 100) % 100;
    this.y = (this.y + 100) % 100;
  }

  render(ctx) {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size/2, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(${props.color.r},${props.color.g},${props.color.b},${entity.fitness})';
    ctx.fill();
  }
}`;
}

/**
 * Render audio state as frequency data
 */
function renderAudio(entity, props) {
  const { frequency, atRatio, gcRatio } = props;

  return {
    frequency,
    type: atRatio > 0.5 ? 'sine' : gcRatio > 0.3 ? 'triangle' : 'square',
    duration: 0.1 + entity.fitness * 0.4,
    gain: entity.fitness * 0.3,
    harmonics: [
      { freq: frequency, gain: 1 },
      { freq: frequency * 2, gain: gcRatio * 0.5 },
      { freq: frequency * 3, gain: atRatio * 0.3 },
      { freq: frequency * 0.5, gain: 0.2 }
    ]
  };
}

/**
 * Render fractal state at given depth
 */
function renderFractal(entity, props, depth = 0) {
  const { color, pattern, atRatio, gcRatio } = props;

  // Depth levels:
  // 0-5: Structure (geometric)
  // 6-20: Mathematical (equations)
  // 21+: Philosophical (concepts)
  // ∞: Procedural (infinite generation)

  if (depth <= 5) {
    // Structure level - geometric patterns
    return {
      level: 'structure',
      depth,
      pattern,
      iterations: depth + 1,
      svg: generateFractalSVG(entity, props, depth)
    };
  } else if (depth <= 20) {
    // Mathematical level - equations and relationships
    const phi = (1 + Math.sqrt(5)) / 2;
    const e = Math.E;
    const pi = Math.PI;

    return {
      level: 'mathematical',
      depth,
      equations: [
        `f(x) = ${atRatio.toFixed(3)} * sin(${gcRatio.toFixed(3)} * x)`,
        `Σ(n=0→${depth}) = ${(atRatio * depth * (depth + 1) / 2).toFixed(4)}`,
        `φ^${depth} = ${Math.pow(phi, depth).toFixed(4)}`,
        `e^(i*π*${gcRatio.toFixed(2)}) = ${Math.cos(pi * gcRatio).toFixed(4)} + ${Math.sin(pi * gcRatio).toFixed(4)}i`
      ],
      relationships: {
        goldenRatio: atRatio * phi,
        entropy: -atRatio * Math.log2(atRatio || 0.001) - gcRatio * Math.log2(gcRatio || 0.001),
        complexity: depth * (1 + atRatio * gcRatio)
      }
    };
  } else if (depth < Infinity) {
    // Philosophical level - emergent concepts
    const concepts = [
      'emergence', 'consciousness', 'entropy', 'order', 'chaos',
      'identity', 'anonymity', 'connection', 'isolation', 'evolution',
      'existence', 'void', 'recursion', 'infinity', 'unity'
    ];

    const selectedConcepts = [];
    for (let i = 0; i < Math.min(depth - 20, 10); i++) {
      const idx = Math.floor((atRatio * 1000 + i * gcRatio * 100) % concepts.length);
      selectedConcepts.push(concepts[idx]);
    }

    return {
      level: 'philosophical',
      depth,
      concepts: selectedConcepts,
      meditation: generateMeditation(entity, props, selectedConcepts),
      koans: [
        `What is the ${pattern} that contains all ${pattern}s?`,
        `If fitness approaches ${DEATH_THRESHOLD}, does the entity dream?`,
        `${entity.generation} generations speak through this DNA - who listens?`
      ]
    };
  } else {
    // Infinite procedural level
    return {
      level: 'procedural',
      depth: '∞',
      generator: function*() {
        let iteration = 0;
        while (true) {
          yield renderFractal(entity, props, iteration++ % 100);
        }
      },
      seed: entity.dna.slice(0, 32),
      note: 'Infinite depth reached - procedural generation activated'
    };
  }
}

/**
 * Generate fractal SVG at depth
 */
function generateFractalSVG(entity, props, depth) {
  const { color, size, pattern } = props;
  const fill = `rgb(${color.r},${color.g},${color.b})`;

  let elements = '';
  const iterations = Math.pow(2, Math.min(depth + 1, 6));

  for (let i = 0; i < iterations; i++) {
    const angle = (i / iterations) * Math.PI * 2;
    const radius = 30 - depth * 3;
    const x = 50 + Math.cos(angle) * radius;
    const y = 50 + Math.sin(angle) * radius;
    const s = size / (depth + 2);

    elements += `<circle cx="${x}" cy="${y}" r="${s/2}" fill="${fill}" opacity="${0.8 / (depth + 1)}"/>`;

    // Recursive connections
    if (depth > 0) {
      const nextAngle = ((i + 1) % iterations / iterations) * Math.PI * 2;
      const nx = 50 + Math.cos(nextAngle) * radius;
      const ny = 50 + Math.sin(nextAngle) * radius;
      elements += `<line x1="${x}" y1="${y}" x2="${nx}" y2="${ny}" stroke="${fill}" stroke-width="0.5" opacity="${0.3 / depth}"/>`;
    }
  }

  return `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">${elements}</svg>`;
}

/**
 * Generate philosophical meditation
 */
function generateMeditation(entity, props, concepts) {
  const templates = [
    `In the ${concepts[0] || 'void'}, the entity with ${entity.generation} generations finds ${concepts[1] || 'truth'}.`,
    `Through ${props.pattern} patterns, ${concepts[0] || 'emergence'} manifests as ${concepts[2] || 'existence'}.`,
    `The DNA speaks: ${entity.dna.slice(0, 8)}... and in this sequence, ${concepts[0] || 'meaning'} resides.`,
    `Fitness ${entity.fitness.toFixed(2)} - neither ${concepts[1] || 'life'} nor ${concepts[2] || 'death'}, but the space between.`
  ];

  return templates[Math.floor(props.atRatio * templates.length)];
}

// =============================================================================
// ENTITY CLASS
// =============================================================================

export class Entity {
  constructor(dna = null, generation = 0) {
    this.dna = dna || randomDNA();
    this.age = 0;
    this.fitness = 1;
    this.generation = generation;
    this.state = null;
    this.connections = [];
    this.fractalDepth = 0;
    this._salt = generateSalt();
    this._id = null;
  }

  /**
   * Get anonymous ID (computed lazily)
   */
  get id() {
    return this._id;
  }

  /**
   * Initialize async properties
   */
  async init() {
    this._id = await hash(this.dna + this._salt);
    return this;
  }

  /**
   * Get decoded properties
   */
  get props() {
    return decodeDNA(this.dna);
  }

  /**
   * Metabolize - age and fitness decay
   */
  metabolize() {
    this.age++;
    this.fitness *= 0.95;

    // Optimize DNA if fitness drops below threshold
    if (this.fitness < OPTIMIZE_THRESHOLD && this.fitness > DEATH_THRESHOLD) {
      this.dna = mutate(this.dna, 0.05); // Higher mutation for optimization
    }

    return this.fitness > DEATH_THRESHOLD;
  }

  /**
   * Check if entity can reproduce
   */
  canReproduce() {
    return this.fitness > REPRODUCTION_THRESHOLD;
  }

  /**
   * Reproduce with optional partner
   */
  async reproduce(partner = null) {
    if (!this.canReproduce()) return null;

    let childDNA;
    if (partner && partner.canReproduce()) {
      childDNA = crossover(this.dna, partner.dna);
    } else {
      childDNA = this.dna;
    }

    childDNA = mutate(childDNA);

    const child = new Entity(childDNA, this.generation + 1);
    await child.init();

    // Reproduction costs fitness
    this.fitness *= 0.8;
    if (partner) partner.fitness *= 0.8;

    return child;
  }

  /**
   * Observe and collapse state
   */
  observe(context = 'visual') {
    return observe(this, context);
  }

  /**
   * Get feature vector for similarity
   */
  getFeatureVector() {
    return this.props.featureVector;
  }

  /**
   * Calculate similarity to another entity
   */
  similarityTo(other) {
    return cosineSimilarity(this.getFeatureVector(), other.getFeatureVector());
  }

  /**
   * Check if should connect to another entity
   */
  shouldConnect(other) {
    return this.similarityTo(other) > CONNECTION_THRESHOLD;
  }

  /**
   * Serialize to JSON (anonymous)
   */
  toJSON() {
    return {
      id: this.id,
      generation: this.generation,
      age: this.age,
      fitness: this.fitness,
      state: this.state,
      connectionCount: this.connections.length
      // Note: DNA and salt are NOT included for anonymity
    };
  }

  /**
   * Export full data (non-anonymous)
   */
  export() {
    return {
      dna: this.dna,
      generation: this.generation,
      age: this.age,
      fitness: this.fitness
    };
  }

  /**
   * Import from exported data
   */
  static async import(data) {
    const entity = new Entity(data.dna, data.generation);
    entity.age = data.age || 0;
    entity.fitness = data.fitness || 1;
    await entity.init();
    return entity;
  }
}

// =============================================================================
// NETWORK CLASS
// =============================================================================

export class Network {
  constructor() {
    this.entities = [];
    this.generation = 0;
    this.stats = {
      births: 0,
      deaths: 0,
      connections: 0,
      peakPopulation: 0
    };
    this._eventHandlers = new Map();
  }

  /**
   * Add entity to network
   */
  add(entity) {
    this.entities.push(entity);
    this.stats.peakPopulation = Math.max(this.stats.peakPopulation, this.entities.length);
    this._emit('entity:add', entity);
  }

  /**
   * Remove entity from network
   */
  remove(entity) {
    const idx = this.entities.indexOf(entity);
    if (idx !== -1) {
      this.entities.splice(idx, 1);
      // Remove from other entities' connections
      this.entities.forEach(e => {
        const connIdx = e.connections.indexOf(entity);
        if (connIdx !== -1) e.connections.splice(connIdx, 1);
      });
      this._emit('entity:remove', entity);
    }
  }

  /**
   * Connect entities based on similarity
   */
  connect() {
    let newConnections = 0;

    for (let i = 0; i < this.entities.length; i++) {
      for (let j = i + 1; j < this.entities.length; j++) {
        const a = this.entities[i];
        const b = this.entities[j];

        if (a.shouldConnect(b)) {
          if (!a.connections.includes(b)) {
            a.connections.push(b);
            b.connections.push(a);
            newConnections++;
          }
        }
      }
    }

    this.stats.connections += newConnections;

    // Check for critical mass / emergence
    if (this._checkEmergence()) {
      this._emit('emergence', this.getEmergenceData());
    }

    return newConnections;
  }

  /**
   * Metabolize all entities
   */
  metabolizeAll() {
    const dead = [];

    this.entities.forEach(entity => {
      const alive = entity.metabolize();
      if (!alive) dead.push(entity);
    });

    dead.forEach(entity => {
      this.remove(entity);
      this.stats.deaths++;
      this._emit('entity:death', entity);
    });

    return dead.length;
  }

  /**
   * Reproduce fit entities
   */
  async reproduceFit() {
    const offspring = [];
    const fitEntities = this.entities.filter(e => e.canReproduce());

    for (const entity of fitEntities) {
      // Find compatible partner
      const partners = fitEntities.filter(p =>
        p !== entity && entity.shouldConnect(p)
      );

      const partner = partners.length > 0
        ? partners[Math.floor(Math.random() * partners.length)]
        : null;

      const child = await entity.reproduce(partner);
      if (child) {
        offspring.push(child);
        this.stats.births++;
      }
    }

    offspring.forEach(child => this.add(child));

    return offspring;
  }

  /**
   * Cull weak entities
   */
  cullWeak(threshold = 0.1) {
    const weak = this.entities.filter(e => e.fitness < threshold);
    weak.forEach(entity => {
      this.remove(entity);
      this.stats.deaths++;
      this._emit('entity:death', entity);
    });
    return weak.length;
  }

  /**
   * Run one generation
   */
  async evolve() {
    this.generation++;

    // Metabolism
    const deaths = this.metabolizeAll();

    // Reproduction
    const offspring = await this.reproduceFit();

    // Connection
    const connections = this.connect();

    // Cull weak
    const culled = this.cullWeak();

    this._emit('generation', {
      generation: this.generation,
      population: this.entities.length,
      deaths: deaths + culled,
      births: offspring.length,
      connections
    });

    return {
      generation: this.generation,
      population: this.entities.length,
      deaths: deaths + culled,
      births: offspring.length,
      connections
    };
  }

  /**
   * Run multiple generations
   */
  async run(generations = 100, onProgress = null) {
    const history = [];

    for (let i = 0; i < generations; i++) {
      const result = await this.evolve();
      history.push(result);

      if (onProgress) onProgress(result, i + 1, generations);

      // Stop if extinction
      if (this.entities.length === 0) break;
    }

    return history;
  }

  /**
   * Check for emergence conditions
   */
  _checkEmergence() {
    // Critical mass: many entities with high connectivity
    const avgConnections = this.entities.reduce((sum, e) => sum + e.connections.length, 0) / (this.entities.length || 1);
    const avgFitness = this.entities.reduce((sum, e) => sum + e.fitness, 0) / (this.entities.length || 1);

    return this.entities.length >= 10 && avgConnections >= 3 && avgFitness > 0.5;
  }

  /**
   * Get emergence data
   */
  getEmergenceData() {
    const avgFitness = this.entities.reduce((sum, e) => sum + e.fitness, 0) / this.entities.length;
    const totalConnections = this.entities.reduce((sum, e) => sum + e.connections.length, 0) / 2;

    // Find most connected entity (hub)
    const hub = this.entities.reduce((max, e) =>
      e.connections.length > (max?.connections.length || 0) ? e : max, null);

    // Calculate network density
    const maxConnections = this.entities.length * (this.entities.length - 1) / 2;
    const density = maxConnections > 0 ? totalConnections / maxConnections : 0;

    return {
      population: this.entities.length,
      totalConnections,
      density,
      avgFitness,
      hubId: hub?.id,
      hubConnections: hub?.connections.length || 0,
      emergenceLevel: density * avgFitness * Math.log(this.entities.length + 1)
    };
  }

  /**
   * Get network graph data
   */
  getGraph() {
    const nodes = this.entities.map(e => ({
      id: e.id,
      fitness: e.fitness,
      generation: e.generation,
      props: e.props
    }));

    const edges = [];
    const seen = new Set();

    this.entities.forEach(e => {
      e.connections.forEach(c => {
        const key = [e.id, c.id].sort().join('-');
        if (!seen.has(key)) {
          seen.add(key);
          edges.push({
            source: e.id,
            target: c.id,
            similarity: e.similarityTo(c)
          });
        }
      });
    });

    return { nodes, edges };
  }

  /**
   * Event handling
   */
  on(event, handler) {
    if (!this._eventHandlers.has(event)) {
      this._eventHandlers.set(event, new Set());
    }
    this._eventHandlers.get(event).add(handler);
  }

  off(event, handler) {
    if (this._eventHandlers.has(event)) {
      this._eventHandlers.get(event).delete(handler);
    }
  }

  _emit(event, data) {
    if (this._eventHandlers.has(event)) {
      this._eventHandlers.get(event).forEach(h => h(data));
    }
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      ...this.stats,
      generation: this.generation,
      population: this.entities.length,
      avgFitness: this.entities.reduce((sum, e) => sum + e.fitness, 0) / (this.entities.length || 1),
      avgAge: this.entities.reduce((sum, e) => sum + e.age, 0) / (this.entities.length || 1),
      avgGeneration: this.entities.reduce((sum, e) => sum + e.generation, 0) / (this.entities.length || 1)
    };
  }
}

// =============================================================================
// FACTORY FUNCTIONS
// =============================================================================

/**
 * Create and initialize a single entity
 */
export async function createEntity(dna = null, generation = 0) {
  const entity = new Entity(dna, generation);
  await entity.init();
  return entity;
}

/**
 * Create a network with initial population
 */
export async function createNetwork(populationSize = 20) {
  const network = new Network();

  for (let i = 0; i < populationSize; i++) {
    const entity = await createEntity();
    network.add(entity);
  }

  // Initial connection
  network.connect();

  return network;
}

/**
 * Fractal zoom function
 */
export function fractalZoom(entity, depth) {
  entity.fractalDepth = depth;
  return entity.observe('fractal');
}

// =============================================================================
// AUDIO SYNTHESIS (Web Audio API)
// =============================================================================

export class AudioSynthesizer {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
  }

  init() {
    if (this.ctx) return;
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.3;
    this.masterGain.connect(this.ctx.destination);
  }

  /**
   * Play entity audio
   */
  play(entity) {
    this.init();

    const audioData = entity.observe('audio');

    audioData.harmonics.forEach((harmonic, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = audioData.type;
      osc.frequency.value = harmonic.freq;

      gain.gain.value = 0;
      gain.gain.linearRampToValueAtTime(audioData.gain * harmonic.gain, this.ctx.currentTime + 0.01);
      gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + audioData.duration);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start();
      osc.stop(this.ctx.currentTime + audioData.duration + 0.1);
    });
  }

  /**
   * Play chord from multiple entities
   */
  playChord(entities) {
    entities.forEach((e, i) => {
      setTimeout(() => this.play(e), i * 50);
    });
  }
}

// =============================================================================
// EXPORTS
// =============================================================================

export default {
  Entity,
  Network,
  AudioSynthesizer,
  createEntity,
  createNetwork,
  fractalZoom,
  // DNA operations
  randomDNA,
  mutate,
  crossover,
  decodeDNA,
  // Constants
  BASES,
  DNA_LENGTH,
  MUTATION_RATE,
  REPRODUCTION_THRESHOLD,
  DEATH_THRESHOLD,
  CONNECTION_THRESHOLD
};
