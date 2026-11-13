import { useState, useEffect } from "react";
import { Check, Globe2, Loader2, Plus, X } from "lucide-react";
import { btn, card, field, ghost, IconChip, labelCls } from "@/features/dashboard/library/ui";
import { useUpdateAstrologerProfile } from "../../hooks/useAstrologerWorkspace";
import type { AstrologerProfileSelf } from "../../types";

const POPULAR_LANGUAGES = [
  "Hindi",
  "English",
  "Sanskrit",
  "Gujarati",
  "Marathi",
  "Bengali",
  "Tamil",
  "Telugu",
  "Kannada",
  "Malayalam",
  "Punjabi",
  "Odia",
];

interface LanguagesCardProps {
  profile: AstrologerProfileSelf;
}

export function LanguagesCard({ profile }: LanguagesCardProps) {
  const update = useUpdateAstrologerProfile();
  const [languages, setLanguages] = useState<string[]>(profile.languages ?? []);
  const [customInput, setCustomInput] = useState("");

  useEffect(() => {
    setLanguages(profile.languages ?? []);
  }, [profile.languages]);

  const addLanguage = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (!languages.some((l) => l.toLowerCase() === trimmed.toLowerCase())) {
      setLanguages((prev) => [...prev, trimmed]);
    }
    setCustomInput("");
  };

  const removeLanguage = (toRemove: string) => {
    setLanguages((prev) => prev.filter((l) => l !== toRemove));
  };

  const handleSave = () => {
    update.mutate({ languages });
  };

  return (
    <div className={`${card} p-5 sm:p-6 shadow-sm`}>
      <div className="mb-5 flex items-start gap-3.5 border-b border-[#E9DDC9] pb-4">
        <IconChip icon={Globe2} tone="brown" size="sm" />
        <div className="min-w-0">
          <h2 className="font-home-serif text-lg font-semibold text-[#2A1A10]">
            Consultation Languages
          </h2>
          <p className="mt-0.5 text-xs text-[#6E5D4E]">
            Select the languages in which you can fluently converse and consult with seekers.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Selected Languages Pills */}
        <div>
          <label className={labelCls}>Selected Languages</label>
          {languages.length > 0 ? (
            <ul className="mt-2 flex flex-wrap gap-2">
              {languages.map((lang) => (
                <li
                  key={lang}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[#D8C6A6] bg-[#FBF5EC] px-3.5 py-1 text-xs font-semibold text-[#5A3816] shadow-2xs"
                >
                  <span>{lang}</span>
                  <button
                    type="button"
                    onClick={() => removeLanguage(lang)}
                    className="flex h-4 w-4 items-center justify-center rounded-full text-[#8C6D4F] transition-colors hover:bg-[#EADBC4] hover:text-[#3A1C0C]"
                    aria-label={`Remove ${lang}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-xs italic text-[#8C7A6B]">
              No languages selected yet. Add at least one language below.
            </p>
          )}
        </div>

        {/* Add custom language input */}
        <div>
          <label htmlFor="customLang" className={labelCls}>
            Add Another Language
          </label>
          <div className="mt-1 flex gap-2">
            <input
              id="customLang"
              type="text"
              className={field}
              placeholder="e.g. French, Marwari, Bhojpuri"
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addLanguage(customInput);
                }
              }}
            />
            <button
              type="button"
              onClick={() => addLanguage(customInput)}
              className={`${ghost} shrink-0`}
            >
              <Plus className="h-4 w-4" /> Add
            </button>
          </div>
        </div>

        {/* Quick suggestions */}
        <div>
          <p className="text-[0.7rem] font-semibold uppercase tracking-wider text-[#A8803A]">
            Quick suggestions
          </p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {POPULAR_LANGUAGES.map((lang) => {
              const isSelected = languages.some((l) => l.toLowerCase() === lang.toLowerCase());
              return (
                <button
                  key={lang}
                  type="button"
                  onClick={() => (isSelected ? removeLanguage(lang) : addLanguage(lang))}
                  className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                    isSelected
                      ? "border border-[#A8803A]/40 bg-[#F3E8D4] text-[#5A3816]"
                      : "border border-[#E9DDC9] bg-white text-[#6E5D4E] hover:border-[#D8C6A6] hover:bg-[#FAF6EE]"
                  }`}
                >
                  {isSelected && <Check className="h-3 w-3 text-[#2F7D4B]" />}
                  {lang}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="button"
            className={`${btn} min-w-[140px]`}
            onClick={handleSave}
            disabled={update.isPending}
          >
            {update.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Save Languages
          </button>
        </div>
      </div>
    </div>
  );
}

