import { useRef, useMemo, useLayoutEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useWorldStore } from '@/store/worldStore'
import type { GridCell } from '@/types'

const CELL_M = 5

export function Hazards() {
  const world = useWorldStore(s => s.world)
  if (!world) return null

  const fireCells = world.grid.flat().filter(c => c.fireIntensity > 0.1 && c.isRevealed)
  const floodCells = world.grid.flat().filter(c => c.floodDepth > 0.1 && c.isRevealed)

  return (
    <group>
      <FireParticles cells={fireCells} cellSizeM={world.cellSizeM} />
      <FloodPlanes cells={floodCells} cellSizeM={world.cellSizeM} />
    </group>
  )
}

const PARTICLES_PER_CELL = 6
const MAX_FIRE_CELLS = Math.floor(500 / PARTICLES_PER_CELL) // keeps total ≤ 500 particles

function FireParticles({ cells, cellSizeM }: { cells: GridCell[]; cellSizeM: number }) {
  const ref = useRef<THREE.Points>(null)

  // Prioritise cells with highest fire intensity; cap to avoid frame drops
  const activeCells = cells.length > MAX_FIRE_CELLS
    ? cells.slice(0, MAX_FIRE_CELLS)
    : cells
  const total = activeCells.length * PARTICLES_PER_CELL

  const { positions, colors } = useMemo(() => {
    const pos = new Float32Array(total * 3)
    const col = new Float32Array(total * 3)
    activeCells.forEach((cell, ci) => {
      for (let p = 0; p < PARTICLES_PER_CELL; p++) {
        const i = (ci * PARTICLES_PER_CELL + p) * 3
        pos[i]   = cell.x * cellSizeM + (Math.random() - 0.5) * cellSizeM
        pos[i+1] = Math.random() * 3 * cell.fireIntensity
        pos[i+2] = cell.y * cellSizeM + (Math.random() - 0.5) * cellSizeM
        // HDR-ish hot colors (>1) so the Bloom pass (threshold 0.55) makes them glow.
        // Base is a hot yellow-white core fading to deep orange embers.
        const t = Math.random()
        const heat = 2.2 + t * 2.0          // 2.2–4.2 overall brightness, well above bloom threshold
        col[i]   = heat                      // red channel hot
        col[i+1] = heat * (0.45 + t * 0.25)  // green: yellow-orange mix
        col[i+2] = heat * 0.08               // tiny blue for white-hot tips
      }
    })
    return { positions: pos, colors: col }
  }, [activeCells.length])

  useFrame(() => {
    if (!ref.current) return
    const pos = ref.current.geometry.attributes.position.array as Float32Array
    for (let i = 0; i < total; i++) {
      pos[i * 3 + 1] += 0.04   // drift upward
      if (pos[i * 3 + 1] > 6) pos[i * 3 + 1] = 0  // reset
    }
    ref.current.geometry.attributes.position.needsUpdate = true
  })

  if (total === 0) return null

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      {/*
        Additive blending + toneMapped={false} keeps the HDR vertex colors above the
        Bloom threshold (0.55) so the existing PostProcessing bloom pass makes the fire glow.
        Additive overlap also brightens dense embers into a hot core. depthWrite off avoids
        sprites occluding each other / the flood water behind them.
      */}
      <pointsMaterial
        size={0.7}
        vertexColors
        transparent
        opacity={0.95}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        toneMapped={false}
      />
    </points>
  )
}

/**
 * FloodPlanes — all flood cells merged into ONE plane geometry rendered in a single
 * draw call with an animated, semi-transparent water shader. The shader gives:
 *   - depth-tinted translucency (deep teal → lighter shallow rim)
 *   - scrolling procedural ripple normals (two layers crossing for an alive surface)
 *   - fresnel-driven specular shimmer / sky tint at grazing angles
 * No texture asset is fetched — the ripple normal is generated procedurally in-shader,
 * so nothing is added under public/textures/.
 */
