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
    <div className="flex flex-col gap-2 px-4 pt-4 pb-5 border-b border-gray-200 w-full">
      {/* Header (Usuario) */}
      <div className="flex items-center justify-between">
        <Link href={`/${username}`} className="flex items-center gap-2 group min-w-0 flex-1">
          {author.avatar_url ? (
            <img
              src={author.avatar_url}
              alt={username}
              className="w-9 h-9 rounded-full object-cover group-hover:opacity-80 transition-opacity"
            />
          ) : (
            <div className="w-9 h-9 rounded-full bg-gray-300 flex items-center justify-center text-[12px] font-bold text-white">
              {username.charAt(0).toUpperCase()}
            </div>
          )}

          <div className="flex flex-col leading-tight min-w-0">
            <span className="text-[14px] font-bold text-gray-900 truncate group-hover:underline decoration-gray-400 underline-offset-2">
              {displayName || "usuario"}
            </span>
            <span className="text-[12px] text-gray-500 truncate">
              @{username} • {timeLabel}
            </span>
          </div>
        </Link>
      </div>

      {/* Zona de la Obra (Attachment) */}
      <Link
        href={`/${review.type}/${review.spotify_id}`}
        className="flex gap-3 p-2.5 my-1 bg-transparent border border-gray-200 rounded-xl group hover:bg-gray-50 transition-all"
      >
        {/* Portada un pelín más grande para equilibrar */}
        {review.spotify_image_url ? (
          <img
            src={review.spotify_image_url}
            alt={review.spotify_title || "Álbum/Canción desconocida"}
            className="w-12 h-12 rounded-md object-cover shadow-sm shrink-0 border border-black/5"
          />
        ) : (
          <div className="w-12 h-12 rounded-md bg-gray-100 border border-black/5 shrink-0" />
        )}

        {/* Información apilada (Título -> Artista -> Estrellas) */}
        <div className="flex flex-col justify-center min-w-0">
          <span className="text-[14.5px] font-bold text-gray-900 truncate group-hover:underline decoration-gray-400 underline-offset-2 leading-tight">
            {review.spotify_title || "Álbum/Canción desconocida"}
          </span>
          <span className="text-[12px] text-gray-500 truncate mb-0.5">
            {review.spotify_artist || ""}
          </span>
          <div className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map((i) =>
              i <= (review.rating || 0) ? (
                <FaStar key={i} size={12} className="text-blue-600" />
              ) : (
                <FaRegStar key={i} size={12} className="text-gray-300" />
              )
            )}
          </div>
        </div>
      </Link>

      {/* Texto de la reseña */}
      {review.review_text?.trim() && (
        <p className="text-[14px] text-gray-800 leading-snug">
          {review.review_text}
        </p>
      )}

      {/* Footer: Acción de Like */}
      <div className="flex items-center justify-end mt-1">
        <button
          onClick={handleToggleLike}
          className="flex items-center gap-1.5 group"
          disabled={isLoadingLike}
          aria-label={isLiked ? "Quitar like" : "Dar like"}
          type="button"
        >
          {isLiked ? (
            <FaHeart className="w-4 h-4 text-blue-600 scale-110 transition-transform" />
          ) : (
            <FaRegHeart className="w-4 h-4 text-gray-400 group-hover:text-blue-500 transition-colors" />
          )}
          <span className={`text-[12px] font-bold ${isLiked ? "text-blue-600" : "text-gray-500"}`}>
            {likesCount > 0 ? likesCount : ""}
          </span>
        </button>
      </div>
    </div>
  );
}
