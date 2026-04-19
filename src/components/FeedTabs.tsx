"use client";

import { useEffect, useMemo, useState } from "react";
import { FaAlignLeft } from 'react-icons/fa';
import { createBrowserClient } from "@supabase/ssr";

import FeedReviewCard, {
  type FeedAuthor,
  type FeedReview,
} from "@/components/FeedReviewCard";

type TabKey = "siguiendo" | "populares";

type FeedReviewRow = FeedReview & { profiles: FeedAuthor };

function timeAgo(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (seconds < 60) return `hace ${seconds} seg`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `hace ${days} d`;
  return date.toLocaleDateString();
}

function timeAgoShort(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return date.toLocaleDateString();
}

export default function FeedTabs({
  followingReviews,
  allReviews,
}: {
  followingReviews: FeedReviewRow[];
  allReviews: FeedReviewRow[];
}) {
  // Ahora 'populares' es el default
  const [activeTab, setActiveTab] = useState<TabKey>("populares");
  // Estado para el filtro de solo reseñas con texto
  const [onlyWithText, setOnlyWithText] = useState(false);

  const supabaseClient = useMemo(() => {
    return createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
  }, []);

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Centralizar la sesión: obtener el usuario una sola vez en el padre.
  useEffect(() => {
    let mounted = true;
    const fetchUser = async () => {
      const { data: { user } } = await supabaseClient.auth.getUser();
      if (!mounted) return;
      setCurrentUserId(user?.id ?? null);
    };
    fetchUser();
    return () => {
      mounted = false;
    };
  }, [supabaseClient]);

  const displayedReviews = useMemo(() => {
    // 1. Filtrar primero por texto si el toggle está activo
    let reviews = activeTab === "populares" ? allReviews : followingReviews;
    let filtered = [...reviews];
    if (onlyWithText) {
      filtered = filtered.filter(review => review.review_text && review.review_text.trim() !== '');
    }
    // 2. Luego aplicar el ordenamiento según la pestaña
    if (activeTab === 'populares') {
      return filtered.sort((a, b) => (b.likes_count || 0) - (a.likes_count || 0));
    } else {
      // 'siguiendo': Mantiene el orden original (asumiendo que es cronológico)
      return filtered;
    }
  }, [followingReviews, allReviews, activeTab, onlyWithText]);

  return (
    <div className="pb-32">
      {/* Header de Pestañas (Segmented Control Sticky) */}
      {/* Header de Pestañas (Strict Light Mode) */}
      <div className="sticky top-0 z-10 bg-gray-50/90 backdrop-blur-md pt-3 pb-2 w-full flex flex-col border-b border-gray-200">
        {/* FILA 1: Tabs */}
        <div className="w-full flex justify-center px-4">
          {/* Contenedor de la Píldora Gris */}
          <div className="relative flex bg-gray-200/80 p-1 rounded-full w-full max-w-[280px]">
            {/* Fondo deslizable: Ahora 'siguiendo' lo mueve a la derecha */}
            <div 
              className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-white rounded-full shadow-sm transition-transform duration-300 ease-out ${activeTab === 'siguiendo' ? 'translate-x-full' : 'translate-x-0'}`}
            ></div>

            {/* Tab 1: Populares (izquierda, default) */}
            <button 
              onClick={() => setActiveTab('populares')}
              className={`relative flex-1 py-1.5 text-[14px] font-bold rounded-full transition-colors z-10 ${activeTab === 'populares' ? 'text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Populares
            </button>

            {/* Tab 2: Siguiendo (derecha) */}
            <button 
              onClick={() => setActiveTab('siguiendo')}
              className={`relative flex-1 py-1.5 text-[14px] font-bold rounded-full transition-colors z-10 ${activeTab === 'siguiendo' ? 'text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Siguiendo
            </button>
          </div>
        </div>

        {/* FILA 2: Filtro */}
        <div className="w-full flex justify-end px-4 mt-3">
          <button 
            onClick={() => setOnlyWithText(!onlyWithText)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-bold border transition-all active:scale-95 ${
              onlyWithText 
                ? 'bg-blue-50 text-blue-600 border-blue-200' 
                : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
            }`}
          >
            <FaAlignLeft className="w-3 h-3" />
            Solo con texto
          </button>
        </div>
      </div>

      {/* Lista de Reseñas */}
      <div className="mt-4">
        {displayedReviews.length > 0 ? (
          <div className="bg-white w-full">
            {displayedReviews.map((review) => (
              <FeedReviewCard
                key={review.id}
                review={review}
                author={review.profiles}
                timeLabel={timeAgo(review.created_at)}
                timeLabelShort={timeAgoShort(review.created_at)}
                initialIsLiked={Boolean(review.user_has_liked)}
                initialLikesCount={typeof review.likes_count === "number" ? review.likes_count : 0}
                currentUserId={currentUserId}
                supabaseClient={supabaseClient}
              />
            ))}
          </div>
        ) : (
          <div className="text-center text-gray-500 mt-10 px-4">
            No hay reseñas para mostrar aquí.
          </div>
        )}
      </div>
    </div>
  );
}
