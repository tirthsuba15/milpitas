import { useRef, useEffect } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { bus } from '@/events/bus'

type CameraPreset = 'wide' | 'buildsite' | 'rescue' | 'debrief'

const PRESETS: Record<CameraPreset, { pos: [number,number,number]; target: [number,number,number] }> = {
  wide:      { pos: [125, 90, 230],  target: [125, 0, 100] },
  buildsite: { pos: [140, 35, 145],  target: [140, 0, 90]  },
  rescue:    { pos: [60,  30, 100],  target: [50,  0, 60]  },
  debrief:   { pos: [125, 60, 200],  target: [125, 0, 125] },
}

export function Camera() {
  const { camera } = useThree()
  const targetRef = useRef(new THREE.Vector3(125, 0, 125))
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
