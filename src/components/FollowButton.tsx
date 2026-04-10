"use client";
import React, { useState } from "react";
import { createBrowserClient } from "@supabase/ssr";

interface FollowButtonProps {
  targetUserId: string;
  currentUserId: string;
  initialIsFollowing: boolean;
  initialFollowersCount: number;
}

export default function FollowButton({
  targetUserId,
  currentUserId,
  initialIsFollowing,
  initialFollowersCount,
}: FollowButtonProps) {
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [loading, setLoading] = useState(false);

  // Sync isFollowing with prop (para refresco de página)
  React.useEffect(() => {
    setIsFollowing(initialIsFollowing);
  }, [initialIsFollowing]);

  const handleClick = async () => {
    if (loading) return;
    setLoading(true);
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    if (isFollowing) {
      setIsFollowing(false);
      await supabase
        .from("followers")
        .delete()
        .eq("follower_id", currentUserId)
        .eq("following_id", targetUserId);
    } else {
      setIsFollowing(true);
      await supabase
        .from("followers")
        .insert({ follower_id: currentUserId, following_id: targetUserId });
    }
    setLoading(false);
  };

  return (
    <button
      className={`w-full h-11 px-4 rounded-full font-bold transition border text-sm flex items-center justify-center ${
        isFollowing
          ? "bg-gray-100 text-gray-500 border-gray-300"
          : "bg-[#FB3C4C] text-white border-transparent hover:bg-[#e12b3a]"
      } ${loading ? "opacity-60 cursor-not-allowed" : ""}`}
      style={{ minHeight: '2.75rem' }}
      onClick={handleClick}
      disabled={loading}
    >
      {isFollowing ? "Siguiendo" : "Seguir"}
    </button>
  );
}
