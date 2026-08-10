// PNM V5 — Core Renderer
// Individual meshes (not InstancedMesh). Stable and simple.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Line2 } from 'three/addons/lines/Line2.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { LineGeometry } from 'three/addons/lines/LineGeometry.js';
import { state, emit, getModules, HOT_KEYS } from './state.js';
import {
  getVisibleNodes, getPrimeRGB, nodeColor, shouldShowNode,
  isPrimeNumber, primeFactorsOf, hueToRGB, SPHERE_R, SPACING_2D,
  SAMPLES_PER_SEG, buildParastichy, buildLineArcs, catmullRom,
  GOLDEN_ANGLE,
} from './math.js';
import {
  interpolatedPos, getMaxDim, getMinDim,
  flatPolar, flatFromPolar, spherePolar, sphereFromPolar, lineNodePos,
  chordPos, chordPolar, chordFromPolar, chordRadius,
  springPos,
} from './positions.js';

// === PARASTICHY LINE FADE ===
// linewidth is in device pixels (worldUnits: false, resolution = the drawing
// buffer), so 1 is already the thinnest a line can physically be — on a 3x DPR
// phone that is a third of a CSS pixel. There is nothing below it. But a line
// that thin still draws at full prime-colour brightness and reads as a bright
// stroke rather than a fine one, so the thin end fades instead.
//
// It fades toward the BACKGROUND, not toward grey. Desaturating would make the
// line brighter on a near-black field, not fainter, and a desaturated 2-line
// stops reading as red — the colour is the factorisation, so hue is the one
// thing that must survive.
const LINE_FADE_FLOOR = 0.3;    // brightness retained at thickness 1
const LINE_FADE_UNTIL = 3;      // full brightness at and above this thickness

function lineFadeAmount(width) {
  if (width >= LINE_FADE_UNTIL) return 1;
  const t = (width - 1) / (LINE_FADE_UNTIL - 1);
  return LINE_FADE_FLOOR + Math.max(0, Math.min(1, t)) * (1 - LINE_FADE_FLOOR);
}

// The camera's home. Named rather than written inline at construction, because
// Reset now returns to it as well — two literals would have drifted apart the
// first time either moved.
//
// Was (8, 6, 10). Pushed out ~10% along the same view direction: the angle was
// right, the figure just sat too large in the frame at load, with the outermost
// nodes crowding the edge before the morph had even started travelling.
const HOME_CAM_POS = new THREE.Vector3(8.8, 6.6, 11);
const HOME_CAM_TARGET = new THREE.Vector3(0, 0, 0);

// How long the morph holds still at each stable shape, in seconds.
//
// Was a bare `2` repeated at six call sites — the two bounce ends, the two
// keyframe crossings, the loop's first-frame seed, and resetMorph(). Raised to
// 3 and named, because six literals that all had to agree is exactly the shape
// of a bug waiting to happen: change five and the figure hesitates for a
// different beat depending on which way it happened to be travelling.
//
// This is independent of shapeDriftSpeed, which governs travel BETWEEN shapes.
// The dwell is what makes each arrangement legible, so it wants to stay a fixed
// wall-clock beat rather than scaling with speed.
const DWELL_SECONDS = 3;

// Three.js refs
let threeScene = null, threeCamera = null, threeRenderer = null, threeControls = null;
let animId = null;
let lastDim = -1;
let resizeObserver = null;

// Node data — the public interface modules use
let nodeData = [];
let nodeByN = new Map();

// Curves and glow sprites. The 3D sprite labels are gone — the lens owns
// labelling now, and it projects HTML instead, which stays crisp and can be
// decluttered. See modules/lens.js.
let curveLines = [];
let glowSprites = [];

// Shape morph state
let morphPos = 0.5;
let morphDir = Math.random() < 0.5 ? 1 : -1;
let morphPauseTimer = 0;
let morphActive = false;

// Color drift state
let colorDriftWasOn = false;

// ============================================================
// PUBLIC ACCESSORS (for modules)
// ============================================================
export function getScene() { return threeScene; }
export function getCamera() { return threeCamera; }
export function getRenderer() { return threeRenderer; }
export function getControls() { return threeControls; }
export function getNodes() { return nodeData; }
export function getNodeByN(n) { return nodeByN.get(n); }

// ============================================================
// RESOLVE N
// ============================================================
export function resolveN() {
  if (state.N != null) return state.N;
  if (state.primes.length === 0) return 30;
  let n = state.primes.reduce((a, b) => a * b, 1);
  if (n > 500) n = 500;
  return n;
}

// ============================================================
// CLEANUP
// ============================================================
// Set while rebuilding after a context loss.
//
// When a GL context is lost the driver has already freed every object that
// lived in it. Calling dispose() on those afterwards asks the NEW context to
// delete buffers it never owned, which is what produced a wall of
// `INVALID_OPERATION: delete: object does not belong to this context` warnings
// during recovery. Harmless, but noise on the console is how real warnings get
// missed, and the calls are pure waste.
//
// So on that one path the JS-side references are dropped without touching the
// GPU. Normal rebuilds still dispose properly — skipping it there would leak.
let skipGpuDispose = false;

function disposeMesh(obj) {
  if (!obj) return;
  if (skipGpuDispose) return;
  if (obj.geometry) obj.geometry.dispose();
  if (obj.material) {
    if (obj.material.map) obj.material.map.dispose();
    obj.material.dispose();
  }
}

function cleanup() {
  if (animId) { cancelAnimationFrame(animId); animId = null; }

  // Notify modules to clean up
  for (const [name, mod] of getModules()) {
    if (!mod.enabled) continue;
    try { mod.destroy?.(); } catch (e) { console.error(`[PNM] Module "${name}" destroy error:`, e); }
  }

  // Dispose scene background
  if (threeScene) {
    if (threeScene.background && threeScene.background.isTexture) {
      threeScene.background.dispose();
    }
    threeScene.background = null;
  }

  // Dispose node meshes
  for (const nd of nodeData) disposeMesh(nd.mesh);
  // Dispose curves
  for (const c of curveLines) {
    if (skipGpuDispose) break;   // same reason as disposeMesh(): the context took these with it
    if (c.geometry) c.geometry.dispose();
    if (c.material) c.material.dispose();
  }
  // Dispose glow sprites
  for (const g of glowSprites) disposeMesh(g);

  nodeData = [];
  nodeByN.clear();
  curveLines = [];
  glowSprites = [];
  lastDim = -1;
}

