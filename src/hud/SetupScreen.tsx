import { useState, type CSSProperties } from 'react'

const ACCENT = '#00d4ff'

export function SetupScreen({
  onDeploy,
}: {
  onDeploy: (houses: number, drones: number, teams: number) => void
}) {
  const [houses, setHouses] = useState(8)
  const [drones, setDrones] = useState(2)

  const responders = Math.max(2, Math.ceil(houses * 0.75))
  const estimate = Math.max(1, Math.round((houses * 2) / responders))

  return (
    <div style={overlay} role="dialog" aria-modal="true" aria-label="Mission Setup">
      <div style={card}>
        <div style={header}>
          <div style={title}>HAVEN</div>
          <div style={subtitle}>Mission Setup</div>
        </div>

        <div style={sliders}>
          <Slider
            id="setup-houses"
            label="Houses (all damaged)"
            min={4}
            max={20}
            value={houses}
            onChange={setHouses}
          />
          <Slider
            id="setup-drones"
            label="Recon drones"
            min={1}
            max={5}
            value={drones}
            onChange={setDrones}
          />
        </div>

        <div style={autoRow}>
          <span style={autoLabel}>Responders (auto)</span>
          <span style={autoVal}>{responders}</span>
        </div>

        <div style={estimateLine} aria-live="polite">
          Estimated completion: <span style={estimateValue}>~{estimate} min</span>
        </div>

        <button
          type="button"
          style={deployBtn}
          onClick={() => onDeploy(houses, drones, responders)}
        >
          Deploy Mission
        </button>
      </div>
    </div>
  )
}

function Slider({
  id,
  label,
  min,
  max,
  value,
  onChange,
}: {
  id: string
  label: string
  min: number
  max: number
  value: number
  onChange: (n: number) => void
}) {
  return (
    <div style={sliderRow}>
      <div style={sliderHead}>
        <label htmlFor={id} style={sliderLabel}>
          {label}
        </label>
        <span style={sliderValue}>{value}</span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={range}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
      />
    </div>
  )
}

const overlay: CSSProperties = {
  position: 'absolute',
  inset: 0,
  zIndex: 100,
  pointerEvents: 'auto',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'rgba(0,0,0,0.82)',
  backdropFilter: 'blur(8px)',
  WebkitBackdropFilter: 'blur(8px)',
  fontFamily:
    "system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
}

const card: CSSProperties = {
  width: 'min(440px, calc(100vw - 48px))',
  padding: '32px 36px 36px',
  borderRadius: 16,
  background: 'rgba(18,22,28,0.92)',
  border: '1px solid rgba(255,255,255,0.08)',
  boxShadow:
    '0 24px 60px rgba(0,0,0,0.55), 0 0 0 1px rgba(0,212,255,0.08) inset',
  color: '#e8edf2',
}

const header: CSSProperties = {
  textAlign: 'center',
  marginBottom: 28,
}

const title: CSSProperties = {
  fontSize: 40,
  fontWeight: 800,
  letterSpacing: '0.28em',
  color: '#ffffff',
  textShadow: `0 0 18px rgba(0,212,255,0.35)`,
}

const subtitle: CSSProperties = {
  marginTop: 6,
  fontSize: 13,
  letterSpacing: '0.22em',
  textTransform: 'uppercase',
  color: ACCENT,
}

const sliders: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 22,
  marginBottom: 26,
}

const sliderRow: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
}

const sliderHead: CSSProperties = {
  display: 'flex',
  alignItems: 'baseline',
  justifyContent: 'space-between',
}

const sliderLabel: CSSProperties = {
  fontSize: 14,
  fontWeight: 500,
  color: '#c4ccd4',
}

const sliderValue: CSSProperties = {
  fontSize: 18,
  fontWeight: 700,
  fontVariantNumeric: 'tabular-nums',
  color: ACCENT,
}

const range: CSSProperties = {
  width: '100%',
  accentColor: ACCENT,
  cursor: 'pointer',
}

const autoRow: CSSProperties = {
  display: 'flex',
  alignItems: 'baseline',
  justifyContent: 'space-between',
  padding: '10px 0',
  borderTop: '1px solid rgba(255,255,255,0.07)',
  marginBottom: 10,
}

const autoLabel: CSSProperties = {
  fontSize: 14,
  fontWeight: 500,
  color: '#9aa4ad',
}

const autoVal: CSSProperties = {
  fontSize: 20,
  fontWeight: 700,
  fontVariantNumeric: 'tabular-nums',
  color: ACCENT,
}

const estimateLine: CSSProperties = {
  textAlign: 'center',
  fontSize: 14,
  color: '#9aa4ad',
  marginBottom: 26,
}

const estimateValue: CSSProperties = {
  color: '#ffffff',
  fontWeight: 700,
  fontVariantNumeric: 'tabular-nums',
}

const deployBtn: CSSProperties = {
  width: '100%',
  padding: '14px 16px',
  borderRadius: 10,
  border: '1px solid rgba(0,212,255,0.55)',
  background: 'linear-gradient(180deg, rgba(0,212,255,0.22), rgba(0,212,255,0.10))',
  color: '#ffffff',
  fontSize: 15,
  fontWeight: 700,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  cursor: 'pointer',
  boxShadow: '0 0 24px rgba(0,212,255,0.25)',
}
