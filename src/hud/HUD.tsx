import { useState } from 'react'
import { useWorldStore } from '@/store/worldStore'
import { TopRail } from './TopRail'
import { ReasoningFeed } from './ReasoningFeed'
import { Dashboard, type SectionId } from './Dashboard'
import { BottomBar } from './BottomBar'
import { ResizeHandle } from './ResizeHandle'
import { ColdOpen } from './ColdOpen'
import { Debrief } from './Debrief'
import styles from './hud.module.css'

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v))

export function HUD() {
  const isRunning = useWorldStore(s => s.isRunning)
  const phase = useWorldStore(s => s.world?.phase)

  const forceDebrief =
    typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('debrief')
  const showColdOpen = !isRunning && phase !== 'complete' && !forceDebrief
  const showDebrief = phase === 'complete' || forceDebrief

  const [open, setOpen] = useState<Record<SectionId, boolean>>({
    status: true, carbon: true, comms: true, operator: true,
  })
  const [dashCollapsed, setDashCollapsed] = useState(false)

  const [dashW, setDashW] = useState(436)
  const [resizing, setResizing] = useState(false)

  const toggle = (id: SectionId) => setOpen(o => ({ ...o, [id]: !o[id] }))

  return (
    <div className={styles.overlay}>
      <TopRail />

      <ReasoningFeed />

      <Dashboard
        open={open}
        onToggle={toggle}
        collapsed={dashCollapsed}
        onToggleCollapse={() => setDashCollapsed(c => !c)}
        width={dashW}
        resizing={resizing}
      />
      {!dashCollapsed && (
        <ResizeHandle
          ariaLabel="Resize dashboard width"
          style={{ right: dashW - 3 }}
          onStart={() => setResizing(true)}
          onEnd={() => setResizing(false)}
          onResize={x => setDashW(clamp(window.innerWidth - x, 320, 680))}
        />
      )}

      <BottomBar />

      {showColdOpen && <ColdOpen />}
      {showDebrief && <Debrief force={forceDebrief} />}
    </div>
  )
}
