import { type ReactNode } from 'react'
import styles from './hud.module.css'

type Accent = 'sig' | 'good' | 'crit'

export function Section({
  id,
  num,
  title,
  meta,
  accent = 'sig',
  open,
  onToggle,
  children,
}: {
  id: string
  num?: string
  title: string
  meta?: string
  accent?: Accent
  open: boolean
  onToggle: () => void
  children: ReactNode
}) {
  const dotClass = accent === 'sig' ? styles.sectionDot : `${styles.sectionDot} ${styles[accent]}`

  return (
    <div className={styles.section} id={`sec-${id}`}>
      <button type="button" className={styles.sectionHeader} aria-expanded={open} onClick={onToggle}>
        <svg
          className={`${styles.sectionChevron} ${open ? styles.open : ''}`}
          viewBox="0 0 16 16"
          fill="none"
          aria-hidden="true"
        >
          <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {num && <span className={styles.sectionNum}>{num}</span>}
        <span className={dotClass} />
        <span className={styles.sectionTitle}>{title}</span>
        {meta && <span className={styles.sectionMeta}>{meta}</span>}
      </button>

      <div className={`${styles.sectionBody} ${open ? styles.open : ''}`}>
        <div className={styles.sectionInner}>
          <div className={styles.sectionPad}>{children}</div>
        </div>
      </div>
    </div>
  )
}
