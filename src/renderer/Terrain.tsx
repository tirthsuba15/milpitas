import { useRef, useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { useTexture } from '@react-three/drei'
import {
  GRID_W, GRID_H, CELL_SIZE_M, WORLD_SIZE_M, CENTER_X, CENTER_Z,
  CORE_MIN_X, CORE_MIN_Z, CORE_MAX_X, CORE_MAX_Z,
  makeRng,
} from '@/simulation/grid'
import { useWorldStore } from '@/store/worldStore'
import type { ZoneType } from '@/types'

// Modest green frame around the 500 m city; far edge dissolves into fog
// before it becomes visible as a hard square boundary.
const SURROUND_SIZE_M = 1300

export function Terrain() {
  const world = useWorldStore((s) => s.world)
  return (
    <group>
      <GrassSurround />
      <ZoneGround world={world} />
      <RubbleMounds />
    </group>
  )
}

/**
 * The vast grass groundplane reaching the horizon. Tiles the ground albedo at a
 * high repeat and tints it green so it reads as a healthy grass field. This sits
 * UNDER the per-zone ground (which only covers the 500 m sim grid) and fills the
 * rest of the world out to the fog so there's never a void.
 */
function GrassSurround() {
  const [albedo, roughness] = useTexture([
    '/textures/ground_albedo.jpg',
    '/textures/ground_roughness.jpg',
  ])

  const [grassAlbedo, grassRough] = useMemo(() => {
    const a = albedo.clone()
    const r = roughness.clone()
    for (const t of [a, r]) {
      t.wrapS = t.wrapT = THREE.RepeatWrapping
      t.repeat.set(120, 120)
      t.anisotropy = 8
      t.needsUpdate = true
    }
    a.colorSpace = THREE.SRGBColorSpace
    return [a, r]
  }, [albedo, roughness])

  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[CENTER_X, -0.04, CENTER_Z]}
      receiveShadow
    >
      <planeGeometry args={[SURROUND_SIZE_M, SURROUND_SIZE_M, 1, 1]} />
      <meshStandardMaterial
        map={grassAlbedo}
        roughnessMap={grassRough}
        color="#6f8c42"
        roughness={1.0}
        metalness={0.0}
      />
    </mesh>
  )
}

// ─── Per-zone ground over the 500 m sim grid ────────────────────────────────
// A single 100×100 DataTexture is baked from world.grid[y][x].zone and mapped
// onto one ground plane covering the whole grid. Roads read as dark asphalt,
// sidewalks as lighter concrete, yards/nature as lush grass, the disaster_core
// as worn earth. The core's edges are softened with a radial falloff that
// fades the worn tone back into the surrounding grass so there is NO hard slab
// border. A detail grass texture is multiplied over the whole plane for
// surface variation, and high-frequency per-cell value noise breaks up flat
// color. The plane sits flush at y≈0, just above GrassSurround, so the core
// meets the suburb ground at one continuous height with no z-fighting.

// Zone base colours (linear-ish sRGB authoring values).
const ZONE_COLORS: Record<ZoneType, [number, number, number]> = {
  nature:        [0.36, 0.50, 0.21],
  yard:          [0.42, 0.56, 0.24],
  road:          [0.16, 0.16, 0.17],
  sidewalk:      [0.62, 0.61, 0.58],
  house_lot:     [0.45, 0.42, 0.36],
  civic:         [0.48, 0.46, 0.42],
  disaster_core: [0.50, 0.44, 0.31],
}

function buildZoneTexture(grid: { zone: ZoneType }[][]): THREE.DataTexture {
  const w = GRID_W
  const h = GRID_H
  const data = new Uint8Array(w * h * 4)

  // value-noise helper, deterministic per cell
  const hash = (x: number, y: number) => {
    const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453
    return s - Math.floor(s)
  }

  // Core bounds in cells for the soft radial blend.
  const coreCx = ((CORE_MIN_X + CORE_MAX_X) / 2) / CELL_SIZE_M
  const coreCz = ((CORE_MIN_Z + CORE_MAX_Z) / 2) / CELL_SIZE_M
  const coreHalf = (CORE_MAX_X - CORE_MIN_X) / 2 / CELL_SIZE_M

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const row = grid[y]
      const zone: ZoneType = row && row[x] ? row[x].zone : 'nature'
      let [r, g, b] = ZONE_COLORS[zone] ?? ZONE_COLORS.nature

      // Soft blend for the disaster core: near the core edge, lerp the worn
      // colour back toward grass so the patch dissolves into the suburb rather
      // than ending at a crisp rectangle. (Radial-ish using chebyshev distance.)
      if (zone === 'disaster_core') {
        const dx = Math.abs(x + 0.5 - coreCx)
        const dz = Math.abs(y + 0.5 - coreCz)
        const cheb = Math.max(dx, dz) // 0 at center → coreHalf at edge
        const edgeT = THREE.MathUtils.clamp(
          (cheb - coreHalf * 0.55) / (coreHalf * 0.45),
          0,
          1,
        )
        // jitter the blend line so it isn't a clean square outline
        const jitter = (hash(x * 3.1, y * 3.1) - 0.5) * 0.18
        const t = THREE.MathUtils.clamp(edgeT + jitter, 0, 1)
        const grass = ZONE_COLORS.nature
        r = THREE.MathUtils.lerp(r, grass[0], t)
        g = THREE.MathUtils.lerp(g, grass[1], t)
        b = THREE.MathUtils.lerp(b, grass[2], t)
      }

      // Per-cell value-noise to break up flat fills (subtle).
      const n = (hash(x, y) - 0.5) * 0.10
      // Extra mottling for natural ground; near-zero for hard surfaces.
      const isHard = zone === 'road' || zone === 'sidewalk'
      const amt = isHard ? 0.04 : 1.0
      r = THREE.MathUtils.clamp(r + n * amt, 0, 1)
      g = THREE.MathUtils.clamp(g + n * amt, 0, 1)
      b = THREE.MathUtils.clamp(b + n * amt, 0, 1)

      const i = (y * w + x) * 4
      data[i] = Math.round(r * 255)
      data[i + 1] = Math.round(g * 255)
      data[i + 2] = Math.round(b * 255)
      data[i + 3] = 255
    }
  }

  const tex = new THREE.DataTexture(data, w, h, THREE.RGBAFormat)
  tex.colorSpace = THREE.SRGBColorSpace
  // Bilinear filtering smooths cell-to-cell transitions → soft borders, no
  // visible 5 m blocky steps (esp. across the core blend).
  tex.minFilter = THREE.LinearMipmapLinearFilter
  tex.magFilter = THREE.LinearFilter
  tex.generateMipmaps = true
  tex.anisotropy = 8
  tex.needsUpdate = true
  return tex
}

