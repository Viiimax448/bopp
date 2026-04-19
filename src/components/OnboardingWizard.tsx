"use client";

import type { ChangeEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import imageCompression from "browser-image-compression";
import { FaPlus, FaExchangeAlt, FaUser } from "react-icons/fa";

import TopPickerModal from "@/components/TopPickerModal";

type Step = 1 | 2 | 3;

type TopItem = {
  id: string;
  title: string;
  artist: string;
  image_url: string;
};

type UsernameStatus =
  | { state: "idle" }
  | { state: "invalid"; message: string }
  | { state: "checking" }
  | { state: "available" }
  | { state: "taken" };

function ProgressPills({ step }: { step: Step }) {
  return (
    <div className="flex items-center gap-1.5 mb-8 w-full max-w-xs mx-auto">
      <div
        className={
          step >= 1
            ? "h-1.5 flex-1 bg-blue-600 rounded-full"
            : "h-1.5 flex-1 bg-gray-200 rounded-full"
        }
      />
      <div
        className={
          step >= 2
            ? "h-1.5 flex-1 bg-blue-600 rounded-full"
            : "h-1.5 flex-1 bg-gray-200 rounded-full"
        }
      />
      <div
        className={
          step >= 3
            ? "h-1.5 flex-1 bg-blue-600 rounded-full"
            : "h-1.5 flex-1 bg-gray-200 rounded-full"
        }
      />
    </div>
  );
}

function normalizeUsername(raw: string) {
  return raw
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "")
    .slice(0, 20);
}

function buildTopArray(current: Array<TopItem | null | undefined>, slot: number, item: TopItem) {
  return Array.from({ length: 4 }, (_, i) => (i === slot ? item : (current[i] ?? null)));
}