function fullDestroy() {
  cleanup();
  if (resizeObserver) { resizeObserver.disconnect(); resizeObserver = null; }
  if (threeRenderer) {
    threeControls.dispose();
    threeRenderer.dispose();
    threeRenderer.domElement.remove();
    threeScene = threeCamera = threeRenderer = threeControls = null;
  }
}

// ============================================================
// SPRING CURVE BUILDER — helix coils from node line, one turn per segment
// ============================================================
function buildSpringArcs(p, N, maxPrime, samplesPerSeg = 20) {
  const lastMult = Math.floor(N / p);
  if (lastMult < 1) return null;
  const lastMultN = lastMult * p;
  const extending = lastMultN < N;
  const extraFrac = extending ? (N - lastMultN) / p : 0;
  const extraSamples = Math.ceil(extraFrac * samplesPerSeg);
  const EXTEND_FRAC = 0.5;
  const extendSamples = Math.ceil(EXTEND_FRAC * samplesPerSeg);

  const baseR = chordRadius(N);
  const R = baseR * p / maxPrime; // largest prime = chord radius, smaller coil inside
  const nodeAngle = GOLDEN_ANGLE; // all nodes sit at this angle
  // Offset helix center inward (toward 0 node) so loops extend toward center
  const cx = (baseR - R) * Math.cos(nodeAngle);
  const cz = (baseR - R) * Math.sin(nodeAngle);
  // Start angle: pointing outward toward node position (tangent point)
  const startAngle = nodeAngle;
  const nodeY = n => SPHERE_R * (1 - 2 * n / N);
  const pts = [];

  for (let k = 1; k < lastMult; k++) {
    const y1 = nodeY(k * p);
    const y2 = nodeY((k + 1) * p);
    for (let s = 0; s < samplesPerSeg; s++) {
      const t = s / samplesPerSeg;
      const y = y1 + t * (y2 - y1);
      const angle = startAngle + t * Math.PI * 2;
      pts.push(cx + R * Math.cos(angle), y, cz + R * Math.sin(angle));
    }
  }

  // Extension beyond last multiple
  {
    const y1 = nodeY(lastMultN);
    const y2 = nodeY(lastMultN + p);
    const arcSamples = extending ? extraSamples + extendSamples : extendSamples;
    for (let s = 0; s <= arcSamples; s++) {
      const t = s / samplesPerSeg;
      const y = y1 + t * (y2 - y1);
      if (y < -SPHERE_R) break;
      const angle = startAngle + t * Math.PI * 2;
      pts.push(cx + R * Math.cos(angle), y, cz + R * Math.sin(angle));
    }
  }

  return new Float32Array(pts);
}

// ============================================================
// STRING CURVE BUILDER — vertical semicircular arcs at chord edge
// ============================================================
function buildStringArcs(p, N, samplesPerSeg = 20) {
  const lastMult = Math.floor(N / p);
  if (lastMult < 1) return null;
  const lastMultN = lastMult * p;
  const extending = lastMultN < N;
  const extraFrac = extending ? (N - lastMultN) / p : 0;
  const extraSamples = Math.ceil(extraFrac * samplesPerSeg);
  const EXTEND_FRAC = 0.5;
  const extendSamples = Math.ceil(EXTEND_FRAC * samplesPerSeg);

  const nx = 0;
  const nz = 0;
  // Bulge direction — arcs swing in X
  const dirX = 1;
  const dirZ = 0;
  const nodeY = n => SPHERE_R * (1 - 2 * n / N);
  const pts = [];

  for (let k = 1; k < lastMult; k++) {
    const y1 = nodeY(k * p);
    const y2 = nodeY((k + 1) * p);
    const cy = (y1 + y2) / 2;
    const r = (y1 - y2) / 2; // half the vertical span
    const inward = (k % 2 === 1); // alternate toward/away from 0
    for (let s = 0; s < samplesPerSeg; s++) {
      const t = s / samplesPerSeg;
      const angle = Math.PI * (1 - t);
      const y = cy - r * Math.cos(angle);
      const bulge = r * Math.sin(angle) * (inward ? 1 : -1);
      pts.push(nx + dirX * bulge, y, nz + dirZ * bulge);
    }
  }

  // Extension
  {
    const y1 = nodeY(lastMultN);
    const y2 = nodeY(lastMultN + p);
    const cy = (y1 + y2) / 2;
    const r = (y1 - y2) / 2;
    const inward = (lastMult % 2 === 1);
    const arcSamples = extending ? extraSamples + extendSamples : extendSamples;
    for (let s = 0; s <= arcSamples; s++) {
      const t = s / samplesPerSeg;
      const angle = Math.PI * (1 - t);
      const y = cy - r * Math.cos(angle);
      if (y < -SPHERE_R) break;
      const bulge = r * Math.sin(angle) * (inward ? 1 : -1);
      pts.push(nx + dirX * bulge, y, nz + dirZ * bulge);
    }
  }

  return new Float32Array(pts);
}

// ============================================================
// LERP HELPERS (for curves — lerp between shape arrays)
// ============================================================
function lerpShapeArrays(linePts, diskPts, spherePts, chordPts, springPts, stringPts, dim, out) {
  if (dim <= 0.5) {
    const t = Math.max(0, dim) * 2;
    for (let i = 0; i < out.length; i++)
      out[i] = linePts[i] + t * (diskPts[i] - linePts[i]);
  } else if (dim <= 1.0) {
    const t = (dim - 0.5) * 2;
    for (let i = 0; i < out.length; i++)
      out[i] = diskPts[i] + t * (spherePts[i] - diskPts[i]);
  } else if (dim <= 1.5) {
    const t = (dim - 1.0) * 2;
    for (let i = 0; i < out.length; i++)
      out[i] = spherePts[i] + t * (chordPts[i] - spherePts[i]);
  } else if (dim <= 2.0) {
    const t = (dim - 1.5) * 2;
    for (let i = 0; i < out.length; i++)
      out[i] = chordPts[i] + t * (springPts[i] - chordPts[i]);
  } else {
    const t = (dim - 2.0) * 2;
    for (let i = 0; i < out.length; i++)
      out[i] = springPts[i] + t * (stringPts[i] - springPts[i]);
  }
}

