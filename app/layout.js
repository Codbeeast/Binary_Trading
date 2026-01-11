import './globals.css'
import { Inter, Outfit } from 'next/font/google'
import Shell from '@/components/Shell'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const outfit = Outfit({ subsets: ['latin'], variable: '--font-outfit' })

export const metadata = {
  title: 'Finexa Trading - Real-time Market Simulation',
  description: 'Professional binary trading chart with admin controls and real-time data',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        cz-shortcut-listen="true"
        className={`${inter.variable} ${outfit.variable} font-sans bg-[#111318]`}>
        <Shell>
          {children}
        </Shell>
      </body>
    </html>
  )
}