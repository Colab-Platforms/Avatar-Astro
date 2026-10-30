import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useAdminTempleOptions,
  useCreateChadhawa,
  useUpdateChadhawa,
} from "../../hooks/useChadhawaAdmin";
import type {
  AdminChadhawa,
  ChadhawaFormValues,
} from "../../types/chadhawa";

interface ChadhawaFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Omit to create a new offering. */
  chadhawa?: AdminChadhawa | null;
  /** Pre-selected temple when creating from a filtered listing. */
  defaultTempleId?: string;
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

export function ChadhawaFormDialog({
  open,
  onOpenChange,
  chadhawa,
  defaultTempleId,
}: ChadhawaFormDialogProps) {
  const isEdit = Boolean(chadhawa);

  const [templeId, setTempleId] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState(0);
  const [emoji, setEmoji] = useState("");
  const [displayOrder, setDisplayOrder] = useState(0);
  const [isActive, setIsActive] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { data: temples = [], isLoading: templesLoading } =
    useAdminTempleOptions();
  const createChadhawa = useCreateChadhawa();
  const updateChadhawa = useUpdateChadhawa();
  const isSubmitting = createChadhawa.isPending || updateChadhawa.isPending;

  useEffect(() => {
    if (!open) return;

    setTempleId(chadhawa?.templeId ?? defaultTempleId ?? "");
    setName(chadhawa?.name ?? "");
    setDescription(chadhawa?.description ?? "");
    setPrice(chadhawa?.price ?? 0);
    setEmoji(chadhawa?.emoji ?? "");
    setDisplayOrder(chadhawa?.displayOrder ?? 0);
    setIsActive(chadhawa?.isActive ?? true);
    setErrors({});
  }, [open, chadhawa, defaultTempleId]);

  // Mirrors the server-side Joi rules so obvious mistakes never cost a
  // round-trip; the backend stays the authority.
  const validate = () => {
    const next: Record<string, string> = {};

    if (!templeId) next.templeId = "Select a temple";
    if (!name.trim()) next.name = "Offering name is required";
    if (!description.trim()) next.description = "Description is required";
    if (!Number.isFinite(price) || price <= 0)
      next.price = "Price must be greater than 0";
    if (!Number.isInteger(displayOrder) || displayOrder < 0)
      next.displayOrder = "Display order must be 0 or greater";

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isSubmitting) return;
    if (!validate()) return;

    const values: ChadhawaFormValues = {
      templeId,
      name: name.trim(),
      description: description.trim(),
      price,
      emoji: emoji.trim(),
      displayOrder,
      isActive,
    };

    try {
      if (isEdit) {
        await updateChadhawa.mutateAsync({ chadhawaId: chadhawa!.id, values });
      } else {
        await createChadhawa.mutateAsync(values);
      }
      onOpenChange(false);
    } catch {
      // hooks surface the error; keep the dialog open with the entered values
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => !isSubmitting && onOpenChange(next)}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto border-border bg-white text-foreground sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-semibold text-lg tracking-normal text-foreground">
            {isEdit ? "Edit Chadhawa Offering" : "Add Chadhawa Offering"}
          </DialogTitle>
          <DialogDescription className="text-foreground/70">
            {isEdit
              ? "Update this offering's details."
              : "Create a new devotional offering for a temple."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Temple" required error={errors.templeId}>
            <Select
              value={templeId}
              onValueChange={setTempleId}
              disabled={templesLoading}
            >
              <SelectTrigger className="border-border bg-card text-foreground">
                <SelectValue
                  placeholder={
                    templesLoading ? "Loading temples…" : "Select a temple"
                  }
                />
              </SelectTrigger>
              <SelectContent className="border-border bg-white text-foreground">
                {temples.map((temple) => (
                  <SelectItem key={temple.id} value={temple.id}>
                    {temple.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!templesLoading && temples.length === 0 && (
              <p className="text-xs text-foreground/70">
                Add a temple under Puja Management first.
              </p>
            )}
          </Field>

          <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
            <Field label="Offering Name" required error={errors.name}>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Flower Basket"
                className="border-border bg-card text-foreground"
              />
            </Field>

            <Field label="Emoji">
              <Input
                value={emoji}
                onChange={(e) => setEmoji(e.target.value)}
                placeholder="🌺"
                className="w-24 border-border bg-card text-center text-foreground"
              />
            </Field>
          </div>

          <Field label="Description" required error={errors.description}>
            <Textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Fresh flowers offered at the deity's feet"
              className="border-border bg-card text-foreground"
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Price (₹)" required error={errors.price}>
              <Input
                type="number"
                min={1}
                value={price}
                onChange={(e) => setPrice(Number(e.target.value))}
                className="border-border bg-card text-foreground"
              />
            </Field>

            <Field label="Display Order" error={errors.displayOrder}>
              <Input
                type="number"
                min={0}
                value={displayOrder}
                onChange={(e) => setDisplayOrder(Number(e.target.value))}
                className="border-border bg-card text-foreground"
              />
            </Field>
          </div>

          <Field label="Status">
            <Select
              value={isActive ? "active" : "inactive"}
              onValueChange={(value) => setIsActive(value === "active")}
            >
              <SelectTrigger className="border-border bg-card text-foreground">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="border-border bg-white text-foreground">
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </Field>

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
              {isEdit ? "Save Changes" : "Add Offering"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default ChadhawaFormDialog;
