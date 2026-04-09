
'use client';
import BottomNav from "@/components/BottomNav";


import { useEffect, useState } from 'react'
import { supabase } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { FaSearch, FaRegStar, FaStar, FaStarHalfAlt } from 'react-icons/fa'

import { MdTouchApp } from 'react-icons/md'
import { BsMusicNoteBeamed } from 'react-icons/bs'
import QuickRateCarousel, { QuickRateItem } from '@/components/QuickRateCarousel'

type FeedItem = {
  id: string
  title: string
  artist: string
  image: string
  spotifyUrl?: string
  type: 'album' | 'track'
}

type SpotifyData = {
  calificacionVeloz: QuickRateItem[]
  tendencias: FeedItem[]
}


export default function InicioPage() {
  const [data, setData] = useState<SpotifyData | null>(null)
  const [loading, setLoading] = useState(true)
  const [trendStats, setTrendStats] = useState<Record<string, { average: number, total: number }>>({});
  const router = useRouter();

  // Fetch de datos de Spotify
  useEffect(() => {
    fetch('/api/spotify')
      .then(res => res.json())
      .then(setData)
      .finally(() => setLoading(false))
  }, [])

  // Fetch de stats de reviews para tendencias
  useEffect(() => {
    async function fetchAllStats() {
      if (!data?.tendencias) return;
      const ids = data.tendencias.map(item => item.id);
      if (ids.length === 0) return;
      const { data: reviews, error } = await supabase
        .from('reviews')
        .select('spotify_id, rating');
      // Agrupar reviews por spotify_id
      const stats: Record<string, { average: number, total: number }> = {};
      ids.forEach(id => {
        const filtered = (reviews || []).filter(r => r.spotify_id === id);
        const total = filtered.length;
        const average = total > 0 ? Math.round((filtered.reduce((acc, r) => acc + (r.rating || 0), 0) / total) * 10) / 10 : 0;
        stats[id] = { average, total };
      });
      setTrendStats(stats);
    }
    fetchAllStats();
  }, [data?.tendencias]);

  // Handler para abrir buscar
  const handleSearchFocus = (e: React.FocusEvent<HTMLInputElement> | React.MouseEvent<HTMLInputElement>) => {
    e.preventDefault();
    router.push('/buscar');
  };

  // --- INICIO DEL RETURN DEL COMPONENTE ---
  return (
    <div className="bg-white min-h-screen">
      {/* Search */}
      <div className="flex justify-center px-4 mb-6 mt-6">
        <div className="relative w-full max-w-xl">
          <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="*Busca un álbum, artista o canción..."
            className="w-full pl-12 pr-4 py-3 rounded-full bg-gray-100 text-base outline-none placeholder:text-gray-400 cursor-pointer"
            onFocus={handleSearchFocus}
            onClick={handleSearchFocus}
            readOnly
          />
        </div>
      </div>

      {/* Calificación veloz */}
      <SectionHeader title="Calificación veloz" link="Ver más >" />
      <div className="mb-8">
        {loading && (
          <div className="flex gap-4 px-2">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="min-w-[75%] md:min-w-[60%] snap-center bg-gray-100 rounded-2xl p-4 flex flex-col items-center animate-pulse">
                <div className="w-40 h-40 rounded-xl bg-gray-200 mb-4" />
                <div className="h-5 w-32 bg-gray-200 rounded mb-2" />
                <div className="h-4 w-24 bg-gray-100 rounded mb-3" />
                <div className="flex gap-2 mt-2">
                  {[...Array(5)].map((_, j) => (
                    <div key={j} className="w-8 h-8 rounded-full bg-gray-200" />
                  ))}
                </div>
                <div className="h-10 w-36 bg-gray-200 rounded-full mt-4" />
              </div>
            ))}
          </div>
        )}
        {!loading && (data?.calificacionVeloz?.length || 0) > 0 && (
          <QuickRateCarousel items={data?.calificacionVeloz ?? []} />
        )}
        {!loading && (data?.calificacionVeloz?.length || 0) === 0 && (
          <div className="text-center text-gray-400 py-8">No se encontraron canciones.</div>
        )}
      </div>

      {/* Tendencias de la semana */}
      <SectionHeader title="Tendencias de la semana" link="Ver más >" />
      <div className="overflow-x-auto scrollbar-hide flex gap-4 px-4 pb-4">
        {loading && (
          <div className="text-center text-gray-400 py-8">Cargando vibra...</div>
        )}
        {!loading && data?.tendencias?.map((item, i) => {
          const stats = trendStats[item.id] || { average: 0, total: 0 };
          function renderStars() {
            const stars = [];
            for (let j = 1; j <= 5; j++) {
              if (stats.average >= j) {
                stars.push(<FaStar key={j} className="text-[#FB3C4C]" size={14} />);
              } else if (stats.average >= j - 0.7) {
                stars.push(<FaStarHalfAlt key={j} className="text-[#FB3C4C]" size={14} />);
              } else {
                stars.push(<FaRegStar key={j} className="text-gray-200" size={14} />);
              }
            }
            return stars;
          }
          return (
            <Link
              key={`${item.id}-${item.type}-${i}`}
              href={`/${item.type === 'track' ? 'song' : 'album'}/${item.id}`}
              className="shrink-0 w-36"
            >
              <div className="w-36 h-36 rounded-2xl overflow-hidden mb-2 bg-gray-100">
                <img
                  src={item.image}
                  alt={item.title}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="truncate font-semibold text-black">{item.title}</div>
              <div className="truncate text-sm text-gray-500">{item.artist}</div>
              <div className="flex items-center gap-1 mt-1">
                {renderStars()}
                <span className="ml-1 text-sm text-black">{stats.average.toFixed(1)}</span>
              </div>
              <div className="text-xs text-gray-400">{stats.total === 0 ? '- reviews' : stats.total === 1 ? '1 review' : `${stats.total} reviews`}</div>
            </Link>
          );
        })}
      </div>
      <BottomNav />
    </div>
  );
}

function SectionHeader({ title, link }: { title: string; link: string }) {
  return (
    <div className="flex items-center justify-between px-4 mb-2 mt-6">
      <h2 className="text-xl font-bold text-black">{title}</h2>
      <a href="#" className="text-red-500 text-sm font-medium hover:underline">
        {link}
      </a>
    </div>
  )
}
