'use client'

import { ReactNode } from 'react'
import { FaHome, FaSearch, FaRegEdit, FaRegBell, FaUser } from 'react-icons/fa'

export default function InicioLayout({ children }: { children: ReactNode }) {
  return (
    <div className="bg-white min-h-screen flex flex-col">
      <div className="flex-1">{children}</div>
    </div>
  )
}


