import React from "react";

export default function TopSongs({ userId }: { userId: string }) {
  // TODO: Implementar lógica real de top canciones
  return (
    <div className="my-6">
      <h3 className="font-bold text-lg mb-2">Top 4 Canciones</h3>
      <div className="grid grid-cols-2 gap-3">
        {/* Placeholder */}
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="aspect-square bg-gray-100 rounded-xl flex items-center justify-center text-gray-400">
            Canción {i}
          </div>
        ))}
      </div>
    </div>
  );
}
