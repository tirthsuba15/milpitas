import { useWorldStore, type ReasoningKind } from '@/store/worldStore'
import styles from './hud.module.css'

const SIM_TICK_MS = 33

const KIND_CLASS: Record<ReasoningKind, string> = {
  plan: styles.kPlan,
  dispatch: styles.kDispatch,
  material: styles.kMaterial,
  reprioritize: styles.kReprioritize,
  reroute: styles.kReroute,
  event: styles.kEvent,
  human: styles.kHuman,
}

function clock(tick: number): string {
  const s = Math.floor((tick * SIM_TICK_MS) / 1000)
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

export function ReasoningFeed({
  width,
  resizing,
  collapsed,
  onToggleCollapse,
}: {
  width?: number
  resizing?: boolean
  collapsed: boolean
  onToggleCollapse: () => void
}) {
  const reasoning = useWorldStore(s => s.reasoning)
  const isRunning = useWorldStore(s => s.isRunning)

  if (collapsed) {
    return (
      <div className={`${styles.mindFeed} ${styles.collapsed}`}>
        <div className={styles.railTab}>
          <button type="button" className={styles.collapseBtn} aria-label="Expand reasoning feed" onClick={onToggleCollapse}>
            ›
          </button>
          <div className={styles.railTabMark}>Reasoning</div>
        </div>
      </div>
    )
  }

  // Newest first — the freshest decision is always pinned at the top.
  const entries = [...reasoning].reverse()

  return (
    <div className={styles.mindFeed} style={{ width, transition: resizing ? 'none' : undefined }}>
      <div className={styles.mindHead}>
        <div className={styles.mindHeadTop}>
          <div className={styles.mindTitle}>
            COMMAND CENTER
          </div>
          <button type="button" className={styles.collapseBtn} aria-label="Collapse reasoning feed" onClick={onToggleCollapse}>
            ‹
          </button>
        </div>
        <div className={styles.mindSub}>
          <span className={`${styles.mindPulse} ${isRunning ? styles.thinking : ''}`} />
          {isRunning ? 'Perceiving · reasoning · acting' : 'Awaiting deployment'}
        </div>
      </div>

      <div className={styles.mindList}>
        {entries.length === 0 ? (
          <div className={styles.mindEmpty}>— NO DECISIONS YET —</div>
        ) : (
          entries.map(e => (
            <div key={e.id} className={styles.mindEntry}>
              <div className={styles.mindMeta}>
                <span className={`${styles.mindTag} ${KIND_CLASS[e.kind]}`}>{e.label}</span>
                <span className={styles.mindTime}>{clock(e.tick)}</span>
              </div>
              <div className={styles.mindText}>{e.text}</div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
