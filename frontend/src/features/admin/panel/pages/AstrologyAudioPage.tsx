import { useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AUTH_API_BASE_URL, AuthApiError } from "@/lib/authClient";
import { authedFetch } from "@/lib/authedFetch";
import { errorMessage, panelSend, usePanel } from "../api";
import { QueryView } from "../QueryView";
import { Badge, Card, Field, fmtDate, ghostBtn, inputClass, PageHeader, primaryBtn } from "../ui";
import VoiceConfigCard from "../audio/VoiceConfigCard";
import { STATUS_TONE, type AudioAsset, type AudioToolDetail, type AudioToolSummary, type TranslationStatus } from "../audio/types";

const BASE = "/astrology/audio";
const TR_TONE: Record<TranslationStatus, "neutral" | "good" | "bad" | "warn"> = { MISSING: "bad", SOURCE: "good", REVIEWED: "good" };
const TR_LABEL: Record<TranslationStatus, string> = { MISSING: "Not translated", SOURCE: "From page (English)", REVIEWED: "Reviewed" };
const busy = (a: AudioAsset) => a.status === "GENERATING" || a.status === "PENDING";

type Flash = { ok: boolean; text: string } | null;

function Workspace({ detail, language, flash, setFlash }: { detail: AudioToolDetail; language: string; flash: Flash; setFlash: (f: Flash) => void }) {
  const qc = useQueryClient();
  const lang = detail.languages.find((l) => l.code === language)!;
  const narration = lang.narration;
  const english = detail.languages.find((l) => l.code === "en")?.narration ?? null;

  // The draft re-syncs whenever the saved text changes (after a save or when switching tool/language).
  const [draft, setDraft] = useState(narration?.text ?? "");
  const [title, setTitle] = useState(narration?.title ?? english?.title ?? "");
  const [syncedHash, setSyncedHash] = useState(narration?.contentHash ?? "");
  if ((narration?.contentHash ?? "") !== syncedHash) {
    setSyncedHash(narration?.contentHash ?? "");
    setDraft(narration?.text ?? "");
    setTitle(narration?.title ?? english?.title ?? "");
  }
  const dirty = draft !== (narration?.text ?? "") || (narration ? title !== narration.title : false);

  const voices = detail.voices.filter((v) => v.languageCode === language && v.isActive);
  const [voicePick, setVoicePick] = useState("");
  const [modelPick, setModelPick] = useState("");
  const voice = voices.find((v) => v.voiceId === voicePick) ?? voices[0];
  const compatible = detail.models.filter((m) => m.languages.includes(language));
  const model = compatible.find((m) => m.id === modelPick) ?? compatible.find((m) => m.id === voice?.modelId) ?? compatible[0];

  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin-panel"] });
  const fail = (e: unknown) => setFlash({ ok: false, text: errorMessage(e) });

  const save = useMutation({
    mutationFn: () => panelSend("PUT", `${BASE}/${detail.slug}/content`, { language, title, text: draft }),
    onSuccess: () => { setFlash({ ok: true, text: "Narration saved. Generate new audio for the updated text." }); invalidate(); },
    onError: fail,
  });
  const startGen = useMutation({
    mutationFn: (a: { force: boolean; voiceId: string; modelId: string }) =>
      panelSend("POST", `${BASE}/${a.force ? "regenerate" : "generate"}`, { toolSlug: detail.slug, language, voiceId: a.voiceId, modelId: a.modelId }),
    onSuccess: () => { setFlash({ ok: true, text: "Generation started. This usually takes under a minute." }); invalidate(); },
    onError: fail,
  });
  const publish = useMutation({
    mutationFn: (assetId: string) => panelSend("POST", `${BASE}/publish`, { assetId }),
    onSuccess: () => { setFlash({ ok: true, text: "Audio published. It is now live on the public tool page." }); invalidate(); },
    onError: fail,
  });

  // Voice preview: first ~250 characters, never stored.
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const previewRef = useRef<string | null>(null);
  useEffect(() => () => { if (previewRef.current) URL.revokeObjectURL(previewRef.current); }, []);
  const preview = async () => {
    if (!voice || !model) return;
    setPreviewing(true);
    try {
      const res = await authedFetch(`${AUTH_API_BASE_URL}/admin${BASE}/preview`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language, voiceId: voice.voiceId, modelId: model.id, text: draft }),
      });
      if (!res.ok) {
        const b = await res.json().catch(() => null);
        throw new AuthApiError(b?.message ?? `Preview failed (${res.status})`, res.status);
      }
      const url = URL.createObjectURL(await res.blob());
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
      previewRef.current = url;
      setPreviewUrl(url);
    } catch (e) {
      fail(e);
    } finally {
      setPreviewing(false);
    }
  };

  const generating = lang.assets.some(busy);
  const current = narration ? lang.assets.find((a) => a.contentHash === narration.contentHash && a.status === "READY") : undefined;
  const blocker = !narration
    ? `No ${lang.name} text yet. Enter and save the ${lang.name} translation first.`
    : dirty ? "Save your changes before generating, so the approved text is exactly what is sent."
    : !voice ? `No active ${lang.name} voice. Add one under Voice configuration.`
    : !model ? `No ElevenLabs model supports ${lang.name}.`
    : !detail.elevenLabsConfigured ? "ElevenLabs is not configured on the server."
    : generating ? "Audio is being generated for this language."
    : null;

  return (
    <>
      <Card
        title={`Narration: ${lang.name}`}
        description="This exact text is sent to ElevenLabs. Edit it, save it, then generate."
        actions={<div className="flex items-center gap-2">{narration && <Badge>v{narration.version}</Badge>}<Badge tone={TR_TONE[lang.translationStatus]}>{TR_LABEL[lang.translationStatus]}</Badge></div>}
      >
        {!narration && (
          <div className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900" role="status">
            <p className="font-medium">{lang.name} text has not been entered. English is never sent to a {lang.name} voice.</p>
            <p className="mt-0.5">Write or paste an approved {lang.name} translation below and save it.</p>
          </div>
        )}
        {!narration && english && (
          <details className="mb-3 rounded-lg border border-[#E8E3DC] bg-[#FAF8F5] p-3 text-sm">
            <summary className="cursor-pointer font-medium">English source text (for reference)</summary>
            <p className="mt-2 whitespace-pre-line text-[#4A423A]">{english.text}</p>
          </details>
        )}
        <div className="space-y-3">
          <Field label="About title" htmlFor="aa-title"><input id="aa-title" className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={160} /></Field>
          <Field label="Narration text" htmlFor="aa-text" hint={`${draft.length} / 5000 characters${narration ? ` · content hash ${narration.contentHash.slice(0, 8)}` : ""}`}>
            <textarea id="aa-text" className={`${inputClass} min-h-[14rem] leading-relaxed`} lang={language} value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={5000} />
          </Field>
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" className={primaryBtn} disabled={!dirty && !!narration || !draft.trim() || save.isPending} onClick={() => save.mutate()}>
              {save.isPending ? "Saving…" : narration ? "Save narration" : `Save ${lang.name} translation`}
            </button>
            {dirty && narration && <button type="button" className={ghostBtn} onClick={() => { setDraft(narration.text); setTitle(narration.title); }}>Discard changes</button>}
            {dirty && <span className="text-sm text-amber-800">Unsaved changes</span>}
          </div>
        </div>
      </Card>

      <Card title="Voice and model" description="Choose what will read the narration.">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Voice" htmlFor="aa-voice">
            <select id="aa-voice" className={inputClass} value={voice?.voiceId ?? ""} disabled={!voices.length} onChange={(e) => { setVoicePick(e.target.value); setModelPick(""); }}>
              {!voices.length && <option value="">No active voice for {lang.name}</option>}
              {voices.map((v) => <option key={v.id} value={v.voiceId}>{v.voiceName}</option>)}
            </select>
          </Field>
          <Field label="Model" htmlFor="aa-model" hint="Only models that support this language are listed.">
            <select id="aa-model" className={inputClass} value={model?.id ?? ""} disabled={!compatible.length} onChange={(e) => setModelPick(e.target.value)}>
              {compatible.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
            </select>
          </Field>
        </div>
        <dl className="mt-3 grid gap-x-6 gap-y-1 rounded-lg bg-[#FAF8F5] p-3 text-sm sm:grid-cols-3" aria-label="Generation settings">
          <div><dt className="text-xs text-[#6B6259]">Language</dt><dd className="font-medium">{lang.name} ({language})</dd></div>
          <div><dt className="text-xs text-[#6B6259]">Voice ID</dt><dd className="font-mono text-xs">{voice?.voiceId ?? "—"}</dd></div>
          <div><dt className="text-xs text-[#6B6259]">Model ID</dt><dd className="font-mono text-xs">{model?.id ?? "—"}</dd></div>
        </dl>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button type="button" className={ghostBtn} disabled={!voice || !model || !draft.trim() || previewing || !detail.elevenLabsConfigured} onClick={preview}>
            {previewing ? "Preparing preview…" : "Preview voice"}
          </button>
          <button type="button" className={primaryBtn} disabled={!!blocker || startGen.isPending || !!current}
            onClick={() => voice && model && startGen.mutate({ force: false, voiceId: voice.voiceId, modelId: model.id })}>
            {generating || startGen.isPending ? "Generating…" : "Generate audio"}
          </button>
          <button type="button" className={ghostBtn} disabled={!!blocker || startGen.isPending || !lang.assets.length}
            onClick={() => voice && model && startGen.mutate({ force: true, voiceId: voice.voiceId, modelId: model.id })}>
            Regenerate
          </button>
        </div>
        {blocker && <p className="mt-2 text-sm text-[#6B6259]">{blocker}</p>}
        {current && !blocker && <p className="mt-2 text-sm text-[#6B6259]">Audio already exists for this text. Use Regenerate to make a new take.</p>}
        {previewUrl && (
          <div className="mt-3">
            <p className="mb-1 text-xs text-[#6B6259]">Voice preview (first 250 characters, not saved)</p>
            <audio controls src={previewUrl} className="w-full" autoPlay />
          </div>
        )}
      </Card>

      <Card title="Generated audio" description="Publishing replaces the live audio only after you approve it. Previous takes are kept.">
        {flash && <p role="status" className={`mb-3 rounded-lg px-3 py-2 text-sm ${flash.ok ? "bg-emerald-100 text-emerald-900" : "bg-red-100 text-red-900"}`}>{flash.text}</p>}
        {!lang.assets.length ? (
          <p className="text-sm text-[#6B6259]">Nothing generated for {lang.name} yet.</p>
        ) : (
          <ul className="space-y-3">
            {lang.assets.map((a) => (
              <li key={a.id} className="rounded-xl border border-[#E8E3DC] p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={STATUS_TONE[a.status]}>{a.status}</Badge>
                  {a.isPublished && <Badge tone="good">Published</Badge>}
                  <span className="text-xs text-[#6B6259]">v{a.contentVersion} · {a.modelId} · {a.voiceId} · {fmtDate(a.createdAt)}{a.durationSeconds ? ` · ${Math.round(a.durationSeconds)}s` : ""}</span>
                </div>
                {busy(a) && (
                  <div className="mt-2" role="status" aria-live="polite">
                    <div className="h-1.5 overflow-hidden rounded-full bg-[#F1ECE5]"><div className="h-full w-1/3 animate-pulse rounded-full bg-[#803003]" /></div>
                    <p className="mt-1 text-xs text-[#6B6259]">Generating with ElevenLabs and uploading to Cloudinary…</p>
                  </div>
                )}
                {a.status === "OUTDATED" && <p className="mt-2 text-sm text-amber-900">The narration changed after this was made. Generate new audio before publishing.{a.isPublished && " This version stays live until you publish a replacement."}</p>}
                {a.status === "FAILED" && (
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <p className="text-sm text-red-800">{a.errorMessage ?? "Generation failed."}</p>
                    <button type="button" className={ghostBtn} disabled={startGen.isPending || generating}
                      onClick={() => startGen.mutate({ force: true, voiceId: a.voiceId, modelId: a.modelId })}>Retry</button>
                  </div>
                )}
                {a.cloudinaryUrl && (a.status === "READY" || a.status === "OUTDATED") && <audio controls preload="none" src={a.cloudinaryUrl} className="mt-2 w-full" />}
                {a.status === "READY" && !a.isPublished && (
                  <button type="button" className={`${primaryBtn} mt-2`} disabled={publish.isPending} onClick={() => publish.mutate(a.id)}>
                    {lang.published ? "Publish (replaces live audio)" : "Publish"}
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}

export default function AstrologyAudioPage() {
  const qc = useQueryClient();
  const tools = usePanel<{ tools: AudioToolSummary[] }>(`${BASE}/tools`, { refetchInterval: (q) => (q.state.data?.tools.some((t) => t.languages.some((l) => l.generating)) ? 3000 : false) });
  const [slug, setSlug] = useState("");
  const [language, setLanguage] = useState("en");
  const [flash, setFlash] = useState<Flash>(null);
  const active = slug || tools.data?.tools[0]?.slug || "";
  const detail = usePanel<AudioToolDetail>(`${BASE}/${active}`, {
    enabled: !!active,
    // Poll while anything is generating so status and progress stay current.
    refetchInterval: (q) => (q.state.data?.languages.some((l) => l.assets.some(busy)) ? 2500 : false),
  });

  const all = useMutation({
    mutationFn: () => panelSend<{ queued: { language: string }[]; skipped: { language: string; reason: string }[] }>("POST", `${BASE}/generate-missing`, { toolSlug: active, confirm: true }),
    onSuccess: (d) => {
      const skipped = d.skipped.map((s) => `${s.language}: ${s.reason}`).join("; ");
      setFlash({ ok: d.queued.length > 0, text: `${d.queued.length} language(s) started${skipped ? `. Skipped: ${skipped}` : ""}.` });
      qc.invalidateQueries({ queryKey: ["admin-panel"] });
    },
    onError: (e) => setFlash({ ok: false, text: errorMessage(e) }),
  });
  const generateAll = (label: string) => {
    if (window.confirm(`Generate all missing audio for "${label}"?\n\nThis uses ElevenLabs credits for every language that has approved text but no up-to-date audio. Languages without a translation are skipped.`)) all.mutate();
  };

  const summary = tools.data?.tools.find((t) => t.slug === active);

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <PageHeader title="Astrology Audio Manager" subtitle="Narrate each astrology tool's About section in English, Hindi and Marathi. Audio is generated here, stored on Cloudinary, and only plays on the public page after you publish it." />
      <QueryView q={tools}>
        {(t) => (
          <Card>
            <div className="grid gap-4 sm:grid-cols-[minmax(0,16rem)_1fr]">
              <Field label="Astrology tool" htmlFor="aa-tool">
                <select id="aa-tool" className={inputClass} value={active} onChange={(e) => { setSlug(e.target.value); setFlash(null); }}>
                  {t.tools.map((x) => <option key={x.slug} value={x.slug}>{x.label}</option>)}
                </select>
              </Field>
              <div>
                <p className="mb-1 text-sm font-medium text-[#1F1B16]">Language</p>
                <div role="tablist" aria-label="Language" className="flex flex-wrap gap-2">
                  {summary?.languages.map((l) => (
                    <button key={l.code} type="button" role="tab" aria-selected={language === l.code} onClick={() => { setLanguage(l.code); setFlash(null); }}
                      className={`rounded-lg border px-3 py-1.5 text-left text-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#803003] ${language === l.code ? "border-[#803003] bg-[#803003]/5" : "border-[#DDD6CC] hover:bg-[#F7F4EF]"}`}>
                      <span className="font-medium">{l.name}</span>
                      <span className="ml-2 inline-flex gap-1 align-middle">
                        <Badge tone={TR_TONE[l.translationStatus]}>{l.translationStatus === "MISSING" ? "No text" : "Text ready"}</Badge>
                        {l.published && <Badge tone="good">Live</Badge>}
                        {l.generating && <Badge tone="warn">Generating</Badge>}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-4 border-t border-[#EEE9E2] pt-3">
              <button type="button" className={ghostBtn} disabled={all.isPending || !summary} onClick={() => summary && generateAll(summary.label)}>
                {all.isPending ? "Starting…" : "Generate all missing languages"}
              </button>
            </div>
          </Card>
        )}
      </QueryView>

      {active && (
        <QueryView q={detail}>
          {(d) => (
            <>
              <Workspace key={`${d.slug}:${language}`} detail={d} language={language} flash={flash} setFlash={setFlash} />
              <VoiceConfigCard voices={d.voices} models={d.models} elevenLabsConfigured={d.elevenLabsConfigured} />
            </>
          )}
        </QueryView>
      )}
    </div>
  );
}
