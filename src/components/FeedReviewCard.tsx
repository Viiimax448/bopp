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
  const supabaseClient = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    let isMounted = true;
    supabaseClient.auth.getUser().then(({ data }) => {
      if (isMounted) setUser(data?.user ?? null);
    });
    return () => { isMounted = false; };
  }, []);

  const handleLike = async () => {
    if (!user) {
      alert("Debes iniciar sesión para dar like.");
      return;
    }
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
    } catch (err) {
      setIsLiked(prevLiked);
      setLikesCount(prevCount);
      // eslint-disable-next-line no-console
      console.error("Error al actualizar el like:", err);
      alert("Hubo un error al actualizar el like. Revisa la consola para más detalles.");
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
          <div className="text-sm font-black text-gray-900 leading-none mb-0.5 truncate w-full break-words font-sans">
            {review.spotify_title || "Álbum/Canción desconocida"}
          </div>
          <p className="text-xs text-gray-500 leading-none mb-0.5 truncate w-full break-words font-sans">
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
          <div
            className={`flex items-center gap-1 text-xs transition-colors cursor-pointer p-1 -mr-1 rounded-full 
              ${isLiked ? "text-blue-600 hover:bg-blue-50" : "text-gray-400 hover:text-blue-600 hover:bg-blue-50"}`}
            onClick={handleLike}
            aria-label={isLiked ? "Quitar like" : "Dar like"}
            role="button"
            tabIndex={0}
          >
            {isLiked ? (
              <FaHeart className="w-4 h-4" />
            ) : (
              <FaRegHeart className="w-4 h-4" />
            )}
            {likesCount > 0 && (
              <span className="font-medium">{likesCount}</span>
            )}
          </div>
        </div>

        {/* Texto de la reseña */}
        {review.review_text?.trim() && (
          <p className="text-sm text-gray-800 leading-snug w-full break-words mt-1">
            {review.review_text}
          </p>
        )}
      </div>
    </div>
  );
}
