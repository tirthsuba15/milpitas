import { useWorldStore } from '@/store/worldStore'
import { Section } from './Section'
import { Scoreboard } from './Scoreboard'
import { CarbonMeter } from './CarbonMeter'
import { OperatorPanel } from './OperatorPanel'
import styles from './hud.module.css'

export type SectionId = 'status' | 'carbon' | 'operator'

export function Dashboard({
  open,
  onToggle,
  collapsed,
  onToggleCollapse,
  width,
  resizing,
}: {
  open: Record<SectionId, boolean>
  onToggle: (id: SectionId) => void
  collapsed: boolean
  onToggleCollapse: () => void
  width?: number
  resizing?: boolean
}) {
  const isRunning = useWorldStore(s => s.isRunning)
  const timberCritical = useWorldStore(s => (s.world?.inventory.importedTimber ?? 1) === 0)

  if (collapsed) {
    return (
      <div className={`${styles.dashboard} ${styles.collapsed}`}>
        <div className={styles.railTab}>
          <button type="button" className={styles.collapseBtn} aria-label="Expand dashboard" onClick={onToggleCollapse}>
            ‹
          </button>
          <div className={styles.railTabMark}>Monitor</div>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.dashboard} style={{ width, transition: resizing ? 'none' : undefined }}>
      <div className={styles.dashHead}>
        <div className={styles.headTop}>
          <div className={styles.mark}>
            HAVEN
          </div>
          <div className={`${styles.live} ${isRunning ? '' : styles.off}`}>
            <span className={styles.liveDot} />
            {isRunning ? 'LIVE' : 'STANDBY'}
          </div>
          <button type="button" className={styles.collapseBtn} aria-label="Collapse dashboard" onClick={onToggleCollapse}>
            ›
          </button>
        </div>
        <div className={styles.dashSub}>Disaster Relief Monitor</div>
      </div>

      <div className={styles.dashScroll}>
        <Section id="status" num="01" title="Mission Status" accent="good" open={open.status} onToggle={() => onToggle('status')}>
          <Scoreboard />
        </Section>
        <Section id="carbon" num="02" title="Carbon Ledger" accent={timberCritical ? 'crit' : 'good'} open={open.carbon} onToggle={() => onToggle('carbon')}>
          <CarbonMeter />
        </Section>
        <Section id="operator" num="03" title="Operator Console" accent="sig" open={open.operator} onToggle={() => onToggle('operator')}>
          <OperatorPanel />
        </Section>
      </div>
    </div>
  )
}