function FloodPlanes({ cells, cellSizeM }: { cells: GridCell[]; cellSizeM: number }) {
  const matRef = useRef<THREE.ShaderMaterial>(null)
  const meshRef = useRef<THREE.Mesh>(null)

  // Build a single merged geometry: one quad per flood cell, in the XZ plane,
  // positioned at the cell's flood depth. One geometry → one draw call.
  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry()
    const count = cells.length
    if (count === 0) return geo

    const positions = new Float32Array(count * 4 * 3)
    const uvs = new Float32Array(count * 4 * 2)
    const depths = new Float32Array(count * 4) // per-vertex flood depth for tinting
    const indices = new Uint32Array(count * 6)

    const half = cellSizeM / 2
    cells.forEach((cell, ci) => {
      const cx = cell.x * cellSizeM
      const cz = cell.y * cellSizeM
      const wy = cell.floodDepth * 0.5
      const v = ci * 4
      // four corners on the XZ plane (water lies flat, facing +Y)
      const corners = [
        [cx - half, wy, cz - half],
        [cx + half, wy, cz - half],
        [cx + half, wy, cz + half],
        [cx - half, wy, cz + half],
      ]
      const cornerUV = [[0, 0], [1, 0], [1, 1], [0, 1]]
      for (let k = 0; k < 4; k++) {
        positions[(v + k) * 3]     = corners[k][0]
        positions[(v + k) * 3 + 1] = corners[k][1]
        positions[(v + k) * 3 + 2] = corners[k][2]
        uvs[(v + k) * 2]     = cornerUV[k][0]
        uvs[(v + k) * 2 + 1] = cornerUV[k][1]
        depths[v + k] = cell.floodDepth
      }
      const idx = ci * 6
      indices[idx]     = v
      indices[idx + 1] = v + 2
      indices[idx + 2] = v + 1
      indices[idx + 3] = v
      indices[idx + 4] = v + 3
      indices[idx + 5] = v + 2
    })

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2))
    geo.setAttribute('aDepth', new THREE.BufferAttribute(depths, 1))
    geo.setIndex(new THREE.BufferAttribute(indices, 1))
    geo.computeBoundingSphere()
    return geo
  }, [cells, cellSizeM])

  // Dispose old geometry when it changes.
  useLayoutEffect(() => {
    const mesh = meshRef.current
    return () => { if (mesh) (mesh.geometry as THREE.BufferGeometry)?.dispose?.() }
  }, [geometry])

  useFrame((_, delta) => {
    if (matRef.current) matRef.current.uniforms.uTime.value += delta
  })

  if (cells.length === 0) return null

  return (
    <mesh ref={meshRef} geometry={geometry} frustumCulled={false}>
      <shaderMaterial
        ref={matRef}
        transparent
        depthWrite={false}
        side={THREE.DoubleSide}
        uniforms={WATER_UNIFORMS()}
        vertexShader={WATER_VERT}
        fragmentShader={WATER_FRAG}
      />
    </mesh>
  )
}

const WATER_UNIFORMS = () => ({
  uTime:       { value: 0 },
  uShallow:    { value: new THREE.Color('#3d7a9c') }, // shallow rim tint
  uDeep:       { value: new THREE.Color('#0a2436') }, // deep water tint
  uShimmer:    { value: new THREE.Color('#bfe6ff') }, // sky/spec highlight color
  uLightDir:   { value: new THREE.Vector3(0.4, 0.8, 0.3).normalize() },
})

const WATER_VERT = /* glsl */`
  attribute float aDepth;
  varying vec2 vUv;
  varying float vDepth;
  varying vec3 vWorldPos;
  void main() {
    vUv = uv;
    vDepth = aDepth;
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorldPos = wp.xyz;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`

const WATER_FRAG = /* glsl */`
  precision highp float;
  uniform float uTime;
  uniform vec3 uShallow;
  uniform vec3 uDeep;
  uniform vec3 uShimmer;
  uniform vec3 uLightDir;
  varying vec2 vUv;
  varying float vDepth;
  varying vec3 vWorldPos;

  // Cheap value-noise based ripple height, two scrolling layers crossing each other.
  float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p){
    vec2 i = floor(p), f = fract(p);
    float a = hash(i), b = hash(i + vec2(1.0,0.0));
    float c = hash(i + vec2(0.0,1.0)), d = hash(i + vec2(1.0,1.0));
    vec2 u = f*f*(3.0-2.0*f);
    return mix(mix(a,b,u.x), mix(c,d,u.x), u.y);
  }

  float waterHeight(vec2 p){
    float t = uTime;
    float h  = noise(p * 0.6 + vec2(t * 0.35, t * 0.12));
    h += 0.5 * noise(p * 1.3 - vec2(t * 0.18, t * 0.27));
    return h;
  }

  void main() {
    // Use world XZ so ripples are continuous across merged cells (no per-cell seams).
    vec2 p = vWorldPos.xz * 0.5;

    // Derive a normal from the ripple height field via finite differences.
    float e = 0.35;
    float hL = waterHeight(p - vec2(e, 0.0));
    float hR = waterHeight(p + vec2(e, 0.0));
    float hD = waterHeight(p - vec2(0.0, e));
    float hU = waterHeight(p + vec2(0.0, e));
    vec3 n = normalize(vec3(hL - hR, 2.0, hD - hU));

    // Depth tint: deeper water reads darker / more saturated.
    float depthMix = clamp(vDepth * 0.9, 0.0, 1.0);
    vec3 baseCol = mix(uShallow, uDeep, depthMix);

    // Diffuse-ish shading from the ripple normal.
    float diff = clamp(dot(n, normalize(uLightDir)), 0.0, 1.0);
    baseCol *= 0.65 + 0.5 * diff;

    // Specular shimmer — sharp highlights riding the ripples.
    vec3 viewDir = normalize(cameraPosition - vWorldPos);
    vec3 halfDir = normalize(normalize(uLightDir) + viewDir);
    float spec = pow(clamp(dot(n, halfDir), 0.0, 1.0), 80.0);

    // Fresnel: grazing angles pick up sky shimmer and read glassier.
    float fres = pow(1.0 - clamp(dot(n, viewDir), 0.0, 1.0), 3.0);

    vec3 col = baseCol + uShimmer * spec * 1.4 + uShimmer * fres * 0.25;

    // Semi-transparent; a touch more opaque where deep, glassier at the edges.
    float alpha = mix(0.55, 0.82, depthMix) + fres * 0.15;
    alpha = clamp(alpha, 0.0, 0.92);

    gl_FragColor = vec4(col, alpha);
  }
`
