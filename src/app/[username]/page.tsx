
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import { FaEllipsisH } from "react-icons/fa";

import ReviewCard from "@/components/ReviewCard";
import BottomNav from "@/components/BottomNav";
import FollowButton from "@/components/FollowButton";

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
        .select("*")
        .eq("user_id", profile.id)
        .order("created_at", { ascending: false }),
    ]).then(([followersRes, followingRes, reviewsRes]) => {
      setFollowersCount(followersRes.count || 0);
      setFollowingCount(followingRes.count || 0);
      setReviews(reviewsRes.data || []);
    });
  }, [profile?.id]);

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

  // Render helpers (mismo look que /perfil; en público no abre picker)
  const renderAlbumGrid = () => {
    const albums: TopItem[] = Array.isArray(profile?.top_albums) ? profile.top_albums : [];
    return (
      <div className="grid grid-cols-2 gap-3 mb-4">
        {[0, 1, 2, 3].map((idx) => {
          const album = albums[idx];
          return album ? (
            <div key={idx} className="aspect-square rounded-xl overflow-hidden bg-gray-200 relative group">
              <img src={album.image_url} alt={album.title} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                <button
                  type="button"
                  disabled
                  className="text-white text-3xl font-bold opacity-60"
                >
                  ✎
                </button>
              </div>
            </div>
          ) : (
            <button
              key={idx}
              type="button"
              disabled
              className="aspect-square rounded-xl bg-gray-100 flex items-center justify-center text-5xl text-gray-300 border-2 border-dashed border-gray-200"
            >
              +
            </button>
          );
        })}
      </div>
    );
  };

  const renderSongList = () => {
    const songs: TopItem[] = Array.isArray(profile?.top_songs) ? profile.top_songs : [];
    return (
      <div className="flex flex-col gap-3">
        {[0, 1, 2, 3].map((idx) => {
          const song = songs[idx];
          return song ? (
            <div key={idx} className="flex items-center gap-3 group">
              <div className="w-12 h-12 rounded-xl overflow-hidden bg-gray-200 shrink-0 relative">
                <img src={song.image_url} alt={song.title} className="w-full h-full object-cover" />
                <button
                  type="button"
                  disabled
                  className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-xl font-bold"
                >
                  ✎
                </button>
              </div>
              <div className="flex-1">
                <div className="text-gray-900 font-medium text-base">{song.title}</div>
                <div className="text-xs text-gray-500">{song.artist}</div>
              </div>
            </div>
          ) : (
            <button
              key={idx}
              type="button"
              disabled
              className="flex items-center gap-3 w-full"
            >
              <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center text-3xl text-gray-300 border-2 border-dashed border-gray-200">
                +
              </div>
              <div className="flex-1 text-gray-400 text-base">Elegí una canción</div>
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#F5F5F7] flex flex-col">
      {/* Header (igual a /perfil) */}
      <div className="flex items-center justify-between px-4 pt-6 pb-2">
        <button onClick={() => router.back()} className="text-2xl text-gray-400">
          ×
        </button>
        <span className="flex-1 text-center font-bold text-lg text-gray-900">Perfil</span>
        <button className="text-2xl text-gray-400" type="button" aria-disabled>
          <FaEllipsisH />
        </button>
      </div>

      {/* Avatar, nombre y username (igual a /perfil) */}
      <div className="flex flex-col items-center mt-2 mb-4">
        {profile?.avatar_url ? (
          <img
            src={profile.avatar_url}
            alt={profile.username}
            className="w-32 h-32 rounded-full object-cover"
          />
        ) : (
          <div className="w-32 h-32 rounded-full bg-gray-300 flex items-center justify-center text-5xl font-bold text-white">
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

        {/* Seguir (solo en vista pública) */}
        {session?.user?.id && !isOwnProfile && profile?.id && (
          <FollowButton
            targetUserId={profile.id}
            currentUserId={session.user.id}
            initialIsFollowing={isFollowing}
            initialFollowersCount={followersCount}
          />
        )}
      </div>

      {/* Stats Bar (igual a /perfil) */}
      <div className="flex items-center justify-center gap-4 px-6 mb-6">
        <div className="flex-1 text-center">
          <span className="font-bold text-gray-900">{reviews.length}</span>
          <span className="text-gray-500 text-xs block">Calificaciones</span>
        </div>
        <div className="w-px h-6 bg-gray-300" />
        <div className="flex-1 text-center">
          <span className="font-bold text-gray-900">{followingCount}</span>
          <span className="text-gray-500 text-xs block">Siguiendo</span>
        </div>
        <div className="w-px h-6 bg-gray-300" />
        <div className="flex-1 text-center">
          <span className="font-bold text-gray-900">{followersCount}</span>
          <span className="text-gray-500 text-xs block">Seguidores</span>
        </div>
      </div>

      {/* Tus Preferidos (igual a /perfil) */}
      <div className="px-4 mb-6">
        <div className="bg-white rounded-2xl shadow-md p-4 mb-4">
          <div className="font-bold text-gray-900 mb-1">Tus Preferidos</div>
          <div className="text-xs text-gray-500 mb-3">Top 4 Álbumes</div>
          {renderAlbumGrid()}
          <div className="text-xs text-gray-500 mb-3">Top 4 Canciones</div>
          {renderSongList()}
        </div>
      </div>

      {/* Tus Calificaciones (igual a /perfil) */}
      <div className="px-4 pb-32">
        <div className="font-bold text-gray-900 mb-3">Tus Calificaciones</div>
        {reviews.length === 0 && (
          <div className="text-gray-400 text-center py-8">Aún no has calificado nada.</div>
        )}
        <div className="flex flex-col gap-4">
          {reviews.map((review, idx) => (
            <ReviewCard key={idx} review={review} />
          ))}
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
