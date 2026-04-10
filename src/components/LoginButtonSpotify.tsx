"use client";

import { createBrowserClient } from "@supabase/ssr";
import { FaSpotify } from "react-icons/fa";
import { getURL } from "@/utils/getURL";

export default function LoginButtonSpotify() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const handleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "spotify",
      options: {
        redirectTo: `${getURL()}auth/callback`,
      },
    });
  };

  return (
    <button
      onClick={handleLogin}
      className="w-full max-w-sm flex items-center justify-center gap-3 bg-[#1DB954] text-white py-4 px-4 rounded-[1rem] font-bold text-lg hover:bg-[#1ed760] transition-transform active:scale-95"
    >
      <FaSpotify className="text-[26px]" />
      Iniciar sesión con Spotify
    </button>
  );
}
