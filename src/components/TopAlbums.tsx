import React from "react";

export default function TopAlbums({ userId }: { userId: string }) {
  // TODO: Implementar lógica real de top álbumes
  return (
    <div className="my-6">
      <h3 className="font-bold text-lg mb-2">Top 4 Álbumes</h3>
      <div className="grid grid-cols-2 gap-3">
        {/* Placeholder */}
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="aspect-square bg-gray-200 rounded-xl flex items-center justify-center text-gray-400">
            Álbum {i}
          </div>
        ))}
      </div>
    </div>
  );
}
