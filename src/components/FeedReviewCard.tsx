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
    <div className="flex gap-4 px-4 py-4 border-b border-gray-200 w-full bg-white items-start">
      {/* IZQUIERDA: Portada Grande (Clickeable) */}
      <Link href={`/${review.type}/${review.spotify_id}`} className="shrink-0 group h-fit">
        {review.spotify_image_url ? (
          <img
            src={review.spotify_image_url}
            className="w-24 h-24 sm:w-28 sm:h-28 rounded-md object-cover shadow-sm border border-black/5 group-hover:opacity-80 transition-opacity"
            alt={review.spotify_title || "Álbum/Canción desconocida"}
          />
        ) : (
          <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-md bg-gray-100 border border-black/5" />
        )}
      </Link>

      {/* DERECHA: Columna de Contenido */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* 1. Header: Usuario (Clickeable y sutil) */}
        <Link href={`/${username}`} className="flex items-center gap-1.5 group mb-1 w-full min-w-0">
          {author.avatar_url ? (
            <img src={author.avatar_url} className="w-5 h-5 rounded-full object-cover group-hover:opacity-80 shrink-0" alt={username} />
          ) : (
            <div className="w-5 h-5 rounded-full bg-gray-300 flex items-center justify-center text-[11px] font-bold text-white">
              {username.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="flex items-center gap-1 flex-1 min-w-0">
            <span className="text-[13.5px] font-bold text-gray-900 group-hover:underline decoration-gray-400 underline-offset-2 truncate shrink">
              {displayName || username}
            </span>
            <span className="text-[12.5px] text-gray-500 truncate min-w-0 shrink">
              @{username}
            </span>
            <span className="text-[12px] text-gray-500 shrink-0">
              • {timeLabel}
            </span>
          </div>
        </Link>

        {/* 2. Info de la Obra (Clickeable) */}
        <Link href={`/${review.type}/${review.spotify_id}`} className="group mb-1 w-fit">
          <h3 className="text-[16px] font-bold text-gray-900 leading-tight group-hover:underline decoration-gray-900 underline-offset-2">
            {review.spotify_title || "Álbum/Canción desconocida"}
          </h3>
          <p className="text-[13.5px] text-gray-500 truncate group-hover:text-gray-700 transition-colors">
            {review.spotify_artist || ""}
          </p>
        </Link>

        {/* 3. Estrellas */}
        <div className="flex items-center mb-2">
          {[1, 2, 3, 4, 5].map((i) =>
            i <= (review.rating || 0) ? (
              <FaStar key={i} className="w-3.5 h-3.5 text-blue-600" />
            ) : (
              <FaRegStar key={i} className="w-3.5 h-3.5 text-gray-300" />
            )
          )}
        </div>

        {/* 4. Texto de la Reseña */}
        {review.review_text?.trim() && (
          <p className="text-[14px] text-gray-800 leading-relaxed mb-2 line-clamp-4">
            {review.review_text}
          </p>
        )}

        {/* 5. Footer: Like alineado a la derecha */}
        <div className="flex justify-end mt-1.5 pt-1">
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
    </div>
  );
}
