import { ReactNode } from 'react'

export default function InicioLayout({ children }: { children: ReactNode }) {
  return (
    <div className="bg-[#F5F5F7] min-h-screen flex flex-col">
      <div className="flex-1">{children}</div>
    </div>
  )
}


