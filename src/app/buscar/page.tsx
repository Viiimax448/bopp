"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { supabase } from "@/utils/supabase/client";
import { FaSearch, FaChevronRight } from "react-icons/fa";
import { IoClose } from "react-icons/io5";
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
        {/* Asumiendo que el valor del input es 'query' y la función 'setQuery' */}
        <div className="relative w-full">
          <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            spellCheck={false}
            autoComplete="off"
            placeholder="Buscar música o gente..."
            className="w-full bg-white border border-gray-200 rounded-full py-2.5 pl-10 pr-10 text-sm font-medium text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm transition-all"
            autoFocus
          />
          {/* Botón X que solo aparece si hay texto */}
          {query.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                inputRef.current?.focus();
              }}
              aria-label="Limpiar búsqueda"
              className="absolute right-3 top-1/2 -translate-y-1/2 bg-gray-200 hover:bg-gray-300 text-gray-600 rounded-full p-1 transition-colors"
            >
              <IoClose className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Segmented Control / Pills */}
        <div className="bg-gray-200/60 p-1 rounded-lg flex items-center w-full mt-4">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`
                flex-1 py-1.5 text-[13px] font-semibold rounded-md transition-all duration-200 ease-out
                ${activeTab === tab
                  ? 'bg-white text-gray-900 shadow-sm ring-1 ring-black/5'
                  : 'text-gray-500 hover:text-gray-700'
                }
              `}
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
          <div className="flex flex-col items-center justify-center text-center mt-20 px-6">
            <FaSearch className="w-16 h-16 text-gray-200 mb-4" />
            <h3 className="text-lg font-bold text-gray-900 mb-2">Busca tu música favorita</h3>
            <p className="text-sm text-gray-500 max-w-64">
              Encuentra canciones, álbumes, artistas o descubre a otros usuarios en Bopp.
            </p>
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
