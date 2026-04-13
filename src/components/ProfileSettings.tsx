"use client";
import { useState } from "react";
import { createBrowserClient } from "@supabase/ssr";

export default function ProfileSettings({ open, onClose, profile, onProfileUpdate }: {
  open: boolean;
  onClose: () => void;
  profile: any;
  onProfileUpdate: (data: { full_name: string; username: string }) => void;
}) {
  const [showEdit, setShowEdit] = useState(false);
  const [fullName, setFullName] = useState(profile?.full_name || "");
  const [username, setUsername] = useState(profile?.username || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const handleSave = async () => {
    setError("");
    if (!username.match(/^[a-z0-9_]+$/)) {
      setError("El @usuario solo puede tener minúsculas, números y guiones bajos.");
      return;
    }
    setSaving(true);
    const { error: err } = await supabase
      .from("profiles")
      .update({ full_name: fullName, username })
      .eq("id", profile.id);
    setSaving(false);
    if (err) {
      setError("Error al guardar.");
    } else {
      onProfileUpdate({ full_name: fullName, username });
      setShowEdit(false);
      onClose();
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  const handleShare = async () => {
    await navigator.clipboard.writeText(window.location.href);
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200] bg-black/40 flex items-end justify-center">
      <div className="bg-white w-full max-w-sm rounded-t-2xl p-6 shadow-xl">
        {!showEdit ? (
          <>
            <button
              className="w-full text-left py-3 px-2 text-gray-900 font-medium hover:bg-gray-100 rounded"
              onClick={() => setShowEdit(true)}
            >
              Editar Identidad
            </button>
            <button
              className="w-full text-left py-3 px-2 text-gray-900 font-medium hover:bg-gray-100 rounded"
              onClick={handleShare}
            >
              Compartir Perfil
            </button>
            <button
              className="w-full text-left py-3 px-2 text-blue-600 font-medium hover:bg-gray-100 rounded"
              onClick={handleSignOut}
            >
              Cerrar Sesión
            </button>
            <button
              className="w-full mt-2 text-center text-gray-400"
              onClick={onClose}
            >
              Cancelar
            </button>
          </>
        ) : (
          <form
            onSubmit={e => {
              e.preventDefault();
              handleSave();
            }}
            className="flex flex-col gap-4"
          >
            <div className="font-bold text-lg text-gray-900 mb-2">Editar Identidad</div>
            <input
              className="p-3 rounded bg-gray-100 text-black outline-none"
              placeholder="Nombre de pantalla"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              maxLength={32}
              required
            />
            <input
              className="p-3 rounded bg-gray-100 text-black outline-none"
              placeholder="@usuario"
              value={username}
              onChange={e => setUsername(e.target.value.replace(/[^a-z0-9_]/g, "").toLowerCase())}
              maxLength={20}
              required
            />
            {error && <div className="text-blue-600 text-sm">{error}</div>}
            <button
              type="submit"
              className="bg-blue-600 text-white font-bold py-2 rounded disabled:opacity-60 hover:bg-blue-700"
              disabled={saving}
            >
              Guardar
            </button>
            <button
              type="button"
              className="text-gray-400 mt-2"
              onClick={() => setShowEdit(false)}
            >
              Cancelar
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
