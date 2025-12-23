/**
 * @file src/games/lib/GameEngine.js
 * @desc Base game engine with THREE.js for GitFox-style space combat games
 *       Eliminates ~300 lines of boilerplate per game file
 */

import { T } from './utils.js';

/**
 * Ship configuration presets
 */
export const ShipPresets = {
  gitfox: {
    bodyColor: 0xcccccc,
    wingColor: 0x00ff00,
    cockpitColor: 0x00ff88,
    cockpitEmissive: 0x004422,
    engineGlow: 0x00aaff,
    hasVerticalFins: false
  },
  amazon: {
    bodyColor: 0x333333,
    wingColor: 0xff6600,
    cockpitColor: 0xff4400,
    cockpitEmissive: 0x441100,
    engineGlow: 0xff6600,
    hasVerticalFins: true
  },
  enemy: {
    bodyColor: 0x444444,
    wingColor: 0xff0000,
    cockpitColor: 0xff0044,
    cockpitEmissive: 0x440011,
    engineGlow: 0xff4400,
    hasVerticalFins: false
  }
};

/**
 * Base Game Engine
 * Provides core functionality for 3D space combat games
 */
export class GameEngine {
  constructor(canvasId, options = {}) {
    this.canvasId = canvasId;
    this.options = {
      clearColor: options.clearColor || 0x050510,
      fov: options.fov || 60,
      cameraPosition: options.cameraPosition || { x: 0, y: 20, z: 40 },
      ambientLight: options.ambientLight || 0x222244,
      ambientIntensity: options.ambientIntensity || 0.5,
      sunColor: options.sunColor || 0xffffee,
      sunIntensity: options.sunIntensity || 0.8,
      sunPosition: options.sunPosition || { x: 100, y: 50, z: 50 },
      starCount: options.starCount || 3000,
      ...options
    };

    // Core game state
    this.shield = 100;
    this.boost = 100;
    this.score = 0;
    this.kills = 0;
    this.dead = false;
    this.invincible = 0;
    this.respawnTimer = 0;

    // Barrel roll state
    this.barrelRolling = false;
    this.barrelRollTimer = 0;

    // Collections
    this.bullets = [];
    this.remoteBullets = [];
    this.particles = [];
    this.entities = [];

    // Ship position (normalized -1 to 1)
    this.shipX = 0;
    this.shipY = 0;
    this.shipTargetX = 0;
    this.shipTargetY = 0;

    // Input state
    this.mouse = { x: 0, y: 0, locked: false };
    this.keys = {};

    // THREE.js references
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.ship = null;
    this.starField = null;

    // Callbacks
    this.onUpdate = null;
    this.onFire = null;
    this.onDeath = null;
    this.onRespawn = null;
  }

  /**
   * Initialize the game engine
   */
  init() {
    this._initThree();
    this._initLighting();
    this._initInput();
    this.createStarfield();
    return this;
  }

  /**
   * Initialize THREE.js scene, camera, and renderer
   */
  _initThree() {
    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(
      this.options.fov,
      window.innerWidth / window.innerHeight,
      0.1,
      3000
    );
    this.camera.position.set(
      this.options.cameraPosition.x,
      this.options.cameraPosition.y,
      this.options.cameraPosition.z
    );

    const canvas = document.getElementById(this.canvasId);
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setClearColor(this.options.clearColor);

    // Resize handler
    window.addEventListener('resize', () => this._onResize());
  }

  /**
   * Initialize scene lighting
   */
  _initLighting() {
    const ambient = new THREE.AmbientLight(
      this.options.ambientLight,
      this.options.ambientIntensity
    );
    this.scene.add(ambient);

    const sun = new THREE.DirectionalLight(
      this.options.sunColor,
      this.options.sunIntensity
    );
    sun.position.set(
      this.options.sunPosition.x,
      this.options.sunPosition.y,
      this.options.sunPosition.z
    );
    this.scene.add(sun);
  }

