import { useEffect, useState } from 'react'
import { useWorldStore } from '@/store/worldStore'
import styles from './hud.module.css'

// The clock shows the real, current wall-clock time (new Date(), ticked every
// second) formatted into the selected zone — NOT app uptime. Default is the
// viewer's LOCAL zone so it always reads as "right now"; the dropdown switches
// the reference zone. UTC etc. remain available.
const LOCAL_TZ = (() => {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC' }
  catch { return 'UTC' }
})()

const ZONES = [
  { code: 'LOCAL', tz: LOCAL_TZ },
  { code: 'UTC', tz: 'UTC' },
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
  const [zoneCode, setZoneCode] = useState('LOCAL')
  const zone = ZONES.find(z => z.code === zoneCode) ?? ZONES[0]
  const localTime = timeIn(now, zone.tz, true)

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
            <div className={styles.railClockSelect}>
              <select
                className={styles.railZoneSelect}
                value={zoneCode}
                onChange={e => setZoneCode(e.target.value)}
                aria-label="Time zone"
              >
                {ZONES.map(z => (
                  <option key={z.code} value={z.code}>{z.code}</option>
                ))}
              </select>
              <span className={styles.railZoneCaret} aria-hidden="true">▾</span>
            </div>
            <span className={styles.railClock}>{localTime}</span>
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
