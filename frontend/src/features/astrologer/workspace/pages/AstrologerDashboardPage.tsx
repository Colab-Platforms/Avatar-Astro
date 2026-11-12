import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, MessageCircle, Plus, ShieldAlert, Upload, UserCog, X } from "lucide-react";
import { btn, card, ErrorBox, field, focusRing, ghost, IconChip, labelCls, Loading, PageHeader } from "@/features/dashboard/library/ui";
import {
  useAstrologerAccess, useSetOwnPublication, useUpdateAstrologerProfile, useUploadAstrologerPhoto,
} from "../hooks/useAstrologerWorkspace";

/**
 * Astrologer workspace — reachable only once approved. requireAstrologer on every API call
 * is the real gate; this page just renders a friendly message when that 403s instead of a
 * generic error, same pattern as the admin panel's MainOnly guard.
 */
export default function AstrologerDashboardPage() {
  const access = useAstrologerAccess();

  if (access.isLoading) return <Loading label="Loading your astrologer workspace…" />;

  if (access.denied) {
    return (
      <section className="mx-auto flex min-h-[50vh] max-w-lg flex-col items-center justify-center gap-3 px-4 text-center">
        <ShieldAlert className="h-8 w-8 text-[#A8803A]" aria-hidden="true" />
        <h1 className="font-home-serif text-xl font-semibold text-[#2A1A10]">Astrologer access required</h1>
        <p className="text-sm text-[#6E5D4E]">
          This workspace is only available once your astrologer application has been approved. Check your application status from your dashboard.
        </p>
        <Link to="/dashboard" className={ghost}>Back to dashboard</Link>
      </section>
    );
  }

  if (access.error || !access.profile) {
    return <ErrorBox error={access.error} onRetry={() => access.refetch()} />;
  }

  const profile = access.profile;

  return (
    <section className="mx-auto w-full max-w-3xl px-4 pb-16 pt-10 sm:px-6">
      <PageHeader
        eyebrow="Astrologer"
        title="Your Astrologer Profile"
        sub="Manage how you appear once published. Approval and publication are separate — nothing goes live until you publish."
        actions={
          <Link to="/astrologer-dashboard/chat" className={ghost}>
            <MessageCircle className="h-4 w-4" aria-hidden="true" /> Chats
          </Link>
        }
      />

      {profile.suspendedAt && (
        <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-900">
          <p className="font-semibold">Your astrologer access is suspended</p>
          {profile.suspensionReason && <p className="mt-1 text-sm">{profile.suspensionReason}</p>}
        </div>
      )}

      <PublicationCard profile={profile} />
      <div className="mt-6">
        <PricingCard profile={profile} />
      </div>
      <div className="mt-6">
        <PhotoCard profile={profile} />
      </div>
      <div className="mt-6">
        <EditProfileCard profile={profile} />
      </div>
    </section>
  );
}

