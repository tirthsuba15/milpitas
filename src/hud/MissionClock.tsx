import { useWorldStore } from '@/store/worldStore'
import styles from './hud.module.css'

export function MissionClock() {
  const world = useWorldStore(s => s.world)
  if (!world) return null

  const s = Math.floor(world.elapsedSeconds)
  const mm = String(Math.floor(s / 60)).padStart(2, '0')
  const ss = String(s % 60).padStart(2, '0')

  const activeRobots  = world.entities.filter(e => e.kind === 'robot' && (e as any).status !== 'idle' && (e as any).status !== 'failed').length
  const failedRobots  = world.entities.filter(e => e.kind === 'robot' && (e as any).status === 'failed').length
  const totalRobots   = world.entities.filter(e => e.kind === 'robot').length

  return (
    <div className={styles.glass} style={{ minWidth: 180 }}>
      <div className={styles.label}>Mission Time</div>
      <div style={{ fontSize: 28, fontWeight: 700, color: '#e0e0e0', fontVariantNumeric: 'tabular-nums' }}>
        {mm}:{ss}
      </div>
      <div style={{ fontSize: 11, marginTop: 6 }}>
        <div className={styles.label}>Fleet</div>
        <div>
          <span className={styles.green}>{activeRobots} active</span>
          {' · '}
          <span className={styles.muted}>{totalRobots - activeRobots - failedRobots} idle</span>
          {failedRobots > 0 && <span className={styles.red}> · {failedRobots} failed</span>}
        </div>
      </div>
      <div style={{ fontSize: 11, marginTop: 4 }}>
        <div className={styles.label}>Phase</div>
        <div className={styles.cyan}>{world.phase.toUpperCase()}</div>
      </div>
    </div>
  )
}
