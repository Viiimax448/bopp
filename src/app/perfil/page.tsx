"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import TopPickerModal from "@/components/TopPickerModal";
import type { TopItem } from "./TopPickerModal.types";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import imageCompression from "browser-image-compression";
import { FiSettings } from "react-icons/fi";
import { FaCamera, FaPlus, FaHeart, FaRegHeart } from "react-icons/fa";
import ProfileSettings from "@/components/ProfileSettings";
import AvatarUpload from "@/components/AvatarUpload";
import BottomNav from "@/components/BottomNav";
import StarRating from "@/components/StarRating";

function ProfileReviewCard({
  review,
  currentUserId,
}: {
  review: any;
  currentUserId: string | null;
}) {
  const [isLiked, setIsLiked] = useState(Boolean(review.user_has_liked));
  const [likesCount, setLikesCount] = useState<number>(
    typeof review.likes_count === "number" ? review.likes_count : Number(review.likes_count) || 0
  );
  const [isLoadingLike, setIsLoadingLike] = useState(false);

  const supabaseClient = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    setIsLiked(Boolean(review.user_has_liked));
  }, [review.user_has_liked]);

  useEffect(() => {
    if (review.likes_count === undefined || review.likes_count === null) return;
    setLikesCount(
      typeof review.likes_count === "number" ? review.likes_count : Number(review.likes_count) || 0
    );
  }, [review.likes_count]);

  // Recalcular `isLiked` si viene la relación `review_likes`
  useEffect(() => {
    if (!currentUserId) return;
    if (Array.isArray(review.review_likes)) {
      const liked = review.review_likes.some((like: any) => like.user_id === currentUserId);
      setIsLiked(liked);
    }
  }, [currentUserId, review.review_likes]);

  const handleToggleLike = async () => {
    if (!currentUserId || isLoadingLike) return;

    setIsLoadingLike(true);
    const prevLiked = isLiked;
    const prevCount = likesCount;

    setIsLiked(!prevLiked);
    setLikesCount(prevLiked ? prevCount - 1 : prevCount + 1);

    try {
      if (!prevLiked) {
        const { error } = await supabaseClient
          .from("review_likes")
          .insert([{ review_id: review.id, user_id: currentUserId }]);
        if (error) throw error;
      } else {
        const { error } = await supabaseClient
          .from("review_likes")
          .delete()
          .eq("review_id", review.id)
          .eq("user_id", currentUserId);
        if (error) throw error;
      }
    } catch (err: any) {
      // Hack: si intentamos INSERT pero ya existía (23505 / 409), la DB confirma que está liked.
      if (!prevLiked && (err?.code === "23505" || err?.status === 409)) {
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
    <div className="flex gap-3 py-3 border-b border-gray-200/60 last:border-0 mx-4">
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

      {/* INFO, ESTRELLAS Y LIKE */}
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
          <p className="text-sm text-gray-700 mt-1.5 leading-relaxed wrap-break-word">
            {review.review_text || review.content}
          </p>
        )}

        <button
          onClick={handleToggleLike}
          className="flex items-center gap-1.5 mt-3 group w-fit"
          disabled={isLoadingLike || !currentUserId}
          aria-label={isLiked ? "Quitar like" : "Dar like"}
          type="button"
        >
          {isLiked ? (
            <FaHeart className="w-4 h-4 text-red-500 scale-110 transition-transform" />
          ) : (
            <FaRegHeart className="w-4 h-4 text-gray-400 group-hover:text-red-400 transition-colors" />
          )}
          <span className={`text-xs ${isLiked ? "text-red-500 font-bold" : "text-gray-500"}`}>
            {likesCount > 0 ? likesCount : ""}
          </span>
        </button>
      </div>
    </div>
  );
}

