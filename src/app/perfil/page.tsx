"use client";

import { useEffect, useState } from "react";
import TopPickerModal from "@/components/TopPickerModal";
import type { TopItem } from "./TopPickerModal.types";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import { FaEllipsisH } from "react-icons/fa";
import ReviewCard from "@/components/ReviewCard";
import ProfileSettings from "@/components/ProfileSettings";
import AvatarUpload from "@/components/AvatarUpload";
import BottomNav from "@/components/BottomNav";

export default function PerfilPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [pickerType, setPickerType] = useState<'album' | 'track'>('album');
  const [pickerSlot, setPickerSlot] = useState<number | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string>("");
  // Optimistic UI para update de perfil
  const handleProfileUpdate = (data: { full_name: string; username: string }) => {
    setProfile((p: any) => ({ ...p, ...data }));
  };

  // Sync avatarUrl con profile
  useEffect(() => {
    setAvatarUrl(profile?.avatar_url || "");
  }, [profile?.avatar_url]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) {
        setLoading(false);
        return;
      }
      const userId = userData.user.id;
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();
      setProfile(profileData);
      const { data: reviewsData } = await supabase
        .from("reviews")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      setReviews(reviewsData || []);
      setLoading(false);
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F5F7] text-gray-500 text-xl">
        Cargando perfil...
      </div>
    );
  }

  // Handler para abrir el picker
  const openPicker = (type: 'album' | 'track', slot: number) => {
    setPickerType(type);
    setPickerSlot(slot);
    setIsPickerOpen(true);
  };

  // Handler para seleccionar un top item
  const handleSelectTopItem = async (item: TopItem) => {
    if (!profile) return;
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    if (pickerType === 'album') {
      const current = Array.isArray(profile.top_albums) ? [...profile.top_albums] : [];
      current[pickerSlot ?? 0] = item;
      // Limitar a 4
      const nuevoArray = (current.slice(0, 4) as TopItem[]);
      await supabase.from('profiles').update({ top_albums: nuevoArray }).eq('id', profile.id);
      setProfile((p: any) => ({ ...p, top_albums: nuevoArray }));
    } else {
      const current = Array.isArray(profile.top_songs) ? [...profile.top_songs] : [];
      current[pickerSlot ?? 0] = item;
      const nuevoArray = (current.slice(0, 4) as TopItem[]);
      await supabase.from('profiles').update({ top_songs: nuevoArray }).eq('id', profile.id);
      setProfile((p: any) => ({ ...p, top_songs: nuevoArray }));
    }
    setIsPickerOpen(false);
  };

  // Render helpers
  const renderAlbumGrid = () => {
    const albums: TopItem[] = Array.isArray(profile?.top_albums) ? profile.top_albums : [];
    return (
      <div className="grid grid-cols-2 gap-3 mb-4">
        {[0,1,2,3].map(idx => {
          const album = albums[idx];
          return album ? (
            <div key={idx} className="aspect-square rounded-xl overflow-hidden bg-gray-200 relative group">
              <img src={album.image_url} alt={album.title} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                <button onClick={() => openPicker('album', idx)} className="text-white text-3xl font-bold">✎</button>
              </div>
            </div>
          ) : (
            <button
              key={idx}
              className="aspect-square rounded-xl bg-gray-100 flex items-center justify-center text-5xl text-gray-300 border-2 border-dashed border-gray-200 hover:bg-gray-200"
              onClick={() => openPicker('album', idx)}
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
        {[0,1,2,3].map(idx => {
          const song = songs[idx];
          return song ? (
            <div key={idx} className="flex items-center gap-3 group">
              <div className="w-12 h-12 rounded-xl overflow-hidden bg-gray-200 shrink-0 relative">
                <img src={song.image_url} alt={song.title} className="w-full h-full object-cover" />
                <button
                  onClick={() => openPicker('track', idx)}
                  className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-xl font-bold"
                >✎</button>
              </div>
              <div className="flex-1">
                <div className="text-gray-900 font-medium text-base">{song.title}</div>
                <div className="text-xs text-gray-500">{song.artist}</div>
              </div>
            </div>
          ) : (
            <button
              key={idx}
              className="flex items-center gap-3 w-full"
              onClick={() => openPicker('track', idx)}
            >
              <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center text-3xl text-gray-300 border-2 border-dashed border-gray-200">+</div>
              <div className="flex-1 text-gray-400 text-base">Elegí una canción</div>
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#F5F5F7] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-6 pb-2">
        <button onClick={() => router.back()} className="text-2xl text-gray-400">
          ×
        </button>
        <span className="flex-1 text-center font-bold text-lg text-gray-900">Perfil</span>
        <button className="text-2xl text-gray-400" onClick={() => setSettingsOpen(true)}>
          <FaEllipsisH />
        </button>
      </div>
      {/* Avatar, nombre y username */}
      <div className="flex flex-col items-center mt-2 mb-4">
        {profile?.id ? (
          <AvatarUpload
            user={{ id: profile.id }}
            avatarUrl={avatarUrl || "/default-avatar.png"}
            onAvatarChange={url => {
              setAvatarUrl(url);
              setProfile((p: any) => ({ ...p, avatar_url: url }));
            }}
          />
        ) : (
          <div className="w-24 h-24 rounded-full bg-gray-300 flex items-center justify-center text-4xl font-bold text-white">
            {profile?.username?.charAt(0).toUpperCase() || "U"}
          </div>
        )}
        <div className="mt-3 text-2xl font-extrabold text-gray-900">{profile?.full_name || ""}</div>
        <div className="text-gray-500 text-base">@{profile?.username || "usuario"}</div>
        {profile?.is_plus && (
          <span className="mt-2 px-3 py-1 rounded-full bg-[#FB3C4C] text-white text-xs font-bold">Bopp+</span>
        )}
      </div>
      <ProfileSettings
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        profile={profile}
        onProfileUpdate={handleProfileUpdate}
      />
      {/* Stats Bar */}
      <div className="flex items-center justify-center gap-4 px-6 mb-6">
        <div className="flex-1 text-center">
          <span className="font-bold text-gray-900">{profile?.reviews_count ?? 0}</span>
          <span className="text-gray-500 text-xs block">Calificaciones</span>
        </div>
        <div className="w-px h-6 bg-gray-300" />
        <div className="flex-1 text-center">
          <span className="font-bold text-gray-900">{profile?.following_count ?? 0}</span>
          <span className="text-gray-500 text-xs block">Siguiendo</span>
        </div>
        <div className="w-px h-6 bg-gray-300" />
        <div className="flex-1 text-center">
          <span className="font-bold text-gray-900">{profile?.followers_count ?? 0}</span>
          <span className="text-gray-500 text-xs block">Seguidores</span>
        </div>
      </div>
      {/* Tus Preferidos */}
      <div className="px-4 mb-6">
        <div className="bg-white rounded-2xl shadow-md p-4 mb-4">
          <div className="font-bold text-gray-900 mb-1">Tus Preferidos</div>
          <div className="text-xs text-gray-500 mb-3">Top 4 Álbumes</div>
          {renderAlbumGrid()}
          <div className="text-xs text-gray-500 mb-3">Top 4 Canciones</div>
          {renderSongList()}
              {/* Picker Modal */}
              <TopPickerModal
                open={isPickerOpen}
                type={pickerType}
                onClose={() => setIsPickerOpen(false)}
                onSelect={handleSelectTopItem}
              />
        </div>
      </div>
      {/* Tus Calificaciones */}
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
