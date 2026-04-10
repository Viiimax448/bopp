
"use client";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import ReviewCard from "@/components/ReviewCard";
import FollowButton from "@/components/FollowButton";

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
    setLoading(true);
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    Promise.all([
      supabase
        .from("profiles")
        .select("*")
        .eq("username", username)
        .single(),
      supabase.auth.getSession(),
    ]).then(([{ data: profileData }, { data: sessionData }]) => {
      setProfile(profileData);
      setSession(sessionData.session);
      setLoading(false);
    });
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
  }, [session, profile]);

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
        <button onClick={() => router.back()} className="text-red-500 underline">Volver</button>
      </div>
    );
  }
  const isOwnProfile = session?.user?.id === profile?.id;
  // Render helpers (idénticos a perfil propio, sin edición ni picker)
  const renderAlbumGrid = () => {
    const albums = Array.isArray(profile?.top_albums) ? profile.top_albums : [];
    return (
      <div className="grid grid-cols-2 gap-3 mb-4">
        {[0,1,2,3].map(idx => {
          const album = albums[idx];
          return album ? (
            <div key={idx} className="aspect-square rounded-xl overflow-hidden bg-gray-200 relative">
              <img src={album.image_url} alt={album.title} className="w-full h-full object-cover" />
            </div>
          ) : (
            <div key={idx} className="aspect-square rounded-xl bg-gray-100" />
          );
        })}
      </div>
    );
  };
  const renderSongList = () => {
    const songs = Array.isArray(profile?.top_songs) ? profile.top_songs : [];
    return (
      <div className="flex flex-col gap-3">
        {[0,1,2,3].map(idx => {
          const song = songs[idx];
          return song ? (
            <div key={idx} className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl overflow-hidden bg-gray-200 shrink-0">
                <img src={song.image_url} alt={song.title} className="w-full h-full object-cover" />
              </div>
              <div className="flex-1">
                <div className="text-gray-900 font-medium text-base">{song.title}</div>
                <div className="text-xs text-gray-500">{song.artist}</div>
              </div>
            </div>
          ) : (
            <div key={idx} className="flex items-center gap-3 w-full">
              <div className="w-12 h-12 rounded-xl bg-gray-100" />
              <div className="flex-1 text-gray-400 text-base">&nbsp;</div>
            </div>
          );
        })}
      </div>
    );
  };
  return (
    <div className="min-h-screen bg-[#F5F5F7] flex flex-col">
      {/* Botón volver */}
      <div className="flex items-center px-4 pt-6 pb-2">
        <button onClick={() => router.back()} className="text-2xl text-gray-400">×</button>
      </div>
      {/* Header estilo Instagram mobile (foto a la izquierda) */}
      <div className="flex items-center px-4 mt-2 gap-4">
        {/* Foto de perfil a la izquierda */}
        <div className="shrink-0 flex flex-col items-center justify-center">
          {profile?.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt={profile.username}
              className="w-20 h-20 rounded-full object-cover shadow"
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-gray-300 flex items-center justify-center text-3xl font-bold text-white">
              {profile?.username?.charAt(0).toUpperCase() || "U"}
            </div>
          )}
        </div>
        {/* Datos y stats a la derecha */}
        <div className="flex-1 flex flex-col justify-center gap-1">
          <div className="flex flex-col sm:flex-row sm:items-center sm:gap-3">
            <div className="text-base font-bold text-gray-900 leading-tight truncate max-w-[180px]">{profile?.full_name || ""}</div>
            {profile?.is_plus && (
              <span className="mt-1 sm:mt-0 sm:ml-2 inline-block px-2 py-0.5 rounded-full bg-[#FB3C4C] text-white text-[10px] font-bold">Bopp+</span>
            )}
          </div>
          <div className="text-gray-500 text-xs truncate max-w-[180px]">@{profile?.username || "usuario"}</div>
          <div className="flex items-center gap-4 mt-1">
            <div className="flex flex-col items-center">
              <span className="font-bold text-gray-900 text-sm">{reviews.length}</span>
              <span className="text-gray-500 text-[10px]">Calificaciones</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="font-bold text-gray-900 text-sm">{followersCount}</span>
              <span className="text-gray-500 text-[10px]">Seguidores</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="font-bold text-gray-900 text-sm">{followingCount}</span>
              <span className="text-gray-500 text-[10px]">Siguiendo</span>
            </div>
          </div>
        </div>
      </div>
      {/* Botones debajo del bloque de perfil */}
      {session?.user?.id && !isOwnProfile && profile?.id && (
        <div className="flex gap-3 px-4 mt-3 mb-6">
          <div className="flex-1">
            <FollowButton
              targetUserId={profile.id}
              currentUserId={session.user.id}
              initialIsFollowing={isFollowing}
              initialFollowersCount={followersCount}
            />
          </div>
          <button
            className="flex-1 w-full h-11 px-4 rounded-full font-bold transition border text-sm flex items-center justify-center bg-gray-100 hover:bg-gray-200 text-gray-700 border-gray-200"
            style={{ minHeight: '2.75rem' }}
            title="Compartir perfil"
            onClick={() => {
              if (navigator.share) {
                navigator.share({
                  title: `Perfil de ${profile.full_name || profile.username}`,
                  url: window.location.href,
                });
              } else {
                navigator.clipboard.writeText(window.location.href);
                alert('Enlace copiado al portapapeles');
              }
            }}
          >
            Compartir
          </button>
        </div>
      )}
      {/* Preferidos */}
      <div className="px-4 mb-6">
        <div className="bg-white rounded-2xl shadow-md p-4 mb-4">
          <div className="font-bold text-gray-900 mb-1">Preferidos</div>
          <div className="text-xs text-gray-500 mb-3">Top 4 Álbumes</div>
          {renderAlbumGrid()}
          <div className="text-xs text-gray-500 mb-3">Top 4 Canciones</div>
          {renderSongList()}
        </div>
      </div>
      {/* Calificaciones */}
      <div className="px-4 pb-32">
        <div className="font-bold text-gray-900 mb-3">Calificaciones</div>
        {reviews.length === 0 && (
          <div className="text-gray-400 text-center py-8">Sin calificaciones aún.</div>
        )}
        <div className="flex flex-col gap-4">
          {reviews.map((review, idx) => (
            <ReviewCard key={idx} review={review} />
          ))}
        </div>
      </div>
    </div>
  );
}