function PublicationCard({ profile }: { profile: { isPublished: boolean; suspendedAt: string | null } }) {
  const setPublication = useSetOwnPublication();
  return (
    <div className={`${card} flex flex-wrap items-center justify-between gap-3 p-5`}>
      <div>
        <p className="font-home-serif text-base font-semibold text-[#2A1A10]">Publication status</p>
        <p className="mt-1 text-sm text-[#6E5D4E]">
          {profile.isPublished ? "Your profile is live." : "Your profile is not yet visible to visitors."}
        </p>
      </div>
      <button
        type="button"
        className={profile.isPublished ? ghost : btn}
        disabled={setPublication.isPending || Boolean(profile.suspendedAt)}
        title={profile.suspendedAt ? "Cannot publish while suspended" : undefined}
        onClick={() => setPublication.mutate(!profile.isPublished)}
      >
        {setPublication.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {profile.isPublished ? "Unpublish" : "Publish profile"}
      </button>
    </div>
  );
}

function PricingCard({ profile }: { profile: { pricePerMinute: number | null } }) {
  const update = useUpdateAstrologerProfile();
  // "Free" here means an unset price (pricePerMinute: null) — the same state the chat
  // backend already reads as "this astrologer is free", giving every visitor a one-time
  // 7-minute free chat with them instead of billing per minute.
  const [isFree, setIsFree] = useState(profile.pricePerMinute == null);
  const [value, setValue] = useState(profile.pricePerMinute?.toString() ?? "");
  const [error, setError] = useState<string | null>(null);

  function save() {
    if (isFree) {
      setError(null);
      update.mutate({ pricePerMinute: null });
      return;
    }
    const n = Number(value);
    if (!value.trim() || !Number.isInteger(n) || n < 1 || n > 10_000) {
      setError("Enter a whole number between ₹1 and ₹10,000 per minute.");
      return;
    }
    setError(null);
    update.mutate({ pricePerMinute: n });
  }

  return (
    <div className={`${card} space-y-3 p-5`}>
      <div>
        <p className="font-home-serif text-base font-semibold text-[#2A1A10]">Consultation pricing</p>
        <p className="mt-1 text-sm text-[#6E5D4E]">
          Set what you charge per minute, or offer free chat instead. Your public profile hides pricing entirely until you set one — visitors never see ₹0.
        </p>
      </div>

      <label className="flex max-w-xs items-center gap-2 text-sm text-[#2A1A10]">
        <input
          type="checkbox"
          checked={isFree}
          onChange={(e) => {
            setIsFree(e.target.checked);
            setError(null);
          }}
        />
        Offer free chat (no charge)
      </label>

      {isFree ? (
        <p className="max-w-xs text-xs text-[#6E5D4E]">Each visitor gets a one-time 7-minute free chat with you. No wallet or payment is involved.</p>
      ) : (
        <div className="flex max-w-xs items-center gap-2">
          <span className="text-sm font-medium text-[#6E5D4E]">₹</span>
          <input type="number" min={1} max={10000} className={field} value={value} onChange={(e) => setValue(e.target.value)} />
          <span className="text-sm text-[#6E5D4E]">/min</span>
        </div>
      )}

      {error && <p className="text-xs text-red-700">{error}</p>}
      <button type="button" className={btn} onClick={save} disabled={update.isPending}>
        {update.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Save price
      </button>
    </div>
  );
}

function PhotoCard({ profile }: { profile: { profilePhotoUrl: string | null } }) {
  const upload = useUploadAstrologerPhoto();
  const fileRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Please choose a JPEG, PNG or WebP image.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("Image must be 10 MB or smaller.");
      return;
    }
    setError(null);
    upload.mutate(file);
  }

  return (
    <div className={`${card} flex items-center gap-4 p-5`}>
      <div className="h-20 w-20 shrink-0 overflow-hidden rounded-full border-2 border-[#A8803A]/50 bg-white">
        {profile.profilePhotoUrl ? <img src={profile.profilePhotoUrl} alt="Profile" className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center"><IconChip icon={UserCog} /></div>}
      </div>
      <div>
        <button type="button" className={`${ghost} ${focusRing}`} onClick={() => fileRef.current?.click()} disabled={upload.isPending}>
          {upload.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          Replace photo
        </button>
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={onPick} />
        {error && <p className="mt-1 text-xs text-red-700">{error}</p>}
      </div>
    </div>
  );
}

function EditProfileCard({ profile }: { profile: { displayName: string; bio: string | null; yearsOfExperience: number | null; languages: string[] } }) {
  const update = useUpdateAstrologerProfile();
  const [form, setForm] = useState({ displayName: profile.displayName, bio: profile.bio ?? "", yearsOfExperience: profile.yearsOfExperience?.toString() ?? "" });
  const [languages, setLanguages] = useState<string[]>(profile.languages);
  const [langInput, setLangInput] = useState("");

  function addLanguage() {
    const v = langInput.trim();
    if (v && !languages.includes(v)) setLanguages((l) => [...l, v]);
    setLangInput("");
  }

  function save() {
    update.mutate({ displayName: form.displayName, bio: form.bio, yearsOfExperience: form.yearsOfExperience ? Number(form.yearsOfExperience) : null, languages });
  }

  return (
    <div className={`${card} space-y-4 p-5`}>
      <p className="font-home-serif text-base font-semibold text-[#2A1A10]">Profile details</p>
      <div>
        <label className={labelCls}>Display name</label>
        <input className={`${field} mt-1`} value={form.displayName} onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))} />
      </div>
      <div>
        <label className={labelCls}>Bio</label>
        <textarea className={`${field} mt-1`} rows={4} value={form.bio} onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))} />
      </div>
      <div>
        <label className={labelCls}>Years of experience</label>
        <input type="number" min={0} className={`${field} mt-1`} value={form.yearsOfExperience} onChange={(e) => setForm((f) => ({ ...f, yearsOfExperience: e.target.value }))} />
      </div>
      <div>
        <label className={labelCls}>Languages</label>
        <div className="mt-1 flex gap-2">
          <input className={field} value={langInput} onChange={(e) => setLangInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addLanguage(); } }} />
          <button type="button" className={ghost} onClick={addLanguage}><Plus className="h-4 w-4" /> Add</button>
        </div>
        {languages.length > 0 && (
          <ul className="mt-2 flex flex-wrap gap-2">
            {languages.map((l) => (
              <li key={l} className="flex items-center gap-1 rounded-full bg-[#F3E8D4] px-3 py-1 text-sm text-[#6B4A12]">
                {l}
                <button type="button" aria-label={`Remove ${l}`} onClick={() => setLanguages((ls) => ls.filter((x) => x !== l))}><X className="h-3.5 w-3.5" /></button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <button type="button" className={btn} onClick={save} disabled={update.isPending}>
        {update.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Save changes
      </button>
    </div>
  );
}
