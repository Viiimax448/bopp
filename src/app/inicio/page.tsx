
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { FaUsers } from "react-icons/fa";
import BottomNav from "@/components/BottomNav";
import FeedReviewCard, { FeedAuthor, FeedReview } from "@/components/FeedReviewCard";

function timeAgo(createdAt: string) {
  const created = new Date(createdAt).getTime();
  const diffSeconds = Math.max(0, Math.floor((Date.now() - created) / 1000));
  if (diffSeconds < 60) return "hace un momento";
  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) return `hace ${diffMinutes}m`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `hace ${diffHours}h`;
  const diffDays = Math.floor(diffHours / 24);
  return `hace ${diffDays}d`;
}

export default async function InicioPage() {
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

  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;
  if (!user) {
    redirect("/");
  }

  const { data: followingRows } = await supabase
    .from("followers")
    .select("following_id")
    .eq("follower_id", user.id);

  const followingIds = Array.from(
    new Set([user.id, ...(followingRows || []).map((r: any) => r.following_id)])
  );

  // Intento de join: reviews + profiles
  const joined = await supabase
    .from("reviews")
    .select(
      "id,user_id,spotify_id,type,rating,review_text,created_at,profiles(full_name,username,avatar_url)"
    )
    .in("user_id", followingIds)
    .order("created_at", { ascending: false });

  let reviews: Array<FeedReview & { author: FeedAuthor }> = [];

  if (!joined.error) {
    reviews = (joined.data || []).map((r: any) => {
      const profile = r.profiles && !Array.isArray(r.profiles) ? r.profiles : (r.profiles?.[0] ?? null);
      return {
        id: r.id,
        user_id: r.user_id,
        spotify_id: r.spotify_id,
        type: r.type,
        rating: r.rating ?? 0,
        review_text: r.review_text ?? null,
        created_at: r.created_at,
        author: {
          full_name: profile?.full_name ?? null,
          username: profile?.username ?? null,
          avatar_url: profile?.avatar_url ?? null,
        },
      };
    });
  } else {
    // Fallback: sin relación, hacemos 2 queries
    const { data: reviewsData } = await supabase
      .from("reviews")
      .select("id,user_id,spotify_id,type,rating,review_text,created_at")
      .in("user_id", followingIds)
      .order("created_at", { ascending: false });

    const authorIds = Array.from(new Set((reviewsData || []).map((r: any) => r.user_id)));
    const { data: profilesData } = await supabase
      .from("profiles")
      .select("id,full_name,username,avatar_url")
      .in("id", authorIds);

    const profileById = new Map((profilesData || []).map((p: any) => [p.id, p]));
    reviews = (reviewsData || []).map((r: any) => {
      const profile = profileById.get(r.user_id);
      return {
        ...r,
        author: {
          full_name: profile?.full_name ?? null,
          username: profile?.username ?? null,
          avatar_url: profile?.avatar_url ?? null,
        },
      };
    });
  }

  // Obtener perfil del usuario logueado
    // Fetch tendencias de la semana desde la vista
    const { data: trending, error: trendingError } = await supabase
      .from("trending_this_week")
      .select("*");
  let currentUserProfile = null;
  if (user) {
    const { data: profileData } = await supabase
      .from("profiles")
      .select("full_name,avatar_url")
      .eq("id", user.id)
      .single();
    currentUserProfile = profileData;
  }

  return (
    <div className="min-h-screen bg-white">
      <header className="flex justify-between items-center px-4 pt-4 pb-2">
        <h1 className="text-3xl font-black text-[#FB3C4C] tracking-tighter">Bopp</h1>
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

      {/* Barra de búsqueda minimalista */}
      <div className="px-4 mt-2 mb-4">
        <Link href="/buscar" className="block">
          <div className="flex items-center bg-gray-100 rounded-2xl px-4 py-3 cursor-pointer">
            <svg className="w-5 h-5 text-gray-400 mr-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
            <span className="text-gray-500 text-base select-none">Busca un álbum, artista o canción...</span>
          </div>
        </Link>
      </div>

      {/* Tendencias en Bopp */}
      <h2 className="text-xl font-bold text-gray-900 px-4 mb-4">Tendencias en Bopp</h2>
      <div className="flex overflow-x-auto gap-4 px-4 pb-2 hide-scrollbar">
        {trending && trending.length > 0 ? (
          trending.map((item) => (
            <div
              key={item.spotify_id}
              className="shrink-0 w-32 flex flex-col items-center bg-white rounded-2xl shadow-sm p-2"
            >
              {item.image_url ? (
                <img
                  src={item.image_url}
                  alt={item.title}
                  className="w-28 h-28 rounded-xl object-cover shadow"
                />
              ) : (
                <div className="w-28 h-28 rounded-xl bg-gray-100" />
              )}
              <div className="text-sm font-bold text-gray-900 mt-2 truncate w-full text-center">
                {item.title}
              </div>
              <div className="text-xs text-gray-500 truncate w-full text-center">
                {item.artist}
              </div>
              <div className="mt-1 text-xs text-orange-500 flex items-center justify-center">
                {item.review_count} reseñas
              </div>
            </div>
          ))
        ) : (
          <div className="text-gray-400 text-sm py-8">No hay tendencias esta semana.</div>
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
              className="px-6 py-3 rounded-full bg-[#FB3C4C] text-white font-bold"
            >
              Buscar amigos
            </Link>
          </div>
        ) : (
          <div className="bg-white">
            {reviews.map((r) => (
              <FeedReviewCard
                key={r.id}
                review={r}
                author={r.author}
                timeLabel={timeAgo(r.created_at)}
              />
            ))}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