function ZoneGround({ world }: { world: ReturnType<typeof useWorldStore.getState>['world'] }) {
  // Fine grass detail multiplied over the zone colours for surface texture.
  const [detail, detailRough] = useTexture([
    '/textures/ground_albedo.jpg',
    '/textures/ground_roughness.jpg',
  ])

  const [detailMap, detailRoughMap] = useMemo(() => {
    const a = detail.clone()
    const r = detailRough.clone()
    for (const t of [a, r]) {
      t.wrapS = t.wrapT = THREE.RepeatWrapping
      // ~1 repeat per 2 cells → crisp blades of grass without over-tiling.
      t.repeat.set(GRID_W / 2, GRID_H / 2)
      t.anisotropy = 8
      t.needsUpdate = true
    }
    a.colorSpace = THREE.SRGBColorSpace
    return [a, r]
  }, [detail, detailRough])

  const zoneTex = useMemo(() => {
    if (!world) return null
    return buildZoneTexture(world.grid)
  }, [world])

  // Dispose the data texture when it changes / on unmount.
  useEffect(() => {
    return () => {
      zoneTex?.dispose()
    }
  }, [zoneTex])

  // No world yet → just lush base grass over the grid footprint so we're never
  // staring at a void before the sim builds.
  if (!world || !zoneTex) {
    return (
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[CENTER_X, -0.01, CENTER_Z]}
        receiveShadow
      >
        <planeGeometry args={[WORLD_SIZE_M, WORLD_SIZE_M, 1, 1]} />
        <meshStandardMaterial
          map={detailMap}
          roughnessMap={detailRoughMap}
          color="#5d7a37"
          roughness={1.0}
          metalness={0.0}
        />
      </mesh>
    )
  }

  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[CENTER_X, -0.01, CENTER_Z]}
      receiveShadow
    >
      {/* segmented so per-vertex shading + mip transitions stay smooth */}
      <planeGeometry args={[WORLD_SIZE_M, WORLD_SIZE_M, 64, 64]} />
      <meshStandardMaterial
        // zone colours drive the base; detail map multiplies in grass texture
        map={zoneTex}
        roughnessMap={detailRoughMap}
        roughness={1.0}
        metalness={0.0}
      />
    </mesh>
  )
}

/**
 * Scattered rubble in the disaster core's NW quadrant — wreckage of the work
 * zone. Unchanged from the worn-core look; sits on the blended ground.
 */
function RubbleMounds() {
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const rubble = useTexture('/textures/rubble_albedo.jpg')
  rubble.wrapS = rubble.wrapT = THREE.RepeatWrapping
  rubble.colorSpace = THREE.SRGBColorSpace

  useEffect(() => {
    const mesh = meshRef.current
    if (!mesh) return

    const dummy = new THREE.Object3D()
    // Seeded PRNG so the rubble layout is identical on every load (stable for
    // recorded demos). Fixed seed → deterministic placement. ("RUBBLE" → hex)
    const RUBBLE_SEED = 0x0ec0bb1e // a fixed constant; any fixed number works
    const rand = makeRng(RUBBLE_SEED)
    const rng = (min: number, max: number) => min + rand() * (max - min)

    for (let i = 0; i < 120; i++) {
      const x = CORE_MIN_X + rng(5, 90)
      const z = CORE_MIN_Z + rng(5, 100)
      dummy.position.set(x, rng(0.2, 1.2), z)
      dummy.rotation.set(rng(-0.2, 0.2), rng(0, Math.PI * 2), rng(-0.2, 0.2))
      dummy.scale.setScalar(rng(0.4, 2.0))
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
    }
    mesh.instanceMatrix.needsUpdate = true
  }, [])

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, 120]} castShadow receiveShadow>
      <boxGeometry args={[3, 1, 2]} />
      <meshStandardMaterial map={rubble} color="#8a7565" roughness={1} metalness={0.05} />
    </instancedMesh>
  )
}
