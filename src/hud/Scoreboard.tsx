import { useWorldStore } from '@/store/worldStore'
import styles from './hud.module.css'

export function Scoreboard() {
  const world = useWorldStore(s => s.world)
  if (!world) return null

  const { score } = world

  return (
    <div className={styles.glass} style={{ display: 'flex', gap: '40px', alignItems: 'flex-end' }}>
      <div>
        <div className={styles.label}>Families Housed</div>
        <div className={styles.bigNumber}>
          {score.familiesHoused}<span style={{ fontSize: 30, fontWeight: 400, color: 'rgba(255,255,255,0.5)' }}>/{score.familiesTotal}</span>
        </div>
      </div>
      <div>
        <div className={styles.label}>People Rescued</div>
        <div className={styles.statValue}>{score.peopleRescued}/{score.peopleTotal}</div>
      </div>
      <div>
        <div className={styles.label}>Vulnerable First</div>
        <div className={styles.statValue}>{score.vulnerableHousedPct}%</div>
      </div>
    </div>
  )
}
