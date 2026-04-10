import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import LoginButtonSpotify from "@/components/LoginButtonSpotify";

export default async function Home() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {
          // No-op en Server Components.
        },
      },
    }
  );

  const { data } = await supabase.auth.getUser();
  if (data?.user) {
    redirect("/inicio");
  }

  return (
    <main className="min-h-screen bg-white px-6 flex flex-col items-center justify-center">
      <div className="w-full max-w-md">
        <h1 className="text-5xl font-extrabold tracking-tight text-black mb-3">Bopp</h1>
        <p className="text-gray-500 text-lg mb-10">
          Descubrí música con amigos, guardá tus reseñas y seguí la vibra.
        </p>

        <div className="flex flex-col items-center gap-3">
          <LoginButtonSpotify />
          <span className="text-xs text-gray-400">
            (Necesario para conectar con Spotify)
          </span>
        </div>
      </div>
    </main>
  );
}