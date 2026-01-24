'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

export default function ViewportScrollbar({
  scrollRef, // React ref to the scroll container (your gridRef)
  right = 10,
  top = 16,
  bottom = 16,
  minThumb = 48,
  trackWidth = 10,
  thumbWidth = 10,
  className = '',
  // show behavior
  autoHide = true,
  hideDelayMs = 900,
}) {
  const draggingRef = useRef(false)
  const dragOffsetRef = useRef(0)
  const hideTimerRef = useRef(null)

  const [metrics, setMetrics] = useState({
    scrollTop: 0,
    scrollHeight: 1,
    clientHeight: 1,
  })
  const [visible, setVisible] = useState(!autoHide)

  const trackHeight = useMemo(() => {
    // clamp to viewport height (fixed)
    const h = typeof window !== 'undefined' ? window.innerHeight : 0
    return Math.max(0, h - top - bottom)
  }, [top, bottom])

  // Compute thumb size/pos
  const { thumbHeight, thumbTop } = useMemo(() => {
    const { scrollTop, scrollHeight, clientHeight } = metrics
    const maxScroll = Math.max(1, scrollHeight - clientHeight)

    const raw = (clientHeight / Math.max(1, scrollHeight)) * trackHeight
    const th = Math.max(minThumb, Math.min(trackHeight, raw))

    const maxThumbTravel = Math.max(1, trackHeight - th)
    const ratio = Math.min(1, Math.max(0, scrollTop / maxScroll))
    const tt = ratio * maxThumbTravel

    return { thumbHeight: th, thumbTop: tt }
  }, [metrics, trackHeight, minThumb])

  function scheduleHide() {
    if (!autoHide) return
    if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current)
    hideTimerRef.current = window.setTimeout(() => {
      setVisible(false)
    }, hideDelayMs)
  }

  function showNow() {
    if (!autoHide) return
    setVisible(true)
    scheduleHide()
  }

  useEffect(() => {
    const el = scrollRef?.current
    if (!el) return

    const update = () => {
      setMetrics({
        scrollTop: el.scrollTop,
        scrollHeight: el.scrollHeight,
        clientHeight: el.clientHeight,
      })
    }

    update()

    const onScroll = () => {
      update()
      showNow()
    }

    // Resize affects viewport track; also content changes affect scrollHeight.
    const onResize = () => {
      update()
      showNow()
    }

    el.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onResize)

    // Observe content size changes to keep thumb correct during infinite load
    const ro = new ResizeObserver(() => {
      update()
      // don’t necessarily force visibility on content resize
    })
    ro.observe(el)

    return () => {
      el.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onResize)
      ro.disconnect()
      if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scrollRef, autoHide, hideDelayMs])

  function setScrollFromThumb(clientY) {
    const el = scrollRef?.current
    if (!el) return

    const yWithinTrack = clientY - top - dragOffsetRef.current
    const maxThumbTravel = Math.max(1, trackHeight - thumbHeight)
    const clampedThumb = Math.min(maxThumbTravel, Math.max(0, yWithinTrack))

    const maxScroll = Math.max(1, el.scrollHeight - el.clientHeight)
    const ratio = clampedThumb / maxThumbTravel
    el.scrollTop = ratio * maxScroll
  }

  function onThumbPointerDown(e) {
    e.preventDefault()
    e.stopPropagation()
    const el = scrollRef?.current
    if (!el) return

    draggingRef.current = true
    setVisible(true)

    // compute offset inside thumb
    const thumbRect = e.currentTarget.getBoundingClientRect()
    dragOffsetRef.current = e.clientY - thumbRect.top

    // capture
    try {
      e.currentTarget.setPointerCapture?.(e.pointerId)
    } catch {}

    const onMove = ev => {
      if (!draggingRef.current) return
      setScrollFromThumb(ev.clientY)
    }

    const onUp = () => {
      draggingRef.current = false
      scheduleHide()
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
  }

  function onTrackPointerDown(e) {
    // clicking the track jumps/centers thumb
    const el = scrollRef?.current
    if (!el) return

    showNow()
    dragOffsetRef.current = thumbHeight / 2
    setScrollFromThumb(e.clientY)
  }

  // Only show if scrollable
  const isScrollable = metrics.scrollHeight > metrics.clientHeight + 2
  if (!isScrollable) return null

  return (
    <div
      className={[
        'fixed z-[60] select-none',
        autoHide ? 'transition-opacity duration-200' : '',
        visible ? 'opacity-100' : 'opacity-0 pointer-events-none',
        className,
      ].join(' ')}
      style={{
        right,
        top,
        width: trackWidth,
        height: trackHeight,
      }}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => scheduleHide()}
      onPointerDown={onTrackPointerDown}
      aria-hidden="true"
    >
      {/* Track */}
      <div
        className="h-full w-full rounded-full bg-zinc-900/70 border border-zinc-700/70 backdrop-blur"
        style={{ padding: 0 }}
      >
        {/* Thumb */}
        <div
          onPointerDown={onThumbPointerDown}
          className="rounded-full bg-zinc-300/30 hover:bg-zinc-300/45 active:bg-zinc-300/55 border border-zinc-200/10 shadow-sm transition-colors"
          style={{
            position: 'absolute',
            right: 0,
            top: top + thumbTop, // because outer div is fixed at top
            transform: `translateY(${0}px)`,
            width: thumbWidth,
            height: thumbHeight,
          }}
        />
      </div>
    </div>
  )
}
