import { useState, useEffect } from "react";
import { Loader2, Sparkles, User } from "lucide-react";
import { btn, card, field, IconChip, labelCls } from "@/features/dashboard/library/ui";
import { useUpdateAstrologerProfile } from "../../hooks/useAstrologerWorkspace";
import type { AstrologerProfileSelf } from "../../types";

interface ProfileDetailsCardProps {
  profile: AstrologerProfileSelf;
}

export function ProfileDetailsCard({ profile }: ProfileDetailsCardProps) {
  const update = useUpdateAstrologerProfile();
  const [displayName, setDisplayName] = useState(profile.displayName);
  const [yearsOfExperience, setYearsOfExperience] = useState(
    profile.yearsOfExperience?.toString() ?? ""
  );
  const [bio, setBio] = useState(profile.bio ?? "");
  const [error, setError] = useState<string | null>(null);

  // Keep state in sync if parent query updates
  useEffect(() => {
    setDisplayName(profile.displayName);
    setYearsOfExperience(profile.yearsOfExperience?.toString() ?? "");
    setBio(profile.bio ?? "");
  }, [profile.displayName, profile.yearsOfExperience, profile.bio]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = displayName.trim();
    if (!trimmedName) {
      setError("Display name is required.");
      return;
    }

    let expNum: number | null = null;
    if (yearsOfExperience.trim() !== "") {
      const parsed = Number(yearsOfExperience);
      if (!Number.isInteger(parsed) || parsed < 0 || parsed > 100) {
        setError("Please enter a valid number of years of experience (0 to 100).");
        return;
      }
      expNum = parsed;
    }

    setError(null);
    update.mutate({
      displayName: trimmedName,
      yearsOfExperience: expNum,
      bio: bio.trim() || null,
    });
  };

  return (
    <div className={`${card} p-5 sm:p-6 shadow-sm`}>
      <div className="mb-5 flex items-start gap-3.5 border-b border-[#E9DDC9] pb-4">
        <IconChip icon={User} tone="brown" size="sm" />
        <div className="min-w-0">
          <h2 className="font-home-serif text-lg font-semibold text-[#2A1A10]">
            Basic Information
          </h2>
          <p className="mt-0.5 text-xs text-[#6E5D4E]">
            How your identity and experience appear across the platform.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Display Name */}
          <div>
            <label htmlFor="displayName" className={labelCls}>
              Display Name <span className="text-[#803003]">*</span>
            </label>
            <input
              id="displayName"
              type="text"
              required
              className={`${field} mt-1`}
              value={displayName}
              onChange={(e) => {
                setDisplayName(e.target.value);
                setError(null);
              }}
              placeholder="e.g. Acharya Rajesh Sharma"
            />
            <p className="mt-1 text-[0.7rem] text-[#8C7A6B]">
              The public name visitors see on your profile and in chat.
            </p>
          </div>

          {/* Years of Experience */}
          <div>
            <label htmlFor="yearsOfExperience" className={labelCls}>
              Years of Experience
            </label>
            <input
              id="yearsOfExperience"
              type="number"
              min={0}
              max={100}
              className={`${field} mt-1`}
              value={yearsOfExperience}
              onChange={(e) => {
                setYearsOfExperience(e.target.value);
                setError(null);
              }}
              placeholder="e.g. 12"
            />
            <p className="mt-1 text-[0.7rem] text-[#8C7A6B]">
              Total years practicing astrology or spiritual sciences.
            </p>
          </div>
        </div>

        {/* Bio */}
        <div>
          <div className="flex items-center justify-between">
            <label htmlFor="bio" className={labelCls}>
              About & Bio
            </label>
            <span className="text-[0.7rem] text-[#8C7A6B]">
              {bio.length} / 1000 characters
            </span>
          </div>
          <textarea
            id="bio"
            rows={4}
            maxLength={1000}
            className={`${field} mt-1 resize-y`}
            value={bio}
            onChange={(e) => {
              setBio(e.target.value);
              setError(null);
            }}
            placeholder="Share your lineage, philosophy, expertise in Vedic astrology, Kundali matching, or how you approach client readings..."
          />
          <p className="mt-1 text-[0.7rem] text-[#8C7A6B]">
            A thorough bio builds trust and helps prospective seekers understand your guidance style.
          </p>
        </div>

        {error && (
          <p role="alert" className="text-xs font-medium text-red-700">
            {error}
          </p>
        )}

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            className={`${btn} min-w-[140px]`}
            disabled={update.isPending}
          >
            {update.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Save Details
          </button>
        </div>
      </form>
    </div>
  );
}

