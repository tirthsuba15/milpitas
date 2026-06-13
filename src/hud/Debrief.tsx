import { useState } from 'react'
import { useWorldStore } from '@/store/worldStore'
import styles from './hud.module.css'

export function Debrief({ force }: { force?: boolean }) {
  void force // dev-mode signal only; presentation is identical
  const [open, setOpen] = useState(true)
  const world = useWorldStore((s) => s.world)

  if (!open) return null

  // ── Headline: AI after-action summary (store.debrief) ▸ latest commander line ▸ canned prose ──
  // Prefer the LLM-written debrief once it lands; never show blank while it loads.
  const debrief = useWorldStore((s) => s.debrief)
  const commsLog = world?.commsLog ?? []
  let line =
    'Housed all vulnerable families on time while cutting rebuild emissions by 81% versus a conventional build.'
  for (let i = commsLog.length - 1; i >= 0; i--) {
    if (commsLog[i].agent === 'commander') {
      line = commsLog[i].message
      break
    }
  }
  if (debrief) line = debrief

  // ── Bar values (compute from world if present, else fallbacks) ───────────
  const score = world?.score
  const carbon = world?.carbon

  const housed = score?.familiesHoused ?? 4
  const total = score?.familiesTotal ?? 4
  const housedPct = total > 0 ? (housed / total) * 100 : 0

  const baselineKg = carbon?.baselineKgCo2e ?? 45000
  const avoidedKg = carbon?.avoidedKgCo2e ?? 36500
  const carbonPct = baselineKg > 0 ? Math.round((avoidedKg / baselineKg) * 100) : 0

  const wasteDivertedKg = score?.wasteDivertedKg ?? 0
  const wasteT = (wasteDivertedKg / 1000).toFixed(1)

  return (
    <div className={styles.debrief}>
      <div className={styles.debriefInner}>
        <div className={styles.debriefTitle}>Mission Debrief</div>
        <div className={styles.debriefLine}>{line}</div>

        <div className={styles.bars}>
          {/* 1 — Families Housed */}
          <div className={styles.barRow}>
            <div className={styles.barLabel}>Families Housed</div>
            <div className={styles.barTrack}>
              <div className={styles.barWrap}>
                <div
                  className={`${styles.barBar} ${styles.barHaven}`}
                  style={{ width: `${housedPct}%` }}
                />
                <span className={`${styles.barVal} ${styles.haven}`}>
                  {housed}/{total}
                </span>
              </div>
              <div className={styles.barWrap}>
                <div
                  className={`${styles.barBar} ${styles.barBase}`}
                  style={{ width: '50%' }}
                />
                <span className={`${styles.barVal} ${styles.base}`}>2/4 (slower)</span>
              </div>
            </div>
          </div>

          {/* 2 — Carbon Avoided */}
          <div className={styles.barRow}>
            <div className={styles.barLabel}>Carbon Avoided</div>
            <div className={styles.barTrack}>
              <div className={styles.barWrap}>
                <div
                  className={`${styles.barBar} ${styles.barHaven}`}
                  style={{ width: `${carbonPct}%` }}
                />
                <span className={`${styles.barVal} ${styles.haven}`}>+{carbonPct}%</span>
              </div>
              <div className={styles.barWrap}>
                <div
                  className={`${styles.barBar} ${styles.barBase}`}
                  style={{ width: '100%' }}
                />
                <span className={`${styles.barVal} ${styles.base}`}>0% (45.0t CO₂e)</span>
              </div>
            </div>
          </div>

          {/* 3 — Waste Diverted */}
          <div className={styles.barRow}>
            <div className={styles.barLabel}>Waste Diverted</div>
            <div className={styles.barTrack}>
              <div className={styles.barWrap}>
                <div
                  className={`${styles.barBar} ${styles.barHaven}`}
                  style={{ width: '85%' }}
                />
                <span className={`${styles.barVal} ${styles.haven}`}>{wasteT}t</span>
              </div>
              <div className={styles.barWrap}>
                <div
                  className={`${styles.barBar} ${styles.barBase}`}
                  style={{ width: '8%' }}
                />
                <span className={`${styles.barVal} ${styles.base}`}>~0t (to landfill)</span>
              </div>
            </div>
          </div>

          {/* 4 — Time-to-House */}
          <div className={styles.barRow}>
            <div className={styles.barLabel}>Time-to-House</div>
            <div className={styles.barTrack}>
              <div className={styles.barWrap}>
                <div
                  className={`${styles.barBar} ${styles.barHaven}`}
                  style={{ width: '100%' }}
                />
                <span className={`${styles.barVal} ${styles.haven}`}>ON TIME</span>
              </div>
              <div className={styles.barWrap}>
                <div
                  className={`${styles.barBar} ${styles.barBase}`}
                  style={{ width: '60%' }}
                />
                <span className={`${styles.barVal} ${styles.base}`}>DELAYED</span>
              </div>
            </div>
          </div>
        </div>

        <button
          type="button"
          className={styles.closeBtn}
          onClick={() => setOpen(false)}
        >
          Acknowledge
        </button>
      </div>
    </div>
  )
}
