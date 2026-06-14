/**
 * CentralPark — fills the disaster_core with a blended community park.
 *
 * Owns:
 *   - Park LAWN   (healthy grass overlay, south/central core, y≈0.02)
 *   - POND/LAKE   (animated water shader, elliptical, center ~(222,305), y≈0.03)
 *   - SHORELINE   (sandy ring around pond, y≈0.025)
 *   - PATHS       (2–3 light-tan concrete walking paths, y≈0.04)
 *
 * Does NOT own: park props (trees/benches/gazebo → ParkProps.tsx)
 * Does NOT cover: rubble scar (upper-left of core), build-site exclusion rect
 *   X∈[256,324] Z∈[169,229].
 *
 * Coordinate system: world units = meters, XZ plane, Y up.
 * Core spans world X,Z ∈ [125,375], center (250,250).
 * Pond center: world (222, 305).  Radii: 28 m (X) × 20 m (Z).
 */

import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useTexture } from '@react-three/drei'

// ── Constants ────────────────────────────────────────────────────────────────

/** Pond center in world X, Z. */
const POND_CX = 222
const POND_CZ = 305
/** Pond ellipse radii (world meters). */
const POND_RX = 28
const POND_RZ = 20
/** Shoreline ring extra margin (world meters). */
const SHORE_MARGIN = 4

// ── Pond water shader — adapted from Hazards.tsx FloodPlanes ─────────────────
// Scrolling value-noise ripples, fresnel, depth tint, single draw call.

const POND_UNIFORMS = () => ({
  uTime:     { value: 0 },
  uShallow:  { value: new THREE.Color('#5a9fbf') }, // calm pond shallow
  uDeep:     { value: new THREE.Color('#0d3348') }, // deep still centre
  uShimmer:  { value: new THREE.Color('#d4eef8') }, // sky reflection shimmer
  uLightDir: { value: new THREE.Vector3(0.4, 0.8, 0.3).normalize() },
})

const POND_VERT = /* glsl */`
  varying vec2 vUv;
  varying vec3 vWorldPos;
  void main() {
    vUv = uv;
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorldPos = wp.xyz;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`

const POND_FRAG = /* glsl */`
  precision highp float;
  uniform float uTime;
  uniform vec3  uShallow;
  uniform vec3  uDeep;
  uniform vec3  uShimmer;
  uniform vec3  uLightDir;
  varying vec2  vUv;
  varying vec3  vWorldPos;

  // ── value noise ──────────────────────────────────────────────────────────
  float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p){
    vec2 i = floor(p), f = fract(p);
    float a = hash(i), b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0)), d = hash(i + vec2(1.0, 1.0));
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
  }

  float waterHeight(vec2 p){
    float t = uTime;
    float h  = noise(p * 0.5 + vec2(t * 0.25, t * 0.09));
    h += 0.5 * noise(p * 1.1 - vec2(t * 0.14, t * 0.21));
    return h;
  }

  void main() {
    // Use world XZ for seamless ripples across the whole ellipse.
    vec2 p = vWorldPos.xz * 0.45;

    // Derive ripple normal via finite differences.
    float e   = 0.30;
    float hL  = waterHeight(p - vec2(e, 0.0));
    float hR  = waterHeight(p + vec2(e, 0.0));
    float hD  = waterHeight(p - vec2(0.0, e));
    float hU  = waterHeight(p + vec2(0.0, e));
    vec3 n    = normalize(vec3(hL - hR, 2.0, hD - hU));

    // UV-based depth — centre of ellipse (0.5,0.5) = deep, rim = shallow.
    float distFromCentre = length(vUv - 0.5) * 2.0; // 0 centre → 1 rim
    float depthMix = clamp(1.0 - distFromCentre * 1.1, 0.0, 1.0);
    vec3 baseCol = mix(uShallow, uDeep, depthMix);

    // Diffuse from ripple normal.
    float diff = clamp(dot(n, normalize(uLightDir)), 0.0, 1.0);
    baseCol *= 0.65 + 0.5 * diff;

    // Specular shimmer.
    vec3 viewDir = normalize(cameraPosition - vWorldPos);
    vec3 halfDir = normalize(normalize(uLightDir) + viewDir);
    float spec   = pow(clamp(dot(n, halfDir), 0.0, 1.0), 90.0);

    // Fresnel.
    float fres = pow(1.0 - clamp(dot(n, viewDir), 0.0, 1.0), 3.0);

    vec3 col = baseCol + uShimmer * spec * 1.2 + uShimmer * fres * 0.22;

    // Smooth alpha fade near the shoreline edges via UV distance.
    float edgeFade = clamp((0.95 - distFromCentre) * 8.0, 0.0, 1.0);
    float alpha = (mix(0.55, 0.84, depthMix) + fres * 0.12) * edgeFade;
    alpha = clamp(alpha, 0.0, 0.92);

    gl_FragColor = vec4(col, alpha);
  }
`

