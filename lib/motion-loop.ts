export interface MotionFrame {
  time: number
  delta: number
  animate: boolean
}

/** One animation clock, with a single static frame for controls and reduced motion. */
export function createMotionLoop(element: HTMLElement, render: (frame: MotionFrame) => void) {
  const media = window.matchMedia('(prefers-reduced-motion: reduce)')
  let paused = false
  let motionOverride = false
  let visible = true
  let disposed = false
  let frameId = 0
  let previous = 0
  let time = 0

  const canRender = () => !disposed && visible && !document.hidden
  const canAnimate = () => canRender() && !paused && (!media.matches || motionOverride)

  function frame(timestamp: number) {
    frameId = 0
    if (!canRender()) return
    const animate = canAnimate()
    const delta = animate && previous ? Math.min((timestamp - previous) / 1000, 0.05) : 0
    previous = animate ? timestamp : 0
    time += delta
    render({ time, delta, animate })
    if (canAnimate()) frameId = requestAnimationFrame(frame)
  }

  function invalidate() {
    if (canRender() && !frameId) frameId = requestAnimationFrame(frame)
  }

  function refresh() {
    cancelAnimationFrame(frameId)
    frameId = 0
    previous = 0
    invalidate()
  }

  const observer = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting
    refresh()
  })
  observer.observe(element)
  document.addEventListener('visibilitychange', refresh)
  media.addEventListener('change', refresh)
  invalidate()

  return {
    invalidate,
    setPaused(value: boolean) {
      paused = value
      refresh()
    },
    // Only an explicit visitor action may override the initial device preference.
    setMotionOverride(value: boolean) {
      motionOverride = value
      refresh()
    },
    reset() {
      time = 0
      refresh()
    },
    dispose() {
      disposed = true
      cancelAnimationFrame(frameId)
      observer.disconnect()
      document.removeEventListener('visibilitychange', refresh)
      media.removeEventListener('change', refresh)
    },
  }
}
