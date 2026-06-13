import { useRef, useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { useTexture } from '@react-three/drei'
import { ROAD_SEGMENTS } from '@/simulation/cityLayout'

const WORLD = 250  // metres — 50 cells × 5 m/cell

export function Terrain() {
  return (
    <group>
      <GroundPlane />
      <Roads />
      <RubbleMounds />
      <CollapsedRuins />
      <Trees />
    </group>
  )
}

// ─── Ground ──────────────────────────────────────────────────────────────────

function GroundPlane() {
  const albedo = useTexture('/textures/ground_albedo.jpg')
  const rough  = useTexture('/textures/ground_roughness.jpg')

  useEffect(() => {
    for (const t of [albedo, rough]) {
      t.wrapS = t.wrapT = THREE.RepeatWrapping
      t.repeat.set(14, 14)
      t.needsUpdate = true
    }
  }, [albedo, rough])

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[WORLD / 2, 0, WORLD / 2]} receiveShadow>
      <planeGeometry args={[WORLD, WORLD, 1, 1]} />
      <meshStandardMaterial map={albedo} roughnessMap={rough} roughness={1} metalness={0} />
    </mesh>
  )
}

// ─── Roads ───────────────────────────────────────────────────────────────────
// Simple asphalt grid through the rebuild zone (housing area centred ~x155–190, z55–100)

function Roads() {
  return (
    <group>
      {ROAD_SEGMENTS.map((s, i) => (
        <mesh key={i} position={[s.x, 0.01, s.z]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[s.w, s.l]} />
          <meshStandardMaterial color="#222226" roughness={0.97} metalness={0} />
        </mesh>
      ))}
    </group>
  )
}

// ─── Disaster-zone rubble ─────────────────────────────────────────────────────

function RubbleMounds() {
  const ref = useRef<THREE.InstancedMesh>(null)
  const tex = useTexture('/textures/rubble_albedo.jpg')

  useEffect(() => {
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping
    tex.needsUpdate = true
  }, [tex])

  useEffect(() => {
    const m = ref.current
    if (!m) return
    const d = new THREE.Object3D()
    const rng = (a: number, b: number) => a + Math.random() * (b - a)
    for (let i = 0; i < 240; i++) {
      d.position.set(rng(3, 108), rng(0.05, 0.75), rng(3, 118))
      d.rotation.set(rng(-0.35, 0.35), rng(0, Math.PI * 2), rng(-0.35, 0.35))
      d.scale.set(rng(0.3, 2.8), rng(0.15, 1.3), rng(0.3, 2.2))
      d.updateMatrix()
      m.setMatrixAt(i, d.matrix)
    }
    m.instanceMatrix.needsUpdate = true
  }, [])

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, 240]} castShadow receiveShadow>
      <boxGeometry args={[3, 1, 2]} />
      <meshStandardMaterial map={tex} color="#7a6050" roughness={1} metalness={0.04} />
    </instancedMesh>
  )
}

// ─── Collapsed building shells ────────────────────────────────────────────────

function CollapsedRuins() {
  // fixed seed-like positions via useMemo so they don't jump on re-render
  const ruins = useMemo(() => {
    const rng = (a: number, b: number) => a + Math.random() * (b - a)
    return Array.from({ length: 24 }, () => ({
      x: rng(10, 90), z: rng(10, 102),
      w: rng(5, 18), h: rng(1.2, 5), d: rng(5, 18),
      ry: rng(0, Math.PI),
    }))
  }, [])

  return (
    <group>
      {ruins.map((r, i) => (
        <mesh key={i} position={[r.x, r.h / 2, r.z]} rotation={[0, r.ry, 0]} castShadow receiveShadow>
          <boxGeometry args={[r.w, r.h, r.d]} />
          <meshStandardMaterial color="#4a3d32" roughness={0.95} metalness={0.05} />
        </mesh>
      ))}
    </group>
  )
}

// ─── Pine trees ───────────────────────────────────────────────────────────────

const TREE_COUNT = 160

function Trees() {
  const trunkRef  = useRef<THREE.InstancedMesh>(null)
  const canopyRef = useRef<THREE.InstancedMesh>(null)

  useEffect(() => {
    const trunk  = trunkRef.current
    const canopy = canopyRef.current
    if (!trunk || !canopy) return
    const d   = new THREE.Object3D()
    const rng = (a: number, b: number) => a + Math.random() * (b - a)

    // East forest belt (flood-safe far edge), south tree-line, north corridor
    const spots: [number, number][] = []
    for (let i = 0; i < 70; i++) spots.push([rng(194, 248), rng(5, 245)])
    for (let i = 0; i < 50; i++) spots.push([rng(18, 185),  rng(155, 195)])
    for (let i = 0; i < 40; i++) spots.push([rng(108, 188), rng(5, 45)])

    spots.forEach(([x, z], i) => {
      if (i >= TREE_COUNT) return
      const h = rng(5, 11)
      // trunk
      d.position.set(x, h / 2, z)
      d.rotation.set(0, rng(0, Math.PI * 2), 0)
      d.scale.setScalar(rng(0.6, 1.3))
      d.updateMatrix()
      trunk.setMatrixAt(i, d.matrix)
      // canopy
      d.position.set(x, h + rng(0.5, 2.5), z)
      d.scale.set(rng(1.4, 3), rng(2, 5), rng(1.4, 3))
      d.updateMatrix()
      canopy.setMatrixAt(i, d.matrix)
    })

    trunk.instanceMatrix.needsUpdate  = true
    canopy.instanceMatrix.needsUpdate = true
  }, [])

  return (
    <group>
      <instancedMesh ref={trunkRef} args={[undefined, undefined, TREE_COUNT]} castShadow>
        <cylinderGeometry args={[0.2, 0.32, 1, 6]} />
        <meshStandardMaterial color="#5c3a1e" roughness={1} />
      </instancedMesh>
      <instancedMesh ref={canopyRef} args={[undefined, undefined, TREE_COUNT]} castShadow>
        <coneGeometry args={[1, 1, 7]} />
        <meshStandardMaterial color="#2d5a27" roughness={0.85} metalness={0} />
      </instancedMesh>
    </group>
  )
}
