"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { supabase } from "@/utils/supabase/client";
import { FaSearch, FaChevronRight } from "react-icons/fa";
import BottomNav from "@/components/BottomNav";

const TABS = ["Música", "Gente"];

export default function BuscarPage() {
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState("Música");
  const [results, setResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

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



  return (
    <div className="bg-white min-h-screen flex flex-col">
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
        {!isLoading && activeTab === "Música" && results.length > 0 && results.map((item: any) => (
          <Link
            key={item.id + item.type}
            href={`/${item.type === 'track' ? 'song' : 'album'}/${item.id}`}
            className="flex items-center gap-3 mb-2 p-0.5 px-2 rounded-xl bg-gray-50 hover:bg-gray-100 transition min-h-[3.5rem]"
          >
            <img src={item.image} alt={item.title} className="w-12 h-12 rounded-lg object-cover" />
            <div className="flex-1 min-w-0">
              <div className="font-bold text-sm text-black truncate">{item.title}</div>
              <div className="text-xs text-gray-500 truncate">{item.artist}</div>
              <div className="text-xs text-gray-400 mt-0.5 truncate">{item.type_label}</div>
            </div>
            <FaChevronRight className="ml-2 text-xs text-gray-900 opacity-50" />
          </Link>
        ))}
        {/* Resultados Gente */}
        {!isLoading && activeTab === "Gente" && results.length > 0 && results.map((user: any) => (
          <div key={user.id} className="flex items-center gap-3 mb-2 p-0.5 px-2 rounded-xl bg-gray-50 hover:bg-gray-100 transition min-h-[3.5rem]">
            <img
              src={user.avatar_url || "/default-avatar.png"}
              alt={user.username}
              className="w-10 h-10 rounded-full object-cover" />
            <div className="flex-1 min-w-0">
              <div className="font-bold text-sm text-black truncate">{user.username}</div>
              <div className="text-xs text-gray-400 truncate">{user.full_name || user.email}</div>
            </div>
            <FaChevronRight className="ml-2 text-xs text-gray-900 opacity-50" />
          </div>
        ))}
      </div>
      <BottomNav />
    </div>
  );
}
