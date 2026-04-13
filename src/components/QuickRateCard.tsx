"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { FaStar, FaRegStar, FaStarHalfAlt } from "react-icons/fa";
import { createBrowserClient } from '@supabase/ssr';
function useReviewStats(spotifyId: string) {
  const [average, setAverage] = useState(0);
  const [total, setTotal] = useState(0);
  useEffect(() => {
    let cancelled = false;
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    async function fetchStats() {
      const { data, error } = await supabase
        .from('reviews')
        .select('rating')
        .eq('spotify_id', spotifyId);
      if (!cancelled && data) {
        setTotal(data.length);
        if (data.length > 0) {
          const sum = data.reduce((acc, r) => acc + (r.rating || 0), 0);
          setAverage(Math.round((sum / data.length) * 10) / 10);
        } else {
          setAverage(0);
        }
      }
    }
    fetchStats();
    return () => { cancelled = true; };
  }, [spotifyId]);
  return { average, total };
}
import type { QuickRateItem } from "./QuickRateCarousel";

interface QuickRateCardProps {
  item: QuickRateItem;
  onOpenModal: (item: QuickRateItem, rating: number) => void;
}


export default function QuickRateCard({ item, onOpenModal }: QuickRateCardProps) {
  const { average, total } = useReviewStats(item.id);
  const [currentRating, setCurrentRating] = useState(0);
  const [showButton, setShowButton] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Al montar, buscar el rating previo del usuario para este item
  useEffect(() => {
    let cancelled = false;
    let didRequest = false;
    async function fetchUserRating() {
      if (didRequest) return;
      didRequest = true;
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      try {
        const { data: userData, error: userError } = await supabase.auth.getUser();
        if (userError || !userData?.user) return;
        const user_id = userData.user.id;
        const { data, error } = await supabase
          .from('reviews')
          .select('rating')
          .eq('user_id', user_id)
          .eq('spotify_id', item.id)
          .eq('type', item.type === 'track' ? 'song' : 'album')
          .single();
        if (!cancelled && data && typeof data.rating === 'number') {
          setCurrentRating(data.rating);
          setShowButton(true);
        }
      } catch (e) {
        // Silenciar error de lock robado
      }
    }
    fetchUserRating();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.id, item.type]);

  // Guardado automático de rating
  async function handleRating(value: number) {
    if (value < 1 || value > 5) return;
    setCurrentRating(value);
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
      // Guardar rating con review_text null (permitido), nunca guardar si no hay estrella
      const { error } = await supabase
        .from('reviews')
        .upsert(
          {
            user_id,
            spotify_id: item.id,
            type: item.type === 'track' ? 'song' : 'album',
            rating: value,
            review_text: "",
          },
          { onConflict: 'user_id,spotify_id,type' }
        );
      if (error) {
        alert('Error al guardar la calificación.');
      } else {
        setShowButton(true);
        setSaved(true);
      }
    } finally {
      setIsSaving(false);
    }
  }

  // Renderizado de estrellas promedio
  // Renderizado de estrellas para calificar
  function renderRatingStars() {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <button
          key={i}
          aria-label={`Calificar ${i} estrellas`}
          onClick={() => handleRating(i)}
          className="focus:outline-none"
          type="button"
          disabled={isSaving}
        >
          {currentRating >= i ? (
            <FaStar className={`text-blue-600 text-4xl transition-all ${isSaving ? 'opacity-50' : ''}`} />
          ) : (
            <FaRegStar className={`text-gray-300 text-4xl transition-all ${isSaving ? 'opacity-50' : ''}`} />
          )}
        </button>
      );
    }
    return (
      <div className="flex items-center gap-2 relative">
        {stars}
        {isSaving && (
          <span className="absolute right-[-32px] top-1/2 -translate-y-1/2">
            <svg className="animate-spin h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
            </svg>
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="min-w-[75%] md:min-w-[60%] snap-center bg-white rounded-2xl shadow p-4 flex flex-col items-center transition-all">
      <Link
        href={`/${item.type === 'track' ? 'song' : 'album'}/${item.id}`}
        tabIndex={-1}
        className="block mb-4 focus:outline-none"
      >
        <img
          src={item.image}
          alt={item.title}
          className="w-40 h-40 rounded-xl object-cover hover:opacity-90 transition"
          style={{ cursor: 'pointer' }}
        />
      </Link>
      <div className="text-gray-900 font-bold text-lg text-center mb-1">{item.title}</div>
      <div className="text-gray-500 text-center mb-3">{item.artist}</div>
      {/* Estrellas para calificar */}
      <div className="flex items-center justify-center gap-2 mt-2">
        {renderRatingStars()}
      </div>
      {/* Promedio y cantidad de reviews */}
      <div className="flex items-center gap-1 mt-1">
        <span className="text-xs text-gray-400">{total === 0 ? '- reviews' : total === 1 ? '1 review' : `${total} reviews`}</span>
        <span className="ml-2 text-sm text-black">{average.toFixed(1)}</span>
      </div>
      {/* Botón para añadir reseña */}
      <div className={`transition-all duration-300 ${showButton ? 'opacity-100 mt-4' : 'opacity-0 pointer-events-none mt-0'}`}>
        <button
          className={`bg-white border border-gray-200 rounded-full px-5 py-2 text-black font-semibold text-base shadow-sm hover:bg-gray-50 focus:outline-none ${saved ? 'border-blue-600 text-blue-600' : ''}`}
          style={{ minWidth: 180 }}
          onClick={() => onOpenModal(item, currentRating)}
          type="button"
          disabled={currentRating === 0}
        >
          Añadir Reseña
        </button>
        {saved && <div className="text-xs text-green-500 mt-1 text-center">¡Calificación guardada!</div>}
      </div>
    </div>
  );
}
