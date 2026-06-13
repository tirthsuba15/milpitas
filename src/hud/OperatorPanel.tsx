import { useState } from 'react'
import { useWorldStore } from '@/store/worldStore'
import { commander } from '@/agents/Commander'
import { bus } from '@/events/bus'
import { startDemoSequence } from '@/scenarios/initial'
import styles from './hud.module.css'

export function OperatorPanel() {
  const [input, setInput] = useState('')
  const setRunning = useWorldStore(s => s.setRunning)
  const isRunning  = useWorldStore(s => s.isRunning)

  const sendCommand = () => {
    if (!input.trim()) return
    commander.injectHumanCommand(input.trim())
    useWorldStore.getState().addCommsEntry('commander', `[HUMAN] "${input.trim()}"`, 'HUMAN_CMD')
    setInput('')
  }

  const handleStartStop = () => {
    const next = !isRunning
    setRunning(next)
    if (next) startDemoSequence()
  }

  return (
    <div className={styles.glass} style={{ display: 'flex', gap: 8, alignItems: 'center', pointerEvents: 'auto' }}>
      {/* Start / stop */}
      <button onClick={handleStartStop} style={btnStyle(isRunning ? '#ff4444' : '#44ff88')}>
        {isRunning ? '⏹ STOP' : '▶ START'}
      </button>

      {/* Chaos controls */}
      <button onClick={() => bus.emit('chaos:timber_shortage')} style={btnStyle('#ffaa00')}>
        TIMBER SHORTAGE
      </button>
      <button onClick={() => bus.emit('chaos:second_storm')} style={btnStyle('#ff6644')}>
        2ND STORM
      </button>
      <button onClick={() => bus.emit('chaos:new_families')} style={btnStyle('#aa44ff')}>
        +FAMILIES
      </button>

      {/* Human command input */}
      <input
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && sendCommand()}
        placeholder="Type a command and press Enter…"
        style={{
          flex: 1, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.2)',
          borderRadius: 4, padding: '6px 10px', color: '#e0e0e0', fontSize: 13,
          outline: 'none', fontFamily: 'inherit',
        }}
      />
      <button onClick={sendCommand} style={btnStyle('#00d4ff')}>SEND</button>
    </div>
  )
}

const btnStyle = (color: string): React.CSSProperties => ({
  background: `${color}22`,
  border: `1px solid ${color}`,
  color,
  borderRadius: 4,
  padding: '6px 12px',
  fontSize: 11,
  fontWeight: 700,
  cursor: 'pointer',
  fontFamily: 'inherit',
  letterSpacing: '0.05em',
  whiteSpace: 'nowrap',
})
