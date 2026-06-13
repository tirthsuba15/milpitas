import { useWorldStore } from '@/store/worldStore'
import styles from './hud.module.css'

export function CarbonMeter() {
  const world = useWorldStore(s => s.world)
  if (!world) return null

  const { carbon, inventory } = world

  const avoidedPct = Math.min(
    100,
    carbon.baselineKgCo2e > 0 ? (carbon.avoidedKgCo2e / carbon.baselineKgCo2e) * 100 : 0,
  )

  const timberCritical = inventory.importedTimber === 0
  const timberClass = timberCritical
    ? `${styles.invVal} ${styles.crit}`
    : inventory.importedTimber < 2000
      ? `${styles.invVal} ${styles.warn}`
      : styles.invVal

  return (
    <div className={styles.ledgerBody}>
      <div className={styles.avoid}>
        <span className={styles.cap}>vs {(carbon.baselineKgCo2e / 1000).toFixed(1)}t BASELINE</span>
      </div>

      <div className={styles.gauge}>
        <div className={styles.well}>
          <div className={styles.fill} style={{ height: `${avoidedPct}%` }} />
          <div className={styles.gpct}>{avoidedPct.toFixed(0)}%</div>
          <div className={`${styles.gsub} ${styles.cap}`}>AVOIDED</div>
        </div>
        <div className={styles.ticks}>
          <span>100</span>
          <span>75</span>
          <span>50</span>
          <span>25</span>
          <span>0</span>
        </div>
      </div>

      <div className={styles.avoid}>
        <span className={styles.lbl}>CO₂e Avoided</span>
        <span className={styles.avoidV}>{(carbon.avoidedKgCo2e / 1000).toFixed(1)}t</span>
      </div>

      <hr className={styles.hr} />

      <div className={styles.inv}>
        <div className={styles.invRow}>
          <span className={styles.invK}>Imported Timber</span>
          <span className={timberClass}>{(inventory.importedTimber / 1000).toFixed(1)} t</span>
        </div>
        <div className={styles.invRow}>
          <span className={styles.invK}>Salvaged Timber</span>
          <span className={`${styles.invVal} ${styles.good}`}>
            {(inventory.salvagedTimber / 1000).toFixed(1)} t
          </span>
        </div>
        <div className={styles.invRow}>
          <span className={styles.invK}>Recycled Panels</span>
          <span className={`${styles.invVal} ${styles.sig}`}>
            {(inventory.recycledPanels / 1000).toFixed(1)} t
          </span>
        </div>
      </div>

      {timberCritical && (
        <div className={styles.shortage}>
          <span className={styles.blip} />
          TIMBER SHORTAGE · RECYCLED ACTIVE
        </div>
      )}
    </div>
  )
}
