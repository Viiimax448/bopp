
"use client";
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { getColor } from 'colorthief';
import { FaHeart, FaRegHeart, FaChevronRight, FaChevronLeft, FaArrowLeft, FaShareAlt, FaHome } from 'react-icons/fa';
import { useRouter } from 'next/navigation';
import StarRating from '@/components/StarRating';
import { createBrowserClient } from '@supabase/ssr';
import ReviewModal from '@/components/ReviewModal';
import type { User } from '@supabase/supabase-js';

export default function SongPage() {
  // Estados para swipe
  const [touchStart, setTouchStart] = useState<{ x: number | null; y: number | null }>({
    x: null,
    y: null,
  });
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const minSwipeDistance = 50;
  const [swipeOffset, setSwipeOffset] = useState(0); // Para efecto visual

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart({
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY,
    });
    setSwipeOffset(0);
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (touchStart.x === null || touchStart.y === null) return;

    const currentX = e.targetTouches[0].clientX;
    const currentY = e.targetTouches[0].clientY;
    const diffX = currentX - touchStart.x;
    const diffY = currentY - touchStart.y;

    // Axis Lock: si el movimiento vertical domina, dejamos scroll natural
    if (Math.abs(diffY) > Math.abs(diffX)) {
      return;
    }

    // Limitar arrastre visual
    if (diffX > 0 && !hasPrevious) return;
    if (diffX < 0 && !hasNext) return;
    setSwipeOffset(diffX);
    setTouchEnd(currentX);
  };
  const onTouchEnd = () => {
    if (touchStart.x === null || touchEnd === null) return;
    const distance = touchStart.x - touchEnd;
    if (distance > minSwipeDistance && hasNext) {
      setSwipeOffset(0);
      goToNextTrack();
    } else if (distance < -minSwipeDistance && hasPrevious) {
      setSwipeOffset(0);
      goToPreviousTrack();
    } else {
      setSwipeOffset(0); // Vuelve a su lugar con animación
    }
    setTouchStart({ x: null, y: null });
    setTouchEnd(null);
  };
    // Prefetch de rutas adyacentes se define más abajo, después de calcular hasPrevious/hasNext
  const params = useParams();
  const [song, setSong] = useState<any>(null);
  const [albumTracks, setAlbumTracks] = useState<any[]>([]); // Lista de tracks del álbum
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [userRating, setUserRating] = useState(0); // Nuevo estado para el rating del usuario
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [reviews, setReviews] = useState<any[]>([]);
  // Fondo dinámico
  const [averageRating, setAverageRating] = useState(0);
  const [totalReviews, setTotalReviews] = useState(0);
  const [dominantColor, setDominantColor] = useState('#121212');
  const [isBackgroundDark, setIsBackgroundDark] = useState(true);
  const imgRef = useRef<HTMLImageElement>(null);

  const [user, setUser] = useState<User | null>(null);
  const [likedByReviewId, setLikedByReviewId] = useState<Record<string, boolean>>({});

  const hasUserRating = rating > 0;

  const supabaseClient = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  function extractRgb(input: unknown): [number, number, number] | null {
    if (!input) return null;
    const v: any = input;

    const candidate =
      (Array.isArray(v) ? v : null) ??
      (Array.isArray(v?.rgb) ? v.rgb : null) ??
      (Array.isArray(v?.color) ? v.color : null);

    const r = candidate?.[0] ?? v?._r ?? v?.r ?? v?.[0];
    const g = candidate?.[1] ?? v?._g ?? v?.g ?? v?.[1];
    const b = candidate?.[2] ?? v?._b ?? v?.b ?? v?.[2];

    if ([r, g, b].every((n) => typeof n === 'number' && Number.isFinite(n))) {
      return [r, g, b];
    }
    return null;
  }

  // Helper para luminancia
  function calcIsDark([r, g, b]: number[]) {
    return (r * 0.299 + g * 0.587 + b * 0.114) < 128;
  }

  // Fetch song info y tracks del álbum
  useEffect(() => {
    if (!params?.id) return;
    setIsLoading(true);
    fetch(`/api/spotify/song/${params.id}`)
      .then(res => res.json())
      .then(data => {
        setSong(data);
        // Si hay info de álbum y tracks, setearlos
        if (data?.album?.id) {
          fetch(`/api/spotify/album/${data.album.id}`)
            .then(res => res.json())
            .then(albumData => {
              if (albumData?.tracks?.items) {
                setAlbumTracks(albumData.tracks.items);
              } else {
                setAlbumTracks([]);
              }
            });
        } else {
          setAlbumTracks([]);
        }
      })
      .finally(() => setIsLoading(false));
  }, [params?.id]);

  // Fetch reviews reales de Supabase y calcular promedio/cantidad
  function fetchReviews() {
    if (!params?.id) return;
    supabaseClient
      .from('reviews')
      .select('*, rating, profiles(username, full_name, avatar_url), review_likes(user_id), likes:review_likes(count)')
      .eq('spotify_id', params.id)
      .eq('type', 'song')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        const mapped = Array.isArray(data)
          ? data.map((review: any) => {
              const likeCountFromEmbed =
                Array.isArray(review.likes) &&
                (typeof review.likes?.[0]?.count === 'number' || typeof review.likes?.[0]?.count === 'string')
                  ? Number(review.likes[0].count)
                  : undefined;

              return {
                ...review,
                likes_count:
                  typeof likeCountFromEmbed === 'number'
                    ? likeCountFromEmbed
                    : typeof review.likes_count === 'number'
                      ? review.likes_count
                      : Array.isArray(review.review_likes)
                        ? review.review_likes.length
                        : 0,
              };
            })
          : [];

        setReviews(mapped);
        if (mapped.length > 0) {
          setTotalReviews(mapped.length);
          const sum = mapped.reduce((acc, r) => acc + (r.rating || 0), 0);
          setAverageRating(Math.round((sum / mapped.length) * 10) / 10);
        } else {
          setTotalReviews(0);
          setAverageRating(0);
        }
      });
  }

  useEffect(() => {
    fetchReviews();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params?.id, isReviewOpen]);

  useEffect(() => {
    let isMounted = true;
    supabaseClient.auth.getUser().then(({ data }) => {
      if (isMounted) setUser(data?.user ?? null);
    });
    return () => { isMounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!user) {
      setLikedByReviewId({});
      return;
    }
    const reviewIds = (reviews || []).map((r) => r?.id).filter(Boolean);
    if (!reviewIds.length) {
      setLikedByReviewId({});
      return;
    }

    let cancelled = false;
    supabaseClient
      .from('review_likes')
      .select('review_id')
      .eq('user_id', user.id)
      .in('review_id', reviewIds)
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          // eslint-disable-next-line no-console
          console.error('Error cargando likes:', error);
          return;
        }
        const next: Record<string, boolean> = {};
        for (const row of data || []) {
          if (row?.review_id) next[String(row.review_id)] = true;
        }
        setLikedByReviewId(next);
      });

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, reviews]);

  const handleLike = async (reviewId: string) => {
    if (!user) {
      alert('Debes iniciar sesión para dar like.');
      return;
    }

    const prevLiked = !!likedByReviewId[reviewId];
    setLikedByReviewId((prev) => ({ ...prev, [reviewId]: !prevLiked }));

    try {
      if (!prevLiked) {
        const { error } = await supabaseClient
          .from('review_likes')
          .insert([{ review_id: reviewId, user_id: user.id }]);
        if (error) throw error;
      } else {
        const { error } = await supabaseClient
          .from('review_likes')
          .delete()
          .eq('review_id', reviewId)
          .eq('user_id', user.id);
        if (error) throw error;
      }
    } catch (err) {
      setLikedByReviewId((prev) => ({ ...prev, [reviewId]: prevLiked }));
      // eslint-disable-next-line no-console
      console.error('Error al actualizar el like:', err);
      alert('Hubo un error al actualizar el like.');
    }
  };

  function formatRelativeTime(input: unknown) {
    if (!input) return '';
    const date = new Date(String(input));
    if (Number.isNaN(date.getTime())) return '';

    const diffMs = Date.now() - date.getTime();
    const diffMinutes = Math.max(0, Math.floor(diffMs / 60000));
    if (diffMinutes < 60) return `${diffMinutes}m`;

    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h`;

    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d`;
  }


  // Al montar, buscar el rating previo del usuario para esta canción
  useEffect(() => {
    let cancelled = false;
    async function fetchUserRating() {
      const { data: userData, error: userError } = await supabaseClient.auth.getUser();
      if (userError || !userData?.user) return;
      const user_id = userData.user.id;
      const { data, error } = await supabaseClient
        .from('reviews')
        .select('rating')
        .eq('user_id', user_id)
        .eq('spotify_id', params.id)
        .eq('type', 'song')
        .single();
      if (!cancelled && data && typeof data.rating === 'number') {
        setRating(data.rating);
      }
    }
    fetchUserRating();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params?.id]);

  // Guardado automático de rating
  async function handleQuickRate(val: number) {
    if (val < 0.5 || val > 5 || val % 0.5 !== 0) return;
    setRating(val);
    setIsSaving(true);
    setSaved(false);
    try {
      const { data: userData, error: userError } = await supabaseClient.auth.getUser();
      if (userError || !userData?.user) {
        setIsSaving(false);
        alert('Debes iniciar sesión para calificar.');
        return;
      }
      const user_id = userData.user.id;
      // Usar metadata de la canción
      const songTitle = song?.name || song?.title || '';
      const songArtist = song?.artists?.map((a: any) => a.name).join(', ') || song?.artist || '';
      const songImage = song?.album?.images?.[0]?.url || song?.images?.[0]?.url || null;
      const { error } = await supabaseClient
        .from('reviews')
        .upsert(
          {
            user_id,
            spotify_id: params.id,
            type: 'song',
            rating: val,
            review_text: "",
            spotify_title: songTitle,
            spotify_artist: songArtist,
            spotify_image_url: songImage,
          },
          { onConflict: 'user_id,spotify_id,type' }
        );
      if (error) {
        alert('Error al guardar la calificación.');
      } else {
        setSaved(true);
      }
    } finally {
      setIsSaving(false);
    }
  }

  // Callback para actualizar rating y reviews tras reseña
  const handleReviewSuccess = (newRating: number) => {
    setRating(newRating); // Siempre sincroniza el rating principal
    setUserRating(newRating); // (opcional, si se usa en el modal)
    fetchReviews();
  };

  // Extraer metadata relevante de la canción y fallback si falta info
  let album: any = {};
  let songName = '';
  let artists = '';
  let releaseYear = '';
  let imageUrl = null;
  let albumId = '';
  if (song) {
    album = song.album || {};
    songName = song.name || song.title || 'Sin título';
    artists = song.artists?.map((a: any) => a.name).join(', ') || song.artist || 'Artista desconocido';
    releaseYear = album.release_date ? album.release_date.slice(0, 4) : '';
    imageUrl = album.images?.[0]?.url || song.album?.images?.[0]?.url || song.images?.[0]?.url || null;
    albumId = album.id || '';
  }

  // Handler para compartir
  function handleShare() {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    if (navigator.share) {
      navigator.share({
        title: songName,
        text: `Escuchá esta canción en Bopp: ${songName} - ${artists}`,
        url,
      });
      return;
    }

    // fallback: copiar al portapapeles
    navigator.clipboard.writeText(url);
    alert('Enlace copiado al portapapeles');
  }

  // Navegación rápida entre tracks del álbum
  let currentTrackIndex = -1;
  if (albumTracks && albumTracks.length > 0 && params?.id) {
    currentTrackIndex = albumTracks.findIndex((t) => t.id === params.id);
  }
  const hasPrevious = currentTrackIndex > 0;
  const hasNext = currentTrackIndex >= 0 && currentTrackIndex < albumTracks.length - 1;
  const prevTrackId = hasPrevious ? albumTracks[currentTrackIndex - 1]?.id : null;
  const nextTrackId = hasNext ? albumTracks[currentTrackIndex + 1]?.id : null;
  const goToPreviousTrack = () => {
    if (hasPrevious) {
      const prevId = albumTracks[currentTrackIndex - 1].id;
      router.push(`/song/${prevId}`);
    }
  };
  const goToNextTrack = () => {
    if (hasNext) {
      const nextId = albumTracks[currentTrackIndex + 1].id;
      router.push(`/song/${nextId}`);
    }
  };


  // Handler para extraer color dominante con ColorThief
  async function handleImageLoad() {
    if (!imgRef.current) return;
    try {
      const rgbRaw = await getColor(imgRef.current);
      const rgb = extractRgb(rgbRaw);
      if (!rgb) {
        setDominantColor('#121212');
        setIsBackgroundDark(true);
        return;
      }
      setDominantColor(`rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`);
      setIsBackgroundDark(calcIsDark(rgb));
    } catch {
      setDominantColor('#121212');
      setIsBackgroundDark(true);
    }
  }

  if (isLoading || !song) {
    return (
      <div className="bg-[#121212] min-h-screen flex items-center justify-center text-gray-300 text-xl">
        Cargando vibra...
      </div>
    );
  }

  return (
    <main
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      style={{
        backgroundColor: dominantColor,
        minHeight: '100vh',
        transform: `translateX(${swipeOffset}px)`
      }}
      className={`min-h-screen w-full relative touch-pan-y ${(isBackgroundDark ? 'text-white' : 'text-gray-900')} ${touchStart.x === null ? 'transition-transform duration-300 ease-out' : ''}`}
    >
      {/* Hero Section */}
      <div className="relative w-full h-[50vh]">
        {/* Botones de acción arriba de la portada */}
        <div className="absolute top-0 left-0 w-full p-4 flex items-center justify-between z-10">
          {/* Grupo Izquierdo: Home y Atrás */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push('/inicio')}
              className={`w-10 h-10 flex items-center justify-center rounded-full backdrop-blur-md active:scale-[0.95] transition-all
                ${isBackgroundDark ? 'bg-white/10' : 'bg-black/10'}
              `}
              aria-label="Ir a inicio"
            >
              <FaHome className={`w-4 h-4 opacity-90 ${isBackgroundDark ? 'text-white' : 'text-black'}`} />
            </button>
            <button
              onClick={() => router.back()}
              className={`w-10 h-10 flex items-center justify-center rounded-full backdrop-blur-md active:scale-[0.95] transition-all
                ${isBackgroundDark ? 'bg-white/10' : 'bg-black/10'}
              `}
              aria-label="Volver atrás"
            >
              <FaArrowLeft className={`w-4 h-4 opacity-90 ${isBackgroundDark ? 'text-white' : 'text-black'}`} />
            </button>
          </div>
          {/* Botón Compartir (Derecha) */}
          <button
            onClick={handleShare}
            className={`w-10 h-10 flex items-center justify-center rounded-full backdrop-blur-md active:scale-[0.95] transition-all
              ${isBackgroundDark ? 'bg-white/10' : 'bg-black/10'}
            `}
            aria-label="Compartir"
          >
            <FaShareAlt className={`w-4 h-4 opacity-90 ${isBackgroundDark ? 'text-white' : 'text-black'}`} />
          </button>
        </div>
        {/* Imagen oculta para extracción de color (Hidden Image Hack) */}
        {imageUrl && (
          <img
            src={imageUrl}
            alt="hidden-color-extract"
            crossOrigin="anonymous"
            style={{ display: 'none' }}
            onLoad={async (e) => {
              try {
                const img = e.target as HTMLImageElement;
                if (!img.naturalWidth || !img.naturalHeight) {
                  console.error('ColorThief: imagen sin dimensiones, no se puede extraer color');
                  setDominantColor('#121212');
                  setIsBackgroundDark(true);
                  return;
                }
                const colorRaw = await getColor(img);
                if (!colorRaw) {
                  setDominantColor('#121212');
                  setIsBackgroundDark(true);
                  return;
                }
                const rgb = extractRgb(colorRaw);
                if (rgb) {
                  const [r, g, b] = rgb;
                  setDominantColor(`rgb(${r}, ${g}, ${b})`);
                  const isDarkValue = (r * 0.299 + g * 0.587 + b * 0.114) < 128;
                  setIsBackgroundDark(isDarkValue);
                } else {
                  console.error('ColorThief: valor inesperado extraído', colorRaw);
                  setDominantColor('#121212');
                  setIsBackgroundDark(true);
                }
              } catch (err) {
                if (err instanceof Error && err.message && err.message.includes('crossorigin')) {
                  console.error('ColorThief: error de CORS/canvas tainted. Spotify no envía headers CORS públicos. No es posible extraer color en frontend puro.', err);
                } else {
                  console.error('ColorThief error:', err);
                }
                setDominantColor('#121212');
                setIsBackgroundDark(true);
              }
            }}
          />
        )}
        {/* Imagen visible para el usuario */}
        {imageUrl && (
          <img
            ref={imgRef}
            src={imageUrl}
            alt={songName}
            className="w-full h-full object-cover"
            crossOrigin="anonymous"
          />
        )}
        {/* Blend corto entre portada y fondo */}
        <div
          className="pointer-events-none absolute left-0 bottom-0 w-full z-10"
          style={{
            height: '20%',
            minHeight: '40px',
            maxHeight: '80px',
            background: `linear-gradient(180deg, transparent 0%, ${dominantColor} 100%)`,
          }}
        />
        {/* Título (único elemento superpuesto) */}
        <h1 className={`absolute bottom-0 left-6 text-4xl font-black z-20 ${isBackgroundDark ? 'text-white' : 'text-gray-900'}`}>
          {songName}
        </h1>
      </div>

      {/* Información debajo de la portada (fuera de la imagen) */}
      <div className="px-6 pt-0 flex flex-col items-start">
        <h2 className={`text-lg font-medium mb-0.5 ${isBackgroundDark ? 'text-white' : 'text-gray-900'}`}>
          {artists}
        </h2>

        <div className={`flex items-center gap-2 ${isBackgroundDark ? 'text-white' : 'text-gray-900'}`}>
          <StarRating rating={averageRating} onChange={()=>{}} starSize={20} className="pointer-events-none" />
          <span className="text-sm font-semibold">
            {averageRating.toFixed(1)} • {totalReviews} reseña{totalReviews === 1 ? '' : 's'}
          </span>
        </div>

        {/* Tarjeta de contexto de álbum */}
        {album?.id && album?.name && imageUrl && (
          <>
            <Link
              href={`/album/${album.id}`}
              className={`w-full flex items-center gap-3 mt-6 p-2.5 rounded-xl transition-colors border-2 ${
                isBackgroundDark
                  ? 'border-white/20 hover:bg-white/10'
                  : 'border-black/15 hover:bg-black/5'
              }`}
              style={{ color: 'inherit' }}
            >
              <img
                src={imageUrl}
                alt={album.name}
                className="w-12 h-12 rounded-md object-cover shadow-sm shrink-0"
              />
              <div className="flex flex-col flex-1 min-w-0">
                <span className="text-[10px] font-bold uppercase tracking-wider opacity-60">
                  Aparece en el álbum
                </span>
                <span className="text-sm font-bold truncate opacity-90 mt-0.5">
                  {album.name}
                </span>
              </div>
              <FaChevronRight className="w-4 h-4 opacity-40 shrink-0 ml-2" />
            </Link>
            {/* Barra de navegación de tracks */}
            {albumTracks.length > 1 && currentTrackIndex !== -1 && (
              <div className="flex items-center justify-between w-full gap-3 mt-3">
                <button
                  onClick={goToPreviousTrack}
                  disabled={!hasPrevious}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[13px] font-bold transition-all border-2 ${
                    isBackgroundDark ? 'border-white/20' : 'border-black/15'
                  } ${
                    hasPrevious
                      ? `${isBackgroundDark ? 'hover:bg-white/10' : 'hover:bg-black/5'} opacity-80 hover:opacity-100 active:scale-[0.98]`
                      : 'opacity-30 cursor-not-allowed'
                  }`}
                >
                  <FaChevronLeft className="w-3 h-3" />
                  Anterior
                </button>
                <button
                  onClick={goToNextTrack}
                  disabled={!hasNext}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[13px] font-bold transition-all border-2 ${
                    isBackgroundDark ? 'border-white/20' : 'border-black/15'
                  } ${
                    hasNext
                      ? `${isBackgroundDark ? 'hover:bg-white/10' : 'hover:bg-black/5'} opacity-80 hover:opacity-100 active:scale-[0.98]`
                      : 'opacity-30 cursor-not-allowed'
                  }`}
                >
                  Siguiente
                  <FaChevronRight className="w-3 h-3" />
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Zona de Reseña */}
      <div className="px-6 pt-8 pb-4 flex flex-col items-center">
        <div className={`text-sm mb-2 text-center ${isBackgroundDark ? 'text-white' : 'text-gray-900'}`}>
          ¿Qué te pareció esta canción?
        </div>
        <div className="flex gap-3 mb-0 items-center justify-center relative">
          <StarRating
            rating={rating}
            onChange={val => handleQuickRate(val)}
            starSize={36}
            className={isSaving ? 'opacity-50 pointer-events-none' : ''}
          />
          {isSaving && (
            <span className="absolute -right-8 top-1/2 -translate-y-1/2">
              <svg className={`animate-spin h-5 w-5 ${isBackgroundDark ? 'text-white' : 'text-gray-900'}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
              </svg>
            </span>
          )}
        </div>
        {saved && !isSaving && (
          <div className={`text-xs mt-1 text-center ${isBackgroundDark ? 'text-white' : 'text-gray-900'}`}>
            ¡Guardado!
          </div>
        )}
        <button
          className={`mt-6 py-3 px-6 text-sm font-bold rounded-full shadow-md transition-opacity mb-8 ${isBackgroundDark ? 'bg-white text-black hover:bg-gray-100' : 'bg-black text-white hover:bg-gray-900'} ${hasUserRating ? 'opacity-100' : 'opacity-50'}`}
          onClick={() => setIsReviewOpen(true)}
          disabled={!hasUserRating}
        >
          Añadir Reseña (opcional)
        </button>
      </div>

      {/* Feed Inferior */}
      <div className="px-6 pb-8">
        <h3 className={`text-base font-semibold mb-4 ${isBackgroundDark ? 'text-white' : 'text-gray-900'}`}>
          Reseñas
        </h3>
        <div className="flex flex-col">
          {reviews.map((review, idx) => {
            const displayName = review.profiles?.full_name || review.profiles?.username || 'Usuario';
            const profileUsername = review.profiles?.username ? String(review.profiles.username) : '';
            const time = formatRelativeTime(review.created_at);
            const ratingValue = typeof review.rating === 'number' ? review.rating : 0;
            const reviewId = String(review.id);
            const isLiked = !!likedByReviewId[reviewId];
            const likesCount = typeof review.likes_count === 'number' ? review.likes_count : Number(review.likes_count) || 0;
            const hasText = Boolean(String(review.review_text || '').trim());

            const textPrimary = isBackgroundDark ? 'text-white' : 'text-gray-900';
            const textSecondary = isBackgroundDark ? 'text-white/60' : 'text-gray-500';
            const borderColor = isBackgroundDark ? 'border-white/10' : 'border-black/10';
            const heartInactive = isBackgroundDark
              ? 'text-white/50 group-hover:text-white'
              : 'text-gray-400 group-hover:text-gray-900';
            const heartActive = isBackgroundDark ? 'text-white' : 'text-gray-900';

            const avatar = review.profiles?.avatar_url ? (
              <img
                src={review.profiles.avatar_url}
                alt={displayName}
                className="w-10 h-10 rounded-full object-cover border border-black/5"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-black/5" />
            );

            return (
              <div
                key={review.id ?? `${review.user_id ?? 'u'}-${idx}`}
                className={`flex gap-3 py-4 border-b w-full last:border-0 items-start ${borderColor}`}
              >
                {profileUsername ? (
                  <Link href={`/${profileUsername}`} className="shrink-0">
                    {avatar}
                  </Link>
                ) : (
                  <div className="shrink-0">{avatar}</div>
                )}

                <div className="flex flex-col flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5 min-w-0">
                    <span className={`font-bold text-[14.5px] truncate ${textPrimary}`}>{displayName}</span>
                    {time ? <span className={`text-[13px] ${textSecondary}`}>{time}</span> : null}
                  </div>

                  <div className="flex items-center justify-between mt-0.5">
                    <StarRating rating={ratingValue} onChange={()=>{}} starSize={14} className="pointer-events-none" />

                    {!hasText ? (
                      <button
                        type="button"
                        onClick={() => handleLike(reviewId)}
                        className="flex items-center gap-1.5 group"
                        aria-label={isLiked ? 'Quitar like' : 'Dar like'}
                      >
                        {isLiked ? (
                          <FaHeart className={`w-[17px] h-[17px] ${heartActive}`} />
                        ) : (
                          <FaRegHeart className={`w-[17px] h-[17px] ${heartInactive}`} />
                        )}
                        <span className={`text-[13px] ${textSecondary}`}>{likesCount}</span>
                      </button>
                    ) : null}
                  </div>

                  {hasText ? (
                    <p className={`text-[14.5px] leading-relaxed mt-1.5 ${isBackgroundDark ? 'text-white/90' : 'text-gray-800'}`}>
                      {review.review_text}
                    </p>
                  ) : null}

                  {hasText ? (
                    <div className="flex justify-end mt-2">
                      <button
                        type="button"
                        onClick={() => handleLike(reviewId)}
                        className="flex items-center gap-1.5 group"
                        aria-label={isLiked ? 'Quitar like' : 'Dar like'}
                      >
                        {isLiked ? (
                          <FaHeart className={`w-[17px] h-[17px] ${heartActive}`} />
                        ) : (
                          <FaRegHeart className={`w-[17px] h-[17px] ${heartInactive}`} />
                        )}
                        <span className={`text-[13px] ${textSecondary}`}>{likesCount}</span>
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <ReviewModal
        isOpen={isReviewOpen}
        onClose={() => setIsReviewOpen(false)}
        onReviewSuccess={handleReviewSuccess}
        type="song"
        title={songName}
        artist={artists}
        rating={rating}
        setRating={setRating}
        spotifyId={song.id}
        spotifyImageUrl={song?.album?.images?.[0]?.url || song?.images?.[0]?.url || ''}
      />
    </main>
  )
}
