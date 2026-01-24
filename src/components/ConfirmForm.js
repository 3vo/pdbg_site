'use client'

export default function ConfirmForm({ action, confirmMessage, children, className = '' }) {
  function onSubmit(e) {
    if (!confirmMessage) return
    const ok = window.confirm(confirmMessage)
    if (!ok) e.preventDefault()
  }

  return (
    <form action={action} onSubmit={onSubmit} className={className}>
      {children}
    </form>
  )
}
