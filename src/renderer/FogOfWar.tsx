import { useRef, useEffect } from 'react'
import * as THREE from 'three'
import { useWorldStore } from '@/store/worldStore'

export function FogOfWar() {
  const world = useWorldStore(s => s.world)
  const textureRef = useRef<THREE.DataTexture | null>(null)
  const meshRef = useRef<any>(null)

  useEffect(() => {
    if (!world) return
    const { gridWidth: W, gridHeight: H } = world
    const data = new Uint8Array(W * H * 4)

    // Initialize: all black (unrevealed)
    for (let i = 0; i < W * H * 4; i += 4) {
      data[i] = 0; data[i+1] = 0; data[i+2] = 0; data[i+3] = 230
    }

    textureRef.current = new THREE.DataTexture(data, W, H, THREE.RGBAFormat)
    textureRef.current.needsUpdate = true
  }, [])

  useEffect(() => {
    if (!world || !textureRef.current) return
    const { grid, gridWidth: W, gridHeight: H } = world
    const data = textureRef.current.image.data as Uint8Array

    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const i = (y * W + x) * 4
        data[i+3] = grid[y][x].isRevealed ? 0 : 200   // alpha: 0=transparent, 200=dark
      }
    }
    textureRef.current.needsUpdate = true
  }, [world?.tick])

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
