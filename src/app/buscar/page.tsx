"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { supabase } from "@/utils/supabase/client";
import { FaSearch, FaChevronRight } from "react-icons/fa";
import BottomNav from "@/components/BottomNav";
import UserListItem from "@/components/UserListItem";
import { createBrowserClient } from "@supabase/ssr";

const TABS = ["Música", "Gente"];

export default function BuscarPage() {
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState("Música");
  const [results, setResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  // Estado global para seguimiento de usuarios
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const inputRef = useRef<HTMLInputElement>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!query) {
      setResults([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    const timeout = setTimeout(async () => {
      if (activeTab === "Música") {
        const res = await fetch(`/api/spotify/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        setResults(data.results || []);
        setIsLoading(false);
      } else {
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .or(`username.ilike.%${query}%,full_name.ilike.%${query}%`)
          .limit(10);
        setResults(data || []);
        setIsLoading(false);
      }
    }, 500);
    return () => clearTimeout(timeout);
  }, [query, activeTab]);

  useEffect(() => {
    // Obtener usuario logueado
    const getUser = async () => {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      const { data } = await supabase.auth.getUser();
      setCurrentUserId(data?.user?.id || null);
    };
    getUser();
  }, []);

  return (
    <div className="bg-[#F5F5F7] min-h-screen flex flex-col">
      {/* Input de búsqueda sticky premium */}
      <div className="sticky top-0 z-10 bg-white px-4 pt-6 pb-2 border-b border-gray-100">
        <div className="flex items-center bg-gray-100 rounded-2xl shadow-sm px-4 py-1.5">
          <FaSearch className="text-gray-400 text-base mr-2" />
          <input
            ref={inputRef}
            type="text"
            className="flex-1 bg-transparent text-base font-bold px-0 py-1 rounded-xl outline-none text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-0 border-0"
            placeholder="Buscar música o gente..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            autoFocus
          />
        </div>
        {/* Segmented Control / Pills */}
        <div className="flex w-full bg-gray-100 p-1 rounded-xl mt-4">
          {TABS.map(tab => (
            <button
              key={tab}
              className={`flex-1 text-center py-1 text-xs font-semibold rounded-lg transition-all ${activeTab === tab
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'}`}
              onClick={() => setActiveTab(tab)}
              type="button"
            >
              {tab}
            </button>
          ))}
        </div>
      </div>
      {/* Resultados o Empty State */}
      <div className="flex-1 px-4 py-4 overflow-y-auto">
        {isLoading && <div className="text-center text-gray-400 py-8">Buscando...</div>}
        {!isLoading && results.length === 0 && query && (
          <div className="text-center text-gray-400 py-8">Sin resultados.</div>
        )}
        {/* Empty State minimalista */}
        {!isLoading && !query && (
          <div className="flex flex-col items-center justify-center mt-32 text-center px-4">
            <FaSearch className="text-6xl text-gray-200 mb-6" />
            <h2 className="text-xl font-bold text-gray-800 dark:text-white">Busca tu música favorita</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Encuentra canciones, álbumes, artistas o descubre a otros usuarios en Bopp.</p>
          </div>
        )}
        {/* Resultados Música */}
        {!isLoading && activeTab === "Música" && results.length > 0 && results.map((item: any) => {
          // Determinar label de tipo
          let tipoLabel = item.type_label || (item.type === 'track' ? 'Canción' : 'Álbum');
          return (
            <Link
              key={item.id + item.type}
              href={`/${item.type === 'track' ? 'song' : 'album'}/${item.id}`}
              className="flex items-center gap-4 px-5 py-3 border-b border-gray-100 last:border-0 hover:bg-gray-100/80 transition-colors cursor-pointer"
            >
              <img
                src={item.image}
                alt={item.title}
                className="w-12 h-12 rounded-md object-cover shrink-0 shadow-sm border border-black/5"
              />
              <div className="flex flex-col flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-900 truncate">{item.title}</p>
                <p className="text-xs text-gray-500 truncate mt-0.5">
                  {item.artist} <span className="mx-1">•</span> {tipoLabel}
                </p>
              </div>
              <FaChevronRight className="w-4 h-4 text-gray-300 shrink-0 ml-2" />
            </Link>
          );
        })}
        {/* Resultados Gente */}
        {!isLoading && activeTab === "Gente" && results.length > 0 && results.map((user: any) => (
          <UserListItem key={user.id} user={user} currentUserId={currentUserId} />
        ))}
      </div>
      <BottomNav />
    </div>
  );
}
