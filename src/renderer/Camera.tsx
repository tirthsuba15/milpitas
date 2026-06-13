import { useRef, useEffect } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { bus } from '@/events/bus'

type CameraPreset = 'wide' | 'buildsite' | 'rescue' | 'debrief'

// Presets authored in the legacy 0–250 frame, shifted +125 so they frame the
// disaster core now centered at world (250,250).
const PRESETS: Record<CameraPreset, { pos: [number,number,number]; target: [number,number,number] }> = {
  wide:      { pos: [250, 90, 355],  target: [250, 0, 225] },
  buildsite: { pos: [265, 35, 270],  target: [265, 0, 215] },
  rescue:    { pos: [185, 30, 225],  target: [175, 0, 185] },
  debrief:   { pos: [250, 60, 325],  target: [250, 0, 250] },
}

export function Camera() {
  const { camera } = useThree()
  const targetRef = useRef(new THREE.Vector3(250, 0, 250))
  const posTargetRef = useRef(new THREE.Vector3(...PRESETS.wide.pos))
  const driftRef = useRef(0)

  // Listen for camera preset requests from the scenario scripts
  useEffect(() => {
    return bus.on('demo:camera', ({ preset }) => {
      const p = PRESETS[preset]
      posTargetRef.current.set(...p.pos)
      targetRef.current.set(...p.target)
    })
  }, [])

  useFrame(({ clock }, delta) => {
    driftRef.current += delta * 0.06

    // Gentle ambient orbit around target
    const drift = Math.sin(driftRef.current) * 12
    posTargetRef.current.x = PRESETS.wide.pos[0] + drift

    camera.position.lerp(posTargetRef.current, delta * 1.2)

    const lookTarget = camera.position.clone().lerp(targetRef.current, 0.07)
    camera.lookAt(lookTarget)
  })

  return null
}
