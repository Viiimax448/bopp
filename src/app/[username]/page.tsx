

"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import { FaEllipsisH, FaRegStar, FaStar, FaStarHalfAlt } from "react-icons/fa";


import BottomNav from "@/components/BottomNav";
import FollowButton from "@/components/FollowButton";
import StarRating from "@/components/StarRating";

import type { TopItem } from "../perfil/TopPickerModal.types";

export default function PublicProfilePage() {
  const router = useRouter();
  const { username } = useParams();

  const [profile, setProfile] = useState<any>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<any>(null);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isShareMenuOpen, setIsShareMenuOpen] = useState(false);

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const fetchBase = async () => {
      setLoading(true);
      const [{ data: profileData }, { data: sessionData }] = await Promise.all([
        supabase.from("profiles").select("*").eq("username", username).single(),
        supabase.auth.getSession(),
      ]);
      setProfile(profileData);
      setSession(sessionData.session);
      setLoading(false);
    };

    fetchBase();
  }, [username]);

  useEffect(() => {
    if (!profile?.id) return;
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    Promise.all([
      supabase
        .from("followers")
        .select("*", { count: "exact", head: true })
        .eq("following_id", profile.id),
      supabase
        .from("followers")
        .select("*", { count: "exact", head: true })
        .eq("follower_id", profile.id),
      supabase
        .from("reviews")
        .select("*")
        .eq("user_id", profile.id)
        .order("created_at", { ascending: false }),
    ]).then(([followersRes, followingRes, reviewsRes]) => {
      setFollowersCount(followersRes.count || 0);
      setFollowingCount(followingRes.count || 0);
      setReviews(reviewsRes.data || []);
    });
  }, [profile?.id]);

  useEffect(() => {
    if (!session?.user?.id || !profile?.id || session.user.id === profile.id) {
      setIsFollowing(false);
      return;
    }
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    supabase
      .from("followers")
      .select("*")
      .eq("follower_id", session.user.id)
      .eq("following_id", profile.id)
      .single()
      .then(({ data }) => setIsFollowing(!!data));
  }, [session?.user?.id, profile?.id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F5F7] text-gray-500 text-xl">
        Cargando perfil...
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-gray-400">
        <h1 className="text-3xl font-bold mb-4">Usuario no encontrado</h1>
        <button onClick={() => router.back()} className="text-blue-600 underline">
          Volver
        </button>
      </div>
    );
  }

  const isOwnProfile = session?.user?.id === profile?.id;



  // Compartir y copiar enlace (menú desplegable)
  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(window.location.href);
    setIsShareMenuOpen(false);
    alert("Enlace copiado al portapapeles");
  };

  const handleNativeShare = async () => {
    setIsShareMenuOpen(false);
    if (navigator.share) {
      await navigator.share({
        title: `Perfil de ${profile?.display_name || profile?.username || "usuario"} en Bopp`,
        url: window.location.href
      });
    } else {
      handleCopyLink();
    }
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((i) => {
          if (rating >= i) {
            return <FaStar key={i} className="w-4 h-4 text-blue-600" />;
          }
          if (rating >= i - 0.5) {
            return <FaStarHalfAlt key={i} className="w-4 h-4 text-blue-600" />;
          }
          return <FaRegStar key={i} className="w-4 h-4 text-gray-300" />;
        })}
      </div>
    );
  };

  // Render helpers (mismo look que /perfil; en público no abre picker)
  const renderAlbumGrid = () => {
    const albums: TopItem[] = Array.isArray(profile?.top_albums) ? profile.top_albums : [];
    return (
      <div className="grid grid-cols-4 gap-2 px-4 mt-6">
        {[0, 1, 2, 3].map((idx) => {
          const album = albums[idx];
          return album ? (
            <div key={idx} className="aspect-square rounded-md overflow-hidden bg-gray-200">
              <img src={album.image_url} alt={album.title} className="w-full h-full object-cover" />
            </div>
          ) : (
            <div key={idx} className="aspect-square rounded-md bg-gray-100" />
          );
        })}
      </div>
    );
  };

  const renderSongList = () => {
    const songs: TopItem[] = Array.isArray(profile?.top_songs) ? profile.top_songs : [];
    return (
      <div className="flex flex-col px-4">
        {[0, 1, 2, 3].map((idx) => {
          const song = songs[idx];
          const position = idx + 1;
          return song ? (
            <div
              key={idx}
              className="flex items-center gap-3 py-3 border-b border-black/5 last:border-0"
            >
              <span className="w-5 text-center text-gray-400 font-bold">{position}</span>
              <div className="w-12 h-12 rounded-md overflow-hidden bg-gray-200 shrink-0">
                <img src={song.image_url} alt={song.title} className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-gray-900 font-medium text-sm truncate">{song.title}</div>
                <div className="text-xs text-gray-500 truncate">{song.artist}</div>
              </div>
            </div>
          ) : (
            <div
              key={idx}
              className="flex items-center gap-3 py-3 border-b border-black/5 last:border-0"
            >
              <span className="w-5 text-center text-gray-400 font-bold">{position}</span>
              <div className="w-12 h-12 rounded-md bg-gray-100 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="h-4 w-28 bg-black/5 rounded" />
                <div className="h-3 w-20 bg-black/5 rounded mt-2" />
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#F5F5F7] flex flex-col">
      {/* Header (igual a /perfil) */}
      <div className="flex items-center justify-between px-4 pt-6 pb-2">
        <button onClick={() => router.back()} className="text-2xl text-gray-400">
          ×
        </button>
        <span className="flex-1 text-center font-bold text-lg text-gray-900">Perfil</span>
        <div className="w-8" />
      </div>

      {/* Header (Avatar y Stats) */}
      <div className="flex flex-col items-center mt-2">
        {profile?.avatar_url ? (
          <img
            src={profile.avatar_url}
            alt={profile.username}
            className="w-36 h-36 rounded-full object-cover"
          />
        ) : (
          <div className="w-36 h-36 rounded-full bg-gray-300 flex items-center justify-center text-5xl font-bold text-white">
            {profile?.username?.charAt(0).toUpperCase() || "U"}
          </div>
        )}

        <div className="mt-3 text-2xl font-extrabold text-gray-900">{profile?.full_name || ""}</div>
        <div className="text-gray-500 text-base">@{profile?.username || "usuario"}</div>
        {profile?.is_plus && (
          <span className="mt-2 px-3 py-1 rounded-full bg-blue-600 text-white text-xs font-bold">
            Bopp+
          </span>
        )}

        {/* Stats Bar (compacta) */}
        <div className="flex items-center justify-center gap-3 px-4 mt-4">
          <div className="text-center">
            <span className="font-bold text-gray-900">{reviews.length}</span>
            <span className="text-gray-500 text-xs block">Reseñas</span>
          </div>
          <div className="w-px h-5 bg-black/10" />
          <div className="text-center">
            <span className="font-bold text-gray-900">{followingCount}</span>
            <span className="text-gray-500 text-xs block">Siguiendo</span>
          </div>
          <div className="w-px h-5 bg-black/10" />
          <div className="text-center">
            <span className="font-bold text-gray-900">{followersCount}</span>
            <span className="text-gray-500 text-xs block">Seguidores</span>
          </div>
        </div>
      </div>

      {/* Botones de Acción refinados */}
      <div className="flex items-center justify-center gap-2 mt-4 px-6 relative">
        {session?.user?.id && !isOwnProfile && profile?.id ? (
          <FollowButton
            targetUserId={profile.id}
            currentUserId={session.user.id}
            initialIsFollowing={isFollowing}
            initialFollowersCount={followersCount}
            className="flex-1 max-w-[200px] h-10 py-0 my-0 bg-blue-600 text-white font-bold rounded-full"
          />
        ) : (
          <div className="flex-1 max-w-[200px] h-10" />
        )}
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsShareMenuOpen(!isShareMenuOpen)}
            className="w-10 h-10 shrink-0 flex items-center justify-center bg-gray-100 rounded-full hover:bg-gray-200 text-gray-700 transition-colors"
            aria-label="Opciones de compartir"
          >
            <FaEllipsisH />
          </button>
          {isShareMenuOpen && (
            <>
              {/* Overlay invisible para cerrar al hacer clic afuera */}
              <div className="fixed inset-0 z-40" onClick={() => setIsShareMenuOpen(false)}></div>
              {/* Menú */}
              <div className="absolute right-6 top-14 mt-1 w-48 bg-white rounded-xl shadow-lg border border-gray-100 z-50 overflow-hidden">
                <div className="flex flex-col">
                  <button onClick={handleNativeShare} className="px-4 py-3 text-sm font-medium text-left text-gray-700 hover:bg-gray-50 border-b border-gray-50">
                    Compartir perfil
                  </button>
                  <button onClick={handleCopyLink} className="px-4 py-3 text-sm font-medium text-left text-gray-700 hover:bg-gray-50">
                    Copiar enlace
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Título sección Álbumes */}
      <h3 className="text-sm font-bold text-gray-900 px-4 mt-8 mb-3">Álbumes Favoritos</h3>
      {/* Top Álbumes (Mosaico refinado) */}
      <div className="grid grid-cols-4 gap-2 px-4">
        {(Array.isArray(profile?.top_albums) ? profile.top_albums : []).map((album: TopItem | undefined, idx: number) => (
          album ? (
            <div key={idx} className="aspect-square rounded-md overflow-hidden bg-gray-200">
              <img src={album.image_url} alt={album.title} className="w-full aspect-square object-cover rounded-md border border-black/5" />
            </div>
          ) : (
            <div key={idx} className="aspect-square rounded-md bg-gray-100 border border-black/5" />
          )
        ))}
      </div>

      {/* Título sección Canciones */}
      <h3 className="text-sm font-bold text-gray-900 px-4 mt-8 mb-3">Top Canciones</h3>
      {/* Top Canciones (Lista refinada) */}
      <div>
        {(Array.isArray(profile?.top_songs) ? profile.top_songs : []).map((song: TopItem | undefined, idx: number) => {
          const position = idx + 1;
          return song ? (
            <div key={idx} className="flex items-center gap-3 px-4 py-2">
              <span className="w-4 text-center text-sm font-bold text-gray-400">{position}</span>
              <div className="w-12 h-12 rounded-md overflow-hidden bg-gray-200 shrink-0">
                <img src={song.image_url} alt={song.title} className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-gray-900 font-medium text-sm truncate">{song.title}</div>
                <div className="text-xs text-gray-500 truncate">{song.artist}</div>
              </div>
            </div>
          ) : (
            <div key={idx} className="flex items-center gap-3 px-4 py-2">
              <span className="w-4 text-center text-sm font-bold text-gray-400">{position}</span>
              <div className="w-12 h-12 rounded-md bg-gray-100 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="h-4 w-28 bg-black/5 rounded" />
                <div className="h-3 w-20 bg-black/5 rounded mt-2" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Reseñas Recientes (Estilo Feed) */}
      <div className="px-4 pb-32 mt-6">
        <div className="font-bold text-gray-900 mb-2">Reseñas recientes</div>
          {reviews.length > 0 ? (
            <div className="flex flex-col w-full">
              {reviews.map((review, index) => (
                <div key={review.id || index} className="flex gap-3 py-3 border-b border-gray-200/60 last:border-0 mx-4">
                  {/* PORTADA (Con fallback por si falla la URL) */}
                  <div className="w-12 h-12 shrink-0 bg-gray-200 rounded-md overflow-hidden border border-black/5">
                    {(review?.spotify_image_url || review?.image_url || review?.image) && (
                      <img
                        src={review.spotify_image_url || review.image_url || review.image}
                        alt="Portada"
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>

                  {/* INFO Y ESTRELLAS */}
                  <div className="flex flex-col flex-1 min-w-0">
                    <h4 className="text-sm font-bold text-gray-900 truncate">{review.spotify_title || review.title || 'Obra Desconocida'}</h4>
                    <p className="text-[11px] text-gray-500 truncate">{review.spotify_artist || review.artist || 'Artista'}</p>
                    <div className="mt-1 flex items-center">
                      <StarRating rating={review.rating || review.score || 0} starSize={12} onChange={() => {}} className="text-blue-600" />
                    </div>
                    {(review.review_text || review.content) && (
                      <p className="text-[13px] text-gray-700 mt-1.5 leading-snug line-clamp-3 break-words">
                        {review.review_text || review.content}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-sm px-4 py-8 text-center">Sin reseñas recientes.</p>
          )}
      </div>

      <BottomNav />
    </div>
  );
}