// ============================================================
// BUILD SCENE
// ============================================================
export function buildScene() {
  const N = resolveN();
  const dim = state.dimension;
  const selectedPrimes = state.primes;
  const primeRGB = getPrimeRGB(selectedPrimes, state.colorScheme);
  const nodeSizeMult = state.nodeSize;

  const visible = getVisibleNodes(N, selectedPrimes);
  const selectedPrimeSet = new Set(selectedPrimes);

  // Save camera state
  let savedCamPos = null, savedCamTarget = null;
  if (threeCamera && threeControls) {
    savedCamPos = threeCamera.position.clone();
    savedCamTarget = threeControls.target.clone();
  }

  // Notify modules before build
  for (const [name, mod] of getModules()) {
    if (!mod.enabled || mod._crashed) continue;
    try { mod.beforeBuild?.({ state }); } catch (e) {
      console.error(`[PNM] Module "${name}" beforeBuild error:`, e);
    }
  }

  cleanup();

  // Scene
  //
  // The background is painted by CSS on #viewport, not by Three, and the canvas
  // is transparent. This exists so the lens chalkboard can sit BEHIND the
  // figure instead of on top of it.
  //
  // It used to be a DOM layer over the canvas using mix-blend-mode: lighten,
  // which was ingenious and wrong. Lighten is per-channel max, so a chalkboard
  // of #1a2620 did not merely replace the background — it raised the green and
  // blue of every node darker than itself. Deep reds came out muddy teal and
  // the whole figure shifted while the lens was open. The colour IS the
  // factorisation in this app, so a blend mode that edits colour is not a
  // presentation detail, it is a lie about the mathematics.
  //
  // An opaque canvas cannot have anything behind it, so the fix is a
  // transparent one. Non-lens areas look identical because #viewport carries
  // the same colour the scene used to clear to.
  const scene = new THREE.Scene();
  const bgColor = new THREE.Color(
    state.backgroundStyle === 'white' ? 0xf5f5f0 : state.sceneBackground
  );
  scene.background = null;
  if (viewport) viewport.style.backgroundColor = `#${bgColor.getHexString()}`;
  threeScene = scene;

  // Restore camera
  if (savedCamPos) {
    threeCamera.position.copy(savedCamPos);
    threeControls.target.copy(savedCamTarget);
  }

  // Lights
  scene.add(new THREE.AmbientLight(0x404040, 2.5));
  const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
  dirLight.position.set(5, 10, 7);
  scene.add(dirLight);

  // Scaling: normalize disk positions to fit sphere radius
  const maxR = SPACING_2D * Math.sqrt(N);
  const flatScale = maxR > 0 ? SPHERE_R / maxR : 1;

  // Node geometry (shared)
  const baseR = Math.max(0.03, Math.min(0.2, 3 / Math.sqrt(N))) * nodeSizeMult;
  const nodeGeo = new THREE.SphereGeometry(baseR, 14, 10);
  const sunR = baseR * 2.5;
  const earthR = baseR * 1.6;

  // Build nodes
  nodeData = [];
  nodeByN.clear();

  for (const n of visible) {
    if (!shouldShowNode(n, state)) continue;
    if (n !== 0 && n !== 1 && !state.showNodes) continue;
    if (n === 0 && !state.showZero) continue;
    if (n === 1 && !state.showOne) continue;

    const c = nodeColor(n, primeRGB, selectedPrimes);
    const baseColor = new THREE.Color(c[0], c[1], c[2]);
    const factors = selectedPrimes.filter(p => n > 1 && n % p === 0);
    const allFactors = primeFactorsOf(n);
    const isPrime = selectedPrimeSet.has(n);

    let mesh;

    if (n === 0) {
      // SUN
      const sunGeo = new THREE.SphereGeometry(sunR, 32, 24);
      const sunMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(1.0, 0.85, 0.2),
        roughness: 0.3, metalness: 0.0,
        emissive: new THREE.Color(1.0, 0.6, 0.1),
        emissiveIntensity: state.zeroGlow ? state.zeroGlowIntensity : 0,
      });
      mesh = new THREE.Mesh(sunGeo, sunMat);

      // Glow sprite
      if (state.zeroGlow) {
        const glowCnv = document.createElement('canvas');
        const gCtx = glowCnv.getContext('2d');
        glowCnv.width = 256; glowCnv.height = 256;
        const grad = gCtx.createRadialGradient(128, 128, 0, 128, 128, 128);
        grad.addColorStop(0, 'rgba(255, 200, 50, 0.42)');
        grad.addColorStop(0.3, 'rgba(255, 150, 20, 0.21)');
        grad.addColorStop(0.7, 'rgba(255, 100, 0, 0.056)');
        grad.addColorStop(1, 'rgba(255, 80, 0, 0)');
        gCtx.fillStyle = grad;
        gCtx.fillRect(0, 0, 256, 256);
        const glowTex = new THREE.CanvasTexture(glowCnv);
        const glowMat = new THREE.SpriteMaterial({ map: glowTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false });
        const glowSprite = new THREE.Sprite(glowMat);
        const glowSize = sunR * 8;
        glowSprite.scale.set(glowSize, glowSize, 1);
        const pos = interpolatedPos(0, N, dim);
        glowSprite.position.copy(pos);
        scene.add(glowSprite);
        glowSprites.push(glowSprite);
      }
    } else if (n === 1) {
      // EARTH
      const earthGeo = new THREE.SphereGeometry(earthR, 24, 18);
      const earthCnv = document.createElement('canvas');
      const eCtx = earthCnv.getContext('2d');
      earthCnv.width = 128; earthCnv.height = 64;
      eCtx.fillStyle = '#1a4a8a';
      eCtx.fillRect(0, 0, 128, 64);
      eCtx.fillStyle = '#2a7a3a';
      const landShapes = [[20,15,25,18],[60,8,30,20],[80,35,20,15],[15,40,18,12],[50,38,22,14]];
      for (const [x,y,w,h] of landShapes) {
        eCtx.beginPath();
        eCtx.ellipse(x, y, w/2, h/2, 0, 0, Math.PI*2);
        eCtx.fill();
      }
      eCtx.fillStyle = '#ddeeff';
      eCtx.fillRect(0, 0, 128, 5);
      eCtx.fillRect(0, 59, 128, 5);
      const earthTex = new THREE.CanvasTexture(earthCnv);
      earthTex.wrapS = THREE.RepeatWrapping;
      const earthMat = new THREE.MeshStandardMaterial({
        map: earthTex,
        roughness: 0.7, metalness: 0.05,
        emissive: new THREE.Color(0.02, 0.05, 0.12),
      });
      mesh = new THREE.Mesh(earthGeo, earthMat);
    } else {
      // Normal node
      const mat = new THREE.MeshStandardMaterial({
        color: baseColor.clone(),
        roughness: 0.4,
        metalness: 0.1,
        emissive: (isPrime && state.primeGlow) ? baseColor.clone().multiplyScalar(0.3) : new THREE.Color(0, 0, 0),
        emissiveIntensity: (isPrime && state.primeGlow) ? state.primeGlowIntensity : 0,
      });
      mesh = new THREE.Mesh(nodeGeo, mat);
    }

    const pos = interpolatedPos(n, N, dim);
    mesh.position.copy(pos);

    const nd = {
      n,
      mesh,
      currentPos: pos.clone(),
      baseScale: n === 0 ? sunR : n === 1 ? earthR : baseR,
      color: c,
      baseColor,
      factors,
      allFactors,
      isPrime,
      isSun: n === 0,
      isEarth: n === 1,
      isBackground: false,
      moduleData: {},
    };

    scene.add(mesh);
    nodeData.push(nd);
    nodeByN.set(n, nd);
  }

  // Background nodes (All Integers in Range)
  if (state.showNodes && state.showAllIntegers) {
    const visibleSet = new Set(visible);
    const bgGeo = new THREE.SphereGeometry(baseR * 0.7, 10, 8);
    const primeGeo = new THREE.SphereGeometry(baseR, 14, 10);

    for (let n = 2; n <= N; n++) {
      if (visibleSet.has(n)) continue;

      const mathPrime = isPrimeNumber(n);
      // Math primes not in selection get prime-sized, light grey
      const geo = mathPrime ? primeGeo : bgGeo;
      const bgColor = mathPrime ? new THREE.Color(0.16, 0.16, 0.19) : new THREE.Color(0.15, 0.15, 0.18);
      const mat = new THREE.MeshStandardMaterial({
        color: bgColor,
        roughness: mathPrime ? 0.6 : 0.8,
        metalness: 0.0,
        emissive: (mathPrime && state.primeGlow) ? bgColor.clone().multiplyScalar(0.3) : new THREE.Color(0, 0, 0),
        emissiveIntensity: (mathPrime && state.primeGlow) ? state.primeGlowIntensity : 0,
      });

      const mesh = new THREE.Mesh(geo, mat);
      const pos = interpolatedPos(n, N, dim);
      mesh.position.copy(pos);

      const nd = {
        n,
        mesh,
        currentPos: pos.clone(),
        baseScale: mathPrime ? baseR : baseR * 0.7,
        color: [bgColor.r, bgColor.g, bgColor.b],
        baseColor: bgColor,
        factors: [],
        allFactors: primeFactorsOf(n),
        isPrime: mathPrime,
        isBackground: true,
        moduleData: {},
      };

      scene.add(mesh);
      nodeData.push(nd);
      nodeByN.set(n, nd);
    }
  }

  // === PRIME GLOW SPRITES ===
  if (state.primeGlow && state.primeGlowIntensity > 1.0) {
    // Shared white radial gradient texture — tinted per-node via material color
    const glowCnv = document.createElement('canvas');
    const gCtx = glowCnv.getContext('2d');
    glowCnv.width = 128; glowCnv.height = 128;
    const grad = gCtx.createRadialGradient(64, 64, 0, 64, 64, 64);
    grad.addColorStop(0, 'rgba(255, 255, 255, 0.6)');
    grad.addColorStop(0.3, 'rgba(255, 255, 255, 0.3)');
    grad.addColorStop(0.7, 'rgba(255, 255, 255, 0.08)');
    grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    gCtx.fillStyle = grad;
    gCtx.fillRect(0, 0, 128, 128);
    const sharedGlowTex = new THREE.CanvasTexture(glowCnv);

    // Opacity ramps from 0 at intensity=1 to full at intensity=2
    const spriteOpacity = Math.min(1, state.primeGlowIntensity - 1.0);

    for (const nd of nodeData) {
      if (!nd.isPrime || nd.isSun || nd.isEarth) continue;
      const glowMat = new THREE.SpriteMaterial({
        map: sharedGlowTex,
        color: nd.baseColor.clone(),
        transparent: true,
        opacity: spriteOpacity,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        depthTest: false,
      });
      const glowSprite = new THREE.Sprite(glowMat);
      const glowSize = nd.baseScale * 6;
      glowSprite.scale.set(glowSize, glowSize, 1);
      glowSprite.position.copy(nd.mesh.position);
      glowSprite.userData = { nodeRef: nd };
      scene.add(glowSprite);
      glowSprites.push(glowSprite);
    }
  }

  // === PARASTICHY CURVES ===
  curveLines = [];
  if (state.showCurves) {
    const W = threeRenderer ? threeRenderer.domElement.width : 800;
    const H = threeRenderer ? threeRenderer.domElement.height : 600;

    for (let ci = 0; ci < selectedPrimes.length; ci++) {
      const p = selectedPrimes[ci];
      const S = SAMPLES_PER_SEG;
      const lineArcPts = buildLineArcs(p, N, S);
      const flatCurve = buildParastichy(p, N, n => flatPolar(n), S);
      const sphereCurve = buildParastichy(p, N, n => spherePolar(n, N), S);
      const chordCurve = buildParastichy(p, N, n => chordPolar(n, N), S);
      const maxPrime = selectedPrimes[selectedPrimes.length - 1];
      const springArcPts = buildSpringArcs(p, N, maxPrime, S);
      const stringArcPts = buildStringArcs(p, N, S);
      if (!lineArcPts || !springArcPts || !stringArcPts || flatCurve.length < 2 || sphereCurve.length < 2 || chordCurve.length < 2) continue;

      const numPts = Math.min(lineArcPts.length / 3, flatCurve.length, sphereCurve.length, chordCurve.length, springArcPts.length / 3, stringArcPts.length / 3);
      const diskPts = new Float32Array(numPts * 3);
      const spherePts = new Float32Array(numPts * 3);
      const chordPts = new Float32Array(numPts * 3);

      for (let i = 0; i < numPts; i++) {
        const fv = flatFromPolar(flatCurve[i][0], flatCurve[i][1]);
        diskPts[i * 3]     = fv.x * flatScale;
        diskPts[i * 3 + 1] = fv.y * flatScale;
        diskPts[i * 3 + 2] = fv.z * flatScale;
        const sv = sphereFromPolar(sphereCurve[i][0], sphereCurve[i][1]);
        spherePts[i * 3]     = sv.x;
        spherePts[i * 3 + 1] = sv.y;
        spherePts[i * 3 + 2] = sv.z;
        const cv = chordFromPolar(chordCurve[i][0], chordCurve[i][1], N);
        chordPts[i * 3]     = cv.x;
        chordPts[i * 3 + 1] = cv.y;
        chordPts[i * 3 + 2] = cv.z;
      }

      const linePts = lineArcPts.length === numPts * 3
        ? lineArcPts : lineArcPts.slice(0, numPts * 3);
      const springPts = springArcPts.length === numPts * 3
        ? springArcPts : springArcPts.slice(0, numPts * 3);
      const stringPts = stringArcPts.length === numPts * 3
        ? stringArcPts : stringArcPts.slice(0, numPts * 3);

      const positions = new Float32Array(numPts * 3);
      lerpShapeArrays(linePts, diskPts, spherePts, chordPts, springPts, stringPts, dim, positions);

      const geo = new LineGeometry();
      geo.setPositions(positions);

      const c = primeRGB[p];
      const baseColor = new THREE.Color(c[0], c[1], c[2]);
      const mat = new LineMaterial({
        color: baseColor.getHex(),
        linewidth: state.lineWidth,
        worldUnits: false,
        resolution: new THREE.Vector2(W, H),
      });
      const line = new Line2(geo, mat);
      line.computeLineDistances();
      line.frustumCulled = false;
      line.userData = {
        baseColor: baseColor.clone(), primeIdx: ci, prime: p,
        // The colour this line wants to be, before the thickness fade. Colour
        // drift writes here rather than to material.color so the two effects
        // compose instead of overwriting each other every frame.
        liveColor: baseColor.clone(),
        linePts, diskPts, spherePts, chordPts, springPts, stringPts, numPts,
        lerpBuf: new Float32Array(numPts * 3),
      };
      scene.add(line);
      curveLines.push(line);
    }
  }

  // The colour thin lines fade toward. Read from the background colour rather
  // than hardcoded so the white-background option fades the right way too.
  // (Was `scene.background.clone()`; scene.background is null now that the
  // canvas is transparent, so it reads the same value from its new home.)
  const fadeTarget = bgColor.clone();

  // Notify modules to build
  const buildCtx = { scene, nodes: nodeData, nodeByN, N, state, baseR, flatScale };
  for (const [name, mod] of getModules()) {
    if (!mod.enabled || mod._crashed) continue;
    try {
      mod.build?.(buildCtx);
    } catch (e) {
      console.error(`[PNM] Module "${name}" crashed in build():`, e);
      mod.enabled = false;
      mod._crashed = true;
      try { mod.destroy?.(); } catch (_) {}
      emit('moduleCrash', { name, error: e });
    }
  }

  // Collect all unique primes across all nodes (for color drift on everything)
  const allPrimesInScene = [...new Set(nodeData.flatMap(nd => nd.allFactors))].sort((a, b) => a - b);
  const primeToIndex = new Map(allPrimesInScene.map((p, i) => [p, i]));

  // Start animation
  const animStartTime = performance.now();
  // Seeded to the same instant as animStartTime so the very first frame sees a
  // dt near zero rather than a spike measured from whenever the previous scene
  // last drew — which, after a rebuild, could be a long time ago.
  let lastFrameTime = animStartTime;

  function animate() {
    animId = requestAnimationFrame(animate);
    if (!threeRenderer || contextLost) return;

    const now = performance.now();
    const t = (now - animStartTime) / 1000;

    // Real elapsed seconds, not an assumed 1/60.
    //
    // The morph used to advance by a hardcoded 1/60 per FRAME, which quietly
    // made every duration in this app a frame count wearing a seconds costume.
    // A "3 second" dwell was 180 frames: about 1.5s on a 120Hz phone, 3s at
    // 60Hz, 6s on anything struggling at 30fps. The same figure therefore
    // morphed at twice the intended speed on exactly the hardware most likely
    // to be used to judge it. Worse, the pulse and colour-drift effects above
    // already ran off performance.now(), so the two halves of the animation
    // disagreed with each other on every display that was not 60Hz.
    //
    // Clamped to 100ms. A backgrounded tab, a long GC pause or a breakpoint
    // produces an enormous gap, and feeding that in raw would teleport the
    // morph across several keyframes in one step — skipping the dwell at each,
    // which is the one thing the dwell exists to prevent. Capping means a
    // stalled app resumes where it left off instead of somewhere arbitrary.
    const dt = Math.min((now - lastFrameTime) / 1000, 0.1);
    lastFrameTime = now;

    threeControls.autoRotate = state.autoRotate && !state.paused;
    threeControls.autoRotateSpeed = state.driftSpeed * 0.8;
    threeControls.update();

    // Update line resolution + pulse each frame
    for (const line of curveLines) {
      line.material.resolution.set(
        threeRenderer.domElement.width,
        threeRenderer.domElement.height
      );
      let lw = state.lineWidth;
      if (state.linePulse && !state.paused) {
        const p = line.userData.prime;
        const pulse = 0.5 + 0.5 * Math.sin(t * state.pulseSpeed * Math.PI / p); // 0..1
        lw = state.lineWidth + pulse * state.lineWidth * 4;
      }
      line.material.linewidth = lw;
    }

    // Shape morph — bounce between 0..1.5, pause at keyframes (0, 0.5, 1.0, 1.5)
    if (state.shapeDrift && !state.paused) {
      if (!morphActive) {
        morphPos = state.dimension;
        morphDir = Math.random() < 0.5 ? 1 : -1;
        morphPauseTimer = DWELL_SECONDS;
        morphActive = true;
      }

      // dt comes from the real clock at the top of the frame now. The local
      // `const dt = 1 / 60` that used to sit here shadowed it, which would have
      // made this whole change a silent no-op.
      const speed = state.shapeDriftSpeed * 0.15;
      const maxDim = 2.5;
      const keyframes = [0, 0.5, 1.0, 1.5, 2.0, 2.5];

      if (morphPauseTimer > 0) {
        morphPauseTimer -= dt;
      } else {
        const prevPos = morphPos;
        morphPos += morphDir * speed * dt;

        // Bounce at boundaries
        if (morphPos >= maxDim) { morphPos = maxDim; morphDir = -1; morphPauseTimer = DWELL_SECONDS; }
        if (morphPos <= 0.0) { morphPos = 0.0; morphDir = 1; morphPauseTimer = DWELL_SECONDS; }

        // Pause at intermediate keyframes — detect crossing
        for (const kf of keyframes) {
          if (kf === 0 || kf === maxDim) continue;
          if (morphDir > 0 && morphPos >= kf && prevPos < kf) {
            morphPos = kf; morphPauseTimer = DWELL_SECONDS; break;
          } else if (morphDir < 0 && morphPos <= kf && prevPos > kf) {
            morphPos = kf; morphPauseTimer = DWELL_SECONDS; break;
          }
        }
      }

      // Nothing to mirror into the DOM any more: the Shape section is gone and
      // the transport polls state.dimension directly on its own frame loop.
      state.dimension = morphPos;
    } else {
      morphActive = false;
    }

    // Dimension interpolation
    const dim = state.dimension;
    if (dim !== lastDim) {
      lastDim = dim;
      const N = resolveN();
      for (const nd of nodeData) {
        const pos = interpolatedPos(nd.n, N, dim);
        nd.mesh.position.copy(pos);
        nd.currentPos.copy(pos);
      }
      // Update glow sprites
      for (const gs of glowSprites) {
        if (gs.userData.nodeRef) {
          gs.position.copy(gs.userData.nodeRef.mesh.position);
        } else {
          gs.position.copy(interpolatedPos(0, N, dim));
        }
      }
      // Update curve positions
      for (const line of curveLines) {
        const { linePts, diskPts, spherePts, chordPts, springPts, stringPts, numPts, lerpBuf } = line.userData;
        lerpShapeArrays(linePts, diskPts, spherePts, chordPts, springPts, stringPts, dim, lerpBuf);
        const attr = line.geometry.getAttribute('instanceStart');
        if (!attr) continue;
        const arr = attr.data.array;
        for (let i = 0; i < numPts - 1; i++) {
          const si = i * 3, ei = (i + 1) * 3, bi = i * 6;
          arr[bi]     = lerpBuf[si];     arr[bi + 1] = lerpBuf[si + 1]; arr[bi + 2] = lerpBuf[si + 2];
          arr[bi + 3] = lerpBuf[ei];     arr[bi + 4] = lerpBuf[ei + 1]; arr[bi + 5] = lerpBuf[ei + 2];
        }
        attr.data.needsUpdate = true;
      }
    }

    // Pulse
    if (state.pulse && !state.paused) {
      for (const nd of nodeData) {
        if (nd.isSun || nd.isEarth) continue;
        const af = nd.allFactors;
        if (af.length === 0) { nd.mesh.scale.setScalar(1); continue; }
        let pulse = 0;
        for (const p of af) pulse += Math.sin(t * state.pulseSpeed * Math.PI / p);
        const sc = 1 + 0.2 * pulse / Math.sqrt(af.length);
        nd.mesh.scale.setScalar(Math.max(0.3, sc));
      }
    } else {
      // Reset scales if pulse was just turned off
      for (const nd of nodeData) {
        if (nd.isSun || nd.isEarth) continue;
        if (nd.mesh.scale.x !== 1) nd.mesh.scale.setScalar(1);
      }
    }

    // Color drift — sine-based hue cycling for ALL primes (not just selected).
    //
    // Deliberately NOT gated on `paused`. Pause holds the figure still — the
    // morph, the rotation, the pulse — but the colour cycle is what you are
    // looking at when you stop to look, and freezing it made pausing feel like
    // the app had died rather than settled.
    if (state.colorDrift) {
      const speed = state.colorDriftSpeed;

      // Compute drifting hue for every prime in the scene
      const driftHue = {};
      for (const p of allPrimesInScene) {
        const ci = primeToIndex.get(p);
        driftHue[p] = (0.5 + 0.5 * Math.sin(t * 0.15 * speed + ci * 0.8)) * 0.65;
      }

      // Update all node colors — average factor hues, then convert once
      for (const nd of nodeData) {
        if (nd.isSun || nd.isEarth) continue;
        const af = nd.allFactors;
        if (af.length === 0) continue;
        let hueSum = 0;
        for (const p of af) hueSum += (driftHue[p] || 0);
        const avgHue = hueSum / af.length;
        const c = hueToRGB(avgHue);
        nd.mesh.material.color.setRGB(c[0], c[1], c[2]);
        if (nd.isPrime && state.primeGlow) {
          nd.mesh.material.emissive.setRGB(c[0] * 0.3, c[1] * 0.3, c[2] * 0.3);
        }
      }

      // Update curve colors
      for (const line of curveLines) {
        const p = line.userData.prime;
        const h = driftHue[p];
        if (h != null) {
          const c = hueToRGB(h);
          line.userData.liveColor.setRGB(c[0], c[1], c[2]);
        }
      }

      // Update glow sprite colors
      for (const gs of glowSprites) {
        const nd = gs.userData.nodeRef;
        if (!nd || nd.isSun) continue;
        gs.material.color.copy(nd.mesh.material.color);
      }

      colorDriftWasOn = true;
    } else if (colorDriftWasOn) {
      // Snap back to static colors
      for (const nd of nodeData) {
        if (nd.isSun || nd.isEarth) continue;
        nd.mesh.material.color.copy(nd.baseColor);
        if (nd.isPrime && state.primeGlow && !nd.isBackground) {
          nd.mesh.material.emissive.copy(nd.baseColor).multiplyScalar(0.3);
        } else {
          nd.mesh.material.emissive.setRGB(0, 0, 0);
        }
      }
      for (const line of curveLines) {
        line.userData.liveColor.copy(line.userData.baseColor);
      }
      for (const gs of glowSprites) {
        const nd = gs.userData.nodeRef;
        if (!nd || nd.isSun) continue;
        gs.material.color.copy(nd.baseColor);
      }
      colorDriftWasOn = false;
    }

    // Thickness fade, applied last so it composes with whichever branch above
    // set the colour this frame. Always derived from liveColor rather than
    // lerping material.color in place — lerping the live value would compound
    // frame over frame and walk every line into the background.
    const fade = lineFadeAmount(state.lineWidth);
    for (const line of curveLines) {
      line.material.color.copy(line.userData.liveColor);
      if (fade < 1) line.material.color.lerp(fadeTarget, 1 - fade);
    }

    // Earth rotation
    if (!state.paused) {
      const earthNd = nodeByN.get(1);
      if (earthNd && earthNd.isEarth) {
        earthNd.mesh.rotation.y = t * 0.3;
      }
    }

    // Module animate hooks
    // dt is the real measured delta, same as the morph uses. It was a hardcoded
    // 1/60 here too — so the frame-rate assumption was not confined to this
    // file, it was published to every module through the animate contract.
    // No module reads it today, which is the only reason this never surfaced;
    // the first one that does would have inherited the bug silently.
    const animCtx = { time: t, dt, dim, scene: threeScene, camera: threeCamera, nodes: nodeData, nodeByN, N: resolveN() };
    for (const [name, mod] of getModules()) {
      if (!mod.enabled || mod._crashed) continue;
      try {
        mod.animate?.(animCtx);
      } catch (e) {
        console.error(`[PNM] Module "${name}" crashed in animate():`, e);
        mod.enabled = false;
        mod._crashed = true;
        try { mod.destroy?.(); } catch (_) {}
        emit('moduleCrash', { name, error: e });
      }
    }

    threeRenderer.render(threeScene, threeCamera);
  }
  animate();

  emit('build', buildCtx);
}

