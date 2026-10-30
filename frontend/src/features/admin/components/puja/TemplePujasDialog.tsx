import { useState } from "react";
import { Flame, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAdminTemple, useDeletePuja } from "../../hooks/usePujaAdmin";
import type { AdminPuja } from "../../types/puja";
import { formatPrice } from "../../utils/puja";
import { PujaFormDialog } from "./PujaFormDialog";

interface TemplePujasDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templeId: string | null;
  templeName?: string;
}

export function TemplePujasDialog({
  open,
  onOpenChange,
  templeId,
  templeName,
}: TemplePujasDialogProps) {
  const [formOpen, setFormOpen] = useState(false);
  const [editingPuja, setEditingPuja] = useState<AdminPuja | null>(null);
  const [pujaToDelete, setPujaToDelete] = useState<AdminPuja | null>(null);

  const { data: temple, isLoading, isError, error } = useAdminTemple(
    open ? templeId : null,
  );
  const deletePuja = useDeletePuja();

  const pujas = temple?.pujas ?? [];

  const openCreate = () => {
    setEditingPuja(null);
    setFormOpen(true);
  };

  const openEdit = (puja: AdminPuja) => {
    setEditingPuja(puja);
    setFormOpen(true);
  };

  const confirmDelete = async () => {
    if (!pujaToDelete || !templeId) return;
    try {
      await deletePuja.mutateAsync({ pujaId: pujaToDelete.id, templeId });
    } catch {
      // hook surfaces the error
    } finally {
      setPujaToDelete(null);
    }
  };

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(next) => !deletePuja.isPending && onOpenChange(next)}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto border-primary/15 bg-[#FBF5EC] text-foreground sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-display text-lg tracking-wide text-foreground">
              {templeName ?? temple?.name ?? "Temple"}
            </DialogTitle>
            <DialogDescription className="text-foreground/70">
              Manage the Pujas offered at this temple.
            </DialogDescription>
          </DialogHeader>

          {isLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-foreground/70" />
            </div>
          ) : isError ? (
            <p className="py-8 text-center text-sm text-red-800">
              {(error as Error)?.message ?? "Could not load Pujas"}
            </p>
          ) : pujas.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-primary/15 py-10 text-center">
              <Flame className="h-8 w-8 text-foreground/70" />
              <p className="text-sm text-foreground/70">
                No Pujas added for this temple yet.
              </p>
              <Button
                type="button"
                onClick={openCreate}
                className="bg-[#592209] text-[#F5E9D6] hover:bg-[#592209]/90"
              >
                <Plus className="h-4 w-4" />
                Add Puja
              </Button>
            </div>
          ) : (
            <ul className="divide-y divide-primary/15 rounded-lg border border-primary/15">
              {pujas.map((puja) => (
                <li
                  key={puja.id}
                  className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between"
                >
                  <div className="min-w-0 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span className="font-medium text-foreground">{puja.name}</span>
                      <span className="text-sm text-[#592209]">
                        {formatPrice(puja.price)}
                      </span>
                      <span className="text-sm text-foreground/70">
                        {puja.duration}
                      </span>
                    </div>
                    <ul className="flex flex-wrap gap-1.5">
                      {puja.benefits.map((benefit, index) => (
                        <li
                          key={index}
                          className="rounded-full bg-card px-2.5 py-0.5 text-xs text-foreground/70"
                        >
                          {benefit}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="flex shrink-0 gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => openEdit(puja)}
                      className="text-foreground/70 hover:bg-primary/10 hover:text-foreground"
                      aria-label={`Edit ${puja.name}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setPujaToDelete(puja)}
                      className="text-foreground/70 hover:bg-red-500/10 hover:text-red-800"
                      aria-label={`Delete ${puja.name}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {pujas.length > 0 && (
            <div className="flex justify-end pt-2">
              <Button
                type="button"
                onClick={openCreate}
                className="bg-[#592209] text-[#F5E9D6] hover:bg-[#592209]/90"
              >
                <Plus className="h-4 w-4" />
                Add Puja
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {templeId && (
        <PujaFormDialog
          open={formOpen}
          onOpenChange={setFormOpen}
          templeId={templeId}
          puja={editingPuja}
        />
      )}

      <AlertDialog
        open={Boolean(pujaToDelete)}
        onOpenChange={(next) => !next && setPujaToDelete(null)}
      >
        <AlertDialogContent className="border-primary/15 bg-[#FBF5EC] text-foreground">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display text-lg tracking-wide text-foreground">
              Delete {pujaToDelete?.name}?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-foreground/70">
              This permanently removes the Puja and its benefits. This cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={deletePuja.isPending}
              className="border-primary/15 bg-transparent text-foreground hover:bg-primary/10 hover:text-foreground"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                confirmDelete();
              }}
              disabled={deletePuja.isPending}
              className="bg-red-600 text-[#F5E9D6] hover:bg-red-600/90"
            >
              {deletePuja.isPending && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default TemplePujasDialog;
