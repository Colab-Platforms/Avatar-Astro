import { useEffect, useRef, useState } from "react";
import { ImagePlus, Loader2, Plus, X } from "lucide-react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GradientPicker } from "../GradientPicker";
import { useActiveShopCategories } from "../../hooks/useShopAdmin";
import {
  useCreateShopProduct,
  useUpdateShopProduct,
  useUploadProductImage,
} from "../../hooks/useShopAdmin";
import type { AdminShopProduct, ShopProductFormValues } from "../../types/shop";
import { IMAGE_ACCEPT_ATTR, slugify, validateImageFile } from "../../utils/shop";

const EMPTY_FORM: ShopProductFormValues = {
  categoryId: "",
  name: "",
  slug: "",
  price: 0,
  originalPrice: undefined,
  description: "",
  benefits: [],
  authenticity: "",
  gradient: "",
  isActive: true,
};

interface ProductFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: AdminShopProduct | null;
  /** Preselects a category when opening the form from a category-scoped view. */
  defaultCategoryId?: string;
}

export function ProductFormDialog({
  open,
  onOpenChange,
  product,
  defaultCategoryId,
}: ProductFormDialogProps) {
  const isEdit = Boolean(product);

  const [values, setValues] = useState<ShopProductFormValues>(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [benefitDraft, setBenefitDraft] = useState("");
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [slugTouched, setSlugTouched] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: categories = [] } = useActiveShopCategories();
  const createProduct = useCreateShopProduct();
  const updateProduct = useUpdateShopProduct();
  const uploadImage = useUploadProductImage();

  const isSubmitting =
    createProduct.isPending || updateProduct.isPending || uploadImage.isPending;

  useEffect(() => {
    if (!open) return;

    if (product) {
      setValues({
        categoryId: product.categoryId,
        name: product.name,
        slug: product.slug,
        price: product.price,
        originalPrice: product.originalPrice ?? undefined,
        description: product.description,
        benefits: product.benefits,
        authenticity: product.authenticity,
        gradient: product.gradient ?? "",
        isActive: product.isActive,
      });
      setSlugTouched(true);
    } else {
      setValues({ ...EMPTY_FORM, categoryId: defaultCategoryId ?? "" });
      setSlugTouched(false);
    }

    setErrors({});
    setPendingFile(null);
    setBenefitDraft("");
  }, [open, product, defaultCategoryId]);

  const previewUrl = pendingFile ? URL.createObjectURL(pendingFile) : null;
  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const setField = <K extends keyof ShopProductFormValues>(
    key: K,
    value: ShopProductFormValues[K],
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

  const addBenefit = () => {
    const value = benefitDraft.trim();
    if (!value) return;
    setField("benefits", [...values.benefits, value]);
    setBenefitDraft("");
  };

  const removeBenefit = (index: number) => {
    setField(
      "benefits",
      values.benefits.filter((_, i) => i !== index),
    );
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

    if (!values.categoryId) next.categoryId = "Select a category";
    if (!values.name.trim()) next.name = "Product name is required";
    if (!values.slug.trim()) next.slug = "Slug is required";
    else if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(values.slug))
      next.slug = "Use lowercase letters, numbers and single hyphens";
    if (!Number.isFinite(values.price) || values.price <= 0)
      next.price = "Enter a valid positive price";
    if (
      values.originalPrice !== undefined &&
      values.originalPrice !== null &&
      values.originalPrice !== ("" as unknown) &&
      values.originalPrice <= values.price
    )
      next.originalPrice = "Original price must be greater than the price";
    if (!values.description.trim())
      next.description = "Description is required";
    if (values.benefits.length === 0)
      next.benefits = "Add at least one benefit";
    if (!values.authenticity.trim())
      next.authenticity = "Authenticity is required";

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isSubmitting || !validate()) return;

    const payload: ShopProductFormValues = {
      categoryId: values.categoryId,
      name: values.name.trim(),
      slug: values.slug.trim(),
      price: values.price,
      originalPrice:
        values.originalPrice === undefined ||
        values.originalPrice === null ||
        (values.originalPrice as unknown) === ""
          ? undefined
          : values.originalPrice,
      description: values.description.trim(),
      benefits: values.benefits,
      authenticity: values.authenticity.trim(),
      gradient: values.gradient?.trim() || undefined,
      isActive: values.isActive,
    };

    try {
      const saved = isEdit
        ? await updateProduct.mutateAsync({
            productId: product!.id,
            values: payload,
          })
        : await createProduct.mutateAsync(payload);

      if (pendingFile) {
        await uploadImage.mutateAsync({
          productId: saved.id,
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
      <DialogContent className="max-h-[90vh] overflow-y-auto border-border bg-white text-foreground sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-semibold text-lg tracking-normal text-foreground">
            {isEdit ? `Edit ${product?.name}` : "Add Product"}
          </DialogTitle>
          <DialogDescription className="text-foreground/70">
            {isEdit
              ? "Update the product details."
              : "Create a product listed under the selected category."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Product Name" required error={errors.name}>
              <Input
                value={values.name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="Blue Sapphire (Neelam)"
                className="border-border bg-card text-foreground"
              />
            </Field>

            <Field label="Slug" required error={errors.slug}>
              <Input
                value={values.slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  setField("slug", slugify(e.target.value));
                }}
                placeholder="blue-sapphire"
                className="border-border bg-card text-foreground"
              />
            </Field>

            <Field label="Category" required error={errors.categoryId}>
              <Select
                value={values.categoryId}
                onValueChange={(value) => setField("categoryId", value)}
              >
                <SelectTrigger className="border-border bg-card text-foreground">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label="Price (₹)" required error={errors.price}>
              <Input
                type="number"
                min={1}
                value={values.price}
                onChange={(e) => setField("price", Number(e.target.value))}
                className="border-border bg-card text-foreground"
              />
            </Field>

            <Field label="Original Price (₹)" error={errors.originalPrice}>
              <Input
                type="number"
                min={1}
                value={values.originalPrice ?? ""}
                onChange={(e) =>
                  setField(
                    "originalPrice",
                    e.target.value === "" ? undefined : Number(e.target.value),
                  )
                }
                placeholder="Optional"
                className="border-border bg-card text-foreground"
              />
            </Field>

            <Field label="Authenticity" required error={errors.authenticity}>
              <Input
                value={values.authenticity}
                onChange={(e) => setField("authenticity", e.target.value)}
                placeholder="GIA Certified · Untreated · Sri Lanka Origin"
                className="border-border bg-card text-foreground"
              />
            </Field>
          </div>

          <Field label="Description" required error={errors.description}>
            <Textarea
              rows={3}
              value={values.description}
              onChange={(e) => setField("description", e.target.value)}
              placeholder="Natural Ceylon Blue Sapphire, energized with Vedic rituals…"
              className="border-border bg-card text-foreground"
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
              Benefits
              <span className="ml-0.5 text-[#803003]">*</span>
            </Label>

            {values.benefits.length > 0 && (
              <div className="space-y-1.5">
                {values.benefits.map((benefit, index) => (
                  <div
                    key={`${benefit}-${index}`}
                    className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-1.5"
                  >
                    <span className="flex-1 text-sm text-foreground/80">
                      {benefit}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeBenefit(index)}
                      className="text-foreground/70 hover:text-red-800"
                      aria-label={`Remove ${benefit}`}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <Input
                value={benefitDraft}
                onChange={(e) => setBenefitDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addBenefit();
                  }
                }}
                placeholder="e.g. Career advancement"
                className="border-border bg-card text-foreground"
              />
              <Button
                type="button"
                variant="outline"
                onClick={addBenefit}
                className="border-border bg-transparent text-foreground hover:bg-muted hover:text-foreground"
              >
                <Plus className="h-4 w-4" />
                Add
              </Button>
            </div>
            {errors.benefits && (
              <p className="text-xs text-red-800">{errors.benefits}</p>
            )}
          </div>

          <div className="flex items-center justify-between rounded-md border border-border bg-card px-3 py-2.5">
            <div>
              <Label className="text-sm text-foreground/80">Active</Label>
              <p className="text-xs text-foreground/70">
                Inactive products are hidden from future customer-facing use.
              </p>
            </div>
            <Switch
              checked={values.isActive ?? true}
              onCheckedChange={(checked) => setField("isActive", checked)}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm text-foreground/80">Product Image</Label>

            {(previewUrl || product?.image) && (
              <div className="h-20 w-20 overflow-hidden rounded-md border border-border">
                <img
                  src={previewUrl ?? product?.image ?? ""}
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
              className="border-border bg-transparent text-foreground hover:bg-muted hover:text-foreground"
            >
              <ImagePlus className="h-4 w-4" />
              {product?.image || previewUrl ? "Replace Image" : "Select Image"}
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
              className="text-foreground/70 hover:bg-muted hover:text-foreground"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-[#803003] text-white hover:bg-[#6B2802]"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {uploadImage.isPending
                ? "Uploading image…"
                : isEdit
                  ? "Save Changes"
                  : "Create Product"}
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
        {required && <span className="ml-0.5 text-[#803003]">*</span>}
      </Label>
      {children}
      {error && <p className="text-xs text-red-800">{error}</p>}
    </div>
  );
}

export default ProductFormDialog;
