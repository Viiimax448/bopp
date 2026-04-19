"use client";
import { createBrowserClient } from "@supabase/ssr";

export default function ProfileSettings({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (!error) {
      window.location.href = "/";
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-200 bg-black/40 flex items-end justify-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white w-full max-w-sm rounded-t-2xl p-6 shadow-xl">
        <button
          className="w-full text-left py-3 px-2 text-blue-600 font-medium hover:bg-gray-100 rounded"
          onClick={handleSignOut}
          type="button"
        >
          Cerrar Sesión
        </button>
        <button
          className="w-full mt-2 text-center text-gray-400"
          onClick={onClose}
          type="button"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
