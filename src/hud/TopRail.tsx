import { useEffect, useState } from 'react'
import { useWorldStore } from '@/store/worldStore'
import styles from './hud.module.css'

// UTC is the default operational reference; the strip adds regional ops zones.
const ZONES = [
  { code: 'SFO', tz: 'America/Los_Angeles' },
  { code: 'NYC', tz: 'America/New_York' },
  { code: 'LON', tz: 'Europe/London' },
  { code: 'TOK', tz: 'Asia/Tokyo' },
]

function useNow() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])
  return now
}

function timeIn(d: Date, tz: string, withSeconds = false): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: tz, hour12: false,
    hour: '2-digit', minute: '2-digit', ...(withSeconds ? { second: '2-digit' } : {}),
  }).format(d)
}

export function TopRail() {
  const world = useWorldStore(s => s.world)
  const isRunning = useWorldStore(s => s.isRunning)

  const now = useNow()
  const utc = timeIn(now, 'UTC', true)

  const score = world?.score
  const carbonPct = world && world.carbon.baselineKgCo2e > 0
    ? Math.round((world.carbon.avoidedKgCo2e / world.carbon.baselineKgCo2e) * 100)
    : 0

  const robots = world?.entities.filter(e => e.kind === 'robot') ?? []
  const active = robots.filter(
    e => (e as any).status !== 'idle' && (e as any).status !== 'failed'
  ).length

  const phase = (world?.phase ?? 'standby').toUpperCase()

  return (
    <div className={styles.topRail}>
      <div className={styles.railBrand}>
        <div className={styles.railMark}>
          HAVEN
        </div>
        <div className={styles.railSub}>AI Disaster Relief Commander</div>
      </div>

      <div className={styles.railStats}>
        <Stat k="Families" v={`${score?.familiesHoused ?? 0}/${score?.familiesTotal ?? 4}`} />
        <Stat k="Rescued" v={`${score?.peopleRescued ?? 0}/${score?.peopleTotal ?? 2}`} />
        <Stat k="Carbon Avoided" v={`+${carbonPct}%`} cls="good" />
        <Stat k="Fleet Active" v={`${active}/${robots.length || 8}`} />
      </div>

      <div className={styles.railRight}>
        <div className={styles.railClockWrap}>
          <div className={styles.railClockMain}>
            <span className={styles.railClockLabel}>UTC</span>
            <span className={styles.railClock}>{utc}</span>
          </div>
          <div className={styles.railZones}>
            {ZONES.map(z => (
              <span key={z.code} className={styles.railZone}>
                <span className={styles.railZoneCode}>{z.code}</span>
                <span className={styles.railZoneTime}>{timeIn(now, z.tz)}</span>
              </span>
            ))}
          </div>
        </div>
        <div className={styles.railStatus}>
          <span className={`${styles.statusDot} ${isRunning ? styles.live : ''}`} />
          {isRunning ? phase : 'STANDBY'}
        </div>
      </div>
    </div>
  )
}

function Stat({ k, v, cls }: { k: string; v: string; cls?: string }) {
  return (
    <div className={styles.railStat}>
      <span className={styles.railStatK}>{k}</span>
      <span className={`${styles.railStatV} ${cls ? styles[cls] : ''}`}>{v}</span>
    </div>
  )
}