// ── EllipseGeometry helper ────────────────────────────────────────────────────
/**
 * Build a flat disc geometry approximating an ellipse in the XZ plane.
 * Triangulated as a fan from the centre.
 */
function buildEllipseGeometry(rx: number, rz: number, segments = 64): THREE.BufferGeometry {
  const geo = new THREE.BufferGeometry()
  // vertices: centre + ring
  const vCount = 1 + segments
  const positions = new Float32Array(vCount * 3)
  const uvs = new Float32Array(vCount * 2)
  // centre
  positions[0] = 0; positions[1] = 0; positions[2] = 0
  uvs[0] = 0.5; uvs[1] = 0.5
  for (let i = 0; i < segments; i++) {
    const theta = (i / segments) * Math.PI * 2
    const vx = Math.cos(theta) * rx
    const vz = Math.sin(theta) * rz
    const vi = (1 + i) * 3
    positions[vi]     = vx
    positions[vi + 1] = 0
    positions[vi + 2] = vz
    const ui = (1 + i) * 2
    uvs[ui]     = 0.5 + Math.cos(theta) * 0.5
    uvs[ui + 1] = 0.5 + Math.sin(theta) * 0.5
  }
  // index: fan triangles
  const indices = new Uint16Array(segments * 3)
  for (let i = 0; i < segments; i++) {
    const next = ((i + 1) % segments) + 1
    indices[i * 3]     = 0
    indices[i * 3 + 1] = i + 1
    indices[i * 3 + 2] = next
  }
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2))
  geo.setIndex(new THREE.BufferAttribute(indices, 1))
  geo.computeVertexNormals()
  geo.computeBoundingSphere()
  return geo
}

/**
 * Build a flat ring geometry (annulus) in the XZ plane, from inner to outer ellipse.
 * Used for the sandy shoreline.
 */
function buildEllipseRingGeometry(
  innerRX: number, innerRZ: number,
  outerRX: number, outerRZ: number,
  segments = 64,
): THREE.BufferGeometry {
  const geo = new THREE.BufferGeometry()
  const vCount = segments * 2
  const positions = new Float32Array(vCount * 3)
  const uvs = new Float32Array(vCount * 2)

  for (let i = 0; i < segments; i++) {
    const theta = (i / segments) * Math.PI * 2
    const cos = Math.cos(theta), sin = Math.sin(theta)
    // inner
    const ii = i * 3
    positions[ii]     = cos * innerRX
    positions[ii + 1] = 0
    positions[ii + 2] = sin * innerRZ
    uvs[i * 2]     = 0.5 + cos * 0.35
    uvs[i * 2 + 1] = 0.5 + sin * 0.35
    // outer
    const oi = (segments + i) * 3
    positions[oi]     = cos * outerRX
    positions[oi + 1] = 0
    positions[oi + 2] = sin * outerRZ
    uvs[(segments + i) * 2]     = 0.5 + cos * 0.5
    uvs[(segments + i) * 2 + 1] = 0.5 + sin * 0.5
  }

  const idxCount = segments * 6
  const indices = new Uint16Array(idxCount)
  for (let i = 0; i < segments; i++) {
    const next = (i + 1) % segments
    const inner0 = i
    const inner1 = next
    const outer0 = segments + i
    const outer1 = segments + next
    const base = i * 6
    indices[base]     = inner0
    indices[base + 1] = outer0
    indices[base + 2] = inner1
    indices[base + 3] = inner1
    indices[base + 4] = outer0
    indices[base + 5] = outer1
  }

  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2))
  geo.setIndex(new THREE.BufferAttribute(indices, 1))
  geo.computeVertexNormals()
  geo.computeBoundingSphere()
  return geo
}

// ── Path ribbon helper ────────────────────────────────────────────────────────
/**
 * Build a flat ribbon (path) from an array of centre-line points with a given width.
 * Lies in the XZ plane at y=0 (caller offsets via mesh position).
 */
