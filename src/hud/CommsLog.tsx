import { useEffect, useRef } from 'react'
import { useWorldStore } from '@/store/worldStore'
import type { AgentType } from '@/types'
import styles from './hud.module.css'

const AGENT_CLASS: Record<AgentType, string> = {
  commander: 'cmd',
  rescue:    'rsc',
  salvage:   'slv',
  rebuild:   'rbd',
  logistics: 'log',
}

const AGENT_LABELS: Record<AgentType, string> = {
  commander: 'CMD',
  rescue:    'RSC',
  salvage:   'SLV',
  rebuild:   'RBD',
  logistics: 'LOG',
}

export function CommsLog() {
  const world = useWorldStore(s => s.world)
  const bottomRef = useRef<HTMLDivElement>(null)

  const entries = world?.commsLog.slice(-20) ?? []

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [entries.length])

  return (
    <div className={styles.commsBody}>
      <div className={styles.logList}>
        {entries.length === 0 ? (
          <div className={styles.empty}>— AWAITING DEPLOYMENT —</div>
        ) : (
          entries.map((entry, i) => (
            <div key={i} className={styles.line}>
              <span className={`${styles.tag} ${styles[AGENT_CLASS[entry.agent]]}`}>
                [{AGENT_LABELS[entry.agent]}]
              </span>
              <span className={styles.msg}>{entry.message}</span>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}
