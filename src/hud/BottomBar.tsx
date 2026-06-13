import { useWorldStore } from '@/store/worldStore'
import { bus } from '@/events/bus'
import styles from './hud.module.css'

const PHASES = [
  { id: 'deploying', label: 'Deploying' },
  { id: 'active', label: 'Active' },
  { id: 'recovery', label: 'Recovery' },
  { id: 'complete', label: 'Complete' },
]

export function BottomBar() {
  const phase = useWorldStore(s => s.world?.phase)

  return (
    <div className={styles.bottomBar}>
      <div className={styles.filterGroup}>
        {PHASES.map(p => (
          <span key={p.id} className={`${styles.chip} ${phase === p.id ? styles.on : ''}`}>
            {p.label}
          </span>
        ))}
      </div>

      <div className={`${styles.filterGroup} ${styles.right}`}>
        <span className={styles.injectLabel}>Inject Scenario</span>
        <button type="button" className={`${styles.injectBtn} ${styles.iWarn}`} onClick={() => bus.emit('chaos:timber_shortage')}>
          Timber Shortage
        </button>
        <button type="button" className={`${styles.injectBtn} ${styles.iCrit}`} onClick={() => bus.emit('chaos:second_storm')}>
          2nd Storm
        </button>
        <button type="button" className={`${styles.injectBtn} ${styles.iSig}`} onClick={() => bus.emit('chaos:new_families')}>
          +Families
        </button>
      </div>
    </div>
  )
}
