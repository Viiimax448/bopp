"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import BottomNav from "@/components/BottomNav";
import { FaStar } from "react-icons/fa";

type TimeFilter = "semana" | "mes" | "total";

type TrendingItem = {
  spotify_id: string;
  type: "album" | "song" | string;
  spotify_title: string | null;
  spotify_artist: string | null;
  spotify_image_url: string | null;
  score: number | null;
  review_count: number | null;
  created_at: string | null;
};

export default function TendenciasPage() {
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("semana");
  const [trendingData, setTrendingData] = useState<TrendingItem[]>([]);

  const supabase = useMemo(
    () =>
      createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      ),
    []
  );

  useEffect(() => {
    let cancelled = false;

    async function loadTrending() {
      // Por ahora el datasource público disponible es trending_this_week.
      // El filtro de tiempo controla el estado/UI; para "mes"/"total" se requiere
      // una tabla/vista equivalente o un endpoint dedicado.
      const { data, error } = await supabase
        .from("trending_this_week")
        .select("*")
        .order("score", { ascending: false })
        .order("review_count", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(15);

      if (cancelled) return;
      if (error) {
        // eslint-disable-next-line no-console
        console.error("Error cargando tendencias:", error);
        setTrendingData([]);
        return;
      }
      setTrendingData(Array.isArray(data) ? (data as TrendingItem[]) : []);
    }

    loadTrending();
    return () => {
      cancelled = true;
    };
  }, [supabase, timeFilter]);

  const topFive = trendingData.slice(0, 5);
  const restOfTrending = trendingData.slice(5, 15);

  return (
    <div className="min-h-screen bg-[#F5F5F7]">
      <h1 className="text-2xl font-bold text-gray-800 tracking-tight px-4 pt-6 pb-4 drop-shadow-sm">
        Tendencias globales
      </h1>

      {/* 1. Estado y Filtros de Tiempo */}
      <div className="flex bg-gray-100 p-1 rounded-xl mx-4 mb-6">
        <button
          type="button"
          onClick={() => setTimeFilter("semana")}
          className={
            timeFilter === "semana"
              ? "flex-1 py-1.5 bg-white text-gray-900 text-sm font-semibold rounded-lg shadow-sm border border-gray-200"
              : "flex-1 py-1.5 bg-gray-50 text-gray-500 text-sm font-medium rounded-lg border border-gray-100 hover:text-gray-700"
          }
        >
          Semana
        </button>
        <button
          type="button"
          onClick={() => setTimeFilter("mes")}
          className={
            timeFilter === "mes"
              ? "flex-1 py-1.5 bg-white text-gray-900 text-sm font-semibold rounded-lg shadow-sm border border-gray-200"
              : "flex-1 py-1.5 bg-gray-50 text-gray-500 text-sm font-medium rounded-lg border border-gray-100 hover:text-gray-700"
          }
        >
          Mes
        </button>
        <button
          type="button"
          onClick={() => setTimeFilter("total")}
          className={
            timeFilter === "total"
              ? "flex-1 py-1.5 bg-white text-gray-900 text-sm font-semibold rounded-lg shadow-sm border border-gray-200"
              : "flex-1 py-1.5 bg-gray-50 text-gray-500 text-sm font-medium rounded-lg border border-gray-100 hover:text-gray-700"
          }
        >
          Total
        </button>
      </div>

      {/* 2. Sección 1: Top 5 en formato Lista */}
      <div className="flex flex-col px-4">
        {topFive.map((item, idx) => {
          const position = idx + 1;
          const reviewCount = item.review_count ?? 0;
          return (
            <Link
              key={`${item.type}-${item.spotify_id}-${position}`}
              href={`/${item.type === "song" ? "song" : "album"}/${item.spotify_id}`}
              className="flex items-center gap-3 py-3 border-b border-gray-100 last:border-0"
            >
              <span className="w-5 text-center text-base font-bold text-gray-400">{position}</span>
              {item.spotify_image_url ? (
                <img
                  src={item.spotify_image_url}
                  alt={item.spotify_title ?? ""}
                  className="w-14 h-14 rounded-md object-cover border border-black/5"
                />
              ) : (
                <div className="w-14 h-14 rounded-md bg-gray-100 border border-black/5" />
              )}
              <div className="flex flex-col flex-1 min-w-0">
                <div className="text-sm font-bold text-gray-900 truncate">{item.spotify_title}</div>
                <div className="text-xs text-gray-500 truncate">{item.spotify_artist}</div>
              </div>
              <div className="flex flex-col items-end justify-center shrink-0 ml-2">
                <div className="flex items-center gap-1 text-xs">
                  <FaStar className="w-3.5 h-3.5 text-blue-600" />
                  <span className="font-semibold text-gray-900">{item.score?.toFixed(1) ?? "-"}</span>
                </div>
                <span className="text-[10px] text-gray-400 font-medium mt-0.5">
                  {reviewCount} res
                </span>
              </div>
            </Link>
          );
        })}
      </div>

      {/* 3. Sección 2: Puestos 6 al 15 en formato Grilla (Cards) */}
      <h3 className="text-lg font-bold text-gray-900 px-4 mt-8 mb-4">
        Siguen en tendencia
      </h3>

      <div className="grid grid-cols-3 gap-3 px-4 pb-24">
        {restOfTrending.map((item, idx) => {
          const position = idx + 6;
          return (
            <Link
              key={`${item.type}-${item.spotify_id}-${position}`}
              href={`/${item.type === "song" ? "song" : "album"}/${item.spotify_id}`}
              className="snap-start border border-gray-100 rounded-xl shadow-sm bg-white flex flex-col gap-1.5 p-2 items-center hover:opacity-80 transition"
              style={{ minWidth: 116, maxWidth: 124 }}
            >
              <div className="relative w-full">
                {item.spotify_image_url ? (
                  <img
                    src={item.spotify_image_url}
                    alt={item.spotify_title ?? ""}
                    className="w-full aspect-square rounded-lg object-cover"
                  />
                ) : (
                  <div className="w-full aspect-square rounded-lg bg-gray-100" />
                )}
                <div className="absolute top-1 left-1 bg-black/60 backdrop-blur-sm text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md">
                  #{position}
                </div>
              </div>
              <div className="text-xs font-bold text-gray-900 truncate w-full text-center mt-1">
                {item.spotify_title}
              </div>
              <div className="text-[10px] text-gray-500 truncate w-full text-center -mt-1">
                {item.spotify_artist}
              </div>
              <div className="flex flex-row items-center justify-center gap-1.5 mt-1 w-full">
                <div className="flex items-center gap-0.5 text-blue-600 font-bold text-[11px]">
                  <svg
                    className="w-3 h-3 mb-[1px]"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.97a1 1 0 00.95.69h4.175c.969 0 1.371 1.24.588 1.81l-3.38 2.455a1 1 0 00-.364 1.118l1.287 3.97c.3.921-.755 1.688-1.54 1.118l-3.38-2.455a1 1 0 00-1.175 0l-3.38 2.455c-.784.57-1.838-.197-1.539-1.118l1.287-3.97a1 1 0 00-.364-1.118L2.05 9.397c-.783-.57-.38-1.81.588-1.81h4.175a1 1 0 00.95-.69l1.286-3.97z" />
                  </svg>
                  <span>{item.score?.toFixed(1) ?? "-"}</span>
                </div>
                <span className="text-gray-400 text-[10px] flex items-center">
                  • {item.review_count ?? 0} res
                </span>
              </div>
            </Link>
          );
        })}
      </div>

      <BottomNav />
    </div>
  );
}
