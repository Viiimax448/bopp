
"use client";


import Link from "next/link";
import { FaStar, FaRegStar } from "react-icons/fa";
// ...existing code...
import { FaRegHeart, FaHeart } from "react-icons/fa";
import { useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";

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
  timeLabelShort,
  initialIsLiked = false,
  initialLikesCount = 0,
  currentUserId,
  supabaseClient,
}: {
  review: FeedReview;
  author: FeedAuthor;
  timeLabel: string;
  timeLabelShort?: string;
  initialIsLiked?: boolean;
  initialLikesCount?: number;
  currentUserId: string | null;
  supabaseClient: SupabaseClient;
}) {
  const username = author.username || "usuario";
  const displayName = author.full_name?.trim() || "";
  const [isMounted, setIsMounted] = useState(false);
  const [isLiked, setIsLiked] = useState(initialIsLiked);
  const [likesCount, setLikesCount] = useState(initialLikesCount);
  const [isLoadingLike, setIsLoadingLike] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Si el parent re-hidrata la review con `user_has_liked`, reflejarlo en UI
  useEffect(() => {
    if (typeof review.user_has_liked === "boolean") {
      setIsLiked(review.user_has_liked);

    }
  }, [review.user_has_liked]);

  const handleToggleLike = async () => {
    if (isLoadingLike) return;
    if (!currentUserId) {
      alert("Debes iniciar sesión para dar like.");
      return;
    }
    setIsLoadingLike(true);
    const prevLiked = isLiked;
    const prevCount = likesCount;
    setIsLiked(!prevLiked);
    setLikesCount(prevLiked ? Math.max(0, prevCount - 1) : prevCount + 1);
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

  const tipoLabel = review.type === 'album' ? 'Álbum' : 'Canción';
  return (
    <div className="flex flex-col gap-2.5 px-4 pt-4 pb-3 border-b border-gray-200 w-full bg-white">
      <div className="flex gap-3 sm:gap-4 w-full items-start">
        <Link href={`/${review.type}/${review.spotify_id}`} className="shrink-0 group">
          {review.spotify_image_url ? (
            <img
              src={review.spotify_image_url}
              className="w-24 h-24 sm:w-26 sm:h-26 rounded-lg object-cover shadow-sm border border-black/5 group-hover:opacity-80 transition-opacity"
              alt={review.spotify_title || "Álbum/Canción desconocida"}
            />
          ) : (
            <div className="w-24 h-24 sm:w-26 sm:h-26 rounded-lg bg-gray-100 border border-black/5" />
          )}
        </Link>
        <div className="flex flex-col flex-1 min-w-0">
          {/* Header Usuario (1 línea horizontal, blindado contra desbordes) */}
          <Link href={`/${username}`} className="flex items-center gap-1.5 group mb-1.5 w-full min-w-0">
            <img src={author.avatar_url || "/default-avatar.png"} className="w-5 h-5 rounded-full object-cover shrink-0 group-hover:opacity-80" alt={username} />
            <div className="flex items-baseline gap-1.5 flex-1 min-w-0">
              <span className="text-[14px] font-bold text-gray-900 group-hover:underline decoration-gray-400 truncate shrink">
                {displayName || username}
              </span>
              <span className="text-[13px] text-gray-500 truncate shrink">
                @{username}
              </span>
              <span className="text-[13px] text-gray-500 shrink-0">
                • {isMounted ? (timeLabelShort || timeLabel) : "..."}
              </span>
            </div>
          </Link>
          <Link href={`/${review.type}/${review.spotify_id}`} className="group w-fit min-w-0 mb-1">
            <h3 className="text-[15.5px] font-bold text-gray-900 leading-tight line-clamp-2">
              {review.spotify_title || "Álbum/Canción desconocida"}
            </h3>
            <div className="flex items-center gap-1.5 text-[13px] text-gray-500 group-hover:text-gray-700 transition-colors mt-0.5">
              <span className="truncate">{review.spotify_artist || ""}</span>
              <span className="text-[10px] opacity-70">•</span>
              <span className="shrink-0 font-medium">{tipoLabel}</span>
            </div>
          </Link>
          {/* 3. Estrellas (Y Like condicional si NO hay texto) */}
          <div className="flex items-center justify-between mt-0.5 w-full">
            <div className="flex items-center">
              {[1, 2, 3, 4, 5].map((i) =>
                i <= (review.rating || 0) ? (
                  <FaStar key={i} className="w-3.5 h-3.5 text-blue-600" />
                ) : (
                  <FaRegStar key={i} className="w-3.5 h-3.5 text-gray-300" />
                )
              )}
            </div>
            {/* Renderiza el Like AQUÍ solo si NO hay texto */}
            {!review.review_text && (
              <button
                onClick={handleToggleLike}
                className="flex items-center gap-1.5 group"
                disabled={isLoadingLike}
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
        </div>
      </div>
      {review.review_text?.trim() && (
        <p className="text-[14.5px] text-gray-800 leading-relaxed mt-1 w-full">
          {review.review_text}
        </p>
      )}
      {/* Footer: Like anclado abajo (SOLO si HAY texto) */}
      {review.review_text && (
        <div className="flex justify-end mt-auto pt-2">
          <button
            onClick={handleToggleLike}
            className="flex items-center gap-1.5 group"
            disabled={isLoadingLike}
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
  );
}
