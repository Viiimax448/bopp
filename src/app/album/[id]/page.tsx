'use client'


import { FaArrowLeft, FaEllipsisH, FaRegStar, FaStar, FaStarHalfAlt, FaChevronRight } from 'react-icons/fa'
import { useParams } from 'next/navigation'
import { useEffect, useState, useRef } from 'react'
import { getColor } from 'colorthief';
import { createBrowserClient } from '@supabase/ssr';
import ReviewModal from '@/components/ReviewModal'



export default function AlbumPage() {
  // Fondo dinámico
  const [dominantColor, setDominantColor] = useState('#121212');
  const [isBackgroundDark, setIsBackgroundDark] = useState(true);
  const imgRef = useRef<HTMLImageElement>(null);

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

  // Fetch álbum info
  useEffect(() => {
    if (!params?.id) return;
    setIsLoading(true);
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
    if (val < 1 || val > 5) return;
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
      const { error } = await supabase
        .from('reviews')
        .upsert(
          {
            user_id,
            spotify_id: params.id,
            type: 'album',
            rating: val,
            review_text: "",
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
                  const img = e.target;
                  if (!img.naturalWidth || !img.naturalHeight) {
                    console.error('ColorThief: imagen sin dimensiones, no se puede extraer color');
                    setDominantColor('#121212');
                    setIsBackgroundDark(true);
                    return;
                  }
                  // @ts-ignore
                  const color = await getColor(img);
                  // Extracción defensiva de canales
                  const r = color?._r ?? color?.[0];
                  const g = color?._g ?? color?.[1];
                  const b = color?._b ?? color?.[2];
                  if ([r, g, b].every((v) => typeof v === 'number' && !isNaN(v))) {
                    setDominantColor(`rgb(${r}, ${g}, ${b})`);
                    let isDarkValue;
                    if (typeof color.isDark === 'boolean') {
                      isDarkValue = color.isDark;
                    } else if (typeof color.isDark === 'function') {
                      isDarkValue = color.isDark();
                    } else {
                      isDarkValue = (r * 0.299 + g * 0.587 + b * 0.114) < 128;
                    }
                    setIsBackgroundDark(isDarkValue);
                  } else {
                    console.error('ColorThief: valor inesperado extraído', color);
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
          {/* Header - Botones blur semitransparente */}
          <div className="absolute top-4 left-0 w-full flex justify-between items-center px-4 z-10">
            <button
              className={`w-10 h-10 flex items-center justify-center rounded-full backdrop-blur-sm transition-colors duration-200 ${isBackgroundDark ? 'bg-white/20' : 'bg-black/10'}`}
              aria-label="Volver"
              onClick={() => window.history.back()}
            >
              <FaArrowLeft size={20} className={isBackgroundDark ? 'text-white' : 'text-gray-900'} />
            </button>
            <button
              className={`w-10 h-10 flex items-center justify-center rounded-full backdrop-blur-sm transition-colors duration-200 ${isBackgroundDark ? 'bg-white/20' : 'bg-black/10'}`}
              aria-label="Menú"
            >
              <FaEllipsisH size={20} className={isBackgroundDark ? 'text-white' : 'text-gray-900'} />
            </button>
          </div>
          {/* Títulos */}
          <div className="absolute bottom-0 left-0 w-full px-6 pb-6 z-20">
            <h1 className={`text-4xl font-extrabold mb-2 drop-shadow-md ${isBackgroundDark ? 'text-white' : 'text-gray-900'}`}>{album.name}</h1>
            <h2 className={`text-lg font-medium mb-1 drop-shadow-md ${isBackgroundDark ? 'text-white' : 'text-gray-900'}`}>{album.artists?.[0]?.name}</h2>
            {/* Promedio global de estrellas y cantidad de reseñas */}
            <div className={`flex items-center gap-2 mt-2 ${isBackgroundDark ? 'text-white' : 'text-gray-900'}`}>
              {/* Estrellas visuales promedio */}
              {(() => {
                const stars = [];
                let avg = averageRating;
                for (let i = 1; i <= 5; i++) {
                  if (avg >= i) {
                    stars.push(<FaStar key={i} className="text-base text-current" />);
                  } else if (avg >= i - 0.5) {
                    stars.push(<FaStarHalfAlt key={i} className="text-base text-current" />);
                  } else {
                    stars.push(<FaRegStar key={i} className="text-base text-current" />);
                  }
                }
                return stars;
              })()}
              <span className="font-semibold text-base">{averageRating.toFixed(1)}</span>
              <span className="text-sm">• {totalReviews} reseña{totalReviews === 1 ? '' : 's'}</span>
            </div>
          </div>
        </div>

        {/* Zona de Reseña */}
        <div className="px-6 pt-8 pb-4">
          <div className={`text-sm mb-2 ${isBackgroundDark ? 'text-white' : 'text-gray-900'}`}>¿Qué te pareció este álbum?</div>
          <div className="flex gap-3 mb-6 items-center relative">
            {[1,2,3,4,5].map((i) => (
              <button
                key={i}
                type="button"
                className="focus:outline-none"
                onClick={() => handleQuickRate(i)}
                aria-label={`Calificar ${i} estrella${i > 1 ? 's' : ''}`}
                disabled={isSaving}
              >
                {rating >= i ? (
                  <FaStar size={36} className={`${isBackgroundDark ? 'text-white' : 'text-gray-900'} ${isSaving ? 'opacity-50' : ''}`} />
                ) : (
                  <FaRegStar size={36} className={`${isBackgroundDark ? 'text-white/40' : 'text-gray-400'} ${isSaving ? 'opacity-50' : ''}`} />
                )}
              </button>
            ))}
            {isSaving && (
              <span className="absolute -right-8 top-1/2 -translate-y-1/2">
                <svg className={`animate-spin h-5 w-5 ${isBackgroundDark ? 'text-white' : 'text-gray-900'}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                </svg>
              </span>
            )}
            {saved && !isSaving && <span className="text-xs text-green-500 ml-2">¡Guardado!</span>}
          </div>
          <button
            className={`w-full py-4 text-lg font-bold rounded-full shadow-md transition mb-8 ${isBackgroundDark ? 'bg-white text-black hover:bg-gray-100' : 'bg-black text-white hover:bg-gray-900'}`}
            onClick={() => setIsReviewOpen(true)}
          >
            Añadir Reseña (280 ch)
          </button>

          {/* Lista de canciones del álbum */}
          {album.tracks?.items?.length > 0 && (
            <div className="mt-2 divide-y divide-gray-700">
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
                        <FaStar className="text-sm text-current" />
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
          <div className="flex flex-col gap-4">
            {reviews.map((review, idx) => (
              <div
                key={idx}
                className={`rounded-2xl p-4 flex gap-4 items-start backdrop-blur-md ${isBackgroundDark ? 'bg-white/10' : 'bg-black/80'}`}
              >
                {review.profiles?.avatar_url ? (
                  <img
                    src={review.profiles.avatar_url}
                    alt={review.profiles.full_name || review.profiles.username || 'Usuario'}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-black/40 flex items-center justify-center text-xl font-bold text-white select-none">
                    {(review.profiles?.full_name || review.profiles?.username || 'U').charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="flex-1 flex flex-col">
                  {/* Fila 1: Usuario */}
                  <div className="flex items-center mb-0.5">
                    <span className="font-bold text-white">{review.profiles?.full_name || review.profiles?.username || 'Usuario'}</span>
                    {review.profiles?.username && (
                      <span className="text-gray-300 text-sm ml-1">@{review.profiles.username}</span>
                    )}
                  </div>
                  {/* Fila 2: Estrellas */}
                  <div className="flex items-center gap-1 mt-1">
                    {[...Array(5)].map((_, i) =>
                      i < review.rating ? (
                        <FaStar key={i} size={16} className="text-[#FB3C4C]" />
                      ) : (
                        <FaStar key={i} size={16} className="text-[#FB3C4C]/30" />
                      )
                    )}
                  </div>
                  {/* Fila 3: Texto de la reseña */}
                  <div className="text-white text-sm mt-2">{review.review_text || ''}</div>
                </div>
              </div>
            ))}
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
      />
    </>
  )
}