  /**
   * Initialize input handlers
   */
  _initInput() {
    window.addEventListener('keydown', (e) => {
      this.keys[e.code] = true;
      if (e.code === 'KeyQ' || e.code === 'ShiftLeft') {
        this.barrelRoll();
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
    });

    document.addEventListener('click', () => {
      if (!this.mouse.locked) {
        document.body.requestPointerLock();
      } else {
        this.fire();
      }
    });

    document.addEventListener('pointerlockchange', () => {
      this.mouse.locked = !!document.pointerLockElement;
    });

    document.addEventListener('mousemove', (e) => {
      if (this.mouse.locked) {
        this.mouse.x += e.movementX * 0.002;
        this.mouse.y += e.movementY * 0.002;
        this.mouse.x = T.clamp(this.mouse.x, -1, 1);
        this.mouse.y = T.clamp(this.mouse.y, -1, 1);
      }
    });
  }

  /**
   * Handle window resize
   */
  _onResize() {
    if (this.renderer && this.camera) {
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
    }
  }

  /**
   * Create a spaceship mesh
   * @param {Object|string} config - Ship preset name or custom config
   * @returns {THREE.Group}
   */
  createShip(config = 'gitfox') {
    const preset = typeof config === 'string' ? ShipPresets[config] : config;
    const c = { ...ShipPresets.gitfox, ...preset };

    const group = new THREE.Group();

    // Body (cone)
    const body = new THREE.Mesh(
      new THREE.ConeGeometry(1.5, 6, 4),
      new THREE.MeshPhongMaterial({ color: c.bodyColor })
    );
    body.rotation.x = -Math.PI / 2;
    body.rotation.y = Math.PI / 4;
    group.add(body);

    // Wings
    const wingGeo = new THREE.BoxGeometry(8, 0.2, 2);
    const wingMat = new THREE.MeshPhongMaterial({ color: c.wingColor });

    const leftWing = new THREE.Mesh(wingGeo, wingMat);
    leftWing.position.set(-2, 0, 1);
    leftWing.rotation.z = 0.1;
    group.add(leftWing);

    const rightWing = new THREE.Mesh(wingGeo, wingMat);
    rightWing.position.set(2, 0, 1);
    rightWing.rotation.z = -0.1;
    group.add(rightWing);

    // Vertical fins (for enemy ships)
    if (c.hasVerticalFins) {
      const finGeo = new THREE.BoxGeometry(0.5, 6, 2);
      const leftFin = new THREE.Mesh(finGeo, wingMat);
      leftFin.position.set(-4, 0, 1);
      group.add(leftFin);

      const rightFin = new THREE.Mesh(finGeo, wingMat);
      rightFin.position.set(4, 0, 1);
      group.add(rightFin);
    }

    // Cockpit
    const cockpit = new THREE.Mesh(
      new THREE.SphereGeometry(0.8, 8, 8),
      new THREE.MeshPhongMaterial({
        color: c.cockpitColor,
        emissive: c.cockpitEmissive
      })
    );
    cockpit.position.z = -1;
    cockpit.scale.set(1, 0.5, 1);
    group.add(cockpit);

    // Engines
    for (let i = -1; i <= 1; i += 2) {
      const engine = new THREE.Mesh(
        new THREE.CylinderGeometry(0.3, 0.5, 1.5),
        new THREE.MeshPhongMaterial({ color: 0x666666 })
      );
      engine.rotation.x = Math.PI / 2;
      engine.position.set(i * 1.5, -0.3, 3);
      group.add(engine);

      // Engine glow
      const glow = new THREE.Mesh(
        new THREE.CylinderGeometry(0.2, 0.4, 0.5),
        new THREE.MeshBasicMaterial({ color: c.engineGlow })
      );
      glow.rotation.x = Math.PI / 2;
      glow.position.set(i * 1.5, -0.3, 3.8);
      glow.userData.isGlow = true;
      group.add(glow);
    }

    return group;
  }

  /**
   * Create starfield background
   * @param {number} count - Number of stars
   */
  createStarfield(count) {
    const starCount = count || this.options.starCount;
    const starGeo = new THREE.BufferGeometry();
    const starPos = [];

    for (let i = 0; i < starCount; i++) {
      starPos.push(
        T.rnd(-1000, 1000),
        T.rnd(-500, 500),
        T.rnd(-1000, 500)
      );
    }

    starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starPos, 3));

