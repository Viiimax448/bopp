"use client";


import Link from "next/link";
import { FaStar, FaRegStar } from "react-icons/fa";

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
}: {
  review: FeedReview;
  author: FeedAuthor;
  timeLabel: string;
}) {

  const username = author.username || "usuario";
  const displayName = author.full_name?.trim() || "";
  const nameLabel = displayName || `@${username}`;

  return (
    <div className="py-3 border-b border-gray-100">
      {/* Header (single line) */}
      <div className="flex items-center gap-2 mb-1 min-w-0">
        {author.avatar_url ? (
          <img
            src={author.avatar_url}
            alt={username}
            className="w-8 h-8 rounded-full object-cover shrink-0"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-xs font-bold text-white shrink-0">
            {username.charAt(0).toUpperCase()}
          </div>
        )}

        <Link
          href={`/${username}`}
          className="text-sm font-semibold text-gray-900 truncate"
        >
          {displayName || "usuario"}
        </Link>
        <span className="text-xs text-gray-500 truncate">@{username}</span>
        <span className="text-gray-300">&middot;</span>
        <span className="text-xs text-gray-400 shrink-0">{timeLabel}</span>
      </div>

      {/* Body (Review) */}
      <div className="pl-10">
        <div className="flex items-center gap-2 mb-1">
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((i) =>
              i <= (review.rating || 0) ? (
                <FaStar key={i} size={12} className="text-[#FB3C4C]" />
              ) : (
                <FaRegStar key={i} size={12} className="text-gray-200" />
              )
            )}
          </div>
          <span className="text-sm text-gray-700">{(review.rating || 0).toFixed(1)}/5</span>
        </div>

        {review.review_text?.trim() ? (
          <div className="text-sm text-gray-800 leading-relaxed mb-3">
            {review.review_text}
          </div>
        ) : null}

        {/* Attachment */}
        <div className="flex items-center gap-3 p-2 bg-gray-50 border border-gray-100 rounded-xl">
          {review.spotify_image_url ? (
            <img
              src={review.spotify_image_url}
              alt={review.spotify_title || "Álbum/Canción desconocida"}
              className="w-10 h-10 rounded-md object-cover bg-gray-100 shrink-0"
            />
          ) : (
            <div className="w-10 h-10 rounded-md bg-gray-200 shrink-0" />
          )}

          <div className="min-w-0">
            <div className="text-sm font-bold text-gray-900 line-clamp-1">
              {review.spotify_title || "Álbum/Canción desconocida"}
            </div>
            <div className="text-xs text-gray-500 line-clamp-1">
              {review.spotify_artist || ""}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
