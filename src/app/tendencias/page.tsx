import Link from "next/link";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import BottomNav from "@/components/BottomNav";

export const dynamic = "force-dynamic";

export default async function TendenciasPage() {
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
  const { data: trending } = await supabase
    .from("trending_this_week")
    .select("*")
    .limit(23);

  const podium = trending?.slice(0, 3) || [];
  const rest = trending?.slice(3, 23) || [];

  return (
    <div className="min-h-screen bg-white">
      <h1 className="text-2xl font-bold text-gray-800 tracking-tight px-4 pt-6 pb-6 drop-shadow-sm">Tendencias globales</h1>

      {/* Podio Top 3 */}
      <div className="flex justify-center items-end gap-2 px-4 mb-8">
        {/* Puesto 2 */}
        {podium[1] && (
          <Link
            href={`/${podium[1].type === 'song' ? 'song' : 'album'}/${podium[1].spotify_id}`}
            className="flex flex-col items-center w-24"
          >
            <div className="bg-gray-50 rounded-2xl p-4 shadow-inner flex flex-col items-center w-full">
              {podium[1].image_url ? (
                <img src={podium[1].image_url} alt={podium[1].title} className="w-20 h-20 rounded-xl object-cover mb-2" />
              ) : (
                <div className="w-20 h-20 rounded-xl bg-gray-100 mb-2" />
              )}
              <span className="bg-blue-600 text-white font-bold px-3 py-1 rounded-full text-xs mb-1">#2</span>
              <span className="text-xs text-gray-500 font-medium mt-1">{podium[1].review_count} {podium[1].review_count === 1 ? 'reseña' : 'reseñas'}</span>
              <div className="text-xs font-semibold text-gray-900 text-center truncate w-full mt-2">{podium[1].title}</div>
              <div className="text-xs text-gray-500 text-center truncate w-full">{podium[1].artist}</div>
            </div>
          </Link>
        )}
        {/* Puesto 1 */}
        {podium[0] && (
          <Link
            href={`/${podium[0].type === 'song' ? 'song' : 'album'}/${podium[0].spotify_id}`}
            className="flex flex-col items-center w-32 mb-4"
          >
            <div className="bg-gray-50 rounded-2xl p-4 shadow-lg border border-blue-600 flex flex-col items-center w-full">
              {podium[0].image_url ? (
                <img src={podium[0].image_url} alt={podium[0].title} className="w-28 h-28 rounded-xl object-cover mb-2" />
              ) : (
                <div className="w-28 h-28 rounded-xl bg-gray-100 mb-2" />
              )}
              <span className="bg-blue-600 text-white font-bold px-3 py-1 rounded-full text-xs mb-1">#1</span>
              <span className="text-xs text-gray-500 font-medium mt-1">{podium[0].review_count} {podium[0].review_count === 1 ? 'reseña' : 'reseñas'}</span>
              <div className="text-base font-bold text-gray-900 text-center truncate w-full mt-2">{podium[0].title}</div>
              <div className="text-sm text-gray-500 text-center truncate w-full">{podium[0].artist}</div>
            </div>
          </Link>
        )}
        {/* Puesto 3 */}
        {podium[2] && (
          <Link
            href={`/${podium[2].type === 'song' ? 'song' : 'album'}/${podium[2].spotify_id}`}
            className="flex flex-col items-center w-24"
          >
            <div className="bg-gray-50 rounded-2xl p-4 shadow-inner flex flex-col items-center w-full">
              {podium[2].image_url ? (
                <img src={podium[2].image_url} alt={podium[2].title} className="w-20 h-20 rounded-xl object-cover mb-2" />
              ) : (
                <div className="w-20 h-20 rounded-xl bg-gray-100 mb-2" />
              )}
              <span className="bg-blue-600 text-white font-bold px-3 py-1 rounded-full text-xs mb-1">#3</span>
              <span className="text-xs text-gray-500 font-medium mt-1">{podium[2].review_count} {podium[2].review_count === 1 ? 'reseña' : 'reseñas'}</span>
              <div className="text-xs font-semibold text-gray-900 text-center truncate w-full mt-2">{podium[2].title}</div>
              <div className="text-xs text-gray-500 text-center truncate w-full">{podium[2].artist}</div>
            </div>
          </Link>
        )}
      </div>

      {/* Lista vertical del 4 al 23 */}
      <div className="flex flex-col px-4 pb-24 divide-y divide-gray-100 [&>*:nth-child(even)]:bg-gray-50 rounded-xl overflow-hidden border border-gray-100">
        {rest.map((item, idx) => (
          <Link
            key={item.spotify_id}
            href={`/${item.type === 'song' ? 'song' : 'album'}/${item.spotify_id}`}
            className="flex items-center gap-4 py-3 px-2 group transition hover:bg-blue-50/50"
          >
            <span className="text-2xl font-black text-blue-600 w-8 text-center">{idx + 4}</span>
            {item.image_url ? (
              <img src={item.image_url} alt={item.title} className="w-12 h-12 rounded-md object-cover" />
            ) : (
              <div className="w-12 h-12 rounded-md bg-gray-100" />
            )}
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-gray-900 line-clamp-1">{item.title}</div>
              <div className="text-sm text-gray-500 line-clamp-1">{item.artist}</div>
            </div>
            <div className="flex items-center gap-1.5 bg-blue-50 text-blue-700 font-medium px-3 py-1.5 rounded-full text-xs min-w-fit">
              {/* Icono de ondas/zumbido */}
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 15s2-2.5 5-2.5 5 2.5 5 2.5 2-2.5 5-2.5 5 2.5 5 2.5" />
              </svg>
              {item.review_count} {item.review_count === 1 ? 'reseña' : 'reseñas'}
            </div>
          </Link>
        ))}
      </div>
      <BottomNav />
    </div>
  );
}
