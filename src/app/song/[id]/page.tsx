
'use client'


import { useParams } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { getColor } from 'colorthief';
import { FaHeart, FaRegHeart } from 'react-icons/fa'
// import duplicado eliminado
import StarRating from '@/components/StarRating';
import { createBrowserClient } from '@supabase/ssr';
import ReviewModal from '@/components/ReviewModal';
import type { User } from '@supabase/supabase-js'


export default function SongPage() {
  const params = useParams();
  const [song, setSong] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [rating, setRating] = useState(0);
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

  // Fetch song info
  useEffect(() => {
    if (!params?.id) return;
    setIsLoading(true);
    fetch(`/api/spotify/song/${params.id}`)
      .then(res => res.json())
      .then(data => setSong(data))
      .finally(() => setIsLoading(false));
  }, [params?.id]);

  // Fetch reviews reales de Supabase y calcular promedio/cantidad
  useEffect(() => {
    if (!params?.id) return;
    supabaseClient
      .from('reviews')
      .select('*, rating, profiles(username, full_name, avatar_url)')
      .eq('spotify_id', params.id)
      .eq('type', 'song')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setReviews(data || []);
        if (data && data.length > 0) {
          setTotalReviews(data.length);
          const sum = data.reduce((acc, r) => acc + (r.rating || 0), 0);
          setAverageRating(Math.round((sum / data.length) * 10) / 10);
        } else {
          setTotalReviews(0);
          setAverageRating(0);
        }
      });
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
    if (diffMinutes < 60) return `hace ${diffMinutes}m`;

    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `hace ${diffHours}h`;

    const diffDays = Math.floor(diffHours / 24);
    return `hace ${diffDays}d`;
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



  // Extraer metadata relevante de la canción y fallback si falta info
  let album: any = {};
  let songName = '';
  let artists = '';
  let releaseYear = '';
  let imageUrl = null;
  if (song) {
    album = song.album || {};
    songName = song.name || song.title || 'Sin título';
    artists = song.artists?.map((a: any) => a.name).join(', ') || song.artist || 'Artista desconocido';
    releaseYear = album.release_date ? album.release_date.slice(0, 4) : '';
    imageUrl = album.images?.[0]?.url || song.album?.images?.[0]?.url || song.images?.[0]?.url || null;
  }


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
    <div
      className={"min-h-screen relative " + (isBackgroundDark ? 'text-white' : 'text-gray-900')}
      style={{ backgroundColor: dominantColor, minHeight: '100vh' }}
    >
      {/* Hero Section */}
      <div className="relative w-full h-[50vh]">
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
            const handle = review.profiles?.username ? `@${review.profiles.username}` : '';
            const time = formatRelativeTime(review.created_at);
            const ratingValue = typeof review.rating === 'number' ? review.rating : 0;
            const reviewId = String(review.id);
            const isLiked = !!likedByReviewId[reviewId];

            return (
              <div
                key={review.id ?? `${review.user_id ?? 'u'}-${idx}`}
                className="flex flex-row gap-3 py-4 border-b border-black/10"
              >
                {review.profiles?.avatar_url ? (
                  <img
                    src={review.profiles.avatar_url}
                    alt={displayName}
                    className="w-10 h-10 rounded-full shrink-0 object-cover bg-black/5"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full shrink-0 object-cover bg-black/5" />
                )}

                <div className="flex flex-col flex-1 min-w-0">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-sm font-bold text-current truncate">{displayName}</span>
                    <span className="text-[11px] text-current opacity-80 truncate">
                      {handle}
                      {time ? ` • ${time}` : ''}
                    </span>
                  </div>

                  <div className="flex items-center justify-between mt-1">
                    <StarRating rating={ratingValue} onChange={()=>{}} starSize={14} className="pointer-events-none" />

                    <div
                      className={`flex items-center gap-1 text-xs text-current transition-opacity cursor-pointer p-1 -mr-1 hover:opacity-80 ${isLiked ? 'opacity-100' : 'opacity-70'}`}
                      onClick={() => handleLike(reviewId)}
                      aria-label={isLiked ? 'Quitar like' : 'Dar like'}
                      role="button"
                      tabIndex={0}
                    >
                      {isLiked ? <FaHeart /> : <FaRegHeart />}
                    </div>
                  </div>

                  <div className="text-sm text-current leading-snug mt-1.5 w-full wrap-break-word">
                    {review.review_text || ''}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <ReviewModal
        isOpen={isReviewOpen}
        onClose={() => setIsReviewOpen(false)}
        type="song"
        title={songName}
        artist={artists}
        rating={rating}
        setRating={setRating}
        spotifyId={song.id}
        spotifyImageUrl={song?.album?.images?.[0]?.url || song?.images?.[0]?.url || ''}
      />
    </div>
  )
}
