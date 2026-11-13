import { CheckCircle2, Eye, EyeOff, Globe, Loader2, ShieldAlert } from "lucide-react";
import { btn, card, ghost, IconChip } from "@/features/dashboard/library/ui";
import { useSetOwnPublication } from "../../hooks/useAstrologerWorkspace";
import type { AstrologerProfileSelf } from "../../types";

interface PublicationStatusCardProps {
  profile: AstrologerProfileSelf;
}

export function PublicationStatusCard({ profile }: PublicationStatusCardProps) {
  const setPublication = useSetOwnPublication();
  const isSuspended = Boolean(profile.suspendedAt);

  const handleToggle = () => {
    if (isSuspended) return;
    setPublication.mutate(!profile.isPublished);
  };

  return (
    <div className={`${card} p-5 sm:p-6 shadow-sm`}>
      <div className="mb-5 flex items-start gap-3.5 border-b border-[#E9DDC9] pb-4">
        <IconChip icon={Globe} tone="brown" size="sm" />
        <div className="min-w-0">
          <h2 className="font-home-serif text-lg font-semibold text-[#2A1A10]">
            Directory Publication
          </h2>
          <p className="mt-0.5 text-xs text-[#6E5D4E]">
            Control whether your profile is publicly visible to prospective clients.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Status Callout Box */}
        <div
          className={`flex items-start gap-3.5 rounded-xl border p-4 ${
            isSuspended
              ? "border-red-200 bg-red-50 text-red-900"
              : profile.isPublished
              ? "border-[#2F7D4B]/30 bg-[#2F7D4B]/5 text-[#1C4E2F]"
              : "border-[#D8C6A6] bg-[#FAF6EE] text-[#5A3816]"
          }`}
        >
          {isSuspended ? (
            <ShieldAlert className="h-5 w-5 shrink-0 text-red-700" />
          ) : profile.isPublished ? (
            <div className="relative mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center">
              <span className="h-2.5 w-2.5 rounded-full bg-[#2F7D4B]" />
              <span className="absolute h-4 w-4 rounded-full bg-[#2F7D4B]/40 animate-ping" />
            </div>
          ) : (
            <EyeOff className="h-5 w-5 shrink-0 text-[#803003]" />
          )}

          <div className="min-w-0 text-xs sm:text-sm">
            <p className="font-semibold">
              {isSuspended
                ? "Publication Suspended"
                : profile.isPublished
                ? "Profile is Live & Discoverable"
                : "Profile is Hidden (Draft Mode)"}
            </p>
            <p className="mt-1 text-xs leading-relaxed opacity-90">
              {isSuspended
                ? "Your publication privilege is currently suspended by administrative review."
                : profile.isPublished
                ? "Your card appears in search, categories, and direct links. Visitors can initiate consultations with you."
                : "Your profile is saved privately. When you are ready, publish to start receiving consultations."}
            </p>
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-1">
          <button
            type="button"
            className={`w-full ${
              profile.isPublished ? ghost : btn
            }`}
            disabled={setPublication.isPending || isSuspended}
            title={isSuspended ? "Cannot change status while suspended" : undefined}
            onClick={handleToggle}
          >
            {setPublication.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : profile.isPublished ? (
              <EyeOff className="h-4 w-4 text-[#803003]" />
            ) : (
              <Eye className="h-4 w-4 text-[#F3E8D4]" />
            )}
            <span>{profile.isPublished ? "Unpublish Profile" : "Publish Profile Live"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

