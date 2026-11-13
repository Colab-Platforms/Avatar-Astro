import { useRef } from "react";
import { Link } from "react-router-dom";
import {
  BadgeCheck,
  Camera,
  Clock3,
  Coins,
  ExternalLink,
  Globe2,
  Loader2,
  Sparkles,
  UserCheck,
} from "lucide-react";
import { card, focusRing, ghost } from "@/features/dashboard/library/ui";
import { useUploadAstrologerPhoto } from "../../hooks/useAstrologerWorkspace";
import type { AstrologerProfileSelf } from "../../types";

interface ProfileHeroBannerProps {
  profile: AstrologerProfileSelf;
}

export function ProfileHeroBanner({ profile }: ProfileHeroBannerProps) {
  const upload = useUploadAstrologerPhoto();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    upload.mutate(file);
  };

  const initials =
    profile.displayName
      .split(/\s+/)
      .map((p) => p[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "A";

  return (
    <div
      className={`${card} mb-6 overflow-hidden border-[#E9DDC9] bg-gradient-to-br from-[#FFFDF8] via-[#FDF9F2] to-[#FAF4E9] p-5 sm:p-7 shadow-sm`}
    >
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        {/* Left: Avatar & Details */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-5 min-w-0">
          {/* Avatar with live status indicator & quick upload */}
          <div className="relative h-20 w-20 shrink-0 self-start sm:self-auto">
            <div className="h-20 w-20 overflow-hidden rounded-2xl border-2 border-[#A8803A]/40 bg-white shadow-xs">
              {profile.profilePhotoUrl ? (
                <img
                  src={profile.profilePhotoUrl}
                  alt={profile.displayName}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-[#3A1C0C] font-home-serif text-2xl font-bold text-[#F3E8D4]">
                  {initials}
                </div>
              )}
            </div>

            {/* Quick change photo badge */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={upload.isPending}
              aria-label="Change profile photo"
              title="Change profile photo"
              className={`absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-xl border-2 border-[#FFFDF8] bg-[#3A1C0C] text-[#F3E8D4] transition-transform hover:scale-105 hover:bg-[#2A1308] disabled:opacity-60 ${focusRing}`}
            >
              {upload.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Camera className="h-3.5 w-3.5" aria-hidden="true" />
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif"
              className="sr-only"
              onChange={handlePhotoSelect}
            />

            {/* Online presence badge */}
            <span
              className={`absolute -top-1 -left-1 flex h-4 w-4 items-center justify-center rounded-full border-2 border-white ${
                profile.isOnline ? "bg-[#2F7D4B]" : "bg-[#9A8575]"
              }`}
              title={profile.isOnline ? "Online for chats" : "Offline"}
            >
              {profile.isOnline && (
                <span className="h-2 w-2 rounded-full bg-white opacity-75 animate-ping" />
              )}
            </span>
          </div>

          {/* Identity & Badges */}
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-home-serif text-2xl sm:text-3xl font-semibold tracking-tight text-[#2A1A10]">
                {profile.displayName}
              </h1>
              <BadgeCheck className="h-5 w-5 text-[#A8803A]" aria-label="Verified Astrologer" />
            </div>

            <p className="text-xs text-[#8C7A6B]">
              Public handle: <span className="font-mono text-[#5A493C]">@{profile.slug}</span>
            </p>

            {/* Status & Highlight Chips */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {/* Publication Pill */}
              {profile.isPublished ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-[#2F7D4B]/20 bg-[#2F7D4B]/10 px-2.5 py-1 text-xs font-semibold text-[#2F7D4B]">
                  <span className="h-2 w-2 rounded-full bg-[#2F7D4B]" />
                  Live & Published
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-[#803003]/20 bg-[#F3E8D4]/70 px-2.5 py-1 text-xs font-semibold text-[#803003]">
                  <span className="h-2 w-2 rounded-full bg-[#803003]" />
                  Draft · Unpublished
                </span>
              )}

              {/* Online Presence Pill */}
              <span
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${
                  profile.isOnline
                    ? "border-[#2F7D4B]/20 bg-[#E8F3EB] text-[#2F7D4B]"
                    : "border-[#E0D2BA] bg-white text-[#6E5D4E]"
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    profile.isOnline ? "bg-[#2F7D4B]" : "bg-[#9A8575]"
                  }`}
                />
                {profile.isOnline ? "Online" : "Offline"}
              </span>

              {/* Experience Pill */}
              {profile.yearsOfExperience != null && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-[#E9DDC9] bg-white px-2.5 py-1 text-xs font-medium text-[#5A493C]">
                  <Clock3 className="h-3 w-3 text-[#A8803A]" />
                  {profile.yearsOfExperience} yrs experience
                </span>
              )}

              {/* Pricing Pill */}
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#E9DDC9] bg-white px-2.5 py-1 text-xs font-medium text-[#5A493C]">
                <Coins className="h-3 w-3 text-[#A8803A]" />
                {profile.pricePerMinute != null ? `₹${profile.pricePerMinute}/min` : "Free chat"}
              </span>

              {/* Languages Pill */}
              {profile.languages?.length > 0 && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-[#E9DDC9] bg-white px-2.5 py-1 text-xs font-medium text-[#5A493C]">
                  <Globe2 className="h-3 w-3 text-[#A8803A]" />
                  {profile.languages.length} {profile.languages.length === 1 ? "language" : "languages"}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right: Quick Actions */}
        <div className="flex flex-wrap items-center gap-3 self-start md:self-center">
          <Link
            to={`/astrologers/${profile.slug}`}
            target="_blank"
            rel="noreferrer"
            className={`${ghost} shadow-xs text-xs sm:text-sm`}
            title="Open your public profile page in a new tab"
          >
            <span>View Public Profile</span>
            <ExternalLink className="h-3.5 w-3.5 text-[#803003]" />
          </Link>
        </div>
      </div>
    </div>
  );
}

