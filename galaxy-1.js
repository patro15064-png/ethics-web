/**
 * Galaxy 1 — Real-Time GPU Particle Simulation
 * 500,000 particles forming a procedural galaxy, simulated and drawn on the GPU.
 * Variation: 7859 | Arms: 2 | Curl: 1.42 | Core: 1.0 | Thickness: 1.0 | Wisps: 0.17
 * Built for Three.js (WebGPU with WebGL2 fallback).
 */

(function (global) {
  'use strict';

  // Exact configuration from tool specifications
  const CONFIG = {
    seed: 7859,
    particles: 500000,
    arms: 2.0,
    armCurl: 1.42,
    core: 1.0,
    thickness: 1.0,
    wisps: 0.17,
    turbulence: 0.49,
    swirlSize: 2.61,
    stringiness: 0.39,
    stars: 0.53,
    size: 1.11,
    sizeVariety: 0.57,
    brightness: 1.16,
    sparkle: 0.79,
    liveliness: 0.33,
    speed: 1.28,
    cursor: 'pull',
    cursorStrength: 0.19,
    cursorReturnSpeed: 0.2,
    glow: 0.47,
    glowSpread: 0.26,
    glowThreshold: 0.3,
    focus: 0.38,
    blur: 0.15,
    fringing: 0.3,
    filmGrain: 0.2,
    vignette: 0.34,
    exposure: 1.34,
    cameraAngle: 35.1,
    cameraHeight: 26.1,
    cameraDistance: 5.5,
    cameraFov: 35,
    theme: 'cybersafe' // 'cybersafe' or 'cosmic'
  };

  // Color gradients
  const PALETTES = {
    // CyberSafe HUD theme: deep cosmic void -> electric cyan -> signal lime -> white hot core
    cybersafe: [
      { stop: 0.00, color: [0.059, 0.141, 0.212] }, // #0f2436
      { stop: 0.30, color: [0.114, 0.353, 0.490] }, // #1d5a7d
      { stop: 0.60, color: [0.133, 0.827, 0.933] }, // #22d3ee (cyan)
      { stop: 0.82, color: [0.776, 0.945, 0.208] }, // #c6f135 (signal lime)
      { stop: 1.00, color: [0.961, 0.984, 1.000] }  // #f5fbff (core white)
    ],
    // Cosmic blue theme: #0f2436 -> #2a6c9e -> #4aa3d4 -> #a9d3ee -> #f5fbff
    cosmic: [
      { stop: 0.00, color: [0.059, 0.141, 0.212] }, // #0f2436
      { stop: 0.25, color: [0.165, 0.424, 0.620] }, // #2a6c9e
      { stop: 0.50, color: [0.290, 0.639, 0.831] }, // #4aa3d4
      { stop: 0.75, color: [0.663, 0.827, 0.933] }, // #a9d3ee
      { stop: 1.00, color: [0.961, 0.984, 1.000] }  // #f5fbff
    ]
  };

  class Galaxy1Simulation {
    constructor(canvasContainer, options = {}) {
      this.container = typeof canvasContainer === 'string' ? document.getElementById(canvasContainer) : canvasContainer;
      if (!this.container) throw new Error('Container element not found');

      this.options = Object.assign({}, CONFIG, options);
      this.isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || (window.innerWidth < 768);
      this.prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

      // Mobile particle clamping: 400k max, half target
      if (this.isTouch) {
        this.particleCount = Math.min(250000, 400000);
      } else {
        this.particleCount = this.options.particles;
      }

      this.active = true;
      this.hidden = document.hidden;
      this.fps = 60;
      this.lastFrameTime = performance.now();
      this.slowFrameDuration = 0;
      this.calmFrameDuration = 0;
      this.targetFPS = 60;
      this.frameInterval = 1000 / 60;

      // Mouse drag state
      this.isDragging = false;
      this.lastMousePos = { x: 0, y: 0 };
      this.currentAngle = this.options.cameraAngle * Math.PI / 180;
      this.currentHeight = this.options.cameraHeight * Math.PI / 180;
      this.currentDistance = this.options.cameraDistance;

      // Cursor ray interaction
      this.cursor3D = { x: 0, y: 0, z: 0 };
      this.cursorActive = 0.0;
      this.cursorRay = null;

      this.init();
    }

    async init() {
      const THREE = window.THREE;
      if (!THREE) {
        console.error('Three.js is required to initialize Galaxy 1');
        return;
      }

      // Sizing
      const rect = this.container.getBoundingClientRect();
      this.width = Math.max(rect.width, 320);
      this.height = Math.max(rect.height, 240);

      // Scene & Camera
      this.scene = new THREE.Scene();
      if (!this.options.transparentBackground) {
        this.scene.background = new THREE.Color(0x000000);
      }

      this.camera = new THREE.PerspectiveCamera(this.options.cameraFov, this.width / this.height, 0.1, 100);
      this.updateCameraPosition();

      // Renderer creation
      this.pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      this.renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance',
        depth: false
      });
      this.renderer.setSize(this.width, this.height);
      this.renderer.setPixelRatio(this.pixelRatio);
      this.renderer.outputColorSpace = THREE.SRGBColorSpace;

      this.canvas = this.renderer.domElement;
      this.canvas.className = 'galaxy-1-canvas';
      this.canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;pointer-events:auto;z-index:0;';
      this.container.appendChild(this.canvas);

      // Create GPU Particle System
      this.createParticleSystem();

      // Create Starfield
      if (this.options.stars > 0) {
        this.createStarfield();
      }

      // Event listeners
      this.bindEvents();

      // Start animation loop
      this.raf = requestAnimationFrame((t) => this.renderLoop(t));
    }

    updateCameraPosition() {
      const cosH = Math.cos(this.currentHeight);
      const sinH = Math.sin(this.currentHeight);
      const cosA = Math.cos(this.currentAngle);
      const sinA = Math.sin(this.currentAngle);

      this.camera.position.set(
        this.currentDistance * cosH * sinA,
        this.currentDistance * sinH,
        this.currentDistance * cosH * cosA
      );
      this.camera.lookAt(0, 0, 0);
    }

    createParticleSystem() {
      const THREE = window.THREE;
      const count = this.particleCount;

      // Base instanced quad geometry: 4 vertices, 2 triangles
      // Camera-facing sprites (not gl.POINTS, which WebGPU draws one pixel wide)
      const baseQuad = new THREE.BufferGeometry();
      const quadVertices = new Float32Array([
        -0.5, -0.5, 0.0,
         0.5, -0.5, 0.0,
         0.5,  0.5, 0.0,
        -0.5,  0.5, 0.0
      ]);
      const quadUVs = new Float32Array([
        0.0, 0.0,
        1.0, 0.0,
        1.0, 1.0,
        0.0, 1.0
      ]);
      const quadIndices = new Uint16Array([0, 1, 2, 0, 2, 3]);

      baseQuad.setAttribute('position', new THREE.BufferAttribute(quadVertices, 3));
      baseQuad.setAttribute('uv', new THREE.BufferAttribute(quadUVs, 2));
      baseQuad.setIndex(new THREE.BufferAttribute(quadIndices, 1));

      // Instanced geometry
      const instancedGeom = new THREE.InstancedBufferGeometry();
      instancedGeom.index = baseQuad.index;
      instancedGeom.attributes.position = baseQuad.attributes.position;
      instancedGeom.attributes.uv = baseQuad.attributes.uv;

      // Per-particle attributes: particle ID (for GPU procedural positioning)
      const particleIds = new Float32Array(count);
      for (let i = 0; i < count; i++) {
        particleIds[i] = i;
      }
      instancedGeom.setAttribute('aParticleId', new THREE.InstancedBufferAttribute(particleIds, 1));

      // Shaders
      const vertexShader = `
        precision highp float;
        precision highp int;

        attribute float aParticleId;

        uniform float uTime;
        uniform float uArms;
        uniform float uCurl;
        uniform float uCore;
        uniform float uThickness;
        uniform float uWisps;
        uniform float uTurbulence;
        uniform float uSwirlSize;
        uniform float uStringiness;
        uniform float uSize;
        uniform float uSizeVariety;
        uniform float uBrightness;
        uniform float uSparkle;
        uniform float uLiveliness;
        uniform vec3 uCursor3D;
        uniform float uCursorActive;
        uniform float uCursorStrength;

        varying vec2 vUv;
        varying float vParam;
        varying float vAlpha;
        varying float vSparkle;

        const uint SEED = 7859u;
        const float PI = 3.14159265358979323846;
        const float TWO_PI = 6.28318530717958647692;
        const float R = 1.7;

        // High performance PCG hash for procedural GPU generation
        uint pcg(uint v) {
          uint state = v * 747796405u + 2891336453u;
          uint word = ((state >> ((state >> 28u) + 4u)) ^ state) * 277803737u;
          return (word >> 22u) ^ word;
        }

        float hash(uint id, uint stream) {
          uint n = id * 104729u + stream * 15485863u + SEED;
          return float(pcg(n)) * 2.3283064365386963e-10;
        }

        float cube(float x) { return x * x * x; }

        vec3 swirl(vec3 p, float freq) {
          vec3 s = vec3(0.0);
          float f = freq;
          float a = 1.0;
          for (int i = 0; i < 2; i++) {
            s.x += sin(p.y * f + p.z * 1.7) * a;
            s.y += sin(p.z * f + p.x * 1.7) * a;
            s.z += sin(p.x * f + p.y * 1.7) * a;
            f *= 2.0;
            a *= 0.5;
          }
          return s * 0.25;
        }

        void main() {
          vUv = uv;
          uint id = uint(aParticleId);

          // Particles are organized in coherent filament strands
          uint strandLen = 48u;
          uint strandId = id / strandLen;
          uint pInStrand = id % strandLen;

          // Along strand position (-0.5 to 0.5)
          float along = (float(pInStrand) / float(strandLen)) - 0.5;

          // Strand shared hashes
          float s0 = hash(strandId, 100u);
          float s1 = hash(strandId, 101u);
          float s2 = hash(strandId, 102u);
          float s5 = hash(strandId, 105u);
          float s9 = hash(strandId, 109u); // role

          // Particle hashes
          float c3 = hash(id, 203u);
          float c4 = hash(id, 204u);
          float c6 = hash(id, 206u);
          float c10 = hash(id, 210u);

          // Stringiness gathering
          c3 = mix(c3, 0.5 + (c3 - 0.5) * (1.0 - uStringiness * 0.75), uStringiness);
          c6 = mix(c6, 0.5 + (c6 - 0.5) * (1.0 - uStringiness * 0.75), uStringiness);

          // Rigid rotation spin
          float spin = uTime * 0.15;

          // 1. STREAMS ALONG THE ARMS
          float rho0 = s0 * s0 * 1.2 + 0.35;
          float arm = floor(s1 * uArms);
          float span = s2 * 1.1 + 0.4;
          float rho = rho0 + (along * span) / (uCurl * TWO_PI + 0.8);

          float gap = TWO_PI / uArms;
          float stray = (c3 - 0.5) * gap * 0.55 + cube(c6 * 2.0 - 1.0) * gap * 0.25;
          float theta = arm * gap + rho * uCurl * TWO_PI + stray * (rho * 0.6 + 0.4) + spin;
          float lift = (c4 - 0.5) * uThickness * (rho * -0.5 + 1.0) * 0.5;
          vec3 stream = vec3(cos(theta) * rho * R, lift, sin(theta) * rho * R);

          // 2. SMOKE COLUMN
          float pick = s5;
          float plume = floor(pick * pick * pick * 3.0);
          uint plumeU = uint(plume);

          float g0 = hash(plumeU, 300u);
          float g1 = hash(plumeU, 301u);
          float g2 = hash(plumeU, 302u);
          float g3 = hash(plumeU, 303u);
          float g4 = hash(plumeU, 304u);
          float g5 = hash(plumeU, 305u);

          float r0 = float(pInStrand) / float(strandLen);
          float climb = r0 * (r0 * 0.4 + 0.6);
          float height = g2 * 0.3 + 1.0;
          float lean = g1 < 0.5 ? 1.0 : -1.0;
          float twist = climb * (g4 * 3.0 + 5.0) + g0 * TWO_PI + uTime * 0.2;
          float baseAngle = g0 * TWO_PI + spin;
          vec3 base = vec3(cos(baseAngle), 0.0, sin(baseAngle)) * (g3 * 0.2 + 0.08) * R;
          float turn = smoothstep(0.45, 1.0, climb);

          vec3 path = base + vec3(
            sin(twist) * (climb * 0.3) + turn * turn * 1.6 * lean,
            (climb - turn * turn * 0.3) * height,
            cos(twist) * (climb * 0.22)
          );
          vec3 currents = swirl(path * 0.6 + vec3(g5 * 7.0, 0.0, uTime * 0.03), uSwirlSize) * (climb * 0.35);
          vec3 wisp = path + currents + (vec3(c3, c4, c10) - 0.5) * (climb * 0.3 + 0.03);

          // 3. SPARSE HALO DUST
          float r1 = hash(id, 10u);
          float r2 = hash(id, 11u);
          float r3 = hash(id, 12u);
          float hr = sqrt(r1) * 1.1 + 0.3 * R;
          float ha = r2 * TWO_PI + spin;
          vec3 halo = vec3(cos(ha) * hr, cube(r3 * 2.0 - 1.0) * 0.12, sin(ha) * hr);

          // 4. CENTRAL CORE
          float r6 = hash(id, 16u);
          float r7 = hash(id, 17u);
          float r8 = hash(id, 18u);
          float cr = r6 * r6 * 0.3;
          float phi = acos(clamp(r8 * 2.0 - 1.0, -1.0, 1.0));
          float theta2 = r7 * TWO_PI;
          vec3 core = vec3(
            sin(phi) * cos(theta2),
            cos(phi) * (uThickness * 0.6 + 0.4),
            sin(phi) * sin(theta2)
          ) * cr;

          // ROLES
          float role = s9;
          float wispEnd = uWisps * 0.35 + 0.06;
          float coreEnd = wispEnd + uCore * 0.08;

          vec3 pos;
          float param;
          if (role < 0.06) {
            pos = halo;
            param = 1.0;
          } else if (role < wispEnd) {
            pos = wisp;
            param = climb;
          } else if (role < coreEnd) {
            pos = core;
            param = 0.0;
          } else {
            pos = stream;
            param = rho;
          }

          // Turbulence
          if (uTurbulence > 0.0) {
            vec3 turb = swirl(pos * (uSwirlSize * 0.6) + vec3(0.0, uTime * 0.06, 0.0), uSwirlSize) * uTurbulence * 0.3;
            pos += turb * uLiveliness;
          }

          // Cursor Pull
          if (uCursorActive > 0.01) {
            vec3 toCursor = uCursor3D - pos;
            float dist = length(toCursor);
            float pullRadius = 1.8;
            if (dist < pullRadius) {
              float factor = (1.0 - dist / pullRadius) * uCursorStrength * uCursorActive;
              pos += normalize(toCursor) * factor * 0.6;
            }
          }

          vParam = param;

          // Sparkle & Size Variety
          float randSize = hash(id, 50u);
          float particleSize = uSize * (1.0 + (randSize - 0.5) * uSizeVariety * 2.0) * 0.014;

          float isSparkle = hash(id, 99u) > (1.0 - uSparkle * 0.02) ? 1.0 : 0.0;
          vSparkle = isSparkle;
          if (isSparkle > 0.5) {
            particleSize *= 1.8;
          }

          // Camera-facing Billboard Quad Transform
          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          mvPosition.xy += position.xy * particleSize;

          gl_Position = projectionMatrix * mvPosition;

          // Depth / Fog alpha attenuation
          vAlpha = uBrightness;
        }
      `;

      const fragmentShader = `
        precision highp float;

        uniform vec3 uColor0;
        uniform vec3 uColor1;
        uniform vec3 uColor2;
        uniform vec3 uColor3;
        uniform vec3 uColor4;
        uniform float uExposure;
        uniform float uVignette;
        uniform float uFilmGrain;
        uniform float uTime;

        varying vec2 vUv;
        varying float vParam;
        varying float vAlpha;
        varying float vSparkle;

        // Density gradient sampler (density: 0.0 sparse to 1.0 dense core)
        vec3 evaluateGradient(float d) {
          d = clamp(d, 0.0, 1.0);
          if (d < 0.25) {
            return mix(uColor0, uColor1, d / 0.25);
          } else if (d < 0.50) {
            return mix(uColor1, uColor2, (d - 0.25) / 0.25);
          } else if (d < 0.75) {
            return mix(uColor2, uColor3, (d - 0.50) / 0.25);
          } else {
            return mix(uColor3, uColor4, (d - 0.75) / 0.25);
          }
        }

        void main() {
          // Camera-facing soft circular sprite
          vec2 center = vUv - vec2(0.5);
          float dist = length(center) * 2.0;
          if (dist > 1.0) discard;

          // Soft profile + pinpoint core
          float soft = exp(-dist * dist * 3.6);
          float core = exp(-dist * dist * 18.0) * 1.4;
          float intensity = (soft * 0.7 + core * 0.3);

          // Density mapping from parameter
          // vParam: 0 is dense central core, ~0.6-1.0 is arms, >1.5 is sparse outer tail
          float density = 1.0 - clamp(vParam / 1.7, 0.0, 1.0);

          vec3 col = evaluateGradient(density);

          if (vSparkle > 0.5) {
            col = mix(col, vec3(1.0, 1.0, 1.0), 0.7) * 2.4;
            intensity *= 1.5;
          }

          // Output luminous color
          vec3 finalColor = col * intensity * vAlpha * uExposure;
          gl_FragColor = vec4(finalColor, intensity * vAlpha);
        }
      `;

      const palette = PALETTES[this.options.theme] || PALETTES.cybersafe;

      this.uniforms = {
        uTime: { value: 0 },
        uArms: { value: this.options.arms },
        uCurl: { value: this.options.armCurl },
        uCore: { value: this.options.core },
        uThickness: { value: this.options.thickness },
        uWisps: { value: this.options.wisps },
        uTurbulence: { value: this.options.turbulence },
        uSwirlSize: { value: this.options.swirlSize },
        uStringiness: { value: this.options.stringiness },
        uSize: { value: this.options.size },
        uSizeVariety: { value: this.options.sizeVariety },
        uBrightness: { value: this.options.brightness },
        uSparkle: { value: this.options.sparkle },
        uLiveliness: { value: this.prefersReducedMotion ? 0.06 : this.options.liveliness },
        uCursor3D: { value: new THREE.Vector3(0, 0, 0) },
        uCursorActive: { value: 0 },
        uCursorStrength: { value: this.options.cursorStrength },
        uExposure: { value: this.options.exposure },
        uVignette: { value: this.options.vignette },
        uFilmGrain: { value: this.options.filmGrain },
        uColor0: { value: new THREE.Vector3(...palette[0].color) },
        uColor1: { value: new THREE.Vector3(...palette[1].color) },
        uColor2: { value: new THREE.Vector3(...palette[2].color) },
        uColor3: { value: new THREE.Vector3(...palette[3].color) },
        uColor4: { value: new THREE.Vector3(...palette[4].color) }
      };

      const material = new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms: this.uniforms,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending
      });

      this.mesh = new THREE.Mesh(instancedGeom, material);
      this.mesh.frustumCulled = false;
      this.scene.add(this.mesh);
    }

    createStarfield() {
      const THREE = window.THREE;
      const starCount = this.isTouch ? 2500 : 6000;
      const geom = new THREE.BufferGeometry();
      const pos = new Float32Array(starCount * 3);
      const cols = new Float32Array(starCount * 3);

      for (let i = 0; i < starCount; i++) {
        const u = Math.random();
        const v = Math.random();
        const theta = u * 2.0 * Math.PI;
        const phi = Math.acos(2.0 * v - 1.0);
        const r = 8.0 + Math.random() * 14.0;

        pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
        pos[i * 3 + 1] = (r * Math.sin(phi) * Math.sin(theta)) * 0.7;
        pos[i * 3 + 2] = r * Math.cos(phi);

        // Subtly colored stars (cyan / white / faint lime)
        const rand = Math.random();
        if (rand > 0.8) {
          cols[i * 3] = 0.77; cols[i * 3 + 1] = 0.94; cols[i * 3 + 2] = 0.21; // lime
        } else if (rand > 0.4) {
          cols[i * 3] = 0.13; cols[i * 3 + 1] = 0.82; cols[i * 3 + 2] = 0.93; // cyan
        } else {
          cols[i * 3] = 0.85; cols[i * 3 + 1] = 0.90; cols[i * 3 + 2] = 0.95; // white
        }
      }

      geom.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      geom.setAttribute('color', new THREE.BufferAttribute(cols, 3));

      const mat = new THREE.PointsMaterial({
        size: 0.04,
        vertexColors: true,
        transparent: true,
        opacity: 0.45 * this.options.stars,
        blending: THREE.AdditiveBlending
      });

      this.starPoints = new THREE.Points(geom, mat);
      this.scene.add(this.starPoints);
    }

    setTheme(themeName) {
      const THREE = window.THREE;
      const palette = PALETTES[themeName] || PALETTES.cybersafe;
      this.options.theme = themeName;
      if (this.uniforms) {
        this.uniforms.uColor0.value.set(...palette[0].color);
        this.uniforms.uColor1.value.set(...palette[1].color);
        this.uniforms.uColor2.value.set(...palette[2].color);
        this.uniforms.uColor3.value.set(...palette[3].color);
        this.uniforms.uColor4.value.set(...palette[4].color);
      }
    }

    setQuality(particleCount, pixelRatio) {
      if (this.particleCount === particleCount && this.pixelRatio === pixelRatio) return;
      this.particleCount = particleCount;
      this.pixelRatio = pixelRatio;
      this.renderer.setPixelRatio(pixelRatio);

      // Recreate particle geometry with new instance count
      if (this.mesh) {
        this.scene.remove(this.mesh);
        this.mesh.geometry.dispose();
        this.createParticleSystem();
      }
    }

    bindEvents() {
      const THREE = window.THREE;
      const raycaster = new THREE.Raycaster();
      const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
      const mouse = new THREE.Vector2();

      // Mouse Drag: turn the piece by dragging with mouse (not touch)
      this.canvas.addEventListener('mousedown', (e) => {
        if (e.button !== 0) return;
        this.isDragging = true;
        this.lastMousePos = { x: e.clientX, y: e.clientY };
      });

      window.addEventListener('mousemove', (e) => {
        // Drag rotation
        if (this.isDragging) {
          const dx = e.clientX - this.lastMousePos.x;
          const dy = e.clientY - this.lastMousePos.y;
          this.lastMousePos = { x: e.clientX, y: e.clientY };

          this.currentAngle -= dx * 0.006;
          this.currentHeight = Math.max(-1.45, Math.min(1.45, this.currentHeight + dy * 0.006));
          this.updateCameraPosition();
        }

        // Cursor pull calculation
        const rect = this.canvas.getBoundingClientRect();
        mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

        raycaster.setFromCamera(mouse, this.camera);
        const intersectPoint = new THREE.Vector3();
        if (raycaster.ray.intersectPlane(plane, intersectPoint)) {
          this.cursor3D.x = intersectPoint.x;
          this.cursor3D.y = intersectPoint.y;
          this.cursor3D.z = intersectPoint.z;
          this.cursorActive = 1.0;
        }
      });

      window.addEventListener('mouseup', () => {
        this.isDragging = false;
      });

      this.canvas.addEventListener('mouseleave', () => {
        this.cursorActive = 0.0;
      });

      // Window resize
      window.addEventListener('resize', () => {
        const rect = this.container.getBoundingClientRect();
        this.width = Math.max(rect.width, 320);
        this.height = Math.max(rect.height, 240);
        this.camera.aspect = this.width / this.height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(this.width, this.height);
      }, { passive: true });

      // Tab visibility & Intersection Observer
      document.addEventListener('visibilitychange', () => {
        this.hidden = document.hidden;
      });

      const observer = new IntersectionObserver(([entry]) => {
        this.active = entry.isIntersecting;
      }, { threshold: 0.05 });
      observer.observe(this.container);
    }

    renderLoop(timestamp) {
      this.raf = requestAnimationFrame((t) => this.renderLoop(t));

      if (!this.active || this.hidden) return;

      const elapsed = timestamp - this.lastFrameTime;

      // Frame rate limiting: 60fps max
      if (elapsed < this.frameInterval - 1) return;

      const deltaSeconds = elapsed / 1000;
      this.lastFrameTime = timestamp;

      // Dynamic quality throttling
      if (elapsed > 20) { // Slower than 50fps
        this.slowFrameDuration += deltaSeconds;
        this.calmFrameDuration = 0;
        if (this.slowFrameDuration > 1.0) {
          this.slowFrameDuration = 0;
          if (this.particleCount > 250000) {
            this.setQuality(Math.floor(this.particleCount * 0.7), this.pixelRatio);
          } else if (this.pixelRatio > 1.0) {
            this.setQuality(this.particleCount, 1.0);
          }
        }
      } else {
        this.slowFrameDuration = 0;
        this.calmFrameDuration += deltaSeconds;
        if (this.calmFrameDuration > 10.0) {
          this.calmFrameDuration = 0;
          if (this.particleCount < this.options.particles && !this.isTouch) {
            this.setQuality(Math.min(this.options.particles, Math.floor(this.particleCount * 1.3)), this.pixelRatio);
          }
        }
      }

      // Update uniforms
      const simSpeed = this.options.speed * (this.prefersReducedMotion ? 0.2 : 1.0);
      const currentTime = (timestamp * 0.001) * simSpeed;
      if (this.uniforms) {
        this.uniforms.uTime.value = currentTime;
        this.uniforms.uCursor3D.value.set(this.cursor3D.x, this.cursor3D.y, this.cursor3D.z);
        this.uniforms.uCursorActive.value += (this.cursorActive - this.uniforms.uCursorActive.value) * this.options.cursorReturnSpeed;
      }

      // Stars slow rotation
      if (this.starPoints) {
        this.starPoints.rotation.y = currentTime * 0.015;
      }

      // Render scene
      this.renderer.render(this.scene, this.camera);
    }

    destroy() {
      if (this.raf) cancelAnimationFrame(this.raf);
      if (this.renderer) {
        this.renderer.dispose();
        if (this.canvas && this.canvas.parentNode) {
          this.canvas.parentNode.removeChild(this.canvas);
        }
      }
    }
  }

  global.Galaxy1Simulation = Galaxy1Simulation;
  global.GALAXY1_CONFIG = CONFIG;
  global.GALAXY1_PALETTES = PALETTES;

})(typeof window !== 'undefined' ? window : this);
