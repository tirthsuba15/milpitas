import { useState } from 'react'
import { useWorldStore } from '@/store/worldStore'
import { commander } from '@/agents/Commander'
import styles from './hud.module.css'

export function OperatorPanel() {
  const [input, setInput] = useState('')
  const setRunning = useWorldStore(s => s.setRunning)
  const isRunning  = useWorldStore(s => s.isRunning)

  const sendCommand = () => {
    if (!input.trim()) return
    commander.injectHumanCommand(input.trim())
    useWorldStore.getState().addCommsEntry('commander', `[HUMAN] "${input.trim()}"`, 'HUMAN_CMD')
    useWorldStore.getState().pushReasoning('human', 'OPERATOR', `"${input.trim()}" — folding into next plan.`)
    setInput('')
  }

  return (
    <div className={styles.consoleBody}>
      {isRunning ? (
        <button type="button" className={`${styles.armBtn} ${styles.running}`} onClick={() => setRunning(false)}>
          <span className={styles.armDot} />
          STOP MISSION
        </button>
      ) : (
        <button type="button" className={`${styles.armBtn} ${styles.ready}`} onClick={() => setRunning(true)}>
          ▶ ARM MISSION
        </button>
      )}

      <div className={styles.cmdrow}>
        <input
          className={styles.cmdin}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && sendCommand()}
          placeholder="Issue command to commander…"
        />
        <button type="button" className={styles.transmit} onClick={sendCommand}>
          SEND ▸
        </button>
      </div>
    </div>
  )
}
