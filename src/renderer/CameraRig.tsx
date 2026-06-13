import { useEffect, useRef, useState } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import { OrbitControls, Html } from '@react-three/drei'
import * as THREE from 'three'

type CameraMode = 'orbit' | 'free'

// World extents — the camera may not travel beyond this box around the world.
const CENTER = new THREE.Vector3(125, 0, 125)
const WORLD_HALF = 600 // clamp roam to ±600m of the core
const MIN_Y = 3
const MAX_Y = 420

/**
 * Dual-mode camera rig.
 *
 *  ORBIT (default): drei OrbitControls with range limits — zoom clamped
 *  (minDistance/maxDistance), polar angle kept just below the horizon so you
 *  can't see under the ground, and pan limited to a box so you can't fly off
 *  the world.
 *
 *  FREE ROAM: WASD / arrow-keys fly. W/S forward-back on the ground plane,
 *  A/D strafe, Q/E (or Space/Shift) up-down, mouse-drag to look. Position is
 *  clamped to the world box every frame so it can never leave the limit.
 *
 * The mode toggle UI is rendered via drei <Html> docked at the bottom-left of
 * the dashboard so it needs no App changes.
 */
export function CameraRig() {
  const [mode, setMode] = useState<CameraMode>('orbit')

  return (
    <>
      {mode === 'orbit' ? <OrbitMode /> : <FreeRoamMode />}
      <CameraControlUI mode={mode} onChange={setMode} />
    </>
  )
}

function OrbitMode() {
  return (
    <OrbitControls
      makeDefault
      target={[125, 0, 125]}
      minDistance={25}
      maxDistance={520}
      // stop just shy of horizontal so you can't dip below the ground plane
      maxPolarAngle={Math.PI / 2.12}
      minPolarAngle={0.15}
      enablePan
      enableZoom
      enableRotate
      zoomSpeed={1.2}
      panSpeed={1.0}
      // keep panning inside the playable world
      onChange={(e) => {
        const ctrl = e?.target as unknown as { target: THREE.Vector3 } | undefined
        if (!ctrl) return
        const t = ctrl.target
        t.x = THREE.MathUtils.clamp(t.x, 125 - WORLD_HALF, 125 + WORLD_HALF)
        t.z = THREE.MathUtils.clamp(t.z, 125 - WORLD_HALF, 125 + WORLD_HALF)
        t.y = THREE.MathUtils.clamp(t.y, 0, 60)
      }}
    />
  )
}

function FreeRoamMode() {
  const { camera, gl } = useThree()
  const keys = useRef<Record<string, boolean>>({})
  const drag = useRef<{ active: boolean; px: number; py: number }>({ active: false, px: 0, py: 0 })
  // yaw/pitch tracked so mouse-look is stable regardless of starting orientation
  const euler = useRef(new THREE.Euler(0, 0, 0, 'YXZ'))

  // Seed look direction from current camera orientation on entering free roam.
  useEffect(() => {
    euler.current.setFromQuaternion(camera.quaternion)
    euler.current.z = 0
  }, [camera])

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      keys.current[e.code] = true
    }
    const up = (e: KeyboardEvent) => {
      keys.current[e.code] = false
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [])

  useEffect(() => {
    const dom = gl.domElement
    const onDown = (e: PointerEvent) => {
      if (e.button !== 0) return
      drag.current.active = true
      drag.current.px = e.clientX
      drag.current.py = e.clientY
    }
    const onUp = () => {
      drag.current.active = false
    }
    const onMove = (e: PointerEvent) => {
      if (!drag.current.active) return
      const dx = e.clientX - drag.current.px
      const dy = e.clientY - drag.current.py
      drag.current.px = e.clientX
      drag.current.py = e.clientY
      const sens = 0.0026
      euler.current.y -= dx * sens
      euler.current.x = THREE.MathUtils.clamp(
        euler.current.x - dy * sens,
        -Math.PI / 2 + 0.05,
        Math.PI / 2 - 0.05,
      )
    }
    dom.addEventListener('pointerdown', onDown)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointermove', onMove)
    return () => {
      dom.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointermove', onMove)
    }
  }, [gl])

  const forward = useRef(new THREE.Vector3())
  const right = useRef(new THREE.Vector3())

  useFrame((_, delta) => {
    // apply look
    camera.quaternion.setFromEuler(euler.current)

    const k = keys.current
    const boost = k['ShiftLeft'] || k['ShiftRight'] ? 2.4 : 1
    const speed = 60 * boost * Math.min(delta, 0.05)

    // ground-plane forward/right derived from yaw only (so W stays horizontal)
    const yaw = euler.current.y
    forward.current.set(-Math.sin(yaw), 0, -Math.cos(yaw))
    right.current.set(Math.cos(yaw), 0, -Math.sin(yaw))

    const move = new THREE.Vector3()
    if (k['KeyW'] || k['ArrowUp']) move.add(forward.current)
    if (k['KeyS'] || k['ArrowDown']) move.sub(forward.current)
    if (k['KeyD'] || k['ArrowRight']) move.add(right.current)
    if (k['KeyA'] || k['ArrowLeft']) move.sub(right.current)
    if (move.lengthSq() > 0) {
      move.normalize().multiplyScalar(speed)
      camera.position.add(move)
    }

    // vertical: Q/Space up, E/Shift... use Space up, KeyQ up, KeyE down
    if (k['KeyE'] || k['Space']) camera.position.y += speed
    if (k['KeyQ']) camera.position.y -= speed

    // clamp to the world box so you can't leave the limit
    camera.position.x = THREE.MathUtils.clamp(camera.position.x, CENTER.x - WORLD_HALF, CENTER.x + WORLD_HALF)
    camera.position.z = THREE.MathUtils.clamp(camera.position.z, CENTER.z - WORLD_HALF, CENTER.z + WORLD_HALF)
    camera.position.y = THREE.MathUtils.clamp(camera.position.y, MIN_Y, MAX_Y)
  })

  return null
}

