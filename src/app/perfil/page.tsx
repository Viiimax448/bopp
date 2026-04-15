"use client";

import { useEffect, useState } from "react";
import TopPickerModal from "@/components/TopPickerModal";
import type { TopItem } from "./TopPickerModal.types";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import { FiSettings } from "react-icons/fi";
import ProfileSettings from "@/components/ProfileSettings";
import AvatarUpload from "@/components/AvatarUpload";
import BottomNav from "@/components/BottomNav";
import StarRating from "@/components/StarRating";

export default function PerfilPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [pickerType, setPickerType] = useState<'album' | 'track'>('album');
  const [pickerSlot, setPickerSlot] = useState<number | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsStartInEdit, setSettingsStartInEdit] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string>("");
  // Contadores de followers/following
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);

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
      // Stats y reviews en paralelo
      const [profileRes, followersRes, followingRes, reviewsRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("*")
          .eq("id", userId)
          .single(),
        supabase
          .from("followers")
          .select("*", { count: "exact", head: true })
          .eq("following_id", userId),
        supabase
          .from("followers")
          .select("*", { count: "exact", head: true })
          .eq("follower_id", userId),
        supabase
          .from("reviews")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false }),
      ]);
      setProfile(profileRes.data);
      setFollowersCount(followersRes.count || 0);
      setFollowingCount(followingRes.count || 0);
      setReviews(reviewsRes.data || []);
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

  const handleOpenEditProfile = () => {
    setSettingsStartInEdit(true);
    setSettingsOpen(true);
  };

  const handleOpenSettings = () => {
    setSettingsStartInEdit(false);
    setSettingsOpen(true);
  };

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

    const slot = pickerSlot ?? 0;

    if (pickerType === "album") {
      const current = Array.isArray(profile.top_albums) ? [...profile.top_albums] : [];
      const nuevoArray = Array.from({ length: 4 }, (_, i) => (i === slot ? item : (current[i] ?? null)));
      await supabase.from("profiles").update({ top_albums: nuevoArray }).eq("id", profile.id);
      setProfile((p: any) => ({ ...p, top_albums: nuevoArray }));
    } else {
      const current = Array.isArray(profile.top_songs) ? [...profile.top_songs] : [];
      const nuevoArray = Array.from({ length: 4 }, (_, i) => (i === slot ? item : (current[i] ?? null)));
      await supabase.from("profiles").update({ top_songs: nuevoArray }).eq("id", profile.id);
      setProfile((p: any) => ({ ...p, top_songs: nuevoArray }));
    }

    setIsPickerOpen(false);
  };

  // Render helpers (mismo estilo que el perfil público)
  const renderAlbumGrid = () => {
    const albums: (TopItem | null | undefined)[] = Array.isArray(profile?.top_albums) ? profile.top_albums : [];
    return (
      <div className="grid grid-cols-4 gap-2 px-4">
        {[0, 1, 2, 3].map((idx) => {
          const album = albums[idx];
          return album ? (
            <button
              key={idx}
              type="button"
              onClick={() => openPicker("album", idx)}
              className="aspect-square rounded-md overflow-hidden bg-gray-200"
              aria-label={`Editar álbum favorito ${idx + 1}`}
            >
              <img
                src={album.image_url}
                alt={album.title}
                className="w-full aspect-square object-cover rounded-md border border-black/5"
              />
            </button>
          ) : (
            <button
              key={idx}
              type="button"
              onClick={() => openPicker("album", idx)}
              className="aspect-square rounded-md bg-gray-100 border border-black/5 flex items-center justify-center"
              aria-label={`Elegir álbum favorito ${idx + 1}`}
            >
              <span className="text-3xl font-bold text-black/20">+</span>
            </button>
          );
        })}
      </div>
    );
  };

  const renderSongList = () => {
    const songs: (TopItem | null | undefined)[] = Array.isArray(profile?.top_songs) ? profile.top_songs : [];
    return (
      <div>
        {[0, 1, 2, 3].map((idx) => {
          const song = songs[idx];
          const position = idx + 1;

          return song ? (
            <button
              key={idx}
              type="button"
              onClick={() => openPicker("track", idx)}
              className="flex items-center gap-3 px-4 py-2 w-full text-left"
              aria-label={`Editar canción top ${position}`}
            >
              <span className="w-4 text-center text-sm font-bold text-gray-400">{position}</span>
              <div className="w-12 h-12 rounded-md overflow-hidden bg-gray-200 shrink-0">
                <img src={song.image_url} alt={song.title} className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-gray-900 font-medium text-sm truncate">{song.title}</div>
                <div className="text-xs text-gray-500 truncate">{song.artist}</div>
              </div>
            </button>
          ) : (
            <button
              key={idx}
              type="button"
              onClick={() => openPicker("track", idx)}
              className="flex items-center gap-3 px-4 py-2 w-full text-left"
              aria-label={`Elegir canción top ${position}`}
            >
              <span className="w-4 text-center text-sm font-bold text-gray-400">{position}</span>
              <div className="w-12 h-12 rounded-md bg-gray-100 shrink-0 flex items-center justify-center border border-black/5">
                <span className="text-2xl font-bold text-black/20">+</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="h-4 w-28 bg-black/5 rounded" />
                <div className="h-3 w-20 bg-black/5 rounded mt-2" />
              </div>
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#F5F5F7] flex flex-col">
      {/* Header (igual a perfiles públicos) */}
      <div className="flex items-center justify-between px-4 pt-6 pb-2">
        <button onClick={() => router.back()} className="text-2xl text-gray-400">
          ×
        </button>
        <span className="flex-1 text-center font-bold text-lg text-gray-900">Perfil</span>
        <div className="w-8" />
      </div>

      {/* Header (Avatar y Stats) */}
      <div className="flex flex-col items-center mt-2">
        {profile?.id ? (
          <AvatarUpload
            user={{ id: profile.id }}
            avatarUrl={avatarUrl || "/default-avatar.png"}
            onAvatarChange={(url) => {
              setAvatarUrl(url);
              setProfile((p: any) => ({ ...p, avatar_url: url }));
            }}
          />
        ) : (
          <div className="w-36 h-36 rounded-full bg-gray-300 flex items-center justify-center text-5xl font-bold text-white">
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

        {/* Stats Bar (compacta) */}
        <div className="flex items-center justify-center gap-3 px-4 mt-4">
          <div className="text-center">
            <span className="font-bold text-gray-900">{reviews.length}</span>
            <span className="text-gray-500 text-xs block">Reseñas</span>
          </div>
          <div className="w-px h-5 bg-black/10" />
          <div className="text-center">
            <span className="font-bold text-gray-900">{followingCount}</span>
            <span className="text-gray-500 text-xs block">Siguiendo</span>
          </div>
          <div className="w-px h-5 bg-black/10" />
          <div className="text-center">
            <span className="font-bold text-gray-900">{followersCount}</span>
            <span className="text-gray-500 text-xs block">Seguidores</span>
          </div>
        </div>
      </div>

      {/* Botones de Acción (perfil propio: editar + configuración) */}

      <div className="flex items-center justify-center gap-2 mt-4 px-6 relative">
        <button
          type="button"
          onClick={handleOpenEditProfile}
          className="min-w-[120px] h-10 px-4 bg-white border border-gray-300 hover:bg-gray-50 text-gray-900 text-sm font-bold rounded-full transition-colors flex items-center justify-center"
        >
          Editar perfil
        </button>

        <button
          type="button"
          onClick={handleOpenSettings}
          className="w-10 h-10 shrink-0 flex items-center justify-center bg-white border border-gray-300 rounded-full text-gray-900 hover:bg-gray-50 transition-colors"
          aria-label="Configuración"
        >
          <FiSettings className="w-5 h-5" />
        </button>
      </div>

      <ProfileSettings
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        profile={profile}
        onProfileUpdate={handleProfileUpdate}
        startInEdit={settingsStartInEdit}
      />

      {/* Título sección Álbumes */}
      <h3 className="text-sm font-bold text-gray-900 px-4 mt-8 mb-3">Álbumes Favoritos</h3>
      {renderAlbumGrid()}

      {/* Título sección Canciones */}
      <h3 className="text-sm font-bold text-gray-900 px-4 mt-8 mb-3">Top Canciones</h3>
      {renderSongList()}

      {/* Reseñas Recientes (Estilo Feed) */}
      <div className="px-4 pb-32 mt-6">
        <div className="font-bold text-gray-900 mb-2">Reseñas recientes</div>
        {reviews.length > 0 ? (
          <div className="flex flex-col w-full">
            {reviews.map((review, index) => (
              <div key={review.id || index} className="flex gap-3 py-3 border-b border-gray-200/60 last:border-0 mx-4">
                {/* PORTADA (Con fallback por si falla la URL) */}
                <div className="w-12 h-12 shrink-0 bg-gray-200 rounded-md overflow-hidden border border-black/5">
                  {(review?.spotify_image_url || review?.image_url || review?.image) && (
                    <img
                      src={review.spotify_image_url || review.image_url || review.image}
                      alt="Portada"
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>

                {/* INFO Y ESTRELLAS */}
                <div className="flex flex-col flex-1 min-w-0">
                  <h4 className="text-sm font-bold text-gray-900 truncate">
                    {review.spotify_title || review.title || "Obra Desconocida"}
                  </h4>
                  <p className="text-[11px] text-gray-500 truncate">
                    {review.spotify_artist || review.artist || "Artista"}
                  </p>
                  <div className="mt-1 flex items-center">
                    <StarRating
                      rating={review.rating || review.score || 0}
                      starSize={12}
                      onChange={() => {}}
                      className="text-blue-600"
                    />
                  </div>
                  {(review.review_text || review.content) && (
                    <p className="text-[13px] text-gray-700 mt-1.5 leading-snug line-clamp-3 break-words">
                      {review.review_text || review.content}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-400 text-sm px-4 py-8 text-center">Sin reseñas recientes.</p>
        )}
      </div>

      {/* Picker Modal */}
      <TopPickerModal
        open={isPickerOpen}
        type={pickerType}
        onClose={() => setIsPickerOpen(false)}
        onSelect={handleSelectTopItem}
      />

      <BottomNav />
    </div>
  );
}
