import { useEffect, useRef, useState } from "react";
import { ImagePlus, Loader2 } from "lucide-react";
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
import { Switch } from "@/components/ui/switch";
import {
  useCreateShopCategory,
  useUpdateShopCategory,
  useUploadCategoryImage,
} from "../../hooks/useShopAdmin";
import type { AdminShopCategory, ShopCategoryFormValues } from "../../types/shop";
import { IMAGE_ACCEPT_ATTR, slugify, validateImageFile } from "../../utils/shop";

const EMPTY_FORM: ShopCategoryFormValues = {
  name: "",
  slug: "",
  description: "",
  isActive: true,
};

interface CategoryFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category?: AdminShopCategory | null;
}

export function CategoryFormDialog({
  open,
  onOpenChange,
  category,
}: CategoryFormDialogProps) {
  const isEdit = Boolean(category);

  const [values, setValues] = useState<ShopCategoryFormValues>(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [slugTouched, setSlugTouched] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const createCategory = useCreateShopCategory();
  const updateCategory = useUpdateShopCategory();
  const uploadImage = useUploadCategoryImage();

  const isSubmitting =
    createCategory.isPending || updateCategory.isPending || uploadImage.isPending;

  useEffect(() => {
    if (!open) return;

    if (category) {
      setValues({
        name: category.name,
        slug: category.slug,
        description: category.description ?? "",
        isActive: category.isActive,
      });
      setSlugTouched(true);
    } else {
      setValues(EMPTY_FORM);
      setSlugTouched(false);
    }

    setErrors({});
    setPendingFile(null);
  }, [open, category]);

  const previewUrl = pendingFile ? URL.createObjectURL(pendingFile) : null;
  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const setField = <K extends keyof ShopCategoryFormValues>(
    key: K,
    value: ShopCategoryFormValues[K],
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

  const handleFilePicked = (fileList: FileList | null) => {
    const file = fileList?.[0];
    if (!file) return;

    const error = validateImageFile(file);
    if (error) {
      toast.error(error);
    } else {
      setPendingFile(file);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const validate = (): boolean => {
    const next: Record<string, string> = {};

    if (!values.name.trim()) next.name = "Category name is required";
    if (!values.slug.trim()) next.slug = "Slug is required";
    else if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(values.slug))
      next.slug = "Use lowercase letters, numbers and single hyphens";

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isSubmitting || !validate()) return;

    const payload: ShopCategoryFormValues = {
      name: values.name.trim(),
      slug: values.slug.trim(),
      description: values.description?.trim() || undefined,
      isActive: values.isActive,
    };

    try {
      const saved = isEdit
        ? await updateCategory.mutateAsync({
            categoryId: category!.id,
            values: payload,
          })
        : await createCategory.mutateAsync(payload);

      if (pendingFile) {
        await uploadImage.mutateAsync({
          categoryId: saved.id,
          file: pendingFile,
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
      <DialogContent className="max-h-[90vh] overflow-y-auto border-primary/15 bg-[#FBF5EC] text-foreground sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-lg tracking-wide text-foreground">
            {isEdit ? `Edit ${category?.name}` : "Add Category"}
          </DialogTitle>
          <DialogDescription className="text-foreground/70">
            {isEdit
              ? "Update the category details."
              : "Create a category for shop products to belong to."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Category Name" required error={errors.name}>
            <Input
              value={values.name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Gemstones"
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
              placeholder="gemstones"
              className="border-primary/15 bg-card text-foreground"
            />
          </Field>

          <Field label="Description" error={errors.description}>
            <Textarea
              rows={3}
              value={values.description ?? ""}
              onChange={(e) => setField("description", e.target.value)}
              placeholder="Optional description shown to admins…"
              className="border-primary/15 bg-card text-foreground"
            />
          </Field>

          <div className="flex items-center justify-between rounded-md border border-primary/15 bg-card px-3 py-2.5">
            <div>
              <Label className="text-sm text-foreground/80">Active</Label>
              <p className="text-xs text-foreground/70">
                Inactive categories are hidden from future customer-facing use.
              </p>
            </div>
            <Switch
              checked={values.isActive ?? true}
              onCheckedChange={(checked) => setField("isActive", checked)}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm text-foreground/80">Category Image</Label>

            {(previewUrl || category?.image) && (
              <div className="h-20 w-20 overflow-hidden rounded-md border border-primary/15">
                <img
                  src={previewUrl ?? category?.image ?? ""}
                  alt=""
                  className="h-full w-full object-cover"
                />
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept={IMAGE_ACCEPT_ATTR}
              className="hidden"
              onChange={(e) => handleFilePicked(e.target.files)}
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="border-primary/15 bg-transparent text-foreground hover:bg-primary/10 hover:text-foreground"
            >
              <ImagePlus className="h-4 w-4" />
              {category?.image || previewUrl ? "Replace Image" : "Select Image"}
            </Button>
            <p className="text-xs text-foreground/70">
              JPEG, PNG, WebP or AVIF · up to 10 MB
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
              {uploadImage.isPending
                ? "Uploading image…"
                : isEdit
                  ? "Save Changes"
                  : "Create Category"}
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

export default CategoryFormDialog;
