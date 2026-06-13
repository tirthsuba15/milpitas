import { useWorldStore } from '@/store/worldStore'
import styles from './hud.module.css'

export function CarbonMeter() {
  const world = useWorldStore(s => s.world)
  if (!world) return null

  const { carbon, inventory } = world
  const avoidedPct = Math.min(100, carbon.baselineKgCo2e > 0
    ? (carbon.avoidedKgCo2e / carbon.baselineKgCo2e) * 100
    : 0)

  const timberLow = inventory.importedTimber < 2000
  const timberCritical = inventory.importedTimber === 0

  return (
    <div className={styles.glass} style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div className={styles.label}>Carbon Ledger</div>

      {/* Vertical avoided bar */}
      <div style={{ flex: 1, position: 'relative', background: 'rgba(255,255,255,0.05)', borderRadius: 4, overflow: 'hidden', minHeight: 120 }}>
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          height: `${avoidedPct}%`,
          background: 'linear-gradient(to top, #44ff88, #00d4ff)',
          transition: 'height 0.6s ease',
          borderRadius: 4,
        }} />
        <div style={{ position: 'absolute', bottom: 8, left: 0, right: 0, textAlign: 'center', fontSize: 20, fontWeight: 700, color: '#44ff88' }}>
          {avoidedPct.toFixed(1)}%
        </div>
        <div style={{ position: 'absolute', top: 8, left: 0, right: 0, textAlign: 'center', fontSize: 9, color: '#666' }}>
          vs baseline
        </div>
      </div>

      <div style={{ fontSize: 11 }}>
        <div className={styles.label}>Avoided</div>
        <div className={styles.green}>{(carbon.avoidedKgCo2e / 1000).toFixed(1)} tCO₂e</div>
      </div>

      <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.1)' }} />

      {/* Material inventory */}
      <div style={{ fontSize: 11 }}>
        <div className={styles.label}>Timber Stock</div>
        <div className={timberCritical ? styles.red : timberLow ? styles.amber : styles.white}>
          {(inventory.importedTimber / 1000).toFixed(1)}t imported
        </div>
        <div className={styles.green}>{(inventory.salvagedTimber / 1000).toFixed(1)}t salvaged</div>
        <div className={styles.cyan}>{(inventory.recycledPanels / 1000).toFixed(1)}t recycled panels</div>
      </div>

      {timberCritical && (
        <div style={{ background: 'rgba(255,68,68,0.15)', border: '1px solid #ff4444', borderRadius: 4, padding: '6px 8px', fontSize: 11, color: '#ff4444' }}>
          ⚠ TIMBER SHORTAGE
        </div>
      )}
    </div>
  )
}