// ── docked control UI (drei <Html>, fixed to the viewport) ──────────────────

function CameraControlUI({
  mode,
  onChange,
}: {
  mode: CameraMode
  onChange: (m: CameraMode) => void
}) {
  // Dashboard occupies the right ~436px; bottom bar is ~44px tall. Dock the
  // control just left of the dashboard, above the bottom bar.
  const wrap: React.CSSProperties = {
    position: 'fixed',
    right: 448,
    bottom: 52,
    zIndex: 45,
    pointerEvents: 'auto',
    userSelect: 'none',
    fontFamily: "'DM Mono', ui-monospace, monospace",
  }
  const panel: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    padding: '8px 9px',
    background: '#0C0C0C',
    border: '1px solid rgba(255,255,255,0.18)',
    borderRadius: 3,
    boxShadow: '0 6px 24px rgba(0,0,0,0.55)',
    minWidth: 168,
  }
  const row: React.CSSProperties = { display: 'flex', gap: 6 }
  const btn = (active: boolean): React.CSSProperties => ({
    flex: 1,
    whiteSpace: 'nowrap',
    padding: '6px 8px',
    fontFamily: "'DM Mono', ui-monospace, monospace",
    fontSize: 11,
    letterSpacing: '0.08em',
    lineHeight: 1.1,
    cursor: 'pointer',
    borderRadius: 2,
    border: active ? '1px solid rgba(255,255,255,0.55)' : '1px solid rgba(255,255,255,0.14)',
    background: active ? '#ECECEC' : '#161616',
    color: active ? '#0A0A0A' : '#9A9A9A',
    transition: 'background .12s, color .12s, border-color .12s',
  })
  const hint: React.CSSProperties = {
    fontSize: 8.5,
    letterSpacing: '0.14em',
    color: '#5E5E5E',
    textAlign: 'center',
    paddingTop: 1,
  }

  return (
    <Html
      // render into the DOM, not the 3D scene; full-screen transform off
      calculatePosition={() => [0, 0, 0]}
      style={{ pointerEvents: 'none' }}
      zIndexRange={[45, 45]}
      prepend
    >
      <div style={wrap}>
        <div style={panel}>
          <div style={row}>
            <button
              type="button"
              style={btn(mode === 'orbit')}
              onClick={() => onChange('orbit')}
            >
              ◉ ORBIT
            </button>
            <button
              type="button"
              style={btn(mode === 'free')}
              onClick={() => onChange('free')}
            >
              ✛ FREE ROAM
            </button>
          </div>
          <div style={hint}>WASD / ARROWS · DRAG TO LOOK</div>
        </div>
      </div>
    </Html>
  )
}
