"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";

function normalizeUsername(raw: string) {
  return raw
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "")
    .slice(0, 20);
}

export default function OnboardingForm() {
  const router = useRouter();
  const supabase = useMemo(
    () =>
      createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      ),
    [],
  );

  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData?.user;
      if (!user) {
        router.push("/");
        return;
      }

      const finalUsername = normalizeUsername(username);
      if (!finalUsername) {
        setError("Elegí un username válido.");
        return;
      }

      const { error: upsertError } = await supabase.from("profiles").upsert({
        id: user.id,
        username: finalUsername,
        full_name: fullName.trim() || null,
      });

      if (upsertError) {
        if (String(upsertError.message).toLowerCase().includes("duplicate")) {
          setError("Ese username ya está en uso.");
          return;
        }
        throw upsertError;
      }

      router.push("/feed");
    } catch (e: any) {
      setError(e?.message ?? "Ocurrió un error.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md">
      <h1 className="text-3xl font-extrabold tracking-tight text-black mb-2">
        Completá tu perfil
      </h1>
      <p className="text-gray-600 mb-6">
        Solo te pedimos un username para que otros te encuentren.
      </p>

      <form
        onSubmit={onSubmit}
        className="bg-white border border-gray-200 rounded-2xl p-5"
      >
        <label className="block text-sm font-medium text-gray-800 mb-1">
          Nombre (opcional)
        </label>
        <input
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          type="text"
          autoComplete="name"
          placeholder="Tu nombre"
          className="w-full mb-4 px-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-900 outline-none focus:border-gray-400"
        />

        <label className="block text-sm font-medium text-gray-800 mb-1">
          Username
        </label>
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          type="text"
          autoComplete="username"
          required
          placeholder="tu_username"
          className="w-full mb-4 px-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-900 outline-none focus:border-gray-400"
        />

        {error ? (
          <div className="mb-4 text-sm text-red-600">{error}</div>
        ) : null}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-xl bg-black text-white font-semibold disabled:opacity-60"
        >
          {loading ? "Guardando..." : "Continuar"}
        </button>
      </form>
    </div>
  );
}
