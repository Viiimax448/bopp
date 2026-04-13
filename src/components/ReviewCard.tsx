"use client";
import { useEffect, useState } from "react";
import { FaStar, FaRegStar } from "react-icons/fa";

interface ReviewCardProps {
  review: {
    spotify_id: string;
    type: "album" | "song";
    rating: number;
    review_text: string;
  };
}

export default function ReviewCard({ review }: ReviewCardProps) {
  const [metadata, setMetadata] = useState<{
    title: string;
    artist: string;
    imageUrl: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function fetchMetadata() {
      setIsLoading(true);
      try {
        const endpoint = review.type === "album"
          ? `/api/spotify/album/${review.spotify_id}`
          : `/api/spotify/song/${review.spotify_id}`;
        const res = await fetch(endpoint);
        const data = await res.json();
        if (!cancelled) {
          setMetadata({
            title: data.name || "",
            artist: data.artists?.[0]?.name || "",
            imageUrl: (data.images?.[0]?.url || data.album?.images?.[0]?.url) ?? "",
          });
        }
      } catch {
        if (!cancelled) setMetadata({ title: "", artist: "", imageUrl: "" });
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    fetchMetadata();
    return () => { cancelled = true; };
  }, [review.spotify_id, review.type]);

  return (
    <div className="bg-white rounded-2xl shadow p-4 flex gap-4 items-start">
      {isLoading ? (
        <div className="w-16 h-16 rounded-xl bg-gray-200 animate-pulse" />
      ) : (
        <img
          src={metadata?.imageUrl || "/default-album.png"}
          alt={metadata?.title || "Portada"}
          className="w-16 h-16 rounded-xl object-cover"
        />
      )}
      <div className="flex-1">
        {isLoading ? (
          <>
            <div className="h-5 w-32 bg-gray-200 rounded mb-2 animate-pulse" />
            <div className="h-4 w-20 bg-gray-200 rounded mb-2 animate-pulse" />
          </>
        ) : (
          <>
            <div className="font-bold text-gray-900 text-base mb-1">{metadata?.title}</div>
            <div className="text-xs text-gray-700 mb-1">{metadata?.artist}</div>
          </>
        )}
        <div className="flex items-center gap-1 mb-1">
          {[1,2,3,4,5].map(i =>
            i <= review.rating ? (
              <FaStar key={i} size={16} className="text-blue-600" />
            ) : (
              <FaRegStar key={i} size={16} className="text-gray-300" />
            )
          )}
        </div>
        <div className="text-gray-700 text-sm line-clamp-3">
          {review.review_text}
        </div>
      </div>
    </div>
  );
}
