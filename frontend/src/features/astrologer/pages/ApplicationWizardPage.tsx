import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, Plus, Upload, X } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { AuthApiError } from "@/lib/authClient";
import { Stepper, type StepDef } from "../components/Stepper";
import {
  useAcceptAgreements,
  useAstrologerApplication,
  useAstrologerConfig,
  useRemoveProfilePhoto,
  useSetSpecialties,
  useStartApplication,
  useSubmitApplication,
  useUpdateApplication,
  useUploadDocument,
  useUploadProfilePhoto,
  useWithdrawApplication,
} from "../hooks/useAstrologerApplication";
import {
  AGREEMENT_LABELS,
  ALL_AGREEMENT_TYPES,
  EDITABLE_STATUSES,
  STATUS_LABELS,
  type AgreementType,
  type AstrologerApplication,
  type DocumentRequirement,
} from "../types";

const inputCls =
  "w-full rounded-lg border border-[#592209]/30 bg-white px-3 py-2.5 text-base text-[#301607] focus:border-[#E58A45] focus:outline-none focus:ring-2 focus:ring-[#E58A45]/40";
const labelCls = "mb-1 block text-sm font-medium text-[#592209]";
const primaryBtn =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-[#592209] px-5 py-2.5 text-sm font-semibold text-[#F5E9D6] hover:bg-[#461B07] disabled:cursor-not-allowed disabled:opacity-50";
const ghostBtn =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-[#592209]/30 bg-white px-5 py-2.5 text-sm font-semibold text-[#592209] hover:bg-[#592209]/5 disabled:cursor-not-allowed disabled:opacity-50";

const STEPS: StepDef[] = [
  { key: "personal", label: "Personal" },
  { key: "professional", label: "Professional" },
  { key: "documents", label: "Documents" },
  { key: "review", label: "Review & Submit" },
];

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className={labelCls}>{label}</label>
      {children}
      {hint && <p className="mt-1 text-xs text-[#6B4A37]">{hint}</p>}
    </div>
  );
}

/** Applicant-facing wizard (Part 3 of the brief). Each "Next" persists via PATCH before advancing, so a draft is never lost. */
export default function ApplicationWizardPage() {
  const user = useAuthStore((s) => s.user);
  const applicationQuery = useAstrologerApplication();
  const configQuery = useAstrologerConfig();
  const startApplication = useStartApplication();
  const [step, setStep] = useState(0);

  const application = applicationQuery.data;

  useEffect(() => {
    if (applicationQuery.isSuccess && application === null && !startApplication.isPending) {
      startApplication.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applicationQuery.isSuccess, application]);

  if (applicationQuery.isLoading || configQuery.isLoading || (applicationQuery.isSuccess && application === null)) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[#592209]" />
      </div>
    );
  }

  if (applicationQuery.error || configQuery.error || !application || !configQuery.data) {
    return (
      <section className="mx-auto max-w-xl px-4 py-16 text-center">
        <p className="text-[#592209]">We could not load your application. Please try again.</p>
        <button type="button" className={cnBtn()} onClick={() => { applicationQuery.refetch(); configQuery.refetch(); }}>
          Try again
        </button>
      </section>
    );
  }

  const editable = EDITABLE_STATUSES.includes(application.status);

  if (!editable) {
    return <SubmittedStatusView application={application} />;
  }

  return (
    <section className="mx-auto w-full max-w-3xl px-4 pb-16 pt-10 sm:px-6">
      <h1 className="font-home-serif text-3xl font-semibold text-[#592209]">Astrologer Application</h1>
      <p className="mt-1 text-sm text-[#6B4A37]">
        Signed in as {user?.email}. Your progress is saved automatically as you move between steps.
      </p>
      <div className="mt-6">
        <Stepper steps={STEPS} current={step} />
      </div>

      <div className="mt-8">
        {step === 0 && <StepPersonal application={application} onNext={() => setStep(1)} />}
        {step === 1 && <StepProfessional application={application} config={configQuery.data} onNext={() => setStep(2)} onBack={() => setStep(0)} />}
        {step === 2 && <StepDocuments application={application} config={configQuery.data} onNext={() => setStep(3)} onBack={() => setStep(1)} />}
        {step === 3 && <StepReview application={application} onBack={() => setStep(2)} />}
      </div>
    </section>
  );
}

