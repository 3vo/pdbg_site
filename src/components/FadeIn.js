'use client'

import { useEffect, useState } from 'react'

export default function FadeIn({ children, className = '' }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // Trigger opacity transition after mount
    setVisible(true)
  }, [])

  return (
    <div
      className={[
        'transition-opacity duration-200',
        visible ? 'opacity-100' : 'opacity-0',
        className,
      ].join(' ')}
    >
      {children}
    </div>
  )
}
