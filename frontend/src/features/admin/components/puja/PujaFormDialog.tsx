import { useEffect, useState } from "react";
import { Loader2, Plus, X } from "lucide-react";
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
import { useCreatePuja, useUpdatePuja } from "../../hooks/usePujaAdmin";
import type { AdminPuja, PujaFormValues } from "../../types/puja";

interface PujaFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templeId: string;
  /** Omit to create a new Puja. */
  puja?: AdminPuja | null;
}

export function PujaFormDialog({
  open,
  onOpenChange,
  templeId,
  puja,
}: PujaFormDialogProps) {
  const isEdit = Boolean(puja);

  const [name, setName] = useState("");
  const [price, setPrice] = useState(0);
  const [duration, setDuration] = useState("");
  const [benefits, setBenefits] = useState<string[]>([""]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const createPuja = useCreatePuja();
  const updatePuja = useUpdatePuja();
  const isSubmitting = createPuja.isPending || updatePuja.isPending;

  useEffect(() => {
    if (!open) return;

    setName(puja?.name ?? "");
    setPrice(puja?.price ?? 0);
    setDuration(puja?.duration ?? "");
    setBenefits(puja?.benefits.length ? [...puja.benefits] : [""]);
    setErrors({});
  }, [open, puja]);

  const updateBenefit = (index: number, value: string) =>
    setBenefits((prev) => prev.map((b, i) => (i === index ? value : b)));

  const removeBenefit = (index: number) =>
    setBenefits((prev) =>
      prev.length === 1 ? [""] : prev.filter((_, i) => i !== index),
    );

  const validate = (cleanedBenefits: string[]) => {
    const next: Record<string, string> = {};

    if (!name.trim()) next.name = "Puja name is required";
    if (!Number.isFinite(price) || price < 0)
      next.price = "Enter a valid non-negative price";
    if (!duration.trim()) next.duration = "Duration is required";
    if (cleanedBenefits.length === 0) next.benefits = "Add at least one benefit";

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isSubmitting) return;

    const cleanedBenefits = benefits
      .map((b) => b.trim())
      .filter((b) => b.length > 0);

    if (!validate(cleanedBenefits)) return;

    const values: PujaFormValues = {
      name: name.trim(),
      price,
      duration: duration.trim(),
      benefits: cleanedBenefits,
    };

    try {
      if (isEdit) {
        await updatePuja.mutateAsync({ pujaId: puja!.id, templeId, values });
      } else {
        await createPuja.mutateAsync({ templeId, values });
      }
      onOpenChange(false);
    } catch {
      // hooks surface the error; keep the dialog open with the entered values
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !isSubmitting && onOpenChange(next)}>
      <DialogContent className="max-h-[90vh] overflow-y-auto border-border bg-white text-foreground sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-semibold text-lg tracking-normal text-foreground">
            {isEdit ? "Edit Puja" : "Add Puja"}
          </DialogTitle>
          <DialogDescription className="text-foreground/70">
            {isEdit
              ? "Update this Puja's details and benefits."
              : "Create a new Puja for this temple."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-sm text-foreground/80">
              Puja Name<span className="ml-0.5 text-[#803003]">*</span>
            </Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Suprabhatam Seva"
              className="border-border bg-card text-foreground"
            />
            {errors.name && <p className="text-xs text-red-800">{errors.name}</p>}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-sm text-foreground/80">
                Price (₹)<span className="ml-0.5 text-[#803003]">*</span>
              </Label>
              <Input
                type="number"
                min={0}
                value={price}
                onChange={(e) => setPrice(Number(e.target.value))}
                className="border-border bg-card text-foreground"
              />
              {errors.price && (
                <p className="text-xs text-red-800">{errors.price}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm text-foreground/80">
                Duration<span className="ml-0.5 text-[#803003]">*</span>
              </Label>
              <Input
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                placeholder="30 min"
                className="border-border bg-card text-foreground"
              />
              {errors.duration && (
                <p className="text-xs text-red-800">{errors.duration}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm text-foreground/80">
              Benefits<span className="ml-0.5 text-[#803003]">*</span>
            </Label>

            <div className="space-y-2">
              {benefits.map((benefit, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    value={benefit}
                    onChange={(e) => updateBenefit(index, e.target.value)}
                    placeholder="Divine awakening blessings"
                    className="border-border bg-card text-foreground"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeBenefit(index)}
                    className="shrink-0 text-foreground/70 hover:bg-muted hover:text-foreground"
                    aria-label="Remove benefit"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>

            {errors.benefits && (
              <p className="text-xs text-red-800">{errors.benefits}</p>
            )}

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setBenefits((prev) => [...prev, ""])}
              className="border-border bg-transparent text-foreground hover:bg-muted hover:text-foreground"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Benefit
            </Button>
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
              {isEdit ? "Save Changes" : "Add Puja"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default PujaFormDialog;