function cnBtn() {
  return primaryBtn + " mt-4";
}

// ── Step 1: Personal ────────────────────────────────────────────────────────

function StepPersonal({ application, onNext }: { application: AstrologerApplication; onNext: () => void }) {
  const user = useAuthStore((s) => s.user);
  const update = useUpdateApplication();
  const uploadPhoto = useUploadProfilePhoto();
  const removePhoto = useRemoveProfilePhoto();
  const fileRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    fullLegalName: application.fullLegalName ?? [user?.firstName, user?.lastName].filter(Boolean).join(" "),
    displayName: application.displayName ?? "",
    email: application.email ?? user?.email ?? "",
    phone: application.phone ?? "",
    city: application.city ?? "",
    state: application.state ?? "",
    country: application.country ?? "",
    bio: application.bio ?? "",
  });

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  function onPickPhoto(e: React.ChangeEvent<HTMLInputElement>) {
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
    uploadPhoto.mutate(file);
  }

  async function next() {
    if (!form.fullLegalName.trim() || !form.displayName.trim()) {
      setError("Full legal name and display name are required.");
      return;
    }
    if (!application.profilePhotoUrl && !uploadPhoto.data?.profilePhotoUrl) {
      setError("A profile photograph is required.");
      return;
    }
    setError(null);
    await update.mutateAsync(form);
    onNext();
  }

  const photoUrl = uploadPhoto.data?.profilePhotoUrl ?? application.profilePhotoUrl;

  return (
    <div className="space-y-5 rounded-2xl border border-[#592209]/20 bg-[#FBF5EC] p-6">
      <div className="flex items-center gap-4">
        <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-full border-2 border-[#E58A45]/60 bg-white">
          {photoUrl ? <img src={photoUrl} alt="Profile" className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center text-xs text-[#9A8575]">No photo</div>}
        </div>
        <div>
          <button type="button" className={ghostBtn} onClick={() => fileRef.current?.click()} disabled={uploadPhoto.isPending}>
            {uploadPhoto.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {photoUrl ? "Replace photo" : "Upload photo"}
          </button>
          {photoUrl && (
            <button type="button" className="ml-2 text-sm text-[#6B4A37] underline" onClick={() => removePhoto.mutate()} disabled={removePhoto.isPending}>
              Remove
            </button>
          )}
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={onPickPhoto} />
          <p className="mt-1 text-xs text-[#6B4A37]">JPEG, PNG or WebP, up to 10 MB. Required.</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full legal name"><input className={inputCls} value={form.fullLegalName} onChange={set("fullLegalName")} /></Field>
        <Field label="Public display name" hint="Shown on your public profile"><input className={inputCls} value={form.displayName} onChange={set("displayName")} /></Field>
        <Field label="Email"><input type="email" className={inputCls} value={form.email} onChange={set("email")} /></Field>
        <Field label="Phone" hint="No OTP verification required"><input className={inputCls} value={form.phone} onChange={set("phone")} /></Field>
        <Field label="City"><input className={inputCls} value={form.city} onChange={set("city")} /></Field>
        <Field label="State"><input className={inputCls} value={form.state} onChange={set("state")} /></Field>
        <Field label="Country"><input className={inputCls} value={form.country} onChange={set("country")} /></Field>
      </div>
      <Field label="Short professional biography"><textarea className={inputCls} rows={4} value={form.bio} onChange={set("bio")} /></Field>

      {error && <p className="text-sm text-red-700">{error}</p>}
      <div className="flex justify-end gap-3">
        <button type="button" className={primaryBtn} onClick={next} disabled={update.isPending}>
          {update.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Next
        </button>
      </div>
    </div>
  );
}

// ── Step 2: Professional ─────────────────────────────────────────────────────

function StepProfessional({
  application,
  config,
  onNext,
  onBack,
}: {
  application: AstrologerApplication;
  config: { specialties: { id: string; key: string; label: string }[] };
  onNext: () => void;
  onBack: () => void;
}) {
  const update = useUpdateApplication();
  const setSpecialties = useSetSpecialties();
  const [error, setError] = useState<string | null>(null);

  const [selected, setSelected] = useState<Set<string>>(new Set(application.specialties.map((s) => s.id)));
  const [primary, setPrimary] = useState<string | null>(application.specialties.find((s) => s.isPrimary)?.id ?? null);
  const [languages, setLanguages] = useState<string[]>(application.languages);
  const [langInput, setLangInput] = useState("");

  const otherOption = config.specialties.find((s) => s.key === "other");
  const [customLabel, setCustomLabel] = useState(application.specialties.find((s) => s.key === "other")?.label ?? "");

  const [form, setForm] = useState({
    yearsOfExperience: application.yearsOfExperience?.toString() ?? "",
    educationBackground: application.educationBackground ?? "",
    certificationsText: application.certificationsText ?? "",
    professionalIntro: application.professionalIntro ?? "",
    consultationExperience: application.consultationExperience ?? "",
  });
  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  function toggleSpecialty(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        if (primary === id) setPrimary(null);
      } else {
        next.add(id);
        if (!primary) setPrimary(id);
      }
      return next;
    });
  }

  function addLanguage() {
    const v = langInput.trim();
    if (v && !languages.includes(v)) setLanguages((l) => [...l, v]);
    setLangInput("");
  }

  async function next() {
    if (selected.size === 0) return setError("Select at least one specialty.");
    if (otherOption && selected.has(otherOption.id) && !customLabel.trim()) return setError("Describe your specialty for \"Other\".");
    if (languages.length === 0) return setError("Add at least one language.");
    if (!form.yearsOfExperience) return setError("Years of experience is required.");
    setError(null);
    await Promise.all([
      setSpecialties.mutateAsync(
        Array.from(selected).map((id) => ({
          specialtyOptionId: id,
          isPrimary: id === primary,
          customLabel: otherOption && id === otherOption.id ? customLabel.trim() : undefined,
        })),
      ),
      update.mutateAsync({ ...form, yearsOfExperience: Number(form.yearsOfExperience), languages }),
    ]);
    onNext();
  }

  return (
    <div className="space-y-5 rounded-2xl border border-[#592209]/20 bg-[#FBF5EC] p-6">
      <Field label="Specialties" hint="Select all that apply, then mark one as primary">
        <div className="flex flex-wrap gap-2">
          {config.specialties.map((s) => (
            <label key={s.id} className={`flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm ${selected.has(s.id) ? "border-[#592209] bg-[#592209] text-[#F5E9D6]" : "border-[#592209]/30 bg-white text-[#301607]"}`}>
              <input type="checkbox" className="sr-only" checked={selected.has(s.id)} onChange={() => toggleSpecialty(s.id)} />
              {s.label}
            </label>
          ))}
        </div>
        {selected.size > 0 && (
          <div className="mt-2">
            <label className="text-xs text-[#6B4A37]">Primary specialty:</label>
            <select className={`${inputCls} mt-1`} value={primary ?? ""} onChange={(e) => setPrimary(e.target.value)}>
              {Array.from(selected).map((id) => (
                <option key={id} value={id}>{config.specialties.find((s) => s.id === id)?.label}</option>
              ))}
            </select>
          </div>
        )}
        {otherOption && selected.has(otherOption.id) && (
          <div className="mt-2">
            <label className="text-xs text-[#6B4A37]">Describe your specialty</label>
            <input
              className={`${inputCls} mt-1`}
              placeholder="e.g. KP Astrology"
              value={customLabel}
              onChange={(e) => setCustomLabel(e.target.value)}
            />
            <p className="mt-1 text-xs text-[#6B4A37]">Shown on your public profile in place of "Other".</p>
          </div>
        )}
      </Field>

      <Field label="Languages spoken">
        <div className="flex gap-2">
          <input className={inputCls} value={langInput} onChange={(e) => setLangInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addLanguage(); } }} placeholder="e.g. Hindi" />
          <button type="button" className={ghostBtn} onClick={addLanguage}><Plus className="h-4 w-4" /> Add</button>
        </div>
        {languages.length > 0 && (
          <ul className="mt-2 flex flex-wrap gap-2">
            {languages.map((l) => (
              <li key={l} className="flex items-center gap-1 rounded-full bg-[#592209]/10 px-3 py-1 text-sm text-[#592209]">
                {l}
                <button type="button" aria-label={`Remove ${l}`} onClick={() => setLanguages((ls) => ls.filter((x) => x !== l))}><X className="h-3.5 w-3.5" /></button>
              </li>
            ))}
          </ul>
        )}
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Years of professional experience"><input type="number" min={0} className={inputCls} value={form.yearsOfExperience} onChange={set("yearsOfExperience")} /></Field>
        <Field label="Education / training background"><input className={inputCls} value={form.educationBackground} onChange={set("educationBackground")} /></Field>
      </div>
      <Field label="Certifications (if any)" hint="Not required — explain your training below if you have no formal certificate"><input className={inputCls} value={form.certificationsText} onChange={set("certificationsText")} /></Field>
      <Field label="Professional introduction"><textarea className={inputCls} rows={3} value={form.professionalIntro} onChange={set("professionalIntro")} /></Field>
      <Field label="Consultation experience"><textarea className={inputCls} rows={3} value={form.consultationExperience} onChange={set("consultationExperience")} /></Field>

      {error && <p className="text-sm text-red-700">{error}</p>}
      <div className="flex justify-between gap-3">
        <button type="button" className={ghostBtn} onClick={onBack}>Back</button>
        <button type="button" className={primaryBtn} onClick={next} disabled={update.isPending || setSpecialties.isPending}>
          {update.isPending || setSpecialties.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Next
        </button>
      </div>
    </div>
  );
}

