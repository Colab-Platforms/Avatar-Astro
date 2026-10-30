import { useEffect, useMemo, useState } from "react";
import { Loader2, Pencil, Plus, Search, Tags, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import Loader from "@/components/Loader/Loader";
import { CategoryFormDialog } from "../components/shop/CategoryFormDialog";
import { useAdminShopCategories, useDeleteShopCategory } from "../hooks/useShopAdmin";
import type { AdminShopCategory } from "../types/shop";
import { formatDate } from "../utils/shop";

const PAGE_SIZE = 20;

export default function AdminShopCategoriesPage() {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const [formOpen, setFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] =
    useState<AdminShopCategory | null>(null);
  const [categoryToDelete, setCategoryToDelete] =
    useState<AdminShopCategory | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const params = useMemo(
    () => ({ search, page, limit: PAGE_SIZE }),
    [search, page],
  );

  const { data, isLoading, isFetching, isError, error } =
    useAdminShopCategories(params);
  const deleteCategory = useDeleteShopCategory();

  const categories = data?.items ?? [];
  const totalPages = data?.totalPages ?? 1;
  const isSearching = search.trim().length > 0;

  const openCreate = () => {
    setEditingCategory(null);
    setFormOpen(true);
  };

  const openEdit = (category: AdminShopCategory) => {
    setEditingCategory(category);
    setFormOpen(true);
  };

  const confirmDelete = async () => {
    if (!categoryToDelete) return;
    try {
      await deleteCategory.mutateAsync(categoryToDelete.id);
      setCategoryToDelete(null);
    } catch {
      // hook surfaces the error; keep the dialog open so it can be retried
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <h2 className="font-display text-2xl tracking-wide text-foreground sm:text-3xl">
            Shop Categories
          </h2>
          <p className="max-w-2xl text-sm text-foreground/70 sm:text-base">
            Manage the categories that shop products belong to.
          </p>
        </div>

        <Button
          type="button"
          onClick={openCreate}
          className="shrink-0 bg-[#592209] text-[#F5E9D6] hover:bg-[#592209]/90"
        >
          <Plus className="h-4 w-4" />
          Add Category
        </Button>
      </div>

      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/70" />
        <Input
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search categories by name…"
          className="border-primary/15 bg-card pl-9 text-foreground placeholder:text-foreground/70"
        />
        {isFetching && !isLoading && (
          <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-foreground/70" />
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader />
        </div>
      ) : isError ? (
        <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-6 text-center">
          <p className="text-sm text-red-800">
            {(error as Error)?.message ?? "Could not load categories"}
          </p>
        </div>
      ) : categories.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-primary/15 py-16 text-center">
          <Tags className="h-10 w-10 text-foreground/70" />
          {isSearching ? (
            <p className="text-sm text-foreground/70">
              No categories match “{search}”.
            </p>
          ) : (
            <>
              <p className="text-foreground/80">No categories added yet.</p>
              <p className="text-sm text-foreground/70">
                Add your first category to start organizing shop products.
              </p>
              <Button
                type="button"
                onClick={openCreate}
                className="mt-1 bg-[#592209] text-[#F5E9D6] hover:bg-[#592209]/90"
              >
                <Plus className="h-4 w-4" />
                Add Category
              </Button>
            </>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-primary/15">
          <Table>
            <TableHeader>
              <TableRow className="border-primary/15 hover:bg-transparent">
                <TableHead className="text-foreground/70">Category</TableHead>
                <TableHead className="text-foreground/70">Slug</TableHead>
                <TableHead className="text-foreground/70">Products</TableHead>
                <TableHead className="text-foreground/70">Status</TableHead>
                <TableHead className="hidden lg:table-cell text-foreground/70">Created</TableHead>
                <TableHead className="text-right text-foreground/70">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.map((category) => (
                <TableRow
                  key={category.id}
                  className="border-primary/15 hover:bg-primary/10"
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="h-11 w-11 shrink-0 overflow-hidden rounded-md border border-primary/15 bg-card">
                        {category.image ? (
                          <img
                            src={category.image}
                            alt=""
                            loading="lazy"
                            className="h-full w-full object-cover"
                          />
                        ) : null}
                      </div>
                      <p className="truncate font-medium text-foreground">
                        {category.name}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-foreground/70">
                    /{category.slug}
                  </TableCell>
                  <TableCell className="text-sm text-foreground/70">
                    {category.productCount}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={
                        category.isActive
                          ? "border-emerald-500/30 text-emerald-800"
                          : "border-primary/25 text-foreground/70"
                      }
                    >
                      {category.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell whitespace-nowrap text-sm text-foreground/70">
                    {formatDate(category.createdAt)}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => openEdit(category)}
                        className="text-foreground/70 hover:bg-primary/10 hover:text-foreground"
                        aria-label={`Edit ${category.name}`}
                        title="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => setCategoryToDelete(category)}
                        className="text-foreground/70 hover:bg-red-500/10 hover:text-red-800"
                        aria-label={`Delete ${category.name}`}
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-foreground/70">
            Page {data?.page} of {totalPages} · {data?.total} categor
            {data?.total === 1 ? "y" : "ies"}
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page <= 1 || isFetching}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="border-primary/15 bg-transparent text-foreground hover:bg-primary/10 hover:text-foreground"
            >
              Previous
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page >= totalPages || isFetching}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="border-primary/15 bg-transparent text-foreground hover:bg-primary/10 hover:text-foreground"
            >
              Next
            </Button>
          </div>
        </div>
      )}

      <CategoryFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        category={editingCategory}
      />

      <AlertDialog
        open={Boolean(categoryToDelete)}
        onOpenChange={(next) => !next && setCategoryToDelete(null)}
      >
        <AlertDialogContent className="border-primary/15 bg-[#FBF5EC] text-foreground">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display text-lg tracking-wide text-foreground">
              Delete {categoryToDelete?.name}?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-foreground/70">
              {categoryToDelete && categoryToDelete.productCount > 0
                ? `This category has ${categoryToDelete.productCount} product(s). Move or delete those products first.`
                : "This cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={deleteCategory.isPending}
              className="border-primary/15 bg-transparent text-foreground hover:bg-primary/10 hover:text-foreground"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                confirmDelete();
              }}
              disabled={
                deleteCategory.isPending ||
                Boolean(categoryToDelete && categoryToDelete.productCount > 0)
              }
              className="bg-red-600 text-[#F5E9D6] hover:bg-red-600/90"
            >
              {deleteCategory.isPending && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              Delete Category
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
