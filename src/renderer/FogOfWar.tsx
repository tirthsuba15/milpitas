import { useRef, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useWorldStore } from '@/store/worldStore'

// Fog dissolve tuning. Reveal fades from opaque → transparent in ~0.4–0.8s.
// `DAMP_RATE` is an exponential damping coefficient (per second): higher = faster.
// With rate ~6, a cell covers ~99% of the gap in ~0.7s — a smooth "fog lifting".
const DAMP_RATE = 6
const HIDDEN_ALPHA = 200 // opaque-ish fog over unrevealed cells
const REVEALED_ALPHA = 0 // fully transparent once revealed
// Stop uploading the texture once every cell is within this distance of its
// target — avoids per-frame GPU uploads when the fog has settled.
const SETTLE_EPSILON = 0.75

export function FogOfWar() {
  const world = useWorldStore(s => s.world)
  const textureRef = useRef<THREE.DataTexture | null>(null)
  const meshRef = useRef<any>(null)

  // Per-cell smoothed alpha (Float32) + per-cell target alpha (Uint8).
  // Sized to the grid; rebuilt only when grid dimensions change.
  const currentAlphaRef = useRef<Float32Array | null>(null)
  const targetAlphaRef = useRef<Uint8Array | null>(null)

  useEffect(() => {
    if (!world) return
    const { gridWidth: W, gridHeight: H } = world
    const data = new Uint8Array(W * H * 4)

    // Initialize: all black (unrevealed)
    for (let i = 0; i < W * H * 4; i += 4) {
      data[i] = 0; data[i + 1] = 0; data[i + 2] = 0; data[i + 3] = HIDDEN_ALPHA
    }

    currentAlphaRef.current = new Float32Array(W * H).fill(HIDDEN_ALPHA)
    targetAlphaRef.current = new Uint8Array(W * H).fill(HIDDEN_ALPHA)

    textureRef.current = new THREE.DataTexture(data, W, H, THREE.RGBAFormat)
    textureRef.current.needsUpdate = true
  }, [world?.gridWidth, world?.gridHeight])

  // Update only the *targets* on tick changes (cheap). The actual displayed
  // alpha is animated toward these targets every frame in useFrame, so the
  // reveal dissolves smoothly instead of snapping 200 → 0.
  useEffect(() => {
    if (!world) return
    const targets = targetAlphaRef.current
    if (!targets) return
    const { grid, gridWidth: W, gridHeight: H } = world
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        targets[y * W + x] = grid[y][x].isRevealed ? REVEALED_ALPHA : HIDDEN_ALPHA
      }
    }
  }, [world?.tick])

  // Smoothly damp each cell's alpha toward its target every frame. We only
  // upload the texture while at least one cell is mid-fade, then idle once the
  // whole grid has settled — keeps it cheap on 100×100 grids.
  useFrame((_, delta) => {
    const tex = textureRef.current
    const current = currentAlphaRef.current
    const targets = targetAlphaRef.current
    if (!tex || !current || !targets) return

    // Time-based exponential damp: frame-rate independent. Clamp dt so a long
    // stall (tab unfocus) doesn't overshoot.
    const dt = Math.min(delta, 0.1)
    const t = 1 - Math.exp(-DAMP_RATE * dt)

    const data = tex.image.data as Uint8Array
    const n = current.length
    let dirty = false

    for (let c = 0; c < n; c++) {
      const cur = current[c]
      const tgt = targets[c]
      const diff = tgt - cur
      if (Math.abs(diff) > SETTLE_EPSILON) {
        const next = cur + diff * t
        current[c] = next
        data[c * 4 + 3] = next
        dirty = true
      } else if (cur !== tgt) {
        // Snap the final sliver and write once so the cell lands exactly.
        current[c] = tgt
        data[c * 4 + 3] = tgt
        dirty = true
      }
    }

    if (dirty) tex.needsUpdate = true
  })

  if (!world || !textureRef.current) return null

  const sizeM = world.gridWidth * world.cellSizeM

  return (
    <mesh ref={meshRef} position={[sizeM / 2, 0.3, sizeM / 2]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[sizeM, sizeM]} />
      <meshBasicMaterial
        map={textureRef.current}
        transparent
        color="#000000"
        depthWrite={false}
      />
    </mesh>
  )
}
