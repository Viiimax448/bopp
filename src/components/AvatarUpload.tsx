"use client";
import { useRef, useState } from "react";
import imageCompression from "browser-image-compression";
import { createBrowserClient } from "@supabase/ssr";

export default function AvatarUpload({ user, avatarUrl, onAvatarChange }: {
  user: { id: string };
  avatarUrl: string;
  onAvatarChange: (url: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleClick = () => {
    inputRef.current?.click();
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.id) return;
    setUploading(true);
    // Comprimir y convertir a webp 400x400px, <50KB
    const options = {
      maxSizeMB: 0.05,
      maxWidthOrHeight: 400,
      useWebWorker: true,
      fileType: "image/webp",
      initialQuality: 0.7,
    };
    let compressedFile: File;
    try {
      compressedFile = await imageCompression(file, options);
    } catch {
      setUploading(false);
      return;
    }
    // Subir a Supabase Storage
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const path = `${user.id}.webp`;
    // Intentar subir el archivo, si ya existe lo borra y reintenta
    let uploadRes = await supabase.storage
      .from("avatars")
      .upload(path, compressedFile, { contentType: "image/webp" });
    // Manejo robusto: si el error es 'resource already exists', borra y reintenta
    if (uploadRes.error && (
      uploadRes.error.statusCode === '409' ||
      (typeof uploadRes.error.message === 'string' && uploadRes.error.message.toLowerCase().includes('resource already exists'))
    )) {
      await supabase.storage.from("avatars").remove([path]);
      uploadRes = await supabase.storage
        .from("avatars")
        .upload(path, compressedFile, { contentType: "image/webp" });
    }
    if (uploadRes.error) {
      console.error('Error subiendo avatar:', uploadRes.error);
      setUploading(false);
      return;
    }
    // Obtener URL pública y actualizar perfil
    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    if (data?.publicUrl) {
      // Optimistic UI: forzar recarga instantánea con timestamp
      const urlConTimestamp = `${data.publicUrl}?t=${Date.now()}`;
      onAvatarChange(urlConTimestamp);
      await supabase
        .from("profiles")
        .update({ avatar_url: data.publicUrl })
        .eq("id", user.id);
    }
    setUploading(false);
  };

  return (
    <div className="relative group w-36 h-36">
      <img
        src={avatarUrl}
        alt="Avatar"
        className={`w-36 h-36 rounded-full object-cover cursor-pointer transition-opacity ${uploading ? "opacity-60" : ""}`}
        onClick={handleClick}
        draggable={false}
      />
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFile}
        disabled={uploading}
      />
      <div
        className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 rounded-full transition cursor-pointer z-10"
        onClick={handleClick}
        style={{ pointerEvents: uploading ? 'none' : 'auto' }}
      >
        <span className="text-white font-bold text-sm select-none">Cambiar</span>
      </div>
      {uploading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full z-20">
          <span className="text-white font-bold text-sm">Subiendo...</span>
        </div>
      )}
    </div>
  );
}
