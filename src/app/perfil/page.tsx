"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import TopPickerModal from "@/components/TopPickerModal";
import type { TopItem } from "./TopPickerModal.types";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import imageCompression from "browser-image-compression";
import { FiSettings } from "react-icons/fi";
import { FaCamera, FaPlus, FaHeart, FaRegHeart, FaStar, FaRegStar, FaCog, FaPencilAlt, FaExchangeAlt } from "react-icons/fa";
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
      if (!prevLiked && (err?.code === "23505" || err?.status === 409)) {
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

  const rawType = String(review?.item_type || review?.type || '').toLowerCase();
  const normalizedType = rawType === 'album' || rawType === 'albums' ? 'album' : 'song';
  const tipoLabel = normalizedType === 'album' ? 'Álbum' : 'Canción';
  const itemId = review.item_id || review.spotify_id;
  const itemHref = itemId ? `/${normalizedType}/${itemId}` : '#';
  return (
    <div className="flex gap-3 sm:gap-4 py-4 border-b border-gray-200 w-full last:border-0 items-start">
      {/* IZQUIERDA: Portada grande */}
      <a href={itemHref}
        className="shrink-0 group">
        <img
          src={review.image_url || review.spotify_image_url || review.image}
          className="w-20 h-20 sm:w-24 sm:h-24 rounded-lg object-cover shadow-sm border border-black/10 group-hover:opacity-80 transition-opacity"
          alt={review.title || review.spotify_title || 'Obra'}
        />
      </a>
      {/* DERECHA: Toda la información, texto y botones */}
      <div className="flex flex-col flex-1 min-w-0 min-h-[5rem] sm:min-h-[6rem]">
        {/* Título, Artista y Tipo */}
        <a href={itemHref}
          className="group w-full min-w-0 mb-0.5 block">
          <h3 className="text-[15.5px] font-bold text-gray-900 leading-tight line-clamp-2 group-hover:underline decoration-gray-900 underline-offset-2">
            {review.title || review.spotify_title || 'Obra Desconocida'}
          </h3>
          <div className="flex items-center gap-1.5 text-[13px] text-gray-700 group-hover:text-gray-900 transition-colors mt-0.5 w-full min-w-0">
            <span className="truncate shrink min-w-0">{review.artist || review.spotify_artist || 'Artista'}</span>
            <span className="text-[10px] opacity-70 shrink-0">•</span>
            <span className="font-medium shrink-0">{tipoLabel}</span>
          </div>
        </a>
        {/* Estrellas y Like condicional si NO hay texto */}
        <div className="flex items-center justify-between mt-1">
          <div className="flex items-center">
            {[1, 2, 3, 4, 5].map((i) =>
              i <= (review.rating || review.score || 0) ? (
                <FaStar key={i} size={15} className="text-blue-600" />
              ) : (
                <FaRegStar key={i} size={15} className="text-gray-200" />
              )
            )}
          </div>
          {/* Like en línea solo si NO hay texto */}
          {!review.review_text && (
            <button
              onClick={handleToggleLike}
              className="flex items-center gap-1.5 group"
              disabled={isLoadingLike || !currentUserId}
              aria-label={isLiked ? "Quitar like" : "Dar like"}
              type="button"
            >
              {isLiked ? (
                <FaHeart className="w-[18px] h-[18px] text-blue-600 scale-110 transition-transform" />
              ) : (
                <FaRegHeart className="w-[18px] h-[18px] text-gray-400 group-hover:text-blue-500 transition-colors" />
              )}
              <span className={`text-[13px] font-medium ${isLiked ? 'text-blue-600' : 'text-gray-500'}`}>
                {likesCount > 0 ? likesCount : ''}
              </span>
            </button>
          )}
        </div>
        {/* Texto de la Reseña (dentro de la columna derecha) */}
        {review.review_text && (
          <p className="text-[14px] text-gray-900 leading-relaxed mt-2 line-clamp-4">
            {review.review_text}
          </p>
        )}
        {/* Footer: Like anclado abajo (SOLO si HAY texto) */}
        {review.review_text && (
          <div className="flex justify-end mt-auto pt-2">
            <button
              onClick={handleToggleLike}
              className="flex items-center gap-1.5 group"
              disabled={isLoadingLike || !currentUserId}
              aria-label={isLiked ? "Quitar like" : "Dar like"}
              type="button"
            >
              {isLiked ? (
                <FaHeart className="w-[18px] h-[18px] text-blue-600 scale-110 transition-transform" />
              ) : (
                <FaRegHeart className="w-[18px] h-[18px] text-gray-400 group-hover:text-blue-500 transition-colors" />
              )}
              <span className={`text-[13px] font-medium ${isLiked ? 'text-blue-600' : 'text-gray-500'}`}>
                {likesCount > 0 ? likesCount : ''}
              </span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function PerfilPage() {
    // Estados de edición para secciones
    const [isEditingAlbums, setIsEditingAlbums] = useState(false);
    const [isEditingSongs, setIsEditingSongs] = useState(false);
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
          if (album) {
            return isEditingAlbums ? (
              // MODO EDICIÓN: Botón para cambiar el álbum
              <button
                key={idx}
                type="button"
                onClick={() => openPicker("album", idx)}
                className="relative w-full aspect-square rounded-lg overflow-hidden group border border-black/5"
                aria-label={`Editar álbum favorito ${idx + 1}`}
              >
                <img src={album.image_url} className="w-full h-full object-cover" alt={album.title} />
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center backdrop-blur-[2px]">
                  <FaExchangeAlt className="w-5 h-5 text-white opacity-90" />
                </div>
              </button>
            ) : (
              // MODO VISUALIZACIÓN: Link para navegar al álbum
              <a
                key={idx}
                href={`/album/${album.id}`}
                className="w-full aspect-square rounded-lg overflow-hidden border border-black/5 hover:opacity-80 transition-opacity block"
                aria-label={`Ver álbum favorito ${idx + 1}`}
              >
                <img src={album.image_url} className="w-full h-full object-cover" alt={album.title} />
              </a>
            );
          } else {
            // SLOT VACÍO: Botón '+' que siempre abre el buscador
            return (
              <button
                key={idx}
                type="button"
                onClick={() => openPicker("album", idx)}
                className="w-full aspect-square rounded-lg border-2 border-dashed border-gray-200 flex items-center justify-center hover:bg-black/5 transition-colors"
                aria-label={`Elegir álbum favorito ${idx + 1}`}
              >
                <FaPlus className="w-6 h-6 text-gray-300" />
              </button>
            );
          }
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
          if (song) {
            return isEditingSongs ? (
              <button
                key={idx}
                type="button"
                onClick={() => openPicker("track", idx)}
                className="flex items-center gap-3 px-4 py-2 w-full text-left relative"
                aria-label={`Editar canción top ${position}`}
              >
                <span className="w-4 text-center text-sm font-bold text-gray-400">{position}</span>
                <div className="w-12 h-12 rounded-md overflow-hidden bg-gray-200 shrink-0 relative">
                  <img src={song.image_url} alt={song.title} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center backdrop-blur-[2px]">
                    <FaExchangeAlt className="w-5 h-5 text-white opacity-90" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-gray-900 font-medium text-sm truncate">{song.title}</div>
                  <div className="text-xs text-gray-500 truncate">{song.artist}</div>
                </div>
              </button>
            ) : (
              <a
                key={idx}
                href={`/song/${song.id}`}
                className="flex items-center gap-3 px-4 py-2 w-full text-left hover:bg-black/5 rounded transition-colors"
                aria-label={`Ver canción top ${position}`}
              >
                <span className="w-4 text-center text-sm font-bold text-gray-400">{position}</span>
                <div className="w-12 h-12 rounded-md overflow-hidden bg-gray-200 shrink-0">
                  <img src={song.image_url} alt={song.title} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-gray-900 font-medium text-sm truncate">{song.title}</div>
                  <div className="text-xs text-gray-500 truncate">{song.artist}</div>
                </div>
              </a>
            );
          } else {
            return (
              <button
                key={idx}
                type="button"
                onClick={() => openPicker("track", idx)}
                className="flex items-center gap-4 py-2 cursor-pointer group px-4 w-full text-left"
                aria-label={`Elegir canción top ${position}`}
              >
                <span className="w-4 text-center text-sm font-bold text-gray-400 shrink-0">{position}</span>
                <div className="w-12 h-12 rounded-md border-2 border-dashed border-gray-200 bg-gray-50 flex items-center justify-center group-hover:border-gray-300 group-hover:bg-gray-100 transition-all shrink-0">
                  <FaPlus className="w-4 h-4 text-gray-400" />
                </div>
                <div className="flex flex-col flex-1">
                  <span className="text-sm font-medium text-gray-400 group-hover:text-gray-600 transition-colors">
                    Añadir canción
                  </span>
                </div>
              </button>
            );
          }
        })}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#F5F5F7] flex flex-col">
      {/* Header (igual a perfiles públicos) */}
        {/* HEADER DEL PERFIL (Reemplazo Total) */}
        <div className="relative flex items-center justify-between px-4 py-3 w-full h-16 border-b border-transparent">
          {/* Izquierda: Logo de Bopp (igual que en inicio) */}
          <h1 className="text-3xl font-black text-blue-600 tracking-tighter shrink-0 z-10 cursor-pointer">Bopp</h1>

          {/* Centro: Título 'Perfil' (gris muy oscuro, sin dark) */}
          <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[16px] font-bold text-gray-900 pointer-events-none">Perfil</span>

          {/* Derecha: Botón de Ajustes (gris muy oscuro, sin dark) */}
          <button 
            onClick={handleOpenSettings} 
            className="p-1.5 text-gray-900 hover:bg-black/5 rounded-full active:scale-95 transition-all shrink-0 z-10"
          >
            <FaCog className="w-[20px] h-[20px]" />
          </button>
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


      {/* Zona de Acciones del Perfil */}
      <div className="flex justify-center mt-4 mb-2 w-full">
        <button
          onClick={handleOpenEditProfile}
          className="px-6 py-1.5 rounded-full border border-gray-300 text-[14px] font-bold text-gray-900 bg-transparent hover:bg-black/5 transition-colors active:scale-95"
        >
          Editar perfil
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
      {/* Header de Álbumes Favoritos */}
      <div className="flex items-center justify-between mb-3 w-full px-4 mt-8">
        <h2 className="text-[15px] font-bold text-gray-900">Álbumes Favoritos</h2>
        {profile?.id === currentUserId && (
          <button
            onClick={() => setIsEditingAlbums(!isEditingAlbums)}
            className={`p-1.5 rounded-full transition-colors ${isEditingAlbums ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:bg-gray-100'}`}
            aria-label="Editar álbumes favoritos"
          >
            <FaPencilAlt className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      {renderAlbumGrid()}

      {/* Título sección Canciones */}
      {/* Header de Top Canciones */}
      <div className="flex items-center justify-between mb-3 w-full px-4 mt-8">
        <h2 className="text-[15px] font-bold text-gray-900">Top Canciones</h2>
        {profile?.id === currentUserId && (
          <button
            onClick={() => setIsEditingSongs(!isEditingSongs)}
            className={`p-1.5 rounded-full transition-colors ${isEditingSongs ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:bg-gray-100'}`}
            aria-label="Editar top canciones"
          >
            <FaPencilAlt className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
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
