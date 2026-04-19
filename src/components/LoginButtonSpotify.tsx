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
      className="w-full max-w-sm flex items-center justify-center gap-3 bg-white border border-gray-200 text-gray-900 py-4 px-4 rounded-2xl font-semibold text-lg hover:bg-gray-50 transition active:scale-[0.99]"
    >
      <FaSpotify className="text-[26px]" />
      Continuar con Spotify
    </button>
  );
}
