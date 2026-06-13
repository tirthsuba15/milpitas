import styles from './hud.module.css'

const ITEMS = [
  { id: 'status', num: '01', label: 'Mission Overview' },
  { id: 'carbon', num: '02', label: 'Carbon Ledger' },
  { id: 'comms', num: '03', label: 'Mission Comms' },
  { id: 'operator', num: '04', label: 'Operator' },
]

export function NavMenu({
  active,
  onSelect,
  collapsed,
  onToggleCollapse,
  width,
  resizing,
}: {
  active: string
  onSelect: (id: string) => void
  collapsed: boolean
  onToggleCollapse: () => void
  width?: number
  resizing?: boolean
}) {
  if (collapsed) {
    return (
      <div className={`${styles.navMenu} ${styles.collapsed}`}>
        <div className={styles.railTab}>
          <button type="button" className={styles.collapseBtn} aria-label="Expand menu" onClick={onToggleCollapse}>
            ›
          </button>
          <div className={styles.railTabMark}>Menu</div>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.navMenu} style={{ width, transition: resizing ? 'none' : undefined }}>
      <div className={styles.navTitle}>
        <div className={styles.navTitleMain}>HAVEN</div>
        <div className={styles.navTitleSub}>Command</div>
      </div>

      <div className={styles.navList}>
        {ITEMS.map(it => (
          <button
            key={it.id}
            type="button"
            className={`${styles.navItem} ${active === it.id ? styles.navItemActive : ''}`}
            onClick={() => onSelect(it.id)}
          >
            <span className={styles.navNum}>{it.num}</span>
            <span className={styles.navLabel}>{it.label}</span>
          </button>
        ))}
      </div>

      <button type="button" className={styles.navCollapse} onClick={onToggleCollapse}>
        ‹ Collapse
      </button>
    </div>
  )
}
