import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import Link from "next/link";
import { FaUsers } from "react-icons/fa";

import BottomNav from "@/components/BottomNav";
import FeedReviewCard from "@/components/FeedReviewCard";

function timeAgo(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (seconds < 60) return `hace ${seconds} seg`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `hace ${days} d`;
  return date.toLocaleDateString();
}

type CurrentUserProfile = {
  full_name: string | null;
  avatar_url: string | null;
};

export default async function InicioPage() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let currentUserProfile: CurrentUserProfile | null = null;
  if (user) {
    const { data: profileData } = await supabase
      .from("profiles")
      .select("full_name,avatar_url")
      .eq("id", user.id)
      .single();

    currentUserProfile = profileData ?? null;
  }


  // Obtener los IDs de usuarios seguidos y el propio
  let followingIds: string[] = [];
  if (user) {
    const { data: followingData } = await supabase
      .from("follows")
      .select("followed_id")
      .eq("follower_id", user.id);
    if (Array.isArray(followingData)) {
      followingIds = followingData.map((f) => f.followed_id);
    }
    followingIds.push(user.id); // Incluir el propio user_id
  }

  // Feed global: todas las reseñas con datos de perfil anidados
  const { data: reviewsData, error: reviewsError } = await supabase
    .from('reviews')
    .select(`
      *,
      profiles (*)
    `)
    .order('created_at', { ascending: false })
    .limit(15);

  if (reviewsError) {
    console.error('Error fetching reviews:', reviewsError);
  }
  const reviews = Array.isArray(reviewsData) ? reviewsData : [];

  const { data: trendingData } = await supabase
    .from("trending_this_week")
    .select("*");
  const trending = Array.isArray(trendingData) ? trendingData : [];

  return (
    <div className="min-h-screen bg-white">
      <header className="flex justify-between items-center px-4 pt-4 pb-2">
        <h1 className="text-3xl font-black text-blue-600 tracking-tighter">Bopp</h1>
        {currentUserProfile && (
          <Link
            href="/perfil"
            className="transition-transform hover:scale-105 active:scale-95"
          >
            <img
              src={currentUserProfile.avatar_url || "/default-avatar.png"}
              alt="Perfil"
              className="w-9 h-9 rounded-full object-cover border border-gray-200 shadow-sm"
            />
          </Link>
        )}
      </header>

      <div className="px-4 mt-2 mb-4">
        <form action="/buscar" method="get" className="w-full">
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              name="q"
              placeholder="Busca un álbum, artista o canción..."
              className="pl-10 pr-4 h-12 w-full bg-gray-100 rounded-2xl text-base text-gray-900 placeholder-gray-400 truncate outline-none border-0"
              autoComplete="off"
            />
          </div>
        </form>
      </div>

      <div className="flex justify-between items-end px-4 mb-4">
        <h2 className="text-xl font-bold text-gray-900">Tendencias en Bopp</h2>
        <Link
          href="/tendencias"
          className="text-sm text-blue-600 font-medium mb-1 hover:underline"
        >
          Ver todas &gt;
        </Link>
      </div>

      <div className="grid grid-rows-2 grid-flow-col auto-cols-[116px] gap-4 overflow-x-auto px-4 pb-4 snap-x hide-scrollbar scroll-pl-4 trending-scrollbar">
        {trending.length > 0 ? (
          trending.slice(0, 10).map((item: any) => (
            <Link
              key={item.spotify_id}
              href={`/${item.type === "song" ? "song" : "album"}/${item.spotify_id}`}
              className="snap-start border border-gray-100 rounded-xl shadow-sm bg-white flex flex-col gap-1.5 p-2 items-center hover:opacity-80 transition"
              style={{ minWidth: 116, maxWidth: 124 }}
            >
              {item.image_url ? (
                <img
                  src={item.image_url}
                  alt={item.title}
                  className="w-full aspect-square rounded-lg object-cover"
                />
              ) : (
                <div className="w-full aspect-square rounded-lg bg-gray-100" />
              )}
              <div className="text-xs font-bold text-gray-900 truncate w-full text-center mt-1">
                {item.title}
              </div>
              <div className="text-[10px] text-gray-500 truncate w-full text-center -mt-1">
                {item.artist}
              </div>
              {item.average_rating == null ||
              item.review_count == null ||
              item.review_count === 0 ? (
                <div className="flex items-center justify-center gap-1.5 mt-1 text-[10px] w-full">
                  <span className="text-gray-400 font-medium">Sin calificar</span>
                </div>
              ) : (
                <div className="flex flex-row items-center justify-center gap-1.5 mt-1 w-full">
                  <div className="flex items-center gap-0.5 text-blue-600 font-bold text-[11px]">
                    <svg
                      className="w-3 h-3 mb-[1px]"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.97a1 1 0 00.95.69h4.175c.969 0 1.371 1.24.588 1.81l-3.38 2.455a1 1 0 00-.364 1.118l1.287 3.97c.3.921-.755 1.688-1.54 1.118l-3.38-2.455a1 1 0 00-1.175 0l-3.38 2.455c-.784.57-1.838-.197-1.539-1.118l1.287-3.97a1 1 0 00-.364-1.118L2.05 9.397c-.783-.57-.38-1.81.588-1.81h4.175a1 1 0 00.95-.69l1.286-3.97z" />
                    </svg>
                    <span>{Number(item.average_rating).toFixed(1)}</span>
                  </div>
                  <span className="text-gray-400 text-[10px] flex items-center">
                    • {item.review_count} res
                  </span>
                </div>
              )}
            </Link>
          ))
        ) : (
          <div className="text-gray-400 text-sm py-8 col-span-full">
            No hay tendencias esta semana.
          </div>
        )}
      </div>

      <h2 className="text-xl font-bold text-gray-900 px-4 mt-8 mb-4">Actividad reciente</h2>

      <div className="px-4 pb-32">
        {reviews.length === 0 ? (
          <div className="bg-[#F5F5F7] rounded-2xl p-8 flex flex-col items-center text-center">
            <FaUsers className="text-4xl text-gray-400 mb-3" />
            <div className="text-xl font-bold text-gray-900 mb-1">Tu feed está vacío</div>
            <div className="text-gray-500 mb-6">
              Seguí a tus amigos para ver sus últimas reseñas.
            </div>
            <Link
              href="/buscar"
              className="px-6 py-3 rounded-full bg-blue-600 text-white font-bold hover:bg-blue-700"
            >
              Buscar amigos
            </Link>
          </div>
        ) : (
          <div className="bg-white mt-4">
            {reviews.map((r: any) => (
              <FeedReviewCard
                key={r.id}
                review={r}
                author={r.profiles}
                timeLabel={timeAgo(r.created_at)}
                initialIsLiked={r.initialIsLiked}
                initialLikesCount={r.initialLikesCount}
              />
            ))}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
