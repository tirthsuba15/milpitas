import { useWorldStore } from '@/store/worldStore'
import styles from './hud.module.css'

export function Scoreboard() {
  const world = useWorldStore(s => s.world)
  if (!world) return null

  const { score, carbon } = world
  const carbonPct = carbon.baselineKgCo2e > 0
    ? Math.round((carbon.avoidedKgCo2e / carbon.baselineKgCo2e) * 100)
    : 0

  return (
    <div className={styles.glass} style={{ display: 'flex', gap: '32px', alignItems: 'flex-end' }}>
      <Stat label="Families Housed" value={`${score.familiesHoused}/${score.familiesTotal}`} big />
      <Stat label="Rescued" value={`${score.peopleRescued}/${score.peopleTotal}`} />
      <Stat label="Carbon Avoided" value={`${carbonPct}%`} color="green" />
      <Stat label="Waste Diverted" value={`${(score.wasteDivertedKg / 1000).toFixed(1)}t`} color="green" />
      <Stat label="Vuln. First" value={`${score.vulnerableHousedPct}%`} color={score.vulnerableHousedPct > 70 ? 'cyan' : 'amber'} />
    </div>
  )
}

function Stat({ label, value, big, color }: { label: string; value: string; big?: boolean; color?: string }) {
  const valueStyle = big ? styles.bigNumber : { fontSize: 24, fontWeight: 700, color: colorMap[color ?? 'white'] }
  return (
    <div>
      <div className={styles.label}>{label}</div>
      <div style={typeof valueStyle === 'string' ? undefined : valueStyle} className={typeof valueStyle === 'string' ? valueStyle : undefined}>
        {value}
      </div>
    </div>
  )
}

const colorMap: Record<string, string> = { white: '#e0e0e0', cyan: '#00d4ff', amber: '#ffaa00', green: '#44ff88', red: '#ff4444' }