// ============================================================
// INIT — One-time setup (renderer, camera, controls)
// ============================================================
let viewport = null;

// ============================================================
// DEVICE PIXEL RATIO
// ============================================================
// Capped at 2. A 3x phone renders ~2.25x the fragments of a 2x one for a
// difference almost nobody can resolve on a 5-inch screen, and this app already
// asks a lot of the fill rate: a thousand lit spheres, additive glow sprites,
// and thick Line2 curves that are drawn as screen-space quads.
//
// Uncapped devicePixelRatio was the single cheapest performance mistake in the
// pre-v1 build. Capping is near-universal in shipped WebGL for exactly this
// reason.
//
// NOT measured on a low-end device — see docs/V1-PLAN.md §3. This is the change
// on that list carrying the highest confidence, but it is still judgement.
const MAX_PIXEL_RATIO = 2;
const pixelRatio = () => Math.min(devicePixelRatio || 1, MAX_PIXEL_RATIO);

// ============================================================
// WEBGL CONTEXT LOSS
// ============================================================
// Android reclaims GL contexts. Backgrounding the app, memory pressure, the
// screen locking, another app wanting the GPU — any of these can take the
// context away, and it is markedly more likely on the cheap hardware this app
// has never been tested on.
//
// Without these handlers the canvas goes black and STAYS black. No error, no
// recovery, nothing to do but force-quit. In a browser tab that is an annoyance
// you fix by reloading. In an installed TWA, with no address bar and no reload
// button, it is the whole app dead until the user works out how to kill it —
// and for a paid app, that is a refund and a one-star review.
//
// preventDefault() on the lost event is the load-bearing line: without it the
// browser never fires `webglcontextrestored` and recovery is impossible.
let contextLost = false;

