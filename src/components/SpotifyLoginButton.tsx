'use client'

import { supabase } from '../utils/supabase/client'

export default function SpotifyLoginButton() {
  const handleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'spotify',
      options: {
        scopes: 'user-read-email user-top-read playlist-read-private user-library-read playlist-read-collaborative user-read-private',
        redirectTo: `${window.location.origin}/auth/callback`
      }
    })
  }

  return (
    <button
      onClick={handleLogin}
      className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
    >
      Iniciar sesión con Spotify
    </button>
  )
}
