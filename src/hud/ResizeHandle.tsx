import { type CSSProperties, type PointerEvent as ReactPointerEvent, useCallback } from 'react'
import styles from './hud.module.css'

export function ResizeHandle({
  style,
  onResize,
  onStart,
  onEnd,
  ariaLabel,
}: {
  style?: CSSProperties
  onResize: (clientX: number) => void
  onStart?: () => void
  onEnd?: () => void
  ariaLabel: string
}) {
  const onPointerDown = useCallback(
    (e: ReactPointerEvent) => {
      e.preventDefault()
      onStart?.()
      const move = (ev: PointerEvent) => onResize(ev.clientX)
      const up = () => {
        window.removeEventListener('pointermove', move)
        window.removeEventListener('pointerup', up)
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
        onEnd?.()
      }
      window.addEventListener('pointermove', move)
      window.addEventListener('pointerup', up)
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
    },
    [onResize, onStart, onEnd],
  )

  return (
    <div
      className={styles.resizer}
      style={style}
      onPointerDown={onPointerDown}
      role="separator"
      aria-orientation="vertical"
      aria-label={ariaLabel}
    />
  )
}