function installContextLossHandlers(canvas) {
  canvas.addEventListener('webglcontextlost', (e) => {
    // Tells the browser we intend to recover. Omit this and restoration never
    // happens — this is the difference between a recoverable app and a dead one.
    e.preventDefault();
    contextLost = true;
    if (animId) { cancelAnimationFrame(animId); animId = null; }
    console.warn('[PNM] WebGL context lost — pausing until it is restored.');
    emit('contextLost', {});
  }, false);

  canvas.addEventListener('webglcontextrestored', () => {
    contextLost = false;
    console.warn('[PNM] WebGL context restored — rebuilding the scene.');
    // Every GPU-side resource died with the context: geometries, materials,
    // textures, the lot. buildScene() constructs all of them from scratch, so
    // rebuilding is both the correct recovery and the one that cannot drift out
    // of step with normal startup. It also restarts the animation loop.
    try {
      // The rebuild runs cleanup() first, which would otherwise try to dispose
      // resources the dead context already freed. Cleared in `finally` so a
      // failed rebuild cannot leave normal teardown permanently disabled — that
      // would turn a recoverable glitch into a memory leak for the rest of the
      // session.
      skipGpuDispose = true;
      try { buildScene(); } finally { skipGpuDispose = false; }
      emit('contextRestored', {});
    } catch (err) {
      console.error('[PNM] Rebuild after context restore failed:', err);
    }
  }, false);
}

