'use client'

export default function ConfirmButton({
  confirmMessage = 'Are you sure?',
  children,
  className = '',
  ...props
}) {
  return (
    <button
      {...props}
      onClick={e => {
        const ok = window.confirm(confirmMessage)
        if (!ok) {
          e.preventDefault()
          e.stopPropagation()
        }
      }}
      className={className}
    >
      {children}
    </button>
  )
}
