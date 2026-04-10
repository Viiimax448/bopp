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
      <h1 className="text-2xl font-bold text-gray-800 tracking-tight px-4 pt-6 pb-6">Tendencias globales</h1>

      {/* Podio */}
      <div className="flex justify-center items-end gap-2 px-4 mb-8">
        {/* Puesto 2 */}
        {podium[1] && (
          <Link
            href={`/${podium[1].type === 'song' ? 'song' : 'album'}/${podium[1].spotify_id}`}
            className="flex flex-col items-center w-24"
          >
            {podium[1].image_url ? (
              <img src={podium[1].image_url} alt={podium[1].title} className="w-24 h-24 rounded-xl object-cover mb-2" />
            ) : (
              <div className="w-24 h-24 rounded-xl bg-gray-100 mb-2" />
            )}
            <div className="text-xs font-semibold text-gray-900 text-center truncate w-full">{podium[1].title}</div>
            <div className="text-xs text-gray-500 text-center truncate w-full">{podium[1].artist}</div>
            <span className="mt-1 text-xs bg-gray-200 text-gray-600 rounded-full px-2 py-0.5 font-bold">#2</span>
            <span className="text-xs text-gray-500 font-medium mt-1.5 flex items-center gap-1">{podium[1].review_count} {podium[1].review_count === 1 ? 'reseña' : 'reseñas'}</span>
          </Link>
        )}
        {/* Puesto 1 */}
        {podium[0] && (
          <Link
            href={`/${podium[0].type === 'song' ? 'song' : 'album'}/${podium[0].spotify_id}`}
            className="flex flex-col items-center w-32 mb-4"
          >
            {podium[0].image_url ? (
              <img src={podium[0].image_url} alt={podium[0].title} className="w-32 h-32 rounded-xl object-cover shadow-lg mb-2" />
            ) : (
              <div className="w-32 h-32 rounded-xl bg-gray-100 shadow-lg mb-2" />
            )}
            <div className="text-base font-bold text-gray-900 text-center truncate w-full">{podium[0].title}</div>
            <div className="text-sm text-gray-500 text-center truncate w-full">{podium[0].artist}</div>
            <span className="mt-1 text-xs bg-[#FB3C4C] text-white rounded-full px-2 py-0.5 font-black">#1</span>
            <span className="text-xs text-gray-500 font-medium mt-1.5 flex items-center gap-1">{podium[0].review_count} {podium[0].review_count === 1 ? 'reseña' : 'reseñas'}</span>
          </Link>
        )}
        {/* Puesto 3 */}
        {podium[2] && (
          <Link
            href={`/${podium[2].type === 'song' ? 'song' : 'album'}/${podium[2].spotify_id}`}
            className="flex flex-col items-center w-24"
          >
            {podium[2].image_url ? (
              <img src={podium[2].image_url} alt={podium[2].title} className="w-24 h-24 rounded-xl object-cover mb-2" />
            ) : (
              <div className="w-24 h-24 rounded-xl bg-gray-100 mb-2" />
            )}
            <div className="text-xs font-semibold text-gray-900 text-center truncate w-full">{podium[2].title}</div>
            <div className="text-xs text-gray-500 text-center truncate w-full">{podium[2].artist}</div>
            <span className="mt-1 text-xs bg-gray-200 text-gray-600 rounded-full px-2 py-0.5 font-bold">#3</span>
            <span className="text-xs text-gray-500 font-medium mt-1.5 flex items-center gap-1">{podium[2].review_count} {podium[2].review_count === 1 ? 'reseña' : 'reseñas'}</span>
          </Link>
        )}
      </div>

      {/* Lista vertical del 4 al 23 */}
      <div className="flex flex-col px-4 pb-24">
        {rest.map((item, idx) => (
          <Link
            key={item.spotify_id}
            href={`/${item.type === 'song' ? 'song' : 'album'}/${item.spotify_id}`}
            className="flex items-center gap-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition"
          >
            <span className="text-lg font-bold text-gray-400 w-6 text-center">{idx + 4}</span>
            {item.image_url ? (
              <img src={item.image_url} alt={item.title} className="w-12 h-12 rounded-md object-cover" />
            ) : (
              <div className="w-12 h-12 rounded-md bg-gray-100" />
            )}
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-gray-900 line-clamp-1">{item.title}</div>
              <div className="text-sm text-gray-500 line-clamp-1">{item.artist}</div>
            </div>
            <div className="flex items-center gap-1 text-sm text-gray-500 min-w-fit">
              {item.review_count} {item.review_count === 1 ? 'reseña' : 'reseñas'}
            </div>
          </Link>
        ))}
      </div>
      <BottomNav />
    </div>
  );
}
