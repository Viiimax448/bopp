"use client";

export default function AvatarUpload({
  avatarUrl,
  uploading = false,
  onTriggerUpload,
}: {
  avatarUrl: string;
  uploading?: boolean;
  onTriggerUpload: () => void;
}) {
  const handleClick = () => {
    if (uploading) return;
    onTriggerUpload();
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
      <div
        className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 rounded-full transition cursor-pointer z-10"
        onClick={handleClick}
        style={{ pointerEvents: uploading ? "none" : "auto" }}
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
