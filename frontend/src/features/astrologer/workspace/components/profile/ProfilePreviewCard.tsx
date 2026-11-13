import { Link } from "react-router-dom";
import { BadgeCheck, Clock3, ExternalLink, Eye, MessageCircle, Star } from "lucide-react";
import { card, ghost, IconChip } from "@/features/dashboard/library/ui";
import type { AstrologerProfileSelf } from "../../types";

interface ProfilePreviewCardProps {
  profile: AstrologerProfileSelf;
}

export function ProfilePreviewCard({ profile }: ProfilePreviewCardProps) {
  const initials =
    profile.displayName
      .split(/\s+/)
      .map((p) => p[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "A";

  const languagesList =
    profile.languages?.length > 0
      ? profile.languages.slice(0, 3).join(", ") +
        (profile.languages.length > 3 ? ` +${profile.languages.length - 3}` : "")
      : "No languages added";

  return (
    <div className={`${card} p-5 sm:p-6 shadow-sm`}>
      <div className="mb-4 flex items-start justify-between gap-3 border-b border-[#E9DDC9] pb-4">
        <div className="flex items-start gap-3.5">
          <IconChip icon={Eye} tone="gold" size="sm" />
          <div className="min-w-0">
            <h2 className="font-home-serif text-lg font-semibold text-[#2A1A10]">
              Client Directory Preview
            </h2>
            <p className="mt-0.5 text-xs text-[#6E5D4E]">
              How your card appears to seekers on the marketplace.
            </p>
          </div>
        </div>
      </div>

      {/* Simulated Astrologer Card */}
      <div className="overflow-hidden rounded-2xl border border-[#E9DDC9] bg-white p-4 shadow-2xs">
        <div className="flex items-start gap-3.5">
          {/* Avatar */}
          <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-[#A8803A]/40 bg-[#FAF6EE]">
            {profile.profilePhotoUrl ? (
              <img
                src={profile.profilePhotoUrl}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-[#3A1C0C] font-home-serif text-lg font-bold text-[#F3E8D4]">
                {initials}
              </div>
            )}
            <span
              className={`absolute bottom-1 right-1 h-3 w-3 rounded-full border-2 border-white ${
                profile.isOnline ? "bg-[#2F7D4B]" : "bg-[#9A8575]"
              }`}
            />
          </div>

          {/* Details */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <h3 className="truncate font-home-serif text-base font-semibold text-[#2A1A10]">
                {profile.displayName}
              </h3>
              <BadgeCheck className="h-4 w-4 shrink-0 text-[#A8803A]" />
            </div>

            <p className="truncate text-xs text-[#6E5D4E]">{languagesList}</p>

            <div className="mt-1 flex flex-wrap items-center gap-2 text-[0.7rem] text-[#8C7A6B]">
              {profile.yearsOfExperience != null && (
                <span className="inline-flex items-center gap-0.5">
                  <Clock3 className="h-3 w-3 text-[#A8803A]" />
                  {profile.yearsOfExperience} yrs
                </span>
              )}
              <span>•</span>
              <span className="font-semibold text-[#803003]">
                {profile.pricePerMinute != null ? `₹${profile.pricePerMinute}/min` : "Free chat"}
              </span>
            </div>
          </div>
        </div>

        {/* Action simulator */}
        <div className="mt-4 border-t border-[#F3E8D4] pt-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[#6E5D4E]">
              {profile.isOnline ? "Available for chat" : "Currently offline"}
            </span>
            <span className="inline-flex items-center gap-1 rounded-lg bg-[#3A1C0C] px-3 py-1 font-medium text-[#F3E8D4]">
              <MessageCircle className="h-3 w-3" />
              Chat
            </span>
          </div>
        </div>
      </div>

      {/* Link to public profile */}
      <div className="mt-4">
        <Link
          to={`/astrologers/${profile.slug}`}
          target="_blank"
          rel="noreferrer"
          className={`${ghost} w-full text-xs`}
        >
          <span>Open Live Public Profile</span>
          <ExternalLink className="h-3.5 w-3.5 text-[#803003]" />
        </Link>
      </div>
    </div>
  );
}