export default function PerfilPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [pickerType, setPickerType] = useState<'album' | 'track'>('album');
  const [pickerSlot, setPickerSlot] = useState<number | null>(null);

  // Estados independientes (evitamos estados cruzados entre modales)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Estado del modal Editar Perfil
  const [editFullName, setEditFullName] = useState("");
  const [editUsername, setEditUsername] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string>("");

  // Contadores de followers/following
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);

  // Optimistic UI para update de perfil
  const handleProfileUpdate = (data: { full_name: string; username: string }) => {
    setProfile((p: any) => ({ ...p, ...data }));
  };

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
      setCurrentUserId(userId);

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
          .select(
            `
            *,
            review_likes (user_id),
            likes:review_likes (count)
          `
          )
          .eq("user_id", userId)
          .order("created_at", { ascending: false }),
      ]);

      const mappedReviews = Array.isArray(reviewsRes.data)
        ? reviewsRes.data.map((review: any) => {
            const likeCountFromEmbed =
              Array.isArray(review.likes) &&
              (typeof review.likes?.[0]?.count === "number" ||
                typeof review.likes?.[0]?.count === "string")
                ? Number(review.likes[0].count)
                : undefined;

            return {
              ...review,
              user_has_liked: Array.isArray(review.review_likes)
                ? review.review_likes.some((like: any) => like.user_id === userId)
                : false,
              // Preferimos el COUNT real de `review_likes` para que no desaparezca tras recargar.
              likes_count:
                typeof likeCountFromEmbed === "number"
                  ? likeCountFromEmbed
                  : typeof review.likes_count === "number"
                    ? review.likes_count
                    : Array.isArray(review.review_likes)
                      ? review.review_likes.length
                      : 0,
            };
          })
        : [];

      setProfile(profileRes.data);
      setAvatarUrl(profileRes.data?.avatar_url || "");
      setFollowersCount(followersRes.count || 0);
      setFollowingCount(followingRes.count || 0);
      setReviews(mappedReviews);
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
    setEditFullName(profile?.full_name || "");
    setEditUsername(profile?.username || "");
    setEditError("");
    setIsEditModalOpen(true);
  };

  const handleOpenSettings = () => {
    setIsSettingsOpen(true);
  };

  const handleTriggerUpload = () => fileInputRef.current?.click();

  const handleAvatarFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Permite volver a seleccionar el mismo archivo
    e.target.value = "";

    if (!file || !profile?.id) return;

    setAvatarUploading(true);

    // Comprimir y convertir a webp 400x400px, <50KB
    const options = {
      maxSizeMB: 0.05,
      maxWidthOrHeight: 400,
      useWebWorker: true,
      fileType: "image/webp",
      initialQuality: 0.7,
    };

    let compressedFile: File;
    try {
      compressedFile = await imageCompression(file, options);
    } catch {
      setAvatarUploading(false);
      return;
    }

    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // 1. Definimos un nombre de archivo único (evita problemas de caché)
    // Como comprimimos a webp, forzamos la extensión a .webp
    const fileExt = "webp";
    const fileName = `${profile.id}-${Date.now()}.${fileExt}`;
    const filePath = `${fileName}`;

    // 2. Subimos el archivo con upsert: true
    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(filePath, compressedFile, {
        cacheControl: "3600",
        upsert: true,
        contentType: "image/webp",
      });

    if (uploadError) {
      console.error("Error subiendo avatar:", uploadError);
      setAvatarUploading(false);
      return;
    }

    // 3. Obtenemos la URL pública de la nueva foto
    const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);
    const publicUrl = data?.publicUrl;

    if (publicUrl) {
      // Actualizamos UI al instante
      setAvatarUrl(`${publicUrl}?t=${Date.now()}`);
      setProfile((p: any) => ({ ...p, avatar_url: publicUrl }));

      // 4. Actualizamos la tabla profiles con la nueva URL
      const { error } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", profile.id);

      if (error) {
        console.error("Error actualizando perfil:", error);
      }
    }

    setAvatarUploading(false);
  };

  const handleSaveEditProfile = async () => {
    if (!profile?.id) return;

    setEditError("");

    if (!editUsername.match(/^[a-z0-9_]+$/)) {
      setEditError("El @usuario solo puede tener minúsculas, números y guiones bajos.");
      return;
    }

    setEditSaving(true);

    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { error } = await supabase
      .from("profiles")
      .update({ full_name: editFullName, username: editUsername })
      .eq("id", profile.id);

    setEditSaving(false);

    if (error) {
      setEditError("Error al guardar.");
      return;
    }

    handleProfileUpdate({ full_name: editFullName, username: editUsername });
    setIsEditModalOpen(false);
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
              className="flex items-center gap-4 py-2 cursor-pointer group px-4 w-full text-left"
              aria-label={`Elegir canción top ${position}`}
            >
              {/* Número */}
              <span className="w-4 text-center text-sm font-bold text-gray-400 shrink-0">{position}</span>

              {/* Cuadro con el + */}
              <div className="w-12 h-12 rounded-md border-2 border-dashed border-gray-200 bg-gray-50 flex items-center justify-center group-hover:border-gray-300 group-hover:bg-gray-100 transition-all shrink-0">
                <FaPlus className="w-4 h-4 text-gray-400" />
              </div>

              {/* Texto de Acción (Reemplazando los skeleton loaders) */}
              <div className="flex flex-col flex-1">
                <span className="text-sm font-medium text-gray-400 group-hover:text-gray-600 transition-colors">
                  Añadir canción
                </span>
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
            avatarUrl={avatarUrl || "/default-avatar.png"}
            uploading={avatarUploading}
            onTriggerUpload={handleTriggerUpload}
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
          className="min-w-30 h-10 px-4 bg-white border border-gray-300 hover:bg-gray-50 text-gray-900 text-sm font-bold rounded-full transition-colors flex items-center justify-center"
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

      {/* Modal Editar Perfil */}
      {isEditModalOpen && (
        <div
          className="fixed inset-0 z-200 bg-black/40 flex items-end justify-center"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsEditModalOpen(false);
          }}
        >
          <div className="bg-white w-full max-w-sm rounded-t-2xl shadow-xl">
            {/* Contenido del Modal Editar Perfil */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSaveEditProfile();
              }}
              className="p-6 flex flex-col gap-6"
            >
              <div className="flex flex-col items-center gap-2">
                <div onClick={handleTriggerUpload} className="relative cursor-pointer group">
                  <img
                    src={avatarUrl || "/default-avatar.png"}
                    className="w-20 h-20 rounded-full object-cover border border-gray-200 group-hover:opacity-80 transition-opacity"
                    alt="Avatar"
                  />
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <FaCamera className="text-white w-6 h-6" />
                  </div>
                </div>
                <button
                  onClick={handleTriggerUpload}
                  type="button"
                  className="text-blue-600 font-semibold text-sm hover:text-blue-700"
                >
                  Cambiar foto
                </button>
              </div>

              <div className="flex flex-col gap-4">
                {/* Input Nombre */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-bold text-gray-900 ml-1">Nombre</label>
                  <input
                    type="text"
                    value={editFullName}
                    onChange={(e) => setEditFullName(e.target.value)}
                    maxLength={32}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                  />
                </div>

                {/* Input Usuario */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-bold text-gray-900 ml-1">Nombre de usuario</label>
                  <div className="relative flex items-center">
                    <span className="absolute left-4 text-gray-400 font-medium">@</span>
                    <input
                      type="text"
                      value={editUsername}
                      onChange={(e) =>
                        setEditUsername(
                          e.target.value.replace(/[^a-z0-9_]/g, "").toLowerCase()
                        )
                      }
                      maxLength={20}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-8 pr-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                    />
                  </div>
                </div>
              </div>

              {editError && (
                <div className="text-blue-600 text-sm font-medium">{editError}</div>
              )}

              <button
                type="submit"
                disabled={editSaving}
                className="w-full bg-blue-600 text-white font-bold py-3.5 rounded-xl mt-2 hover:bg-blue-700 active:scale-[0.98] transition-all disabled:opacity-60"
              >
                Guardar cambios
              </button>

              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="w-full text-gray-400 text-sm font-medium -mt-3"
              >
                Cancelar
              </button>
            </form>
          </div>
        </div>
      )}

      <ProfileSettings open={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleAvatarFileChange}
        disabled={avatarUploading}
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
              <ProfileReviewCard
                key={review.id || index}
                review={review}
                currentUserId={currentUserId}
              />
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