export function isContextLost() {
  return contextLost;
}

export function init(el) {
  viewport = el;
  const W = el.clientWidth, H = el.clientHeight;

  // Renderer
  // alpha: true so the lens chalkboard can sit behind the figure. See the
  // scene setup in buildScene() for why. The clear colour is fully transparent
  // and #viewport paints the background instead.
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setClearColor(0x000000, 0);
  renderer.setSize(W, H);
  renderer.setPixelRatio(pixelRatio());
  el.appendChild(renderer.domElement);
  threeRenderer = renderer;

  installContextLossHandlers(renderer.domElement);

  // Camera
  const camera = new THREE.PerspectiveCamera(50, W / H, 0.1, 500);
  camera.position.copy(HOME_CAM_POS);
  threeCamera = camera;

  // Scene (temporary, replaced by buildScene)
  threeScene = new THREE.Scene();

  // Controls
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  threeControls = controls;

  // Resize observer
  resizeObserver = new ResizeObserver(() => {
    if (!threeRenderer) return;
    const w = el.clientWidth, h = el.clientHeight;
    threeCamera.aspect = w / h;
    threeCamera.updateProjectionMatrix();
    threeRenderer.setSize(w, h);
    // Re-applied on resize, not only at startup: dragging a window between a
    // retina and a non-retina display changes devicePixelRatio without
    // recreating the renderer, and Three does not notice on its own.
    threeRenderer.setPixelRatio(pixelRatio());
  });
  resizeObserver.observe(el);

  // Notify modules of init
  const initCtx = { scene: threeScene, camera, renderer, controls };
  for (const [name, mod] of getModules()) {
    if (mod._crashed) continue;
    try {
      mod.init?.(initCtx);
    } catch (e) {
      console.error(`[PNM] Module "${name}" crashed in init():`, e);
      mod._crashed = true;
      emit('moduleCrash', { name, error: e });
    }
  }

  emit('init', initCtx);

  // Build initial scene
  buildScene();
}