export default function OnboardingWizard() {
  const router = useRouter();
  const supabase = useMemo(
    () =>
      createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      ),
    [],
  );

  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [fullName, setFullName] = useState("");
  const [usernameRaw, setUsernameRaw] = useState("");
  const [suggestedUsername, setSuggestedUsername] = useState<string>("");
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>({ state: "idle" });

  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarPublicUrl, setAvatarPublicUrl] = useState<string | null>(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);
  const localPreviewUrlRef = useRef<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  const [topAlbums, setTopAlbums] = useState<Array<TopItem | null>>([null, null, null, null]);
  const [topSongs, setTopSongs] = useState<Array<TopItem | null>>([null, null, null, null]);

  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [pickerType, setPickerType] = useState<"album" | "track">("album");
  const [pickerSlot, setPickerSlot] = useState<number>(0);

  useEffect(() => {
    let cancelled = false;

    const boot = async () => {
      setLoading(true);
      setError(null);

      const { data: userData } = await supabase.auth.getUser();
      const user = userData?.user;
      if (!user) {
        router.push("/");
        return;
      }

      setCurrentUserId(user.id);

      const emailLocalPart = (user.email ?? "").split("@")[0] ?? "";
      const suggested = normalizeUsername(emailLocalPart);
      setSuggestedUsername(suggested);

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("full_name,username,avatar_url,top_albums,top_songs")
        .eq("id", user.id)
        .single();

      if (cancelled) return;

      if (profileError) {
        setError("No pudimos cargar tu perfil.");
        setLoading(false);
        return;
      }

      // Si el backend autogenera username desde el email, tratamos eso como "no completado".
      if (profile?.username && profile.username !== suggested) {
        router.push("/feed");
        return;
      }

      setFullName(profile?.full_name ?? "");
      // No autocompletamos username: lo dejamos como recomendación.
      setUsernameRaw("");

      const avatarUrl = typeof profile?.avatar_url === "string" && profile.avatar_url
        ? profile.avatar_url
        : null;
      setAvatarPublicUrl(avatarUrl);
      setAvatarPreviewUrl(avatarUrl ? `${avatarUrl}?t=${Date.now()}` : null);

      setTopAlbums(
        Array.isArray(profile?.top_albums)
          ? (Array.from({ length: 4 }, (_, i) => (profile.top_albums[i] ?? null)) as Array<TopItem | null>)
          : [null, null, null, null],
      );
      setTopSongs(
        Array.isArray(profile?.top_songs)
          ? (Array.from({ length: 4 }, (_, i) => (profile.top_songs[i] ?? null)) as Array<TopItem | null>)
          : [null, null, null, null],
      );

      setLoading(false);
    };

    boot();

    return () => {
      cancelled = true;
    };
  }, [router, supabase]);

  // Cleanup local object URLs
  useEffect(() => {
    return () => {
      if (localPreviewUrlRef.current) {
        URL.revokeObjectURL(localPreviewUrlRef.current);
        localPreviewUrlRef.current = null;
      }
    };
  }, []);

  // Verificación visual del username con debounce
  useEffect(() => {
    if (!currentUserId) return;

    const raw = usernameRaw;
    if (!raw.trim()) {
      setUsernameStatus({ state: "idle" });
      return;
    }

    const normalized = normalizeUsername(raw);
    if (!normalized) {
      setUsernameStatus({ state: "invalid", message: "Username inválido." });
      return;
    }
    if (!normalized.match(/^[a-z0-9_]+$/)) {
      setUsernameStatus({
        state: "invalid",
        message: "Usá minúsculas, números y _",
      });
      return;
    }

    setUsernameStatus({ state: "checking" });

    const t = setTimeout(async () => {
      const { data: existing, error: checkError } = await supabase
        .from("profiles")
        .select("id")
        .eq("username", normalized)
        .maybeSingle();

      if (checkError) {
        setUsernameStatus({
          state: "invalid",
          message: "No pudimos verificar disponibilidad.",
        });
        return;
      }

      if (existing?.id && existing.id !== currentUserId) {
        setUsernameStatus({ state: "taken" });
        return;
      }

      setUsernameStatus({ state: "available" });
    }, 450);

    return () => clearTimeout(t);
  }, [usernameRaw, currentUserId, supabase]);

  const openPicker = (type: "album" | "track", slot: number) => {
    setPickerType(type);
    setPickerSlot(slot);
    setIsPickerOpen(true);
  };

  const handleSelectTopItem = (item: TopItem) => {
    if (pickerType === "album") {
      setTopAlbums((current) => buildTopArray(current, pickerSlot, item));
    } else {
      setTopSongs((current) => buildTopArray(current, pickerSlot, item));
    }
    setIsPickerOpen(false);
  };

  const handleTriggerUpload = () => {
    (document.getElementById("avatar-upload") as HTMLInputElement | null)?.click();
  };

  const handleAvatarFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";

    if (!file) return;

    setAvatarFile(file);
    setError(null);

    // Mostramos preview inmediato (local) mientras sube
    if (localPreviewUrlRef.current) {
      URL.revokeObjectURL(localPreviewUrlRef.current);
      localPreviewUrlRef.current = null;
    }
    const localUrl = URL.createObjectURL(file);
    localPreviewUrlRef.current = localUrl;
    setAvatarPreviewUrl(localUrl);
  };

  const goNextFromStep2 = async () => {
    setError(null);
    if (!avatarPreviewUrl) return;
    if (avatarUploading) return;

    if (!avatarFile) {
      setStep(3);
      return;
    }

    setAvatarUploading(true);

    const options = {
      maxSizeMB: 0.05,
      maxWidthOrHeight: 400,
      useWebWorker: true,
      fileType: "image/webp",
      initialQuality: 0.7,
    };

    let compressedFile: File;
    try {
      compressedFile = await imageCompression(avatarFile, options);
    } catch {
      setAvatarUploading(false);
      setError("No pudimos procesar la imagen.");
      return;
    }

    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;
    if (!user) {
      router.push("/");
      return;
    }

    const fileName = `${user.id}-${Date.now()}.webp`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(fileName, compressedFile, {
        cacheControl: "3600",
        upsert: true,
        contentType: "image/webp",
      });

    if (uploadError) {
      setAvatarUploading(false);
      setError("No pudimos subir tu foto.");
      return;
    }

    const { data } = supabase.storage.from("avatars").getPublicUrl(fileName);
    const publicUrl = data?.publicUrl;

    if (publicUrl) {
      setAvatarPublicUrl(publicUrl);
      setAvatarPreviewUrl(`${publicUrl}?t=${Date.now()}`);
      setAvatarFile(null);

      if (localPreviewUrlRef.current) {
        URL.revokeObjectURL(localPreviewUrlRef.current);
        localPreviewUrlRef.current = null;
      }
    }

    setAvatarUploading(false);
    setStep(3);
  };

  const step1CanContinue =
    fullName.trim().length > 0 && usernameStatus.state === "available";

  const goNextFromStep1 = async () => {
    setError(null);
    if (!step1CanContinue) return;
    setStep(2);
  };

  const finish = async ({ skipTops }: { skipTops: boolean }) => {
    setSaving(true);
    setError(null);

    try {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData?.user;
      if (!user) {
        router.push("/");
        return;
      }

      const normalized = normalizeUsername(usernameRaw);
      if (!fullName.trim() || !normalized) {
        setError("Completá tu nombre y username.");
        setSaving(false);
        return;
      }

      const payload: any = {
        full_name: fullName.trim(),
        username: normalized,
        avatar_url: avatarPublicUrl,
      };

      if (!skipTops) {
        payload.top_albums = Array.from({ length: 4 }, (_, i) => topAlbums[i] ?? null);
        payload.top_songs = Array.from({ length: 4 }, (_, i) => topSongs[i] ?? null);
      }

      const { error: updateError } = await supabase.from("profiles").update(payload).eq("id", user.id);

      if (updateError) {
        const msg = String(updateError.message || "");
        if (msg.toLowerCase().includes("duplicate")) {
          setError("Ese username ya está en uso.");
        } else {
          setError("No pudimos guardar tu perfil.");
        }
        setSaving(false);
        return;
      }

      router.push("/feed?welcome=true");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full max-w-md">
        <ProgressPills step={1} />
        <div className="mt-10 text-center text-gray-600">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md">
      <div className="mt-8 relative">
        {/* STEP 1 */}
        <div
          className={
            step === 1
              ? "relative z-10 opacity-100 pointer-events-auto transition-opacity duration-200"
              : "absolute inset-0 z-0 opacity-0 pointer-events-none transition-opacity duration-200"
          }
        >
          <ProgressPills step={step} />

          <div className="text-center mb-8">
            <h1 className="text-[24px] font-black text-gray-900 tracking-tight mb-2">
              Crea tu perfil
            </h1>
            <p className="text-[15px] text-gray-500">
              ¿Cómo quieres que te llamen en Bopp?
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-[13px] font-bold text-gray-700 mb-1.5 ml-1">
                Nombre
              </label>
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                type="text"
                autoComplete="name"
                placeholder="Tu nombre real o apodo"
                className="w-full px-4 py-3.5 bg-white border border-gray-200 rounded-xl text-[15px] text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all shadow-sm"
              />
            </div>

            <div>
              <label className="block text-[13px] font-bold text-gray-700 mb-1.5 ml-1">
                Username
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium text-[15px] pointer-events-none">
                  @
                </span>
                <input
                  value={usernameRaw}
                  onChange={(e) => setUsernameRaw(e.target.value)}
                  type="text"
                  autoComplete="username"
                  placeholder="tu_username"
                  className="w-full pl-8 pr-4 py-3.5 bg-white border border-gray-200 rounded-xl text-[15px] text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all shadow-sm"
                />
              </div>

              <div className="flex items-center justify-between mt-2 ml-1">
                <span className="text-[12px] text-gray-500">
                  Solo minúsculas, números y _.
                </span>

                {!usernameRaw.trim() && suggestedUsername ? (
                  <button
                    type="button"
                    onClick={() => setUsernameRaw(suggestedUsername)}
                    className="text-[12px] font-bold text-blue-600 hover:opacity-70 transition-opacity"
                  >
                    Usar @{suggestedUsername}
                  </button>
                ) : usernameStatus.state === "checking" ? (
                  <span className="text-[12px] font-bold text-gray-500">
                    Verificando…
                  </span>
                ) : usernameStatus.state === "available" ? (
                  <span className="text-[12px] font-bold text-green-600">
                    Disponible
                  </span>
                ) : usernameStatus.state === "taken" ? (
                  <span className="text-[12px] font-bold text-red-600">
                    No disponible
                  </span>
                ) : usernameStatus.state === "invalid" ? (
                  <span className="text-[12px] font-bold text-red-600">
                    {usernameStatus.message}
                  </span>
                ) : (
                  <span className="text-[12px] text-gray-400">&nbsp;</span>
                )}
              </div>
            </div>

            {error ? <div className="text-sm text-red-600">{error}</div> : null}

            <button
              type="button"
              onClick={goNextFromStep1}
              disabled={!step1CanContinue}
              className="w-full mt-8 py-3.5 bg-blue-600 text-white font-bold text-[15px] rounded-2xl active:scale-[0.98] hover:bg-blue-700 transition-all disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed shadow-sm"
            >
              Continuar
            </button>
          </div>
        </div>

        {/* STEP 2 */}
        <div
          className={
            step === 2
              ? "relative z-10 opacity-100 pointer-events-auto transition-opacity duration-200"
              : "absolute inset-0 z-0 opacity-0 pointer-events-none transition-opacity duration-200"
          }
        >
          <ProgressPills step={step} />
          <div className="text-center mb-8">
            <h2 className="text-3xl font-extrabold tracking-tight text-gray-900">
              Tu foto
            </h2>
            <p className="text-gray-600 mt-2">Sumá una foto para que te reconozcan.</p>
          </div>

          <div className="flex flex-col">
            {/* Contenedor Principal del Uploader */}
            <div className="flex justify-center my-10">
              <div onClick={handleTriggerUpload} className="relative cursor-pointer group">
                <div className="w-[120px] h-[120px] rounded-full bg-gray-100 flex flex-col items-center justify-center overflow-hidden border border-gray-200 shadow-sm group-hover:bg-gray-200 transition-colors">
                  {avatarPreviewUrl ? (
                    <img src={avatarPreviewUrl} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <FaUser className="w-12 h-12 text-gray-300 mt-2" />
                  )}
                </div>

                <div className="absolute bottom-1 right-1 w-9 h-9 bg-blue-600 rounded-full border-4 border-gray-50 flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                  <FaPlus className="w-3.5 h-3.5 text-white" />
                </div>
              </div>

              <input
                id="avatar-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarFileChange}
              />
            </div>

            {avatarUploading ? (
              <div className="mt-1 text-sm text-gray-500 text-center">Subiendo…</div>
            ) : null}
            {error ? <div className="mt-3 text-sm text-red-600 text-center">{error}</div> : null}

            {/* Botones */}
            <div className="flex flex-col gap-3 w-full mt-auto">
              <button
                type="button"
                disabled={!avatarPreviewUrl}
                onClick={goNextFromStep2}
                className="w-full py-3.5 bg-blue-600 text-white font-bold text-[15px] rounded-2xl active:scale-[0.98] hover:bg-blue-700 transition-all disabled:bg-gray-300 disabled:text-gray-500 disabled:shadow-none shadow-sm"
              >
                Continuar
              </button>

              <button
                type="button"
                onClick={() => setStep(3)}
                className="w-full py-3.5 bg-white border-[1.5px] border-gray-300 text-gray-900 font-bold text-[15px] rounded-2xl active:scale-[0.98] hover:bg-gray-50 transition-all"
              >
                Omitir por ahora
              </button>

              <button
                type="button"
                onClick={() => setStep(1)}
                className="mt-2 text-[14px] text-gray-500 hover:text-gray-900 font-medium transition-colors rounded-2xl"
              >
                Volver
              </button>
            </div>
          </div>
        </div>

        {/* STEP 3 */}
        <div
          className={
            step === 3
              ? "relative z-10 opacity-100 pointer-events-auto transition-opacity duration-200"
              : "absolute inset-0 z-0 opacity-0 pointer-events-none transition-opacity duration-200"
          }
        >
          <ProgressPills step={step} />
          <div className="text-center mb-8">
            <h2 className="text-3xl font-extrabold tracking-tight text-gray-900">
              Tus tops
            </h2>
            <p className="text-gray-600 mt-2">
              Elegí tus favoritos. Podés hacerlo ahora o después.
            </p>
          </div>

          <div className="space-y-6">
            {/* Top 4 Álbumes */}
            <div>
              <div className="flex items-center justify-between px-1 mb-3">
                <h3 className="font-bold text-gray-900">Top 4 Álbumes</h3>
                <span className="text-xs text-gray-500">tocá para elegir</span>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {[0, 1, 2, 3].map((idx) => {
                  const album = topAlbums[idx];
                  if (album) {
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => openPicker("album", idx)}
                        className="relative w-full aspect-square rounded-lg overflow-hidden group border border-black/5"
                        aria-label={`Elegir álbum favorito ${idx + 1}`}
                      >
                        <img
                          src={album.image_url}
                          className="w-full h-full object-cover"
                          alt={album.title}
                        />
                        <div className="absolute inset-0 bg-black/35 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                          <FaExchangeAlt className="w-5 h-5 text-white opacity-90" />
                        </div>
                      </button>
                    );
                  }
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => openPicker("album", idx)}
                      className="w-full aspect-square rounded-lg border-2 border-dashed border-gray-200 flex items-center justify-center hover:bg-black/5 transition-colors"
                      aria-label={`Elegir álbum favorito ${idx + 1}`}
                    >
                      <FaPlus className="w-6 h-6 text-gray-300" />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Top 4 Canciones */}
            <div>
              <div className="flex items-center justify-between px-1 mb-2">
                <h3 className="font-bold text-gray-900">Top 4 Canciones</h3>
                <span className="text-xs text-gray-500">tocá para elegir</span>
              </div>

              <div>
                {[0, 1, 2, 3].map((idx) => {
                  const song = topSongs[idx];
                  const position = idx + 1;
                  if (song) {
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => openPicker("track", idx)}
                        className="flex items-center gap-3 py-2 w-full text-left hover:bg-black/5 rounded transition-colors"
                        aria-label={`Elegir canción top ${position}`}
                      >
                        <span className="w-4 text-center text-sm font-bold text-gray-400">
                          {position}
                        </span>
                        <div className="w-12 h-12 rounded-md overflow-hidden bg-gray-200 shrink-0 relative">
                          <img
                            src={song.image_url}
                            alt={song.title}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black/35 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                            <FaExchangeAlt className="w-5 h-5 text-white opacity-90" />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-gray-900 font-medium text-sm truncate">
                            {song.title}
                          </div>
                          <div className="text-xs text-gray-500 truncate">{song.artist}</div>
                        </div>
                      </button>
                    );
                  }

                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => openPicker("track", idx)}
                      className="flex items-center gap-4 py-2 w-full text-left"
                      aria-label={`Elegir canción top ${position}`}
                    >
                      <span className="w-4 text-center text-sm font-bold text-gray-400 shrink-0">
                        {position}
                      </span>
                      <div className="w-12 h-12 rounded-md border-2 border-dashed border-gray-200 bg-gray-50 flex items-center justify-center hover:border-gray-300 hover:bg-gray-100 transition-all shrink-0">
                        <FaPlus className="w-4 h-4 text-gray-400" />
                      </div>
                      <div className="flex flex-col flex-1">
                        <span className="text-sm font-medium text-gray-400 hover:text-gray-600 transition-colors">
                          Añadir canción
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {error ? <div className="text-sm text-red-600">{error}</div> : null}

            <div className="pt-2 space-y-3">
              <button
                type="button"
                onClick={() => finish({ skipTops: false })}
                disabled={saving}
                className="w-full py-4 rounded-2xl bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-60"
              >
                {saving ? "Guardando..." : "Finalizar"}
              </button>

              <button
                type="button"
                onClick={() => finish({ skipTops: true })}
                disabled={saving}
                className="w-full py-4 rounded-2xl bg-white border border-gray-200 text-gray-900 font-semibold hover:bg-gray-50 disabled:opacity-60"
              >
                Omitir y terminar
              </button>

              <button
                type="button"
                onClick={() => setStep(2)}
                className="w-full py-3 rounded-2xl text-gray-600 hover:text-gray-900"
              >
                Volver
              </button>
            </div>
          </div>
        </div>
      </div>

      <TopPickerModal
        open={isPickerOpen}
        type={pickerType}
        onClose={() => setIsPickerOpen(false)}
        onSelect={handleSelectTopItem}
      />
    </div>
  );
}