function buildPathGeometry(points: [number, number][], width: number): THREE.BufferGeometry {
  const n = points.length
  if (n < 2) return new THREE.BufferGeometry()

  const positions: number[] = []
  const uvs: number[] = []
  const indices: number[] = []
  let uAccum = 0

  for (let i = 0; i < n; i++) {
    const [cx, cz] = points[i]
    // tangent direction
    let tx: number, tz: number
    if (i === 0) {
      tx = points[1][0] - points[0][0]
      tz = points[1][1] - points[0][1]
    } else if (i === n - 1) {
      tx = points[n - 1][0] - points[n - 2][0]
      tz = points[n - 1][1] - points[n - 2][1]
    } else {
      tx = points[i + 1][0] - points[i - 1][0]
      tz = points[i + 1][1] - points[i - 1][1]
    }
    const len = Math.sqrt(tx * tx + tz * tz) || 1
    // perpendicular = (-tz, tx) / len
    const px = (-tz / len) * width * 0.5
    const pz = (tx  / len) * width * 0.5

    if (i > 0) {
      const dx = points[i][0] - points[i - 1][0]
      const dz = points[i][1] - points[i - 1][1]
      uAccum += Math.sqrt(dx * dx + dz * dz) / width
    }

    // left vertex
    positions.push(cx - px, 0, cz - pz)
    uvs.push(0, uAccum)
    // right vertex
    positions.push(cx + px, 0, cz + pz)
    uvs.push(1, uAccum)

    if (i > 0) {
      const b = (i - 1) * 2
      indices.push(b, b + 1, b + 2, b + 1, b + 3, b + 2)
    }
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  geo.setIndex(indices)
  geo.computeVertexNormals()
  geo.computeBoundingSphere()
  return geo
}

// ── Component ─────────────────────────────────────────────────────────────────

export function CentralPark() {
  const matRef = useRef<THREE.ShaderMaterial>(null)

  // Advance uTime each frame for the ripple animation.
  useFrame((_, delta) => {
    if (matRef.current) matRef.current.uniforms.uTime.value += delta
  })

  // Ground texture for paths and lawn
  const [groundAlbedo, groundRough] = useTexture([
    '/textures/ground_albedo.jpg',
    '/textures/ground_roughness.jpg',
  ])

  // ── Lawn plane — covers the southern/central core, grass-tinted ──────────
  // A large rectangle offset to the south of the core center, avoiding
  // the build-site area (X∈[256,324], Z∈[169,229]). We use two planes:
  // one for the southern/western open lawn (Z > 229) and one for the eastern side.
  // Simpler: one large lawn plane covering the open south, clipped by exclusion.
  // We use a plane roughly centred at (210, 300), 160×130 m to cover the
  // southern open expanse without touching the rubble (upper-left) or build sites.

  const lawnAlbedo = useMemo(() => {
    const t = groundAlbedo.clone()
    t.wrapS = t.wrapT = THREE.RepeatWrapping
    t.repeat.set(16, 13)
    t.anisotropy = 8
    t.colorSpace = THREE.SRGBColorSpace
    t.needsUpdate = true
    return t
  }, [groundAlbedo])

  const lawnRough = useMemo(() => {
    const t = groundRough.clone()
    t.wrapS = t.wrapT = THREE.RepeatWrapping
    t.repeat.set(16, 13)
    t.anisotropy = 8
    t.needsUpdate = true
    return t
  }, [groundRough])

  // ── Pond geometry ────────────────────────────────────────────────────────
  const pondGeo = useMemo(
    () => buildEllipseGeometry(POND_RX, POND_RZ, 72),
    [],
  )

  // ── Shoreline ring ───────────────────────────────────────────────────────
  const shoreGeo = useMemo(
    () => buildEllipseRingGeometry(
      POND_RX,  POND_RZ,
      POND_RX + SHORE_MARGIN, POND_RZ + SHORE_MARGIN,
      72,
    ),
    [],
  )

  const shoreAlbedo = useMemo(() => {
    const t = groundAlbedo.clone()
    t.wrapS = t.wrapT = THREE.RepeatWrapping
    t.repeat.set(4, 4)
    t.anisotropy = 8
    t.colorSpace = THREE.SRGBColorSpace
    t.needsUpdate = true
    return t
  }, [groundAlbedo])

  const shoreRough = useMemo(() => {
    const t = groundRough.clone()
    t.wrapS = t.wrapT = THREE.RepeatWrapping
    t.repeat.set(4, 4)
    t.anisotropy = 8
    t.needsUpdate = true
    return t
  }, [groundRough])

  // ── Paths ────────────────────────────────────────────────────────────────
  // Three gentle winding paths across the park, curving around the pond.
  // All avoid the exclusion rect X∈[256,324] Z∈[169,229].
  // Path Y offset = 0.04 via mesh position.

  const pathWidth = 3.0

  // Path 1: Main loop path — curves south of the pond and along the western park
  const path1Points: [number, number][] = [
    [135, 350],
    [155, 335],
    [175, 318],
    [192, 310],
    [200, 295],  // south of pond
    [205, 278],
    [215, 260],
    [230, 248],
    [248, 238],  // west of build exclusion zone (X<256)
    [254, 230],  // just grazes edge of exclusion zone boundary
    [250, 210],  // just west of exclusion (X≈250 < 256)
    [245, 185],
    [240, 160],
  ]

  // Path 2: East arc — stays east of exclusion, curves around pond north-east
  const path2Points: [number, number][] = [
    [365, 340],
    [345, 330],
    [320, 318],
    [300, 308],
    [282, 298],
    [265, 290],
    [255, 278],  // west of exclusion
    [252, 265],
    [250, 248],
  ]

  // Path 3: Cross-path — from west core edge curving around pond south to east
  const path3Points: [number, number][] = [
    [130, 295],
    [155, 298],
    [176, 300],
    [192, 298],
    [200, 292],  // just south-west of pond
    [215, 285],
    [240, 278],
    [255, 272],
    [270, 268],  // south of exclusion (Z=268 > 229 OK)
    [290, 265],
    [320, 260],
    [350, 258],
    [370, 255],
  ]

  const path1Geo = useMemo(() => buildPathGeometry(path1Points, pathWidth), [])
  const path2Geo = useMemo(() => buildPathGeometry(path2Points, pathWidth), [])
  const path3Geo = useMemo(() => buildPathGeometry(path3Points, pathWidth), [])

  const pathAlbedo = useMemo(() => {
    const t = groundAlbedo.clone()
    t.wrapS = t.wrapT = THREE.RepeatWrapping
    t.repeat.set(2, 20)
    t.anisotropy = 8
    t.colorSpace = THREE.SRGBColorSpace
    t.needsUpdate = true
    return t
  }, [groundAlbedo])

  const pathRough = useMemo(() => {
    const t = groundRough.clone()
    t.wrapS = t.wrapT = THREE.RepeatWrapping
    t.repeat.set(2, 20)
    t.anisotropy = 8
    t.needsUpdate = true
    return t
  }, [groundRough])

  return (
    <group>
      {/* ── Park Lawn ─────────────────────────────────────────────────────
          Healthy grass overlay over the open southern/central core.
          Centred at world (210, 300), 160 m wide × 130 m deep.
          Y=0.02 keeps it just above the worn core ground (y≈-0.01).
          Tinted green to match GrassSurround/Ecosystem grass tone. */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[210, 0.02, 300]}
        receiveShadow
      >
        <planeGeometry args={[160, 130, 8, 8]} />
        <meshStandardMaterial
          map={lawnAlbedo}
          roughnessMap={lawnRough}
          color="#5e8935"     // mown park grass — matches ZONE_COLORS.nature
          roughness={1.0}
          metalness={0.0}
          transparent
          opacity={0.82}      // soft-edged blend into surrounding dirt texture
        />
      </mesh>

      {/* ── Sandy Shoreline ring ──────────────────────────────────────────
          Muddy-sand ring just outside the pond, blending water to lawn.
          Y=0.025 (between lawn 0.02 and pond 0.03). */}
      <mesh
        position={[POND_CX, 0.025, POND_CZ]}
        geometry={shoreGeo}
        receiveShadow
      >
        <meshStandardMaterial
          map={shoreAlbedo}
          roughnessMap={shoreRough}
          color="#b09060"     // muddy sand / wet earth tone
          roughness={1.0}
          metalness={0.0}
        />
      </mesh>

      {/* ── Pond / Lake ───────────────────────────────────────────────────
          Elliptical animated water surface. Y=0.03. Single draw call.
          Center: world (222, 305). Radii: 28 × 20 m. */}
      <mesh
        position={[POND_CX, 0.03, POND_CZ]}
        geometry={pondGeo}
        frustumCulled={false}
      >
        <shaderMaterial
          ref={matRef}
          transparent
          depthWrite={false}
          side={THREE.DoubleSide}
          uniforms={POND_UNIFORMS()}
          vertexShader={POND_VERT}
          fragmentShader={POND_FRAG}
        />
      </mesh>

      {/* ── Walking Paths ─────────────────────────────────────────────────
          Light-tan concrete ribbon paths, y=0.04 (above lawn + shoreline).
          Three winding paths curving around the pond and across the park. */}

      {/* Path 1 — western loop, curves south of pond */}
      <mesh
        position={[0, 0.04, 0]}
        geometry={path1Geo}
        receiveShadow
      >
        <meshStandardMaterial
          map={pathAlbedo}
          roughnessMap={pathRough}
          color="#c4b98a"     // light tan / weathered concrete
          roughness={0.85}
          metalness={0.0}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Path 2 — eastern arc, stays east of build exclusion */}
      <mesh
        position={[0, 0.04, 0]}
        geometry={path2Geo}
        receiveShadow
      >
        <meshStandardMaterial
          map={pathAlbedo}
          roughnessMap={pathRough}
          color="#c4b98a"
          roughness={0.85}
          metalness={0.0}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Path 3 — east–west connector, curves around pond south */}
      <mesh
        position={[0, 0.04, 0]}
        geometry={path3Geo}
        receiveShadow
      >
        <meshStandardMaterial
          map={pathAlbedo}
          roughnessMap={pathRough}
          color="#c4b98a"
          roughness={0.85}
          metalness={0.0}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  )
}
