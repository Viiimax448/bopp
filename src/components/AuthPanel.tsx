"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";

import LoginButtonSpotify from "@/components/LoginButtonSpotify";

type Mode = "signin" | "signup";

function humanizeSupabaseAuthError(message: string) {
  const normalized = message.toLowerCase();

  if (normalized.includes("invalid login credentials")) {
    return "Email o contraseña incorrectos.";
  }
  if (normalized.includes("email not confirmed")) {
    return "Tu email aún no fue confirmado.";
  }
  if (normalized.includes("user already registered") || normalized.includes("already registered")) {
    return "Ese email ya está registrado. Probá iniciar sesión.";
  }
  if (normalized.includes("password should be at least")) {
    return "La contraseña es demasiado corta.";
  }

  return message;
}

export default function AuthPanel({ mode }: { mode: Mode }) {
  const router = useRouter();
  const supabase = useMemo(
    () =>
      createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      ),
    [],
  );

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const redirectAfterAuth = async () => {
    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;
    if (!user) return;

    const emailLocalPart = (user.email ?? "").split("@")[0] ?? "";
    const suggestedFromEmail = emailLocalPart
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "_")
      .replace(/[^a-z0-9_]/g, "")
      .slice(0, 20);

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("username")
      .eq("id", user.id)
      .single();

    // Si el backend autogenera username desde el email, tratamos eso como "no completado".
    if (profileError || !profile?.username || profile.username === suggestedFromEmail) {
      router.push("/onboarding");
      return;
    }

    router.push("/feed");
  };

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === "signin") {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) throw signInError;
        await redirectAfterAuth();
        return;
      }

      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });
      if (signUpError) throw signUpError;

      await redirectAfterAuth();
    } catch (e: any) {
      setError(humanizeSupabaseAuthError(e?.message ?? "Ocurrió un error."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md">
      <div className="text-center mb-10">
        <h1 className="text-5xl font-extrabold tracking-tight text-blue-600 mb-3">
          Bopp
        </h1>
        <p className="text-gray-600 mt-1">Ingresá tus datos para continuar</p>
      </div>

      {mode === "signin" ? (
        <>
          <div className="flex flex-col items-center gap-3">
            <LoginButtonSpotify />
            <span className="text-xs text-gray-500">(Recomendado)</span>
          </div>

          <div className="my-8 flex items-center gap-3">
            <div className="h-px flex-1 bg-gray-200" />
            <span className="text-xs text-gray-400">o ingresa tus datos</span>
            <div className="h-px flex-1 bg-gray-200" />
          </div>
        </>
      ) : null}

      <form
        onSubmit={onSubmit}
        className="space-y-4"
      >
        <label className="block text-sm font-medium text-gray-800 mb-1">
          Email
        </label>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          autoComplete="email"
          required
          placeholder="tu@email.com"
          className="w-full px-4 py-3 rounded-2xl border border-gray-200 bg-gray-100 text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />

        <label className="block text-sm font-medium text-gray-800 mb-1">
          Contraseña
        </label>
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          type="password"
          autoComplete={mode === "signin" ? "current-password" : "new-password"}
          required
          placeholder="••••••••"
          className="w-full px-4 py-3 rounded-2xl border border-gray-200 bg-gray-100 text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />

        <div className="flex items-center justify-end text-sm">
          {mode === "signin" ? (
            <button
              type="button"
              onClick={async () => {
                setError(null);
                setLoading(true);
                try {
                  const { error: resetError } = await supabase.auth.resetPasswordForEmail(
                    email,
                    {
                      redirectTo: `${window.location.origin}/auth/callback`,
                    },
                  );
                  if (resetError) throw resetError;
                  setError("Te enviamos un correo para restablecer tu contraseña.");
                } catch (e: any) {
                  setError(
                    humanizeSupabaseAuthError(e?.message ?? "Ocurrió un error."),
                  );
                } finally {
                  setLoading(false);
                }
              }}
              className="text-blue-500 hover:text-blue-600"
            >
              ¿Olvidaste?
            </button>
          ) : null}
        </div>

        {error ? (
          <div
            className={
              error.includes("Te enviamos un correo")
                ? "text-sm text-gray-700"
                : "text-sm text-red-600"
            }
          >
            {error}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-2xl bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-60"
        >
          {loading
            ? "Procesando..."
            : mode === "signin"
              ? "Entrar"
              : "Crear cuenta"}
        </button>

        <p className="text-xs text-gray-500 text-center">
          {mode === "signin" ? "¿No tienes cuenta?" : "¿Ya tienes cuenta?"}{" "}
          <Link
            href={mode === "signin" ? "/register" : "/login"}
            className="text-blue-500 hover:text-blue-600"
          >
            {mode === "signin" ? "Regístrate" : "Inicia sesión"}
          </Link>
        </p>
      </form>
    </div>
  );
}
