import './globals.css'
import { Analytics } from '@vercel/analytics/next'

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-zinc-950 text-zinc-100">
        {children}
        <Analytics />
      </body>
    </html>
  )
}


