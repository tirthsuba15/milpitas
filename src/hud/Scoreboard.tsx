import { useEffect, useRef, useState } from 'react'
import { useWorldStore } from '@/store/worldStore'
import styles from './hud.module.css'

export function Scoreboard() {
  const world = useWorldStore(s => s.world)
  const prevCarbonPct = useRef<number | null>(null)
  const [pulsing, setPulsing] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const carbonPct = world && world.carbon.baselineKgCo2e > 0
    ? Math.round((world.carbon.avoidedKgCo2e / world.carbon.baselineKgCo2e) * 100)
    : 0

  useEffect(() => {
    if (!world) return
    const prev = prevCarbonPct.current
    if (prev !== null && carbonPct > prev) {
      setPulsing(true)
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(() => setPulsing(false), 1200)
    }
    prevCarbonPct.current = carbonPct
  }, [carbonPct, world])

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])

  if (!world) return null

  const { score } = world
  const wasteTonnes = (score.wasteDivertedKg / 1000).toFixed(1)
  const vulnClass = score.vulnerableHousedPct > 70 ? styles.sig : styles.warn

  return (
    <div className={styles.statusGrid}>
      <div className={styles.statHero}>
        <span className={styles.lbl}>Families Housed</span>
        <span className={styles.statV}>
          {score.familiesHoused}<small>/{score.familiesTotal}</small>
        </span>
      </div>

      <div className={styles.statGrid2}>
        <div className={styles.stat}>
          <span className={styles.lbl}>Rescued</span>
          <span className={styles.statV}>
            {score.peopleRescued}<small>/{score.peopleTotal}</small>
          </span>
        </div>

        <div className={styles.stat}>
          <span className={styles.lbl}>Carbon Avoided</span>
          <span className={`${styles.statV} ${styles.good}${pulsing ? ` ${styles.pulse}` : ''}`}>
            +{carbonPct}<small>%</small>
          </span>
        </div>

        <div className={styles.stat}>
          <span className={styles.lbl}>Waste Diverted</span>
          <span className={`${styles.statV} ${styles.good}`}>
            {wasteTonnes}<small>t</small>
          </span>
        </div>

        <div className={styles.stat}>
          <span className={styles.lbl}>Vuln. First</span>
          <span className={`${styles.statV} ${vulnClass}`}>
            {score.vulnerableHousedPct}<small>%</small>
          </span>
        </div>
      </div>
    </div>
  )
}
