"use client";
import { useState, useEffect } from "react";

interface TopPickerModalProps {
  open: boolean;
  type: "album" | "track";
  onClose: () => void;
  onSelect: (item: { id: string; title: string; artist: string; image_url: string }) => void;
}

export default function TopPickerModal({ open, type, onClose, onSelect }: TopPickerModalProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (!query) {
      setResults([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    const timeout = setTimeout(async () => {
      const res = await fetch(`/api/spotify/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      setResults((data.results || []).filter((item: any) => item.type === type));
      setIsLoading(false);
    }, 500);
    return () => clearTimeout(timeout);
  }, [query, type, open]);

  if (!open) return null;

  return (
    <>
      {/* Overlay que tapa TODO, incluido Bottom Nav */}
      <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm" />
      {/* BottomSheet Modal */}
      <div className="fixed bottom-0 left-0 right-0 z-[101] bg-white rounded-t-3xl h-[85vh] flex flex-col shadow-xl animate-fadeInUp">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-3">
          <div className="font-bold text-lg text-gray-900">
            Elegí tu {type === 'album' ? 'Álbum' : 'Canción'} favorito
          </div>
          <button onClick={onClose} className="text-gray-900 text-2xl leading-none">×</button>
        </div>
        {/* Buscador */}
        <div className="px-6 pb-2">
          <input
            type="text"
            className="w-full p-4 bg-gray-100 rounded-xl text-black placeholder-gray-500 outline-none focus:ring-2 focus:ring-[#FB3C4C] text-base"
            placeholder={`Buscar ${type === 'album' ? 'álbum' : 'canción'}...`}
            value={query}
            onChange={e => setQuery(e.target.value)}
            autoFocus
          />
        </div>
        {/* Resultados */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading && <div className="text-center text-gray-400 py-8">Buscando...</div>}
          {!isLoading && results.length === 0 && query && (
            <div className="text-center text-gray-400 py-8">Sin resultados.</div>
          )}
          {!isLoading && results.map((item: any) => (
            <button
              key={item.id}
              className="flex items-center gap-4 w-full p-2 rounded-lg hover:bg-gray-100 transition mb-1"
              onClick={() => {
                onSelect({
                  id: item.id,
                  title: item.title,
                  artist: item.artist,
                  image_url: item.image,
                });
                onClose();
              }}
            >
              <img src={item.image} alt={item.title} className="w-12 h-12 rounded-lg object-cover" />
              <div className="flex-1 text-left">
                <div className="font-semibold text-black text-base">{item.title}</div>
                <div className="text-sm text-gray-500">{item.artist}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
