import { useWorldStore } from '@/store/worldStore'
import styles from './hud.module.css'

export function ColdOpen() {
  const setRunning = useWorldStore((s) => s.setRunning)

  return (
    <div className={styles.coldopen}>
      <div className={styles.coldInner}>
        <div className={styles.coldMark}>
          HAVEN
        </div>
        <div className={styles.coldTag}>AI Disaster Relief Commander</div>
        <p className={styles.coldBrief}>
          An AI commander is standing by to direct an autonomous robot fleet
          through search-and-rescue and a carbon-optimized rebuild of a disaster
          zone. Every decision it makes is logged live.
        </p>
        <div className={styles.coldSys}>
          <div className={styles.coldSysCell}>
            <span className={styles.coldSysK}>FLEET</span>
            <span className={styles.coldSysV}>8 UNITS · STANDBY</span>
          </div>
          <div className={styles.coldSysCell}>
            <span className={styles.coldSysK}>GRID</span>
            <span className={styles.coldSysV}>250 × 250 m</span>
          </div>
          <div className={styles.coldSysCell}>
            <span className={styles.coldSysK}>STATUS</span>
            <span className={styles.coldSysV}>AWAITING OPERATOR</span>
          </div>
        </div>
        <button
          type="button"
          className={styles.beginBtn}
          onClick={() => setRunning(true)}
        >
          ◉ BEGIN MISSION
        </button>
      </div>
    </div>
  )
}
