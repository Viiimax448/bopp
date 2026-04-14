"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/utils/supabase/client";

interface UserListItemProps {
  user: any;
  currentUserId: string | null;
}

export default function UserListItem({ user, currentUserId }: UserListItemProps) {
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!currentUserId) return;
    let isMounted = true;
    const checkFollowing = async () => {
      const { data, error } = await supabase
        .from("followers")
        .select("*")
        .eq("follower_id", currentUserId)
        .eq("following_id", user.id);
      if (isMounted) setIsFollowing(Array.isArray(data) && data.length > 0);
    };
    checkFollowing();
    return () => { isMounted = false; };
  }, [currentUserId, user.id]);

  const handleFollowToggle = async () => {
    if (!currentUserId) return;
    setLoading(true);
    if (!isFollowing) {
      await supabase.from("followers").insert({ follower_id: currentUserId, following_id: user.id });
      setIsFollowing(true);
    } else {
      await supabase.from("followers").delete().eq("follower_id", currentUserId).eq("following_id", user.id);
      setIsFollowing(false);
    }
    setLoading(false);
  };

  return (
    <Link
      href={`/${user.username}`}
      className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0 px-4 cursor-pointer hover:bg-gray-50/50 transition-colors"
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <img
          src={user.avatar_url || "/default-avatar.png"}
          alt={user.username}
          className="w-12 h-12 rounded-full object-cover border border-black/5"
        />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-gray-900 truncate">{user.full_name || user.username}</p>
          <p className="text-[13px] text-gray-500 truncate">@{user.username}</p>
        </div>
      </div>
      <div
        className="shrink-0 ml-2"
        onClick={e => {
          e.preventDefault();
          e.stopPropagation();
        }}
      >
        {!isFollowing ? (
          <button
            onClick={handleFollowToggle}
            className="px-4 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-full hover:bg-blue-700 transition-colors"
            disabled={loading}
          >
            Seguir
          </button>
        ) : (
          <button
            onClick={handleFollowToggle}
            className="px-4 py-1.5 bg-gray-100 text-gray-700 text-xs font-bold rounded-full hover:bg-gray-200 transition-colors"
            disabled={loading}
          >
            Siguiendo
          </button>
        )}
      </div>
    </Link>
  );
}
