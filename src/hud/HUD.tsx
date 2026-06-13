import { type PointerEvent as ReactPointerEvent, useCallback, useState } from 'react'
import { useWorldStore } from '@/store/worldStore'
import { TopRail } from './TopRail'
import { ReasoningFeed } from './ReasoningFeed'
import { Dashboard, type SectionId } from './Dashboard'
import { BottomBar } from './BottomBar'
import { CommsLog } from './CommsLog'
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
    status: true, carbon: true, operator: true,
  })
  const [dashCollapsed, setDashCollapsed] = useState(false)

  const [dashW, setDashW] = useState(436)
  const [resizing, setResizing] = useState(false)

  // left COMMAND CENTER panel — drag its right edge to change width
  const [feedW, setFeedW] = useState(320)
  const [feedResizing, setFeedResizing] = useState(false)
  const [feedCollapsed, setFeedCollapsed] = useState(false)
  const feedEdge = feedCollapsed ? 46 : feedW

  // bottom MISSION COMMS panel — drag its top edge to change height
  const [commsH, setCommsH] = useState(200)
  const [commsResizing, setCommsResizing] = useState(false)
  const [commsCollapsed, setCommsCollapsed] = useState(false)

  const toggle = (id: SectionId) => setOpen(o => ({ ...o, [id]: !o[id] }))

  // vertical drag handle (mirrors ResizeHandle, but reports clientY → height)
  const onCommsHandleDown = useCallback((e: ReactPointerEvent) => {
    e.preventDefault()
    setCommsResizing(true)
    // height = distance from the pointer up to the bottom bar (44px tall)
    const move = (ev: PointerEvent) => setCommsH(clamp(window.innerHeight - 44 - ev.clientY, 120, 460))
    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      setCommsResizing(false)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    document.body.style.cursor = 'row-resize'
    document.body.style.userSelect = 'none'
  }, [])

  return (
    <div className={styles.overlay}>
      <TopRail />

      <ReasoningFeed
        width={feedW}
        resizing={feedResizing}
        collapsed={feedCollapsed}
        onToggleCollapse={() => setFeedCollapsed(c => !c)}
      />
      {!feedCollapsed && (
        <ResizeHandle
          ariaLabel="Resize command center width"
          style={{ left: feedW - 3 }}
          onStart={() => setFeedResizing(true)}
          onEnd={() => setFeedResizing(false)}
          onResize={x => setFeedW(clamp(x, 240, 620))}
        />
      )}

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

      {commsCollapsed ? (
        <div
          className={`${styles.bottomComms} ${styles.collapsed}`}
          style={{ left: feedEdge, right: dashCollapsed ? 46 : dashW }}
        >
          <button
            type="button"
            className={styles.bottomCommsTab}
            aria-label="Expand mission comms"
            onClick={() => setCommsCollapsed(false)}
          >
            <span className={styles.collapseBtn}>⌃</span>
            <span className={styles.bottomCommsTabMark}>Mission Comms</span>
          </button>
        </div>
      ) : (
        <div
          className={styles.bottomComms}
          style={{
            left: feedEdge,
            right: dashCollapsed ? 46 : dashW,
            height: commsH,
            transition: commsResizing ? 'none' : undefined,
          }}
        >
          <div
            className={`${styles.commsResizer} ${commsResizing ? styles.resizing : ''}`}
            onPointerDown={onCommsHandleDown}
            role="separator"
            aria-orientation="horizontal"
            aria-label="Resize mission comms height"
          />
          <div className={styles.bottomCommsHead}>
            <div className={styles.bottomCommsTitle}>
              <span className={styles.bar} />
              Mission Comms
            </div>
            <button
              type="button"
              className={styles.collapseBtn}
              aria-label="Collapse mission comms"
              onClick={() => setCommsCollapsed(true)}
            >
              ⌄
            </button>
          </div>
          <div className={styles.bottomCommsBody}>
            <CommsLog />
          </div>
        </div>
      )}

      <BottomBar />

      {showColdOpen && <ColdOpen />}
      {showDebrief && <Debrief force={forceDebrief} />}
    </div>
  )
}
