import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { errorMessage, panelSend } from "../api";
import { Badge, Card, Field, ghostBtn, inputClass, primaryBtn, Table } from "../ui";
import type { ModelInfo, VoiceConfig } from "./types";

const LANGS = [
  { code: "en", name: "English" },
  { code: "hi", name: "Hindi" },
  { code: "mr", name: "Marathi" },
];

const blank = { languageCode: "en", voiceId: "", voiceName: "", modelId: "", isActive: true };

/**
 * Admin-managed voice list. Voice and model ids are stored in the database, so changing a voice needs no
 * deployment. The ElevenLabs API key is never shown or entered here; it lives in the server environment.
 */
export default function VoiceConfigCard({ voices, models, elevenLabsConfigured }: { voices: VoiceConfig[]; models: ModelInfo[]; elevenLabsConfigured: boolean }) {
  const qc = useQueryClient();
  const [form, setForm] = useState(blank);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const compatible = models.filter((m) => m.languages.includes(form.languageCode));
  const modelId = compatible.some((m) => m.id === form.modelId) ? form.modelId : compatible[0]?.id ?? "";

  const save = useMutation({
    mutationFn: (v: typeof blank) => panelSend<{ verified: boolean }>("PUT", "/astrology/audio/config/voices", { ...v, modelId }),
    onSuccess: (d, v) => {
      setMsg({ ok: true, text: d.verified ? "Voice saved and verified with ElevenLabs." : "Voice saved, but it could not be verified (ElevenLabs key not configured)." });
      qc.invalidateQueries({ queryKey: ["admin-panel"] });
      if (v.voiceId === form.voiceId) setForm(blank);
    },
    onError: (e) => setMsg({ ok: false, text: errorMessage(e) }),
  });

  return (
    <Card title="Voice configuration" description="ElevenLabs voice and model for each language. Changes apply immediately; the API key stays in the server environment.">
      {!elevenLabsConfigured && (
        <p role="status" className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
          ELEVENLABS_API_KEY is not set on the server, so voices cannot be verified and audio cannot be generated.
        </p>
      )}
      {msg && <p role="status" className={`mb-3 rounded-lg px-3 py-2 text-sm ${msg.ok ? "bg-emerald-100 text-emerald-900" : "bg-red-100 text-red-900"}`}>{msg.text}</p>}

      {voices.length > 0 && (
        <div className="mb-4">
          <Table head={["Language", "Voice", "Voice ID", "Model", "Status", ""]}>
            {voices.map((v) => (
              <tr key={v.id}>
                <td className="px-3 py-2">{v.languageName}</td>
                <td className="px-3 py-2 font-medium">{v.voiceName}</td>
                <td className="px-3 py-2 font-mono text-xs">{v.voiceId}</td>
                <td className="px-3 py-2 font-mono text-xs">{v.modelId}</td>
                <td className="px-3 py-2"><Badge tone={v.isActive ? "good" : "neutral"}>{v.isActive ? "Active" : "Inactive"}</Badge></td>
                <td className="px-3 py-2 text-right">
                  <button type="button" className={ghostBtn} disabled={save.isPending}
                    onClick={() => save.mutate({ languageCode: v.languageCode, voiceId: v.voiceId, voiceName: v.voiceName, modelId: v.modelId, isActive: !v.isActive })}>
                    {v.isActive ? "Deactivate" : "Activate"}
                  </button>
                </td>
              </tr>
            ))}
          </Table>
        </div>
      )}

      <form
        className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5"
        onSubmit={(e) => { e.preventDefault(); setMsg(null); save.mutate({ ...form, modelId }); }}
      >
        <Field label="Language" htmlFor="vc-lang">
          <select id="vc-lang" className={inputClass} value={form.languageCode} onChange={(e) => setForm({ ...form, languageCode: e.target.value })}>
            {LANGS.map((l) => <option key={l.code} value={l.code}>{l.name}</option>)}
          </select>
        </Field>
        <Field label="Voice display name" htmlFor="vc-name">
          <input id="vc-name" className={inputClass} required maxLength={80} value={form.voiceName} onChange={(e) => setForm({ ...form, voiceName: e.target.value })} />
        </Field>
        <Field label="ElevenLabs voice ID" htmlFor="vc-id">
          <input id="vc-id" className={`${inputClass} font-mono`} required pattern="[A-Za-z0-9]{8,40}" title="8-40 letters or digits" value={form.voiceId} onChange={(e) => setForm({ ...form, voiceId: e.target.value.trim() })} />
        </Field>
        <Field label="Model" htmlFor="vc-model" hint="Only models that support the language are listed.">
          <select id="vc-model" className={inputClass} value={modelId} onChange={(e) => setForm({ ...form, modelId: e.target.value })}>
            {compatible.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
          </select>
        </Field>
        <div className="flex items-end">
          <button type="submit" className={`${primaryBtn} w-full`} disabled={save.isPending || !modelId}>{save.isPending ? "Saving…" : "Save voice"}</button>
        </div>
      </form>
    </Card>
  );
}
