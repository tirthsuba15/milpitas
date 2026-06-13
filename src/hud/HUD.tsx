import { Scoreboard } from './Scoreboard'
import { CarbonMeter } from './CarbonMeter'
import { CommsLog } from './CommsLog'
import { MissionClock } from './MissionClock'
import { OperatorPanel } from './OperatorPanel'
import styles from './hud.module.css'

export function HUD() {
  return (
    <div className={styles.overlay}>
      <div className={styles.topLeft}>
        <MissionClock />
      </div>
      <div className={styles.topCenter}>
        <Scoreboard />
      </div>
      <div className={styles.rightPanel}>
        <CarbonMeter />
      </div>
      <div className={styles.bottomRight}>
        <CommsLog />
      </div>
      <div className={styles.bottomCenter}>
        <OperatorPanel />
      </div>
    </div>
  )
}
