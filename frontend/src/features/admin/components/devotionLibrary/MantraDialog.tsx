import { useEffect, useRef, useState } from "react";
import { ImagePlus, Loader2, Music, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  useCreateMantra,
  useUpdateMantra,
  useUploadMantraAudio,
  useUploadMantraCover,
} from "../../hooks/useDevotionLibraryAdmin";
import type { AdminMantraChant, MantraFormValues } from "../../types/devotionLibrary";
import { formatDuration, slugify } from "../../utils/devotionLibrary";

const EMPTY_FORM: MantraFormValues = {
  title: "",
  slug: "",
  deity: "",
  category: "",
  lyricsText: "",
  meaning: "",
  status: "DRAFT",
  displayOrder: 0,
};

const MAX_AUDIO_BYTES = 15 * 1024 * 1024;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

interface MantraDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mantra?: AdminMantraChant | null;
}

export function MantraDialog({ open, onOpenChange, mantra }: MantraDialogProps) {
  const [values, setValues] = useState<MantraFormValues>(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [slugTouched, setSlugTouched] = useState(false);
  // Holds the just-created record so the upload section appears immediately
  // after "Create Mantra", without the admin having to reopen the dialog to edit.
  const [savedMantra, setSavedMantra] = useState<AdminMantraChant | null>(null);
  const current = mantra ?? savedMantra;
  const isEdit = Boolean(current);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const createMantra = useCreateMantra();
  const updateMantra = useUpdateMantra();
  const uploadAudio = useUploadMantraAudio();
  const uploadCover = useUploadMantraCover();

  const isSubmitting = createMantra.isPending || updateMantra.isPending;
  const isUploading = uploadAudio.isPending || uploadCover.isPending;

  useEffect(() => {
    if (!open) return;
    if (mantra) {
      setValues({
        title: mantra.title,
        slug: mantra.slug,
        deity: mantra.deity ?? "",
        category: mantra.category,
        lyricsText: mantra.lyricsText ?? "",
        meaning: mantra.meaning ?? "",
        status: mantra.status,
        displayOrder: mantra.displayOrder,
      });
      setSlugTouched(true);
    } else {
      setValues(EMPTY_FORM);
      setSlugTouched(false);
    }
    setErrors({});
    setSavedMantra(null);
  }, [open, mantra]);

  const setField = <K extends keyof MantraFormValues>(key: K, value: MantraFormValues[K]) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      if (!prev[key as string]) return prev;
      const next = { ...prev };
      delete next[key as string];
      return next;
    });
  };

  const handleTitleChange = (title: string) => {
    setValues((prev) => ({ ...prev, title, slug: slugTouched ? prev.slug : slugify(title) }));
  };

  const validate = (): boolean => {
    const next: Record<string, string> = {};
    if (!values.title.trim()) next.title = "Title is required";
    if (!values.slug.trim()) next.slug = "Slug is required";
    else if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(values.slug)) next.slug = "Use lowercase letters, numbers and single hyphens";
    if (!values.category.trim()) next.category = "Category is required";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isSubmitting || !validate()) return;

    const payload: MantraFormValues = {
      ...values,
      title: values.title.trim(),
      slug: values.slug.trim(),
      deity: values.deity?.trim() || undefined,
      category: values.category.trim(),
      lyricsText: values.lyricsText?.trim() || undefined,
      meaning: values.meaning?.trim() || undefined,
    };

    try {
      if (mantra) {
        await updateMantra.mutateAsync({ mantraId: mantra.id, values: payload });
      } else if (savedMantra) {
        setSavedMantra(await updateMantra.mutateAsync({ mantraId: savedMantra.id, values: payload }));
      } else {
        setSavedMantra(await createMantra.mutateAsync(payload));
      }
    } catch {
      // hook already surfaced the error
    }
  };

  const handleAudioPicked = async (fileList: FileList | null) => {
    if (!fileList?.length || !current) return;
    const file = fileList[0];
    if (audioInputRef.current) audioInputRef.current.value = "";

    if (file.type !== "audio/mpeg" && file.type !== "audio/mp3") return toast.error("Only MP3 audio files are allowed");
    if (file.size > MAX_AUDIO_BYTES) return toast.error("The audio file must be 15 MB or smaller");

    const updated = await uploadAudio.mutateAsync({ mantraId: current.id, file }).catch(() => null);
    if (updated && !mantra) setSavedMantra(updated);
  };

  const handleCoverPicked = async (fileList: FileList | null) => {
    if (!fileList?.length || !current) return;
    const file = fileList[0];
    if (coverInputRef.current) coverInputRef.current.value = "";

    if (!["image/jpeg", "image/png", "image/webp", "image/avif"].includes(file.type)) {
      return toast.error("Only JPEG, PNG, WebP and AVIF images are allowed");
    }
    if (file.size > MAX_IMAGE_BYTES) return toast.error("The cover image must be 10 MB or smaller");

    const updated = await uploadCover.mutateAsync({ mantraId: current.id, file }).catch(() => null);
    if (updated && !mantra) setSavedMantra(updated);
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !isSubmitting && !isUploading && onOpenChange(next)}>
      <DialogContent className="max-h-[90vh] overflow-y-auto border-border bg-white text-foreground sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-semibold text-lg tracking-normal text-foreground">
            {isEdit ? `Edit ${current?.title}` : "Add Mantra / Chant"}
          </DialogTitle>
          <DialogDescription className="text-foreground/70">
            {isEdit ? "Update the mantra details, audio and cover image." : "Create the mantra record, then upload its audio and cover."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Title" required error={errors.title}>
              <Input value={values.title} onChange={(e) => handleTitleChange(e.target.value)} placeholder="Gayatri Mantra" className="border-border bg-card text-foreground" />
            </Field>
            <Field label="Slug" required error={errors.slug}>
              <Input
                value={values.slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  setField("slug", slugify(e.target.value));
                }}
                placeholder="gayatri-mantra"
                className="border-border bg-card text-foreground"
              />
            </Field>
            <Field label="Deity">
              <Input value={values.deity ?? ""} onChange={(e) => setField("deity", e.target.value)} placeholder="Savitr" className="border-border bg-card text-foreground" />
            </Field>
            <Field label="Category" required error={errors.category}>
              <Input value={values.category} onChange={(e) => setField("category", e.target.value)} placeholder="Vedic Mantras" className="border-border bg-card text-foreground" />
            </Field>
            <Field label="Status">
              <select
                value={values.status}
                onChange={(e) => setField("status", e.target.value as MantraFormValues["status"])}
                className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm text-foreground"
              >
                <option value="DRAFT">Draft</option>
                <option value="PUBLISHED">Published</option>
              </select>
            </Field>
            <Field label="Display Order">
              <Input type="number" min={0} value={values.displayOrder} onChange={(e) => setField("displayOrder", Number(e.target.value))} className="border-border bg-card text-foreground" />
            </Field>
          </div>

          <Field label="Lyrics / Text">
            <Textarea rows={3} value={values.lyricsText ?? ""} onChange={(e) => setField("lyricsText", e.target.value)} placeholder="Om Bhur Bhuvaḥ Swaha…" className="border-border bg-card text-foreground" />
          </Field>

          <Field label="Meaning">
            <Textarea rows={3} value={values.meaning ?? ""} onChange={(e) => setField("meaning", e.target.value)} placeholder="We meditate on the glory of the Creator…" className="border-border bg-card text-foreground" />
          </Field>

          {isEdit && (
            <div className="grid gap-4 rounded-lg border border-border p-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-sm text-foreground/80">Audio</Label>
                {current?.audioUrl ? (
                  <audio controls preload="none" src={current.audioUrl} className="w-full" />
                ) : (
                  <p className="text-sm text-foreground/70">No audio uploaded yet.</p>
                )}
                {current?.durationSeconds ? <p className="text-xs text-foreground/70">Duration: {formatDuration(current.durationSeconds)}</p> : null}
                <input ref={audioInputRef} type="file" accept="audio/mpeg,audio/mp3" className="hidden" onChange={(e) => handleAudioPicked(e.target.files)} />
                <Button type="button" variant="outline" size="sm" disabled={uploadAudio.isPending} onClick={() => audioInputRef.current?.click()} className="border-border bg-transparent text-foreground hover:bg-muted">
                  {uploadAudio.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Music className="h-4 w-4" />}
                  {current?.audioUrl ? "Replace Audio" : "Upload Audio"}
                </Button>
                <p className="text-xs text-foreground/70">MP3 only · up to 15 MB</p>
              </div>

              <div className="space-y-2">
                <Label className="text-sm text-foreground/80">Cover Image</Label>
                {current?.coverImageUrl ? (
                  <img src={current.coverImageUrl} alt="" className="h-20 w-20 rounded-md border border-border object-cover" />
                ) : (
                  <p className="text-sm text-foreground/70">No cover uploaded yet.</p>
                )}
                <input ref={coverInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/avif" className="hidden" onChange={(e) => handleCoverPicked(e.target.files)} />
                <Button type="button" variant="outline" size="sm" disabled={uploadCover.isPending} onClick={() => coverInputRef.current?.click()} className="border-border bg-transparent text-foreground hover:bg-muted">
                  {uploadCover.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
                  {current?.coverImageUrl ? "Replace Cover" : "Upload Cover"}
                </Button>
                <p className="text-xs text-foreground/70">JPEG, PNG, WebP or AVIF · up to 10 MB</p>
              </div>
            </div>
          )}

          {!isEdit && (
            <p className="rounded-lg bg-[#FAF8F5] p-3 text-sm text-foreground/70">
              Save the mantra first, then upload its audio and cover image from the edit dialog.
            </p>
          )}

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={isSubmitting} className="text-foreground/70 hover:bg-muted hover:text-foreground">
              {isEdit ? "Close" : "Cancel"}
            </Button>
            <Button type="submit" disabled={isSubmitting} className="bg-[#803003] text-white hover:bg-[#6B2802]">
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEdit ? "Save Changes" : "Create Mantra"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, required, error, children }: { label: string; required?: boolean; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm text-foreground/80">
        {label}
        {required && <span className="ml-0.5 text-[#803003]">*</span>}
      </Label>
      {children}
      {error && <p className="text-xs text-red-800">{error}</p>}
    </div>
  );
}

export default MantraDialog;
