'use client'

import { FaSpotify } from 'react-icons/fa'
import { FcGoogle } from 'react-icons/fc'
import { BsMusicNoteBeamed } from 'react-icons/bs' // Usamos esta para el logo
import { createBrowserClient } from '@supabase/ssr'

export default function Home() {
  // Inicializamos el cliente de Supabase para el navegador
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  // Función genérica que maneja ambos logins
  const handleLogin = async (provider: 'spotify' | 'google') => {
    await supabase.auth.signInWithOAuth({
      provider: provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-white px-6">
      
      {/* Logo (Estilo iOS Squircle) */}
      <div className="w-20 h-20 bg-white rounded-[1.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.08)] flex items-center justify-center mb-3">
        <BsMusicNoteBeamed className="text-4xl text-[#ff3b3b]" />
      </div>
      <h1 className="text-3xl font-extrabold text-black mb-12 tracking-tight">Bopp</h1>

      {/* Títulos */}
      <h2 className="text-4xl md:text-5xl font-extrabold text-black text-center mb-3 tracking-tight">
        Tu diario musical.
      </h2>
      <p className="text-gray-500 text-lg md:text-xl text-center mb-12">
        Registra tu música. Comparte tu vibra.
      </p>

      {/* Botones de Auth */}
      <div className="w-full max-w-sm flex flex-col items-center gap-2">
        
        {/* Botón Spotify */}
        <button
          onClick={() => handleLogin('spotify')}
          className="w-full flex items-center justify-center gap-3 bg-[#1DB954] text-white py-4 px-4 rounded-[1rem] font-bold text-lg hover:bg-[#1ed760] transition-transform active:scale-95"
        >
          <FaSpotify className="text-[26px]" />
          Conectar con Spotify
        </button>
        
        {/* Texto pequeño */}
        <span className="text-xs text-gray-400 mb-3">
          (Requerido para estadísticas semanal)
        </span>

        {/* Botón Google */}
        <button
          onClick={() => handleLogin('google')}
          className="w-full flex items-center justify-center gap-3 bg-white text-black border border-gray-200 py-4 px-4 rounded-[1rem] font-bold text-lg hover:bg-gray-50 shadow-sm transition-transform active:scale-95"
        >
          <FcGoogle className="text-[26px]" />
          Continuar con Google
        </button>
        
      </div>
    </main>
  )
}