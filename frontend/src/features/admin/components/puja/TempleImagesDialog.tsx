import { useRef, useState } from "react";
import { ImageIcon, ImagePlus, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  useAdminTemple,
  useDeleteTempleImage,
  useUploadTempleImages,
} from "../../hooks/usePujaAdmin";
import { IMAGE_ACCEPT_ATTR, validateImageFiles } from "../../utils/puja";

interface TempleImagesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templeId: string | null;
  templeName?: string;
}

export function TempleImagesDialog({
  open,
  onOpenChange,
  templeId,
  templeName,
}: TempleImagesDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data: temple, isLoading } = useAdminTemple(open ? templeId : null);
  const uploadImages = useUploadTempleImages();
  const deleteImage = useDeleteTempleImage();

  const busy = uploadImages.isPending || deleteImage.isPending;

  const handleFilesPicked = async (fileList: FileList | null) => {
    if (!fileList?.length || !templeId) return;

    const { accepted, errors } = validateImageFiles(Array.from(fileList));
    errors.forEach((message) => toast.error(message));
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (!accepted.length) return;

    await uploadImages.mutateAsync({ templeId, files: accepted }).catch(() => {
      // hook already surfaced the error
    });
  };

  const handleDelete = async (imageId: string) => {
    if (!templeId) return;
    setDeletingId(imageId);
    try {
      await deleteImage.mutateAsync({ imageId, templeId });
    } catch {
      // hook already surfaced the error
    } finally {
      setDeletingId(null);
    }
  };

  const images = temple?.images ?? [];

  return (
    <Dialog open={open} onOpenChange={(next) => !busy && onOpenChange(next)}>
      <DialogContent className="max-h-[90vh] overflow-y-auto border-primary/15 bg-[#FBF5EC] text-foreground sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-display text-lg tracking-wide text-foreground">
            Temple Images
          </DialogTitle>
          <DialogDescription className="text-foreground/70">
            {templeName ?? temple?.name ?? "Manage the image gallery"}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-foreground/70" />
          </div>
        ) : images.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-primary/15 py-10 text-center">
            <ImageIcon className="h-8 w-8 text-foreground/70" />
            <p className="text-sm text-foreground/70">
              No temple images uploaded yet.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {images.map((image) => (
              <div
                key={image.id}
                className="group relative aspect-square overflow-hidden rounded-lg border border-primary/15"
              >
                <img
                  src={image.url}
                  alt=""
                  loading="lazy"
                  className="h-full w-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => handleDelete(image.id)}
                  disabled={busy}
                  className="absolute right-1.5 top-1.5 rounded-full bg-black/70 p-1.5 text-white transition hover:bg-red-600 disabled:opacity-50"
                  aria-label="Delete image"
                >
                  {deletingId === image.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="space-y-2 pt-2">
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
            onClick={() => fileInputRef.current?.click()}
            disabled={busy || !templeId}
            className="bg-[#592209] text-[#F5E9D6] hover:bg-[#592209]/90"
          >
            {uploadImages.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ImagePlus className="h-4 w-4" />
            )}
            {uploadImages.isPending ? "Uploading…" : "Upload Images"}
          </Button>
          <p className="text-xs text-foreground/70">
            JPEG, PNG, WebP or AVIF · up to 10 MB each · max 10 per upload
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default TempleImagesDialog;
