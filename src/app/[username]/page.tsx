"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import { FaEllipsisH, FaRegStar, FaStar, FaStarHalfAlt, FaHeart, FaRegHeart, FaArrowLeft } from "react-icons/fa";

import Link from "next/link";

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
        .select(`*, review_likes (user_id), likes:review_likes (count)`)
        .eq("user_id", profile.id)
        .order("created_at", { ascending: false }),
    ]).then(([followersRes, followingRes, reviewsRes]) => {
      setFollowersCount(followersRes.count || 0);
      setFollowingCount(followingRes.count || 0);
      const currentUserId = session?.user?.id || null;
      const mappedReviews = Array.isArray(reviewsRes.data)
        ? reviewsRes.data.map((review: any) => {
            const likeCountFromEmbed =
              Array.isArray(review.likes) &&
              (typeof review.likes?.[0]?.count === "number" || typeof review.likes?.[0]?.count === "string")
                ? Number(review.likes[0].count)
                : undefined;
            return {
              ...review,
              user_has_liked: Array.isArray(review.review_likes)
                ? review.review_likes.some((like: any) => like.user_id === currentUserId)
                : false,
              likes_count:
                typeof likeCountFromEmbed === "number"
                  ? likeCountFromEmbed
                  : typeof review.likes_count === "number"
                    ? review.likes_count
                    : Array.isArray(review.review_likes)
                      ? review.review_likes.length
                      : 0,
            };
          })
        : [];
      setReviews(mappedReviews);
    });
  }, [profile?.id, session?.user?.id]);

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

  // Álbumes y canciones para mapeo
  const favoriteAlbums: Array<TopItem | undefined> = Array.isArray(profile?.top_albums)
    ? (profile.top_albums as Array<TopItem | undefined>)
    : [];
  const topSongs: Array<TopItem | undefined> = Array.isArray(profile?.top_songs)
    ? (profile.top_songs as Array<TopItem | undefined>)
    : [];

  return (
    <div className="min-h-screen bg-[#F5F5F7] flex flex-col">
      {/* HEADER DEL PERFIL PÚBLICO */}
      <div className="relative flex items-center justify-between px-4 py-3 w-full h-14 border-b border-transparent">
        {/* Izquierda: Botón Volver (Back) */}
        <button 
          onClick={() => router.back()}
          className="p-1.5 text-gray-900 hover:bg-black/5 rounded-full active:scale-95 transition-all shrink-0 z-10"
        >
          <FaArrowLeft className="w-5 h-5" />
        </button>

        {/* Centro: Username del Perfil */}
        <h1 className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[16px] font-bold text-gray-900 pointer-events-none truncate max-w-[50%]">
          {profile.username}
        </h1>

        {/* Derecha: Menú de Opciones */}
        <button 
          onClick={() => setIsShareMenuOpen(!isShareMenuOpen)}
          className="p-1.5 text-gray-900 hover:bg-black/5 rounded-full active:scale-95 transition-all shrink-0 z-10"
          aria-label="Opciones de compartir"
        >
          <FaEllipsisH className="w-5 h-5" />
        </button>
        {/* Menú desplegable */}
        {isShareMenuOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsShareMenuOpen(false)}></div>
            <div className="absolute right-0 top-14 mt-1 w-48 bg-white rounded-xl shadow-lg border border-gray-100 z-50 overflow-hidden">
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

      {/* ZONA DE ACCIONES DEL PERFIL */}
      <div className="flex justify-center mt-4 mb-2 w-full">
        {session?.user?.id && !isOwnProfile && profile?.id ? (
          isFollowing ? (
            <button 
              onClick={() => setIsFollowing(false)}
              className="px-8 py-1.5 rounded-full border border-gray-300 text-[14px] font-bold text-gray-900 bg-transparent hover:bg-black/5 transition-colors active:scale-95"
            >
              Siguiendo
            </button>
          ) : (
            <button 
              onClick={() => setIsFollowing(true)}
              className="px-8 py-1.5 rounded-full text-[14px] font-bold text-white bg-gray-900 hover:opacity-90 transition-opacity active:scale-95"
            >
              Seguir
            </button>
          )
        ) : null}
      </div>

      {/* Título sección Álbumes */}
      <h3 className="text-sm font-bold text-gray-900 px-4 mt-8 mb-3">Álbumes Favoritos</h3>
      {/* Mapeo de Álbumes Favoritos en Perfil Público */}
      <div className="grid grid-cols-4 gap-2 sm:gap-3 w-full px-4">
        {favoriteAlbums.map((album, index) => (
          album ? (
            <Link 
              key={index}
              href={`/album/${album.id}`}
              className="w-full aspect-square rounded-lg overflow-hidden border border-black/5 hover:opacity-80 transition-opacity"
            >
              <img src={album.image_url} alt={album.title} className="w-full h-full object-cover" />
            </Link>
          ) : (
            <div 
              key={index}
              className="w-full aspect-square rounded-lg border-2 border-dashed border-gray-100 bg-gray-50 flex items-center justify-center opacity-50"
            />
          )
        ))}
      </div>

      {/* Título sección Canciones */}
      <h3 className="text-sm font-bold text-gray-900 px-4 mt-8 mb-3">Top Canciones</h3>
      {/* Mapeo de Top Canciones en Perfil Público */}
      <div className="flex flex-col gap-3 w-full px-4">
        {topSongs.map((song, index) => (
          song ? (
            <Link 
              key={index}
              href={`/cancion/${song.id}`}
              className="flex items-center gap-3 w-full group hover:bg-black/5 p-1 -ml-1 rounded-lg transition-colors"
            >
              <span className="text-[13px] font-bold text-gray-400 w-4 text-center shrink-0">
                {index + 1}
              </span>
              <img src={song.image_url} alt={song.title} className="w-10 h-10 rounded-md object-cover border border-black/5 shrink-0" />
              <div className="flex flex-col min-w-0">
                <span className="text-[14px] font-bold text-gray-900 truncate group-hover:underline">
                  {song.title}
                </span>
                <span className="text-[13px] text-gray-500 truncate">
                  {song.artist}
                </span>
              </div>
            </Link>
          ) : (
            <div key={index} className="flex items-center gap-3 w-full opacity-50 p-1">
              <span className="text-[13px] font-bold text-gray-400 w-4 text-center shrink-0">
                {index + 1}
              </span>
              <div className="w-10 h-10 rounded-md border-2 border-dashed border-gray-200 shrink-0" />
            </div>
          )
        ))}
      </div>

      {/* Reseñas Recientes (Estilo Feed) */}
      <div className="px-4 pb-32 mt-6">
        <div className="font-bold text-gray-900 mb-2">Reseñas recientes</div>
          {reviews.length > 0 ? (
            <div className="flex flex-col w-full">
              {reviews.map((review, index) => (
                <PublicProfileReviewCard
                  key={review.id || index}
                  review={review}
                  currentUserId={session?.user?.id || null}
                />
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

function PublicProfileReviewCard({
  review,
  currentUserId,
}: {
  review: any;
  currentUserId: string | null;
}) {
  const [isLiked, setIsLiked] = useState(Boolean(review.user_has_liked));
  const [likesCount, setLikesCount] = useState<number>(
    typeof review.likes_count === "number" ? review.likes_count : Number(review.likes_count) || 0
  );
  const [isLoadingLike, setIsLoadingLike] = useState(false);

  const supabaseClient = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    setIsLiked(Boolean(review.user_has_liked));
  }, [review.user_has_liked]);

  useEffect(() => {
    if (review.likes_count === undefined || review.likes_count === null) return;
    setLikesCount(
      typeof review.likes_count === "number" ? review.likes_count : Number(review.likes_count) || 0
    );
  }, [review.likes_count]);

  useEffect(() => {
    if (!currentUserId) return;
    if (Array.isArray(review.review_likes)) {
      const liked = review.review_likes.some((like: any) => like.user_id === currentUserId);
      setIsLiked(liked);
    }
  }, [currentUserId, review.review_likes]);

  const handleToggleLike = async () => {
    if (!currentUserId || isLoadingLike) return;
    setIsLoadingLike(true);
    const prevLiked = isLiked;
    const prevCount = likesCount;
    setIsLiked(!prevLiked);
    setLikesCount(prevLiked ? prevCount - 1 : prevCount + 1);
    try {
      if (!prevLiked) {
        const { error } = await supabaseClient
          .from("review_likes")
          .insert([{ review_id: review.id, user_id: currentUserId }]);
        if (error) throw error;
      } else {
        const { error } = await supabaseClient
          .from("review_likes")
          .delete()
          .eq("review_id", review.id)
          .eq("user_id", currentUserId);
        if (error) throw error;
      }
    } catch (err: any) {
      if (!prevLiked && (err?.code === "23505" || err?.status === 409)) {
        setIsLiked(true);
        return;
      }
      setIsLiked(prevLiked);
      setLikesCount(prevCount);
      // eslint-disable-next-line no-console
      console.error("Error al actualizar el like:", err);
      alert("Hubo un error al actualizar el like. Revisa la consola para más detalles.");
    } finally {
      setIsLoadingLike(false);
    }
  };

  const tipoLabel = review.item_type === 'album' ? 'Álbum' : 'Canción';
  return (
    <div className="flex gap-3 sm:gap-4 py-4 border-b border-gray-200 w-full last:border-0 items-start">
      {/* IZQUIERDA: Portada grande */}
      <img
        src={review.image_url || review.spotify_image_url || review.image}
        alt={review.title || review.spotify_title || 'Obra'}
        className="w-20 h-20 sm:w-24 sm:h-24 rounded-lg object-cover shadow-sm border border-black/10 group-hover:opacity-80 transition-opacity shrink-0"
      />
      {/* DERECHA: Toda la información, texto y botones */}
      <div className="flex flex-col flex-1 min-w-0 min-h-[5rem] sm:min-h-[6rem]">
        {/* Título, Artista y Tipo */}
        <a href={`/${review.item_type || review.type}/${review.item_id || review.spotify_id}`}
          className="group w-full min-w-0 mb-0.5 block">
          <h3 className="text-[15.5px] font-bold text-gray-900 leading-tight line-clamp-2 group-hover:underline decoration-gray-900 underline-offset-2">
            {review.title || review.spotify_title || 'Obra Desconocida'}
          </h3>
          <div className="flex items-center gap-1.5 text-[13px] text-gray-700 group-hover:text-gray-900 transition-colors mt-0.5 w-full min-w-0">
            <span className="truncate shrink min-w-0">{review.artist || review.spotify_artist || 'Artista'}</span>
            <span className="text-[10px] opacity-70 shrink-0">•</span>
            <span className="font-medium shrink-0">{tipoLabel}</span>
          </div>
        </a>
        {/* Estrellas y Like condicional si NO hay texto */}
        <div className="flex items-center justify-between mt-1">
          <div className="flex items-center">
            {[1, 2, 3, 4, 5].map((i) =>
              i <= (review.rating || review.score || 0) ? (
                <FaStar key={i} size={15} className="text-blue-600" />
              ) : (
                <FaRegStar key={i} size={15} className="text-gray-200" />
              )
            )}
          </div>
          {/* Like en línea solo si NO hay texto */}
          {!review.review_text && (
            <button
              onClick={handleToggleLike}
              className="flex items-center gap-1.5 group"
              disabled={isLoadingLike || !currentUserId}
              aria-label={isLiked ? "Quitar like" : "Dar like"}
              type="button"
            >
              {isLiked ? (
                <FaHeart className="w-[18px] h-[18px] text-blue-600 scale-110 transition-transform" />
              ) : (
                <FaRegHeart className="w-[18px] h-[18px] text-gray-400 group-hover:text-blue-500 transition-colors" />
              )}
              <span className={`text-[13px] font-medium ${isLiked ? 'text-blue-600' : 'text-gray-500'}`}>
                {likesCount > 0 ? likesCount : ''}
              </span>
            </button>
          )}
        </div>
        {/* Texto de la Reseña (dentro de la columna derecha) */}
        {review.review_text && (
          <p className="text-[14px] text-gray-900 leading-relaxed mt-2 line-clamp-4">
            {review.review_text}
          </p>
        )}
        {/* Footer: Like anclado abajo (SOLO si HAY texto) */}
        {review.review_text && (
          <div className="flex justify-end mt-auto pt-2">
            <button
              onClick={handleToggleLike}
              className="flex items-center gap-1.5 group"
              disabled={isLoadingLike || !currentUserId}
              aria-label={isLiked ? "Quitar like" : "Dar like"}
              type="button"
            >
              {isLiked ? (
                <FaHeart className="w-[18px] h-[18px] text-blue-600 scale-110 transition-transform" />
              ) : (
                <FaRegHeart className="w-[18px] h-[18px] text-gray-400 group-hover:text-blue-500 transition-colors" />
              )}
              <span className={`text-[13px] font-medium ${isLiked ? 'text-blue-600' : 'text-gray-500'}`}>
                {likesCount > 0 ? likesCount : ''}
              </span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
