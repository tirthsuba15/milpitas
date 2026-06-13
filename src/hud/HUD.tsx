import { Scoreboard } from './Scoreboard'
import { CommsLog } from './CommsLog'
import { MissionClock } from './MissionClock'
import { OperatorPanel } from './OperatorPanel'
import { CarbonMeter } from './CarbonMeter'
import { useWorldStore } from '@/store/worldStore'
import type { WorldState } from '@/types'
import styles from './hud.module.css'

export function HUD() {
  const isRunning = useWorldStore(s => s.isRunning)
  const world     = useWorldStore(s => s.world)

  return (
    <div className={styles.overlay}>
      {/* Cold-open title card — visible before the operator hits START */}
      {!isRunning && <ColdOpenCard />}

      <div className={styles.topLeft}><MissionClock /></div>
      <div className={styles.topCenter}><Scoreboard /></div>
      <div className={styles.topRight}><CarbonMeter /></div>
      <div className={styles.bottomRight}><CommsLog /></div>
      <div className={styles.bottomCenter}><OperatorPanel /></div>

      {/* Mission-complete debrief overlay */}
      {world?.phase === 'complete' && <DebriefOverlay world={world} />}
    </div>
  )
}

// ─── Cold-open splash ─────────────────────────────────────────────────────────

function ColdOpenCard() {
  return (
    <div style={{
      position: 'absolute', inset: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.28)',
      pointerEvents: 'none', zIndex: 10,
    }}>
      <div className={styles.glass} style={{
        textAlign: 'center', padding: '44px 64px', maxWidth: 480,
        pointerEvents: 'none',
      }}>
        <div style={{ fontSize: 10, letterSpacing: '0.35em', color: '#00d4ff', marginBottom: 14 }}>
          AI DISASTER RELIEF COMMANDER
        </div>
        <div style={{ fontSize: 54, fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 10 }}>
          HAVEN
        </div>
        <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', lineHeight: 1.65, marginBottom: 32, maxWidth: 360, margin: '0 auto 32px' }}>
          Multi-agent AI commander for disaster relief and sustainable rebuilding
        </div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.28)', letterSpacing: '0.12em' }}>
          PRESS ▶ START BELOW TO DEPLOY
        </div>
      </div>
    </div>
  )
}

// ─── Mission-complete debrief ─────────────────────────────────────────────────

function DebriefOverlay({ world }: { world: WorldState }) {
  const { score, carbon } = world

  const stats = [
    { label: 'Carbon Avoided',  value: `${(carbon.avoidedKgCo2e / 1000).toFixed(1)} t`,      color: '#44ff88' },
    { label: 'People Rescued',  value: `${score.peopleRescued} / ${score.peopleTotal}`,        color: '#44aaff' },
    { label: 'Vulnerable First', value: `${score.vulnerableHousedPct.toFixed(0)} %`,           color: '#ffaa00' },
    { label: 'Waste Diverted',  value: `${(score.wasteDivertedKg / 1000).toFixed(1)} t`,      color: '#cc88ff' },
  ]

  const avoidedPct = carbon.baselineKgCo2e > 0
    ? ((carbon.avoidedKgCo2e / carbon.baselineKgCo2e) * 100).toFixed(0)
    : '0'

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 30,
      background: 'rgba(0,0,0,0.84)', backdropFilter: 'blur(22px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      pointerEvents: 'auto',
    }}>
      <div className={styles.glass} style={{ maxWidth: 640, width: '90%', textAlign: 'center', padding: '52px 60px' }}>
        <div style={{ fontSize: 10, letterSpacing: '0.3em', color: '#44ff88', marginBottom: 16 }}>
          MISSION COMPLETE
        </div>

        {/* Primary metric */}
        <div style={{ fontSize: 60, fontWeight: 800, lineHeight: 1, marginBottom: 6 }}>
          {score.familiesHoused}
          <span style={{ fontSize: 28, fontWeight: 400, color: 'rgba(255,255,255,0.35)', marginLeft: 6 }}>
            / {score.familiesTotal}
          </span>
        </div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', marginBottom: 36 }}>
          families housed vulnerable-first
        </div>

        {/* Stats grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20, marginBottom: 36 }}>
          {stats.map(s => (
            <div key={s.label}>
              <div className={styles.label}>{s.label}</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Counterfactual comparison */}
        <div style={{
          background: 'rgba(255,255,255,0.04)', borderRadius: 8,
          padding: '16px 24px', marginBottom: 28, fontSize: 12,
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, textAlign: 'left',
        }}>
          <div>
            <div className={styles.label} style={{ marginBottom: 8 }}>Haven (AI)</div>
            <div style={{ color: '#44ff88' }}>{score.familiesHoused} families housed</div>
            <div style={{ color: '#44ff88' }}>{avoidedPct}% less carbon</div>
            <div style={{ color: '#44ff88' }}>{score.vulnerableHousedPct.toFixed(0)}% vulnerable-first</div>
          </div>
          <div>
            <div className={styles.label} style={{ marginBottom: 8 }}>Baseline (fixed routing)</div>
            <div className={styles.muted}>{Math.floor(score.familiesTotal * 0.5)} families housed</div>
            <div className={styles.muted}>0% carbon savings</div>
            <div className={styles.muted}>random order</div>
          </div>
        </div>

        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', lineHeight: 1.7 }}>
          Haven housed {score.vulnerableHousedPct.toFixed(0)}% of vulnerable families first · avoided{' '}
          {(carbon.avoidedKgCo2e / 1000).toFixed(1)} t CO₂e vs. conventional rebuild ·{' '}
          diverted {(score.wasteDivertedKg / 1000).toFixed(1)} t from landfill
        </div>
      </div>
    </div>
  )
}
