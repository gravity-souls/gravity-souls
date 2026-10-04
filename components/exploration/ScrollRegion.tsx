'use client'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import styles from './exploration-panel.module.css'

export default function ScrollRegion({
  children,
  label,
}: {
  children: ReactNode
  label: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [scrolling, setScrolling] = useState(false)
  const [more, setMore] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const measure = () =>
      setMore(el.scrollTop + el.clientHeight < el.scrollHeight - 2)
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    if (el.firstElementChild) observer.observe(el.firstElementChild)
    measure()
    return () => {
      observer.disconnect()
      if (timer.current) clearTimeout(timer.current)
    }
  }, [])
  return (
    <div className={styles.scrollFrame} data-more={more}>
      <div
        ref={ref}
        role="region"
        aria-label={label}
        tabIndex={0}
        className={styles.scroll}
        data-scrolling={scrolling}
        onScroll={() => {
          const el = ref.current!
          setMore(el.scrollTop + el.clientHeight < el.scrollHeight - 2)
          setScrolling(true)
          if (timer.current) clearTimeout(timer.current)
          timer.current = setTimeout(() => setScrolling(false), 700)
        }}
      >
        <div>{children}</div>
      </div>
    </div>
  )
}