    this.starField = new THREE.Points(
      starGeo,
      new THREE.PointsMaterial({ color: 0xffffff, size: 0.8 })
    );

    this.scene.add(this.starField);
  }

  /**
   * Create a planet mesh
   * @param {Object} options
   */
  createPlanet(options = {}) {
    const opts = {
      radius: options.radius || 200,
      color: options.color || 0x2244aa,
      position: options.position || { x: -100, y: -350, z: -200 },
      hasAtmosphere: options.hasAtmosphere !== false,
      atmosphereColor: options.atmosphereColor || 0x4488ff,
      atmosphereOpacity: options.atmosphereOpacity || 0.2
    };

    const planet = new THREE.Mesh(
      new THREE.SphereGeometry(opts.radius, 32, 32),
      new THREE.MeshPhongMaterial({ color: opts.color })
    );
    planet.position.set(opts.position.x, opts.position.y, opts.position.z);
    this.scene.add(planet);

    if (opts.hasAtmosphere) {
      const atmo = new THREE.Mesh(
        new THREE.SphereGeometry(opts.radius * 1.05, 32, 32),
        new THREE.MeshBasicMaterial({
          color: opts.atmosphereColor,
          transparent: true,
          opacity: opts.atmosphereOpacity
        })
      );
      atmo.position.copy(planet.position);
      this.scene.add(atmo);
    }

    return planet;
  }

  /**
   * Create arena floor grid
   * @param {Object} options
   */
  createArenaGrid(options = {}) {
    const opts = {
      size: options.size || 400,
      divisions: options.divisions || 20,
      color1: options.color1 || 0x004444,
      color2: options.color2 || 0x002222,
      y: options.y || -100
    };

    const grid = new THREE.GridHelper(opts.size, opts.divisions, opts.color1, opts.color2);
    grid.position.y = opts.y;
    this.scene.add(grid);
    return grid;
  }

  /**
   * Fire a bullet from the player ship
   * @param {Object} options
   */
  fire(options = {}) {
    if (this.dead) return null;

    const color = options.color || 0x00ff00;
    const speed = options.speed || 4;

    const bullet = new THREE.Mesh(
      new THREE.SphereGeometry(0.3),
      new THREE.MeshBasicMaterial({ color })
    );

    bullet.position.copy(this.ship.position);
    bullet.position.z -= 5;

    const aimX = this.shipX * 40;
    const aimY = this.shipY * 25;
    const vel = T.v3(aimX * 0.015, -aimY * 0.015, -speed);

    bullet.userData = {
      vel,
      life: options.life || 80,
      damage: options.damage || 15,
      ownerId: options.ownerId,
      team: options.team
    };

    this.scene.add(bullet);
    this.bullets.push(bullet);

    if (this.onFire) {
      this.onFire(bullet, bullet.userData);
    }

    return bullet;
  }

  /**
   * Spawn a bullet from a remote player
   */
  spawnRemoteBullet(data) {
    const bullet = new THREE.Mesh(
      new THREE.SphereGeometry(0.3),
      new THREE.MeshBasicMaterial({ color: data.color || 0xff6600 })
    );

    bullet.position.set(data.x, data.y, data.z);
    bullet.userData = {
      vel: T.v3(data.vx, data.vy, data.vz),
      life: data.life || 80,
      ownerId: data.ownerId,
      team: data.team
    };

    this.scene.add(bullet);
    this.remoteBullets.push(bullet);
    return bullet;
  }

  /**
   * Execute barrel roll evasion maneuver
   */
  barrelRoll() {
    if (this.barrelRolling || this.boost < 20 || this.dead) return;

    this.barrelRolling = true;
    this.barrelRollTimer = 0;
    this.boost -= 20;
    this.invincible = 30;
  }

  /**
   * Apply damage to player
   * @param {number} amount - Damage amount
   * @param {string} attackerId - ID of attacking player
   */
  takeDamage(amount, attackerId) {
    if (this.invincible > 0 || this.dead) return;

    this.shield -= amount;
    this.invincible = 30;

    if (this.shield <= 0) {
      this.die(attackerId);
    }
  }

  /**
   * Kill the player
   * @param {string} killerId - ID of killer
   */
  die(killerId) {
    this.dead = true;
    this.respawnTimer = 180; // 3 seconds at 60fps
    this.spawnExplosion(this.ship.position, 1.5);
    this.ship.visible = false;

    if (this.onDeath) {
      this.onDeath(killerId);
    }
  }

  /**
   * Respawn the player
   */
  respawn() {
    this.dead = false;
    this.shield = 100;
    this.invincible = 120;
    this.ship.position.set(T.rnd(-50, 50), T.rnd(-20, 20), T.rnd(0, 50));
    this.ship.visible = true;
    this.shipX = 0;
    this.shipY = 0;
    this.shipTargetX = 0;
    this.shipTargetY = 0;

    if (this.onRespawn) {
      this.onRespawn();
    }
  }

  /**
   * Spawn explosion particles at position
   * @param {THREE.Vector3} pos - Explosion position
   * @param {number} scale - Explosion scale
   */
  spawnExplosion(pos, scale = 1) {
    const count = Math.floor(25 * scale);

    for (let i = 0; i < count; i++) {
      const p = new THREE.Mesh(
        new THREE.SphereGeometry(0.5 * scale),
        new THREE.MeshBasicMaterial({
          color: Math.random() > 0.5 ? 0xff6600 : 0xffff00
        })
      );

      p.position.copy(pos);
      p.userData = {
        vel: T.v3(
          T.rnd(-2, 2) * scale,
          T.rnd(-2, 2) * scale,
          T.rnd(-2, 2) * scale
        ),
        life: 50
      };

      this.scene.add(p);
      this.particles.push(p);
    }
  }

  /**
   * Add score points
   * @param {number} points - Points to add
   */
  addScore(points) {
    this.score += points;
  }

  /**
   * Update player movement based on input
   * @param {Object} options - Movement options
   */
  updateMovement(options = {}) {
    const moveSpeed = options.moveSpeed || 0.03;
    const lerpFactor = options.lerpFactor || 0.1;
    const maxX = options.maxX || 80;
    const maxY = options.maxY || 50;

    let lx = this.keys.KeyA ? -1 : this.keys.KeyD ? 1 : 0;
    let ly = this.keys.KeyW ? -1 : this.keys.KeyS ? 1 : 0;

    this.shipTargetX = T.clamp(this.shipTargetX + lx * moveSpeed, -1, 1);
    this.shipTargetY = T.clamp(this.shipTargetY - ly * moveSpeed, -1, 1);

    this.shipX = T.lerp(this.shipX, this.shipTargetX, lerpFactor);
    this.shipY = T.lerp(this.shipY, this.shipTargetY, lerpFactor);

    this.ship.position.x = this.shipX * maxX;
    this.ship.position.y = this.shipY * maxY;

    // Tilt based on movement
    this.ship.rotation.z = T.lerp(this.ship.rotation.z, -lx * 0.5, lerpFactor);
    this.ship.rotation.x = T.lerp(this.ship.rotation.x, ly * 0.3, lerpFactor);

    // Barrel roll animation
    if (this.barrelRolling) {
      this.barrelRollTimer += 0.25;
      this.ship.rotation.z = this.barrelRollTimer;
      if (this.barrelRollTimer >= Math.PI * 2) {
        this.barrelRolling = false;
        this.ship.rotation.z = 0;
      }
    }

    return { lx, ly };
  }

  /**
   * Update bullets
   * @param {Function} onHit - Callback when bullet hits something
   */
  updateBullets(onHit) {
    // Update player bullets
    this.bullets.forEach(b => {
      b.position.add(b.userData.vel);
      b.userData.life--;

      if (onHit) {
        onHit(b, 'player');
      }

      if (b.userData.life <= 0) {
        this.scene.remove(b);
        b.dead = true;
      }
    });
    this.bullets = this.bullets.filter(b => !b.dead);

    // Update remote bullets
    this.remoteBullets.forEach(b => {
      b.position.add(b.userData.vel);
      b.userData.life--;

      if (onHit) {
        onHit(b, 'remote');
      }

      if (b.userData.life <= 0) {
        this.scene.remove(b);
        b.dead = true;
      }
    });
    this.remoteBullets = this.remoteBullets.filter(b => !b.dead);
  }

  /**
   * Update particles
   */
  updateParticles() {
    this.particles.forEach(p => {
      p.position.add(p.userData.vel);
      p.userData.life--;
      p.scale.setScalar(p.userData.life / 50);

      if (p.userData.life <= 0) {
        this.scene.remove(p);
        p.dead = true;
      }
    });
    this.particles = this.particles.filter(p => !p.dead);
  }

  /**
   * Update engine glow effects on a ship
   * @param {THREE.Group} ship - Ship to update
   */
  updateEngineGlow(ship) {
    ship.children.forEach(c => {
      if (c.userData.isGlow) {
        c.scale.z = 0.8 + Math.random() * 0.4;
      }
    });
  }

  /**
   * Update boost regeneration
   */
  updateBoost() {
    this.boost = Math.min(100, this.boost + 0.1);
  }

  /**
   * Update invincibility timer
   */
  updateInvincibility() {
    if (this.invincible > 0) {
      this.invincible--;
      // Flash visibility
      if (!this.dead) {
        this.ship.visible = Math.floor(this.invincible / 3) % 2 === 0;
      }
    } else if (!this.dead) {
      this.ship.visible = true;
    }
  }

  /**
   * Handle respawn timer
   */
  updateRespawnTimer() {
    if (this.dead) {
      this.respawnTimer--;
      if (this.respawnTimer <= 0) {
        this.respawn();
      }
    }
  }

  /**
   * Check if rapid fire is active
   */
  checkRapidFire() {
    return this.keys.Space && Math.random() < 0.15;
  }

  /**
   * Main update loop - call in requestAnimationFrame
   */
  update() {
    if (this.dead) {
      this.updateRespawnTimer();
      return;
    }

    this.updateMovement();
    this.updateBullets();
    this.updateParticles();
    this.updateBoost();
    this.updateInvincibility();
    this.updateEngineGlow(this.ship);

    if (this.checkRapidFire()) {
      this.fire();
    }

    if (this.onUpdate) {
      this.onUpdate();
    }
  }

  /**
   * Update camera to follow ship
   * @param {Object} options
   */
  updateCamera(options = {}) {
    const lerpFactor = options.lerpFactor || 0.03;
    const baseY = options.baseY || 20;
    const lookAheadZ = options.lookAheadZ || -30;

    this.camera.position.x = T.lerp(
      this.camera.position.x,
      this.ship.position.x * 0.2,
      lerpFactor
    );
    this.camera.position.y = T.lerp(
      this.camera.position.y,
      baseY + this.ship.position.y * 0.15,
      lerpFactor
    );

    this.camera.lookAt(
      this.ship.position.x * 0.5,
      this.ship.position.y * 0.5,
      lookAheadZ
    );
  }

  /**
   * Render the scene
   */
  render() {
    this.updateCamera();
    this.renderer.render(this.scene, this.camera);
  }

  /**
   * Main animation loop
   */
  animate() {
    requestAnimationFrame(() => this.animate());
    this.update();
    this.render();
  }

  /**
   * Start the game loop
   */
  start() {
    this.animate();
  }
}

export default GameEngine;
