import { useEffect, useRef, useState } from "react";
import { FileText, ImagePlus, Loader2, UploadCloud } from "lucide-react";
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
  useCreateBook,
  useUpdateBook,
  useUploadBookCover,
  useUploadBookFile,
} from "../../hooks/useDevotionLibraryAdmin";
import type { AdminSpiritualBook, BookFormValues } from "../../types/devotionLibrary";
import { formatBytes, slugify } from "../../utils/devotionLibrary";

const EMPTY_FORM: BookFormValues = {
  title: "",
  slug: "",
  author: "",
  category: "",
  description: "",
  status: "DRAFT",
  displayOrder: 0,
};

const MAX_PDF_BYTES = 25 * 1024 * 1024;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

interface BookDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  book?: AdminSpiritualBook | null;
}

export function BookDialog({ open, onOpenChange, book }: BookDialogProps) {
  const [values, setValues] = useState<BookFormValues>(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [slugTouched, setSlugTouched] = useState(false);
  // Holds the just-created record so the upload section appears immediately
  // after "Create Book", without the admin having to reopen the dialog to edit.
  const [savedBook, setSavedBook] = useState<AdminSpiritualBook | null>(null);
  const current = book ?? savedBook;
  const isEdit = Boolean(current);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const createBook = useCreateBook();
  const updateBook = useUpdateBook();
  const uploadFile = useUploadBookFile();
  const uploadCover = useUploadBookCover();

  const isSubmitting = createBook.isPending || updateBook.isPending;
  const isUploading = uploadFile.isPending || uploadCover.isPending;

  useEffect(() => {
    if (!open) return;
    if (book) {
      setValues({
        title: book.title,
        slug: book.slug,
        author: book.author ?? "",
        category: book.category,
        description: book.description,
        status: book.status,
        displayOrder: book.displayOrder,
      });
      setSlugTouched(true);
    } else {
      setValues(EMPTY_FORM);
      setSlugTouched(false);
    }
    setErrors({});
    setSavedBook(null);
  }, [open, book]);

  const setField = <K extends keyof BookFormValues>(key: K, value: BookFormValues[K]) => {
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
    if (!values.description.trim()) next.description = "Description is required";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isSubmitting || !validate()) return;

    const payload: BookFormValues = {
      ...values,
      title: values.title.trim(),
      slug: values.slug.trim(),
      author: values.author?.trim() || undefined,
      category: values.category.trim(),
      description: values.description.trim(),
    };

    try {
      if (book) {
        await updateBook.mutateAsync({ bookId: book.id, values: payload });
      } else if (savedBook) {
        setSavedBook(await updateBook.mutateAsync({ bookId: savedBook.id, values: payload }));
      } else {
        setSavedBook(await createBook.mutateAsync(payload));
      }
    } catch {
      // hook already surfaced the error
    }
  };

  const handleFilePicked = async (fileList: FileList | null) => {
    if (!fileList?.length || !current) return;
    const file = fileList[0];
    if (fileInputRef.current) fileInputRef.current.value = "";

    if (file.type !== "application/pdf") return toast.error("Only PDF files are allowed");
    if (file.size > MAX_PDF_BYTES) return toast.error("The PDF must be 25 MB or smaller");

    const updated = await uploadFile.mutateAsync({ bookId: current.id, file }).catch(() => null);
    if (updated && !book) setSavedBook(updated);
  };

  const handleCoverPicked = async (fileList: FileList | null) => {
    if (!fileList?.length || !current) return;
    const file = fileList[0];
    if (coverInputRef.current) coverInputRef.current.value = "";

    if (!["image/jpeg", "image/png", "image/webp", "image/avif"].includes(file.type)) {
      return toast.error("Only JPEG, PNG, WebP and AVIF images are allowed");
    }
    if (file.size > MAX_IMAGE_BYTES) return toast.error("The cover image must be 10 MB or smaller");

    const updated = await uploadCover.mutateAsync({ bookId: current.id, file }).catch(() => null);
    if (updated && !book) setSavedBook(updated);
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !isSubmitting && !isUploading && onOpenChange(next)}>
      <DialogContent className="max-h-[90vh] overflow-y-auto border-border bg-white text-foreground sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-semibold text-lg tracking-normal text-foreground">
            {isEdit ? `Edit ${current?.title}` : "Add Spiritual Book"}
          </DialogTitle>
          <DialogDescription className="text-foreground/70">
            {isEdit ? "Update the book details, PDF and cover image." : "Create the book record, then upload its PDF and cover."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Title" required error={errors.title}>
              <Input value={values.title} onChange={(e) => handleTitleChange(e.target.value)} placeholder="Bhagavad Gita" className="border-border bg-card text-foreground" />
            </Field>
            <Field label="Slug" required error={errors.slug}>
              <Input
                value={values.slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  setField("slug", slugify(e.target.value));
                }}
                placeholder="bhagavad-gita"
                className="border-border bg-card text-foreground"
              />
            </Field>
            <Field label="Author">
              <Input value={values.author ?? ""} onChange={(e) => setField("author", e.target.value)} placeholder="Vyasa" className="border-border bg-card text-foreground" />
            </Field>
            <Field label="Category" required error={errors.category}>
              <Input value={values.category} onChange={(e) => setField("category", e.target.value)} placeholder="Scriptures" className="border-border bg-card text-foreground" />
            </Field>
            <Field label="Status">
              <select
                value={values.status}
                onChange={(e) => setField("status", e.target.value as BookFormValues["status"])}
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

          <Field label="Description" required error={errors.description}>
            <Textarea rows={3} value={values.description} onChange={(e) => setField("description", e.target.value)} placeholder="A timeless discourse on duty and devotion…" className="border-border bg-card text-foreground" />
          </Field>

          {isEdit && (
            <div className="grid gap-4 rounded-lg border border-border p-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-sm text-foreground/80">PDF File</Label>
                {current?.fileUrl ? (
                  <a href={current.fileUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm text-[#803003] hover:underline">
                    <FileText className="h-4 w-4" /> Uploaded ({formatBytes(current.fileBytes)})
                  </a>
                ) : (
                  <p className="text-sm text-foreground/70">No PDF uploaded yet.</p>
                )}
                <input ref={fileInputRef} type="file" accept="application/pdf" className="hidden" onChange={(e) => handleFilePicked(e.target.files)} />
                <Button type="button" variant="outline" size="sm" disabled={uploadFile.isPending} onClick={() => fileInputRef.current?.click()} className="border-border bg-transparent text-foreground hover:bg-muted">
                  {uploadFile.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
                  {current?.fileUrl ? "Replace PDF" : "Upload PDF"}
                </Button>
                <p className="text-xs text-foreground/70">PDF only · up to 25 MB</p>
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
              Save the book first, then upload its PDF and cover image from the edit dialog.
            </p>
          )}

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={isSubmitting} className="text-foreground/70 hover:bg-muted hover:text-foreground">
              {isEdit ? "Close" : "Cancel"}
            </Button>
            <Button type="submit" disabled={isSubmitting} className="bg-[#803003] text-white hover:bg-[#6B2802]">
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEdit ? "Save Changes" : "Create Book"}
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

export default BookDialog;
