import { useEffect, useRef } from 'react'
import { useWorldStore } from '@/store/worldStore'
import type { AgentType } from '@/types'
import styles from './hud.module.css'

const AGENT_COLORS: Record<AgentType, string> = {
  commander: '#00d4ff',
  rescue:    '#ff8844',
  salvage:   '#aadd44',
  rebuild:   '#44ddff',
  logistics: '#cc88ff',
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
    <div className={styles.glass} style={{ width: '100%', maxHeight: 240, overflowY: 'auto', pointerEvents: 'auto' }}>
      <div className={styles.label} style={{ marginBottom: 6 }}>Mission Comms</div>
      {entries.length === 0 && <div className={styles.muted} style={{ fontSize: 12 }}>Awaiting deployment…</div>}
      {entries.map((entry, i) => (
        <div key={i} style={{ fontSize: 12, marginBottom: 4, display: 'flex', gap: 6 }}>
          <span style={{ color: AGENT_COLORS[entry.agent], flexShrink: 0, fontWeight: 700 }}>
            [{AGENT_LABELS[entry.agent]}]
          </span>
          <span style={{ color: '#ccc' }}>{entry.message}</span>
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  )
}
