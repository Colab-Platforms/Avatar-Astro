import { useEffect, useMemo, useRef, useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
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
import { GradientPicker } from "../GradientPicker";
import {
  useCreateTemple,
  useUpdateTemple,
  useUploadTempleImages,
} from "../../hooks/usePujaAdmin";
import type {
  AdminTemple,
  AdminTempleListItem,
  TempleFormValues,
} from "../../types/puja";
import {
  IMAGE_ACCEPT_ATTR,
  slugify,
  validateImageFiles,
} from "../../utils/puja";

const EMPTY_FORM: TempleFormValues = {
  name: "",
  slug: "",
  location: "",
  state: "",
  deity: "",
  description: "",
  priceFrom: 0,
  gradient: "",
};

interface TempleFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /**
   * Omit to create a new temple. A list row is enough — this form only edits
   * scalar fields, so it never needs the nested images/pujas arrays.
   */
  temple?: AdminTemple | AdminTempleListItem | null;
}

export function TempleFormDialog({
  open,
  onOpenChange,
  temple,
}: TempleFormDialogProps) {
  const isEdit = Boolean(temple);

  const [values, setValues] = useState<TempleFormValues>(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  // Once the admin edits the slug by hand, stop overwriting it from the name.
  const [slugTouched, setSlugTouched] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const createTemple = useCreateTemple();
  const updateTemple = useUpdateTemple();
  const uploadImages = useUploadTempleImages();

  const isSubmitting =
    createTemple.isPending || updateTemple.isPending || uploadImages.isPending;

  useEffect(() => {
    if (!open) return;

    if (temple) {
      setValues({
        name: temple.name,
        slug: temple.slug,
        location: temple.location,
        state: temple.state,
        deity: temple.deity,
        description: temple.description,
        priceFrom: temple.priceFrom,
        gradient: temple.gradient ?? "",
      });
      setSlugTouched(true);
    } else {
      setValues(EMPTY_FORM);
      setSlugTouched(false);
    }

    setErrors({});
    setPendingFiles([]);
  }, [open, temple]);

  const previews = useMemo(
    () =>
      pendingFiles.map((file) => ({
        file,
        url: URL.createObjectURL(file),
      })),
    [pendingFiles],
  );

  // Object URLs leak until revoked, and a new list is built on every change.
  useEffect(
    () => () => previews.forEach((preview) => URL.revokeObjectURL(preview.url)),
    [previews],
  );

  const setField = <K extends keyof TempleFormValues>(
    key: K,
    value: TempleFormValues[K],
  ) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      if (!prev[key as string]) return prev;
      const next = { ...prev };
      delete next[key as string];
      return next;
    });
  };

  const handleNameChange = (name: string) => {
    setValues((prev) => ({
      ...prev,
      name,
      slug: slugTouched ? prev.slug : slugify(name),
    }));
  };

  const handleFilesPicked = (fileList: FileList | null) => {
    if (!fileList?.length) return;

    const { accepted, errors: fileErrors } = validateImageFiles(
      Array.from(fileList),
    );
    fileErrors.forEach((message) => toast.error(message));
    if (accepted.length) {
      setPendingFiles((prev) => [...prev, ...accepted]);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const validate = (): boolean => {
    const next: Record<string, string> = {};

    if (!values.name.trim()) next.name = "Temple name is required";
    if (!values.slug.trim()) next.slug = "Slug is required";
    else if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(values.slug))
      next.slug = "Use lowercase letters, numbers and single hyphens";
    if (!values.location.trim()) next.location = "Location is required";
    if (!values.state.trim()) next.state = "State is required";
    if (!values.deity.trim()) next.deity = "Deity is required";
    if (!values.description.trim())
      next.description = "Description is required";
    if (!Number.isFinite(values.priceFrom) || values.priceFrom < 0)
      next.priceFrom = "Enter a valid non-negative price";

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isSubmitting || !validate()) return;

    const payload: TempleFormValues = {
      ...values,
      name: values.name.trim(),
      slug: values.slug.trim(),
      location: values.location.trim(),
      state: values.state.trim(),
      deity: values.deity.trim(),
      description: values.description.trim(),
      gradient: values.gradient?.trim() || undefined,
    };

    try {
      const saved = isEdit
        ? await updateTemple.mutateAsync({
            templeId: temple!.id,
            values: payload,
          })
        : await createTemple.mutateAsync(payload);

      // Images need a temple to belong to, so they are uploaded only after the
      // record exists. A failed upload leaves the saved temple intact.
      if (pendingFiles.length) {
        await uploadImages.mutateAsync({
          templeId: saved.id,
          files: pendingFiles,
        });
      }

      onOpenChange(false);
    } catch {
      // Toasts are raised by the mutation hooks; keep the dialog open so the
      // admin can correct the input rather than retyping it.
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !isSubmitting && onOpenChange(next)}>
      <DialogContent className="max-h-[90vh] overflow-y-auto border-primary/15 bg-[#FBF5EC] text-foreground sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-display text-lg tracking-wide text-foreground">
            {isEdit ? `Edit ${temple?.name}` : "Add Temple"}
          </DialogTitle>
          <DialogDescription className="text-foreground/70">
            {isEdit
              ? "Update the temple details. Existing images stay untouched unless you remove them."
              : "Create a temple record. You can attach images now or later."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Temple Name" required error={errors.name}>
              <Input
                value={values.name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="Tirupati Balaji"
                className="border-primary/15 bg-card text-foreground"
              />
            </Field>

            <Field label="Slug" required error={errors.slug}>
              <Input
                value={values.slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  setField("slug", slugify(e.target.value));
                }}
                placeholder="tirupati-balaji"
                className="border-primary/15 bg-card text-foreground"
              />
            </Field>

            <Field label="Location" required error={errors.location}>
              <Input
                value={values.location}
                onChange={(e) => setField("location", e.target.value)}
                placeholder="Tirumala, Tirupati"
                className="border-primary/15 bg-card text-foreground"
              />
            </Field>

            <Field label="State" required error={errors.state}>
              <Input
                value={values.state}
                onChange={(e) => setField("state", e.target.value)}
                placeholder="Andhra Pradesh"
                className="border-primary/15 bg-card text-foreground"
              />
            </Field>

            <Field label="Deity" required error={errors.deity}>
              <Input
                value={values.deity}
                onChange={(e) => setField("deity", e.target.value)}
                placeholder="Lord Venkateswara"
                className="border-primary/15 bg-card text-foreground"
              />
            </Field>

            <Field label="Starting Price (₹)" required error={errors.priceFrom}>
              <Input
                type="number"
                min={0}
                value={values.priceFrom}
                onChange={(e) =>
                  setField("priceFrom", Number(e.target.value))
                }
                className="border-primary/15 bg-card text-foreground"
              />
            </Field>
          </div>

          <Field label="Description" required error={errors.description}>
            <Textarea
              rows={3}
              value={values.description}
              onChange={(e) => setField("description", e.target.value)}
              placeholder="One of the world's most visited religious sites…"
              className="border-primary/15 bg-card text-foreground"
            />
          </Field>

          <Field label="Card Color" error={errors.gradient}>
            <GradientPicker
              value={values.gradient ?? ""}
              onChange={(next) => setField("gradient", next)}
            />
          </Field>

          <div className="space-y-2">
            <Label className="text-sm text-foreground/80">
              {isEdit ? "Add More Images" : "Temple Images"}
            </Label>

            {previews.length > 0 && (
              <div className="flex flex-wrap gap-3">
                {previews.map((preview, index) => (
                  <div
                    key={preview.url}
                    className="relative h-20 w-20 overflow-hidden rounded-md border border-primary/15"
                  >
                    <img
                      src={preview.url}
                      alt={preview.file.name}
                      className="h-full w-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setPendingFiles((prev) =>
                          prev.filter((_, i) => i !== index),
                        )
                      }
                      className="absolute right-0.5 top-0.5 rounded-full bg-black/70 p-1 text-white hover:bg-black"
                      aria-label={`Remove ${preview.file.name}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept={IMAGE_ACCEPT_ATTR}
              multiple
              className="hidden"
              onChange={(e) => handleFilesPicked(e.target.files)}
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="border-primary/15 bg-transparent text-foreground hover:bg-primary/10 hover:text-foreground"
            >
              <ImagePlus className="h-4 w-4" />
              Select Images
            </Button>
            <p className="text-xs text-foreground/70">
              JPEG, PNG, WebP or AVIF · up to 10 MB each
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="text-foreground/70 hover:bg-primary/10 hover:text-foreground"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-[#592209] text-[#F5E9D6] hover:bg-[#592209]/90"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {uploadImages.isPending
                ? "Uploading images…"
                : isEdit
                  ? "Save Changes"
                  : "Create Temple"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm text-foreground/80">
        {label}
        {required && <span className="ml-0.5 text-[#592209]">*</span>}
      </Label>
      {children}
      {error && <p className="text-xs text-red-800">{error}</p>}
    </div>
  );
}

export default TempleFormDialog;
