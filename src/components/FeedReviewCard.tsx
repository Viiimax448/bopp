"use client";


import Link from "next/link";
import { FaStar, FaRegStar } from "react-icons/fa";
// ...existing code...
import { FaRegHeart, FaHeart } from "react-icons/fa";
import { useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";

export type FeedReview = {
  id: string;
  user_id: string;
  spotify_id: string;
  type: "album" | "song";
  rating: number;
  review_text: string | null;
  created_at: string;
  likes_count?: number | null;

  // Estado derivado / relaciones (para el feed)
  user_has_liked?: boolean;
  review_likes?: Array<{ user_id: string }>;
  likes?: Array<{ count: number | string }>;

  // Nuevos campos cacheados
  spotify_title?: string | null;
  spotify_artist?: string | null;
  spotify_image_url?: string | null;
};

export type FeedAuthor = {
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
};

export default function FeedReviewCard({
  review,
  author,
  timeLabel,
  initialIsLiked = false,
  initialLikesCount = 0,
}: {
  review: FeedReview;
  author: FeedAuthor;
  timeLabel: string;
  initialIsLiked?: boolean;
  initialLikesCount?: number;
}) {
  const username = author.username || "usuario";
  const displayName = author.full_name?.trim() || "";
  const [isLiked, setIsLiked] = useState(initialIsLiked);
  const [likesCount, setLikesCount] = useState(initialLikesCount);
  const [user, setUser] = useState<User | null>(null);
  const [isLoadingLike, setIsLoadingLike] = useState(false);
  const supabaseClient = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    let isMounted = true;
    supabaseClient.auth.getUser().then(({ data }) => {
      if (isMounted) setUser(data?.user ?? null);
    });
    return () => {
      isMounted = false;
    };
  }, []);

  // Si el parent re-hidrata la review con `user_has_liked`, reflejarlo en UI
  useEffect(() => {
    if (typeof review.user_has_liked === "boolean") {
      setIsLiked(review.user_has_liked);
    }
  }, [review.user_has_liked]);

  // Recalcular `isLiked` cuando el usuario termina de cargar (evita race en hard reload)
  useEffect(() => {
    if (!user?.id) return;
    if (Array.isArray(review.review_likes)) {
      const liked = review.review_likes.some((like) => like.user_id === user.id);
      setIsLiked(liked);
    }
  }, [user?.id, review.review_likes]);

  const handleToggleLike = async () => {
    if (!user || isLoadingLike) return;
    setIsLoadingLike(true);
    const prevLiked = isLiked;
    const prevCount = likesCount;
    setIsLiked(!prevLiked);
    setLikesCount(prevLiked ? prevCount - 1 : prevCount + 1);
    try {
      if (!prevLiked) {
        const { error } = await supabaseClient
          .from("review_likes")
          .insert([{ review_id: review.id, user_id: user.id }]);
        if (error) throw error;
      } else {
        const { error } = await supabaseClient
          .from("review_likes")
          .delete()
          .eq("review_id", review.id)
          .eq("user_id", user.id);
        if (error) throw error;
      }
    } catch (err: any) {
      // Hack: si intentamos INSERT pero ya existía (23505 / 409), la DB confirma que está liked.
      if (!prevLiked && (err?.code === "23505" || err?.status === 409)) {
        // Mantener el estado optimista y corregir silenciosamente.
        // (No hacemos rollback porque el estado final "liked" ya se cumple.)
        // eslint-disable-next-line no-console
        console.warn("El like ya existía. Corrigiendo estado UI...");
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

  return (
    <div className="flex flex-row items-start gap-3 w-full px-4 py-3 border-b border-gray-100 bg-white">
      {/* Portada */}
      <div className="w-20 h-20 shrink-0 flex items-center justify-center">
        {review.spotify_image_url ? (
          <img
            src={review.spotify_image_url}
            alt={review.spotify_title || "Álbum/Canción desconocida"}
            className="object-cover w-full h-full rounded-md shadow-sm border border-gray-200"
          />
        ) : (
          <div className="w-full h-full rounded-md bg-gray-100 border border-gray-200" />
        )}
      </div>

      {/* Info y reseña */}
      <div className="flex flex-col flex-1 min-w-0 mt-0">
        {/* Fila usuario */}
        <div className="flex items-center gap-1.5 mb-1 min-w-0">
          {author.avatar_url ? (
            <img
              src={author.avatar_url}
              alt={username}
              className="w-5 h-5 rounded-full object-cover"
            />
          ) : (
            <div className="w-5 h-5 rounded-full bg-gray-300 flex items-center justify-center text-[10px] font-bold text-white">
              {username.charAt(0).toUpperCase()}
            </div>
          )}
          <Link
            href={`/${username}`}
            className="text-xs font-bold text-gray-900 truncate"
          >
            {displayName || "usuario"}
          </Link>
          <span className="text-[11px] text-gray-500 truncate">@{username}</span>
          <span className="text-gray-300">&middot;</span>
          <span className="text-[11px] text-gray-500 shrink-0">{timeLabel}</span>
        </div>

        {/* Fila obra */}
        <div>
          <div className="text-sm font-black text-gray-900 leading-none mb-0.5 truncate w-full wrap-break-word font-sans">
            {review.spotify_title || "Álbum/Canción desconocida"}
          </div>
          <p className="text-xs text-gray-500 leading-none mb-0.5 truncate w-full wrap-break-word font-sans">
            {review.spotify_artist || ""}
          </p>
        </div>

        {/* Fila calificación + Like */}
        <div className="flex items-center justify-between mt-0.5 mb-1.5">
          {/* Estrellas */}
          <div className="flex items-center gap-0.5 text-blue-600 text-xs">
            {[1, 2, 3, 4, 5].map((i) =>
              i <= (review.rating || 0) ? (
                <FaStar key={i} size={13} className="text-blue-600" />
              ) : (
                <FaRegStar key={i} size={13} className="text-gray-200" />
              )
            )}
          </div>
          {/* Botón de Like */}
          <button
            onClick={handleToggleLike}
            className="flex items-center gap-1.5 mt-2 group"
            disabled={isLoadingLike}
            aria-label={isLiked ? "Quitar like" : "Dar like"}
            type="button"
          >
            {isLiked ? (
              <FaHeart className="w-4 h-4 text-blue-600 scale-110 transition-transform" />
            ) : (
              <FaRegHeart className="w-4 h-4 text-gray-400 group-hover:text-blue-500 transition-colors" />
            )}
            {likesCount > 0 && (
              <span className={`text-xs ${isLiked ? 'text-blue-600 font-bold' : 'text-gray-500'}`}>
                {likesCount}
              </span>
            )}
          </button>
        </div>

        {/* Texto de la reseña */}
        {review.review_text?.trim() && (
          <p className="text-sm text-gray-800 leading-snug w-full wrap-break-word mt-1">
            {review.review_text}
          </p>
        )}
      </div>
    </div>
  );
}
