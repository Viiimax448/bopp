import React from "react";

export default function ProfileHeader({ profile }: { profile: any }) {
  return (
    <div className="flex flex-col items-center mb-6">
      <img
        src={profile.avatar_url || "/default-avatar.png"}
        alt={profile.username}
        className="w-24 h-24 rounded-full object-cover mb-2 border-4 border-white shadow"
      />
      <h2 className="text-2xl font-bold text-center">{profile.full_name || profile.username}</h2>
      <div className="text-gray-400 text-sm">@{profile.username}</div>
      {/* Aquí puedes agregar stats, followers, etc. */}
    </div>
  );
}
