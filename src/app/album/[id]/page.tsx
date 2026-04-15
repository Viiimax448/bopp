'use client'


import { FaRegHeart, FaHeart, FaChevronRight } from 'react-icons/fa'
import StarRating from '@/components/StarRating';
import { useParams } from 'next/navigation'
import { useEffect, useState, useRef } from 'react'
import { getColor } from 'colorthief';
import { createBrowserClient } from '@supabase/ssr';
import ReviewModal from '@/components/ReviewModal'
import type { User } from '@supabase/supabase-js'



export default function AlbumPage() {
  // Fondo dinámico
  const [dominantColor, setDominantColor] = useState('#121212');
  const [isBackgroundDark, setIsBackgroundDark] = useState(true);
  const imgRef = useRef<HTMLImageElement>(null);

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
  const params = useParams();
  const [album, setAlbum] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [reviews, setReviews] = useState<any[]>([]);
  const [averageRating, setAverageRating] = useState(0);
  const [totalReviews, setTotalReviews] = useState(0);
  const [trackStats, setTrackStats] = useState<Record<string, { average: number, count: number }>>({});

  const [user, setUser] = useState<User | null>(null);
  const [likedByReviewId, setLikedByReviewId] = useState<Record<string, boolean>>({});

  const hasUserRating = rating > 0;

  const supabaseClient = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

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

  // Fetch álbum info
  useEffect(() => {
    if (!params?.id) return;
    setIsLoading(true);
    console.log('Haciendo fetch a Spotify API...');
    fetch(`/api/spotify/album/${params.id}`)
      .then(res => res.json())
      .then(async (albumData) => {
        setAlbum(albumData);
        // Bulk fetch de stats de tracks
        if (albumData?.tracks?.items?.length) {
          const trackIds = albumData.tracks.items.map((t: any) => t.id);
          const supabase = createBrowserClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
          );
          const { data: trackReviews } = await supabase
            .from('reviews')
            .select('spotify_id, rating')
            .in('spotify_id', trackIds);
          // Procesar stats
          const stats: Record<string, { average: number, count: number }> = {};
          if (trackReviews && Array.isArray(trackReviews)) {
            for (const id of trackIds) {
              const reviews = trackReviews.filter(r => r.spotify_id === id);
              if (reviews.length > 0) {
                const sum = reviews.reduce((acc, r) => acc + (r.rating || 0), 0);
                stats[id] = {
                  average: Math.round((sum / reviews.length) * 10) / 10,
                  count: reviews.length
                };
              }
            }
          }
          setTrackStats(stats);
        } else {
          setTrackStats({});
        }
      })
      .finally(() => setIsLoading(false));
  }, [params?.id]);

  // Fetch reviews reales de Supabase y calcular promedio/cantidad
  useEffect(() => {
    if (!params?.id) return;
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    supabase
      .from('reviews')
      .select('*, rating, profiles(username, full_name, avatar_url)')
      .eq('spotify_id', params.id)
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
  }, [params?.id, isReviewOpen]);

  // Al montar, buscar el rating previo del usuario para este album
  useEffect(() => {
    let cancelled = false;
    async function fetchUserRating() {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData?.user) return;
      const user_id = userData.user.id;
      const { data, error } = await supabase
        .from('reviews')
        .select('rating')
        .eq('user_id', user_id)
        .eq('spotify_id', params.id)
        .eq('type', 'album')
        .single();
      if (!cancelled && data && typeof data.rating === 'number') {
        setRating(data.rating);
      }
    }
    fetchUserRating();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params?.id]);

  if (isLoading || !album) {
    return (
      <div className="bg-[#121212] min-h-screen flex items-center justify-center text-gray-300 text-xl">
        Cargando vibra...
      </div>
    );
  }

  // Guardado automático de rating
  async function handleQuickRate(val: number) {
    if (typeof val !== 'number' || val < 1 || val > 5) {
      alert('La calificación debe ser entre 1 y 5.');
      return;
    }
    setRating(val);
    setIsSaving(true);
    setSaved(false);
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData?.user) {
        setIsSaving(false);
        alert('Debes iniciar sesión para calificar.');
        return;
      }
      const user_id = userData.user.id;
      // Usar metadata del álbum
      const albumTitle = album?.name || album?.title || '';
      const albumArtist = album?.artists?.map((a: any) => a.name).join(', ') || album?.artist || '';
      const albumImage = album?.images?.[0]?.url || null;
      const payload: any = {
        user_id,
        spotify_id: params.id,
        type: 'album',
        rating: val,
        spotify_title: albumTitle,
        spotify_artist: albumArtist,
        spotify_image_url: albumImage,
      };
      // No enviar review_text si está vacío
      if (typeof album?.review_text === 'string' && album.review_text.trim().length > 0) {
        payload.review_text = album.review_text;
      }
      const { error } = await supabase
        .from('reviews')
        .upsert([payload], { onConflict: 'user_id,spotify_id,type' });
      if (error) {
        alert('Error al guardar la calificación.');
      } else {
        setSaved(true);
      }
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <>
      <div className={"min-h-screen relative " + (isBackgroundDark ? 'text-white' : 'text-gray-900')}
        style={{ backgroundColor: dominantColor, minHeight: '100vh' }}>
        {/* Hero Section */}
        <div className="relative w-full h-[50vh]">
          {/* Imagen oculta para extracción de color (Hidden Image Hack) */}
          {album.images?.[0]?.url && (
            <img
              src={album.images[0].url}
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
          {album.images?.[0]?.url && (
            <img
              ref={imgRef}
              src={album.images[0].url}
              alt={album.name}
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

          {/* Título del álbum (único elemento superpuesto) */}
          <h1 className={`absolute bottom-0 left-6 text-4xl font-black z-20 ${isBackgroundDark ? 'text-white' : 'text-gray-900'}`}>
            {album.name}
          </h1>
        </div>

        {/* Información debajo de la portada (fuera de la imagen) */}
        <div className="px-6 pt-0 flex flex-col items-start">
          <h2 className={`text-lg font-medium mb-0.5 ${isBackgroundDark ? 'text-white' : 'text-gray-900'}`}>
            {album.artists?.[0]?.name}
          </h2>

          <div className={`flex items-center gap-2 ${isBackgroundDark ? 'text-white' : 'text-gray-900'}`}>
              <StarRating rating={averageRating} onChange={()=>{}} starSize={20} className="pointer-events-none" />
            <span className="text-sm font-semibold">
              {averageRating.toFixed(1)} • {totalReviews} reseña{totalReviews === 1 ? '' : 's'}
            </span>
          </div>
        </div>

        {/* Zona de Calificación */}
        <div className="px-6 pt-8 pb-4 flex flex-col items-center">
          <div className={`text-sm mb-2 text-center ${isBackgroundDark ? 'text-white' : 'text-gray-900'}`}>
            ¿Qué te pareció este álbum?
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

          {/* Lista de canciones del álbum */}
          {album.tracks?.items?.length > 0 && (
            <div className="mt-2 divide-y divide-gray-700 w-full">
              {album.tracks.items.map((track: any) => {
                const stats = trackStats[track.id];
                return (
                  <a
                    key={track.id}
                    href={`/song/${track.id}`}
                    className={`flex items-center px-4 py-3 hover:bg-[#232323] transition rounded`}
                  >
                    <div className="flex flex-col flex-1 min-w-0">
                      <span className={`font-medium text-base truncate ${isBackgroundDark ? 'text-white' : 'text-gray-900'}`}>{track.name}</span>
                      <span className={`text-xs truncate ${isBackgroundDark ? 'text-white/70' : 'text-gray-700'}`}>{track.artists.map((a: any) => a.name).join(', ')}</span>
                    </div>
                    {stats && stats.count > 0 && (
                      <div className={`flex items-center gap-1 ml-2 text-sm ${isBackgroundDark ? 'text-white' : 'text-gray-900'}`}>

                        <span className={`font-bold ${isBackgroundDark ? 'text-white/90' : 'text-gray-900/90'}`}>{stats.average}</span>
                        <span className={`${isBackgroundDark ? 'text-white/50' : 'text-gray-700'} text-xs`}>({stats.count})</span>
                      </div>
                    )}
                    <FaChevronRight className={`ml-3 text-lg ${isBackgroundDark ? 'text-white/60' : 'text-gray-700'}`} />
                  </a>
                );
              })}
            </div>
          )}
        </div>

        {/* Feed Inferior */}
        <div className="px-6 pb-8">
          <h3 className={`text-base font-semibold mb-4 ${isBackgroundDark ? 'text-white' : 'text-gray-900'}`}>Reseñas</h3>
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
      </div>
      <ReviewModal
        isOpen={isReviewOpen}
        onClose={() => setIsReviewOpen(false)}
        type="album"
        title={album.name}
        artist={album.artists?.[0]?.name || ''}
        rating={rating}
        setRating={setRating}
        spotifyId={album.id}
        spotifyImageUrl={album.images?.[0]?.url || ''}
      />
    </>
  )
}
