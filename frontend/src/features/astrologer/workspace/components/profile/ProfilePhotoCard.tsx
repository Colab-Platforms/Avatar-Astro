import { useRef, useState } from "react";
import { Camera, Image as ImageIcon, Loader2, Upload, UserCog } from "lucide-react";
import { card, focusRing, ghost, IconChip } from "@/features/dashboard/library/ui";
import { useUploadAstrologerPhoto } from "../../hooks/useAstrologerWorkspace";
import type { AstrologerProfileSelf } from "../../types";

const ALLOWED_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"];
const MAX_PHOTO_BYTES = 10 * 1024 * 1024; // 10 MB

interface ProfilePhotoCardProps {
  profile: AstrologerProfileSelf;
}

export function ProfilePhotoCard({ profile }: ProfilePhotoCardProps) {
  const upload = useUploadAstrologerPhoto();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleFileProcess = (file: File) => {
    if (!ALLOWED_PHOTO_TYPES.includes(file.type)) {
      setError("Please choose a valid image file (JPEG, PNG, WebP, or AVIF).");
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      setError("Image size must be 10 MB or smaller.");
      return;
    }
    setError(null);
    upload.mutate(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) handleFileProcess(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileProcess(file);
  };

  const initials =
    profile.displayName
      .split(/\s+/)
      .map((p) => p[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "A";

  return (
    <div className={`${card} p-5 sm:p-6 shadow-sm`}>
      <div className="mb-5 flex items-start gap-3.5 border-b border-[#E9DDC9] pb-4">
        <IconChip icon={ImageIcon} tone="gold" size="sm" />
        <div className="min-w-0">
          <h2 className="font-home-serif text-lg font-semibold text-[#2A1A10]">
            Profile Photograph
          </h2>
          <p className="mt-0.5 text-xs text-[#6E5D4E]">
            Your headshot is shown to clients across the directory and in consultation rooms.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Photo Preview & Drop Area */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          className={`flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 text-center transition-colors ${
            isDragOver
              ? "border-[#803003] bg-[#FAF3E8]"
              : "border-[#E0D2BA] bg-[#FAF8F5]/60 hover:bg-[#FAF8F5]"
          }`}
        >
          {/* Avatar display */}
          <div className="relative mb-3 h-24 w-24 shrink-0 overflow-hidden rounded-full border-2 border-[#A8803A]/50 bg-white shadow-md">
            {profile.profilePhotoUrl ? (
              <img
                src={profile.profilePhotoUrl}
                alt={profile.displayName}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-[#3A1C0C] font-home-serif text-3xl font-bold text-[#F3E8D4]">
                {initials}
              </div>
            )}
            {upload.isPending && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-2xs">
                <Loader2 className="h-6 w-6 animate-spin text-white" />
              </div>
            )}
          </div>

          <div className="space-y-1">
            <p className="text-xs font-medium text-[#2A1A10]">
              Drag and drop an image here, or browse
            </p>
            <p className="text-[0.7rem] text-[#8C7A6B]">
              JPG, PNG, WebP or AVIF up to 10 MB. Recommended square 400x400.
            </p>
          </div>

          <div className="mt-3">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={upload.isPending}
              className={`${ghost} ${focusRing} text-xs`}
            >
              {upload.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Upload className="h-3.5 w-3.5 text-[#803003]" />
              )}
              {profile.profilePhotoUrl ? "Change Photo" : "Upload Photo"}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept={ALLOWED_PHOTO_TYPES.join(",")}
              className="sr-only"
              onChange={handleFileChange}
            />
          </div>
        </div>

        {error && (
          <p role="alert" className="text-xs font-medium text-red-700">
            {error}
          </p>
        )}

        {/* Photography guidelines */}
        <div className="rounded-xl border border-[#E9DDC9]/70 bg-[#FFFDF8] p-3 text-[0.75rem] text-[#6E5D4E]">
          <p className="font-semibold text-[#2A1A10]">Guidelines for high trust:</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-4 text-[#8C7A6B]">
            <li>Clear, well-lit face with direct eye contact</li>
            <li>Plain or dignified background (ashram, study, or neutral tone)</li>
            <li>No watermarks, heavy filters, or group photos</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