// ── Step 3: Documents ────────────────────────────────────────────────────────

const VERIFICATION_LABEL: Record<string, { label: string; cls: string }> = {
  PENDING: { label: "Pending review", cls: "bg-[#F6E7D2] text-[#8A5A12]" },
  UNDER_REVIEW: { label: "Under review", cls: "bg-[#F6E7D2] text-[#8A5A12]" },
  VERIFIED: { label: "Verified", cls: "bg-[#E3EBDD] text-[#3F5E3D]" },
  REJECTED: { label: "Rejected", cls: "bg-red-50 text-red-800" },
  RESUBMISSION_REQUIRED: { label: "Resubmission required", cls: "bg-red-50 text-red-800" },
};

function DocumentSlot({ requirement, application }: { requirement: DocumentRequirement; application: AstrologerApplication }) {
  const upload = useUploadDocument();
  const fileRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const existing = application.documents.find((d) => d.requirementId === requirement.id);
  const canReplace = application.status === "DRAFT" || existing?.verificationStatus === "RESUBMISSION_REQUIRED" || !existing;

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!requirement.acceptedMimeTypes.includes(file.type)) {
      setError(`Accepted types: ${requirement.acceptedMimeTypes.join(", ")}`);
      return;
    }
    if (file.size > requirement.maxSizeMb * 1024 * 1024) {
      setError(`File must be ${requirement.maxSizeMb} MB or smaller.`);
      return;
    }
    setError(null);
    upload.mutate({ file, requirementId: requirement.id });
  }

  const status = existing ? VERIFICATION_LABEL[existing.verificationStatus] : null;

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-[#592209]/20 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="font-medium text-[#301607]">{requirement.label}{requirement.isRequired && <span className="ml-1 text-red-700">*</span>}</p>
        {existing ? (
          <p className="mt-0.5 truncate text-sm text-[#6B4A37]">{existing.fileName} (v{existing.version})</p>
        ) : (
          <p className="mt-0.5 text-sm text-[#9A8575]">No file uploaded yet</p>
        )}
        {existing?.rejectionReason && <p className="mt-0.5 text-sm text-red-700">{existing.rejectionReason}</p>}
        {error && <p className="mt-0.5 text-sm text-red-700">{error}</p>}
      </div>
      <div className="flex items-center gap-2">
        {status && <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${status.cls}`}>{status.label}</span>}
        <button
          type="button"
          className={ghostBtn}
          disabled={!canReplace || upload.isPending}
          title={canReplace ? undefined : "Can be replaced only while in draft or after a resubmission request"}
          onClick={() => fileRef.current?.click()}
        >
          {upload.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          {existing ? "Replace" : "Upload"}
        </button>
        <input ref={fileRef} type="file" accept={requirement.acceptedMimeTypes.join(",")} className="sr-only" onChange={onPick} />
      </div>
    </div>
  );
}

function StepDocuments({
  application,
  config,
  onNext,
  onBack,
}: {
  application: AstrologerApplication;
  config: { documentRequirements: DocumentRequirement[] };
  onNext: () => void;
  onBack: () => void;
}) {
  const groups = useMemo(() => {
    const map = new Map<string, DocumentRequirement[]>();
    for (const r of config.documentRequirements) {
      if (!map.has(r.group)) map.set(r.group, []);
      map.get(r.group)!.push(r);
    }
    return Array.from(map.entries());
  }, [config.documentRequirements]);

  const [choice, setChoice] = useState<Record<string, string>>({});

  return (
    <div className="space-y-5 rounded-2xl border border-[#592209]/20 bg-[#FBF5EC] p-6">
      <p className="text-sm text-[#6B4A37]">
        Upload PDF, JPG or PNG files. Government ID options are listed below — choose the one you can provide. Experience
        declarations and certificates are reviewed manually; a formal astrology certificate is never required on its own.
      </p>
      {groups.map(([group, options]) => {
        if (options.length === 1) return <DocumentSlot key={options[0].id} requirement={options[0]} application={application} />;
        const existingChoiceId =
          choice[group] ?? options.find((o) => application.documents.some((d) => d.requirementId === o.id))?.id ?? options[0].id;
        const chosen = options.find((o) => o.id === existingChoiceId)!;
        return (
          <div key={group} className="space-y-2">
            <label className="text-sm font-medium text-[#592209]">Government identity document (choose one)</label>
            <select className={inputCls} value={existingChoiceId} onChange={(e) => setChoice((c) => ({ ...c, [group]: e.target.value }))}>
              {options.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
            </select>
            <DocumentSlot requirement={chosen} application={application} />
          </div>
        );
      })}

      <div className="flex justify-between gap-3">
        <button type="button" className={ghostBtn} onClick={onBack}>Back</button>
        <button type="button" className={primaryBtn} onClick={onNext}>Next</button>
      </div>
    </div>
  );
}

// ── Step 4: Review & Submit ─────────────────────────────────────────────────

function StepReview({ application, onBack }: { application: AstrologerApplication; onBack: () => void }) {
  const acceptAgreements = useAcceptAgreements();
  const submit = useSubmitApplication();
  const withdraw = useWithdrawApplication();
  const [checked, setChecked] = useState<Set<string>>(new Set(application.agreements.map((a) => a.agreementType)));
  const [formError, setFormError] = useState<string | null>(null);

  async function handleSubmit() {
    setFormError(null);
    try {
      if (checked.size < ALL_AGREEMENT_TYPES.length) {
        setFormError("Please accept all four agreements before submitting.");
        return;
      }
      await acceptAgreements.mutateAsync(Array.from(checked) as AgreementType[]);
      await submit.mutateAsync();
    } catch (e) {
      setFormError(e instanceof AuthApiError || e instanceof Error ? e.message : "Could not submit your application.");
    }
  }

  return (
    <div className="space-y-5 rounded-2xl border border-[#592209]/20 bg-[#FBF5EC] p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Review k="Full legal name" v={application.fullLegalName} />
        <Review k="Display name" v={application.displayName} />
        <Review k="Email" v={application.email} />
        <Review k="Phone" v={application.phone} />
        <Review k="City / State / Country" v={[application.city, application.state, application.country].filter(Boolean).join(", ")} />
        <Review k="Experience" v={application.yearsOfExperience != null ? `${application.yearsOfExperience} years` : null} />
        <Review k="Specialties" v={application.specialties.map((s) => s.label).join(", ")} />
        <Review k="Languages" v={application.languages.join(", ")} />
      </div>
      <div>
        <p className="text-sm font-medium text-[#592209]">Documents</p>
        <ul className="mt-1 space-y-1 text-sm text-[#4A2E1F]">
          {application.documents.length === 0 && <li className="text-[#9A8575]">No documents uploaded</li>}
          {application.documents.map((d) => <li key={d.id}>{d.fileName} — {VERIFICATION_LABEL[d.verificationStatus]?.label ?? d.verificationStatus}</li>)}
        </ul>
      </div>

      <div className="space-y-2 rounded-xl border border-[#592209]/20 bg-white p-4">
        <p className="font-medium text-[#301607]">Agreements</p>
        {ALL_AGREEMENT_TYPES.map((type) => (
          <label key={type} className="flex items-start gap-2 text-sm text-[#4A2E1F]">
            <input
              type="checkbox"
              className="mt-0.5"
              checked={checked.has(type)}
              onChange={() => setChecked((prev) => { const next = new Set(prev); if (next.has(type)) next.delete(type); else next.add(type); return next; })}
            />
            I accept the {AGREEMENT_LABELS[type]}
          </label>
        ))}
      </div>

      {formError && <p className="text-sm text-red-700">{formError}</p>}

      <div className="flex flex-wrap justify-between gap-3">
        <div className="flex gap-3">
          <button type="button" className={ghostBtn} onClick={onBack}>Back</button>
          <button
            type="button"
            className="text-sm text-[#6B4A37] underline"
            onClick={() => { if (window.confirm("Withdraw this application? You can start a new one afterward.")) withdraw.mutate(); }}
            disabled={withdraw.isPending}
          >
            Withdraw application
          </button>
        </div>
        <button type="button" className={primaryBtn} onClick={handleSubmit} disabled={submit.isPending || acceptAgreements.isPending}>
          {submit.isPending || acceptAgreements.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Submit application
        </button>
      </div>
    </div>
  );
}

function Review({ k, v }: { k: string; v: string | null | undefined }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wider text-[#A8803A]">{k}</dt>
      <dd className="mt-0.5 text-sm text-[#301607]">{v || "—"}</dd>
    </div>
  );
}

// ── Non-editable status view (submitted/under review/approved/rejected/...) ──

function SubmittedStatusView({ application }: { application: AstrologerApplication }) {
  const withdraw = useWithdrawApplication();
  const canWithdraw = ["SUBMITTED", "UNDER_REVIEW", "INTERVIEW_PENDING", "MORE_INFORMATION_REQUIRED"].includes(application.status);
  return (
    <section className="mx-auto w-full max-w-2xl px-4 pb-16 pt-10 sm:px-6">
      <h1 className="font-home-serif text-3xl font-semibold text-[#592209]">Astrologer Application</h1>
      <div className="mt-6 rounded-2xl border border-[#592209]/20 bg-[#FBF5EC] p-6">
        <p className="text-sm text-[#6B4A37]">Current status</p>
        <p className="mt-1 text-2xl font-semibold text-[#301607]">{STATUS_LABELS[application.status]}</p>
        {application.timeline.length > 0 && (
          <ul className="mt-4 space-y-2 border-t border-[#592209]/15 pt-4 text-sm text-[#4A2E1F]">
            {application.timeline.slice().reverse().map((t, i) => (
              <li key={i}>
                <span className="font-medium text-[#301607]">{STATUS_LABELS[t.toStatus]}</span> — {new Date(t.at).toLocaleString()}
                {t.reason && <span className="block text-[#6B4A37]">{t.reason}</span>}
              </li>
            ))}
          </ul>
        )}
        {application.documents.some((d) => d.verificationStatus === "RESUBMISSION_REQUIRED") && (
          <p className="mt-4 text-sm text-red-700">One or more documents need resubmission. Contact support or wait for the wizard to reopen that step.</p>
        )}
        {canWithdraw && (
          <button
            type="button"
            className="mt-5 text-sm text-[#6B4A37] underline"
            onClick={() => { if (window.confirm("Withdraw this application?")) withdraw.mutate(); }}
            disabled={withdraw.isPending}
          >
            Withdraw application
          </button>
        )}
      </div>
      <Link to="/dashboard" className="mt-5 inline-block text-sm font-semibold text-[#592209] underline">Back to dashboard</Link>
    </section>
  );
}