// ============================================================
// PUBLIC API
// ============================================================
export function update(partial) {
  let needsRebuild = false;
  for (const [key, val] of Object.entries(partial)) {
    if (state[key] !== val) {
      const oldVal = state[key];
      state[key] = val;
      emit('stateChange', { key, value: val, oldValue: oldVal });
      if (!HOT_KEYS.has(key)) needsRebuild = true;
    }
  }
  if (needsRebuild) buildScene();
}

export function rebuild(full) {
  if (full) Object.assign(state, full);
  buildScene();
}

// Send the morph back to the start of its travel.
//
// Reset always did set state.dimension to 0, but the morph keeps its own
// position in module scope and the animation loop only re-seeds it when
// morphActive is false. It was still true, so the next frame overwrote
// state.dimension from the stale morphPos and the figure snapped straight back
// to wherever it had drifted to. Reset looked like it did nothing to the shape.
//
// Direction is set explicitly rather than left to the loop's random pick:
// 0 is the bottom of the range, so a -1 would just bounce, spending a second
// dwell at Line before setting off.
// Look straight down at the figure, framed to fit.
//
// The Disk lies in the XZ plane, so overhead is the one angle that shows its
// phyllotaxis spiral whole rather than as a foreshortened ellipse. Distance is
// derived from the aspect rather than fixed: the vertical FOV is what the
// camera declares, so on a portrait phone the horizontal is the tighter
// constraint and a distance that frames the disk on a desktop crops it badly.
export function setCameraTopDown() {
  if (!threeCamera || !threeControls) return;
  // Was 1.15. Pulled in to 1.06 — Dazzle fills the disk edge to edge, so the
  // extra air read as the figure sitting small in the frame rather than as
  // breathing room.
  const fitR = SPHERE_R * 1.06;                       // a little air around it
  const halfFov = (threeCamera.fov * Math.PI / 180) / 2;
  const distV = fitR / Math.tan(halfFov);
  const distH = distV / Math.max(0.0001, threeCamera.aspect);
  const d = Math.max(distV, distH);

  threeControls.target.set(0, 0, 0);
  // Not exactly (0, d, 0). A view direction parallel to the up vector is
  // degenerate — OrbitControls' azimuth becomes undefined and the first drag
  // snaps the camera somewhere arbitrary. A hair of z is invisible and keeps
  // the spherical coordinates well defined.
  threeCamera.position.set(0, d, d * 0.0015);
  threeCamera.up.set(0, 1, 0);
  threeCamera.lookAt(threeControls.target);
  threeControls.update();
}

export function resetMorph() {
  morphPos = 0;
  morphDir = 1;
  morphPauseTimer = DWELL_SECONDS;
  morphActive = true;
  lastDim = -1;          // force a position recompute on the next frame
}

// Put the camera back where it starts.
//
// Reset restored every setting but left the view wherever it had been dragged
// to, which made a reset from an odd angle look like it had half worked — the
// figure was correct and unrecognisable at the same time. buildScene() also
// restores a saved camera across rebuilds, so this has to run AFTER the
// rebuild it is paired with, not before, or the save clobbers it.
export function resetCamera() {
  if (!threeCamera || !threeControls) return;
  threeCamera.position.copy(HOME_CAM_POS);
  threeCamera.up.set(0, 1, 0);
  threeControls.target.copy(HOME_CAM_TARGET);
  threeCamera.lookAt(threeControls.target);
  threeControls.update();
}

export function destroy() {
  fullDestroy();
}

export function getInfo() {
  return { nodeCount: nodeData.length, N: resolveN(), primes: [...state.primes] };
}
