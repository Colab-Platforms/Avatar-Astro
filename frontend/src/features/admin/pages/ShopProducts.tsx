import { useEffect, useMemo, useState } from "react";
import { Loader2, Pencil, Plus, Search, ShoppingBag, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { ProductFormDialog } from "../components/shop/ProductFormDialog";
import {
  useActiveShopCategories,
  useAdminShopProducts,
  useDeleteShopProduct,
} from "../hooks/useShopAdmin";
import type { AdminShopProduct } from "../types/shop";
import { formatDate, formatPrice } from "../utils/shop";

const PAGE_SIZE = 20;
const ALL_CATEGORIES = "all";
const ALL_STATUSES = "all";

export default function AdminShopProductsPage() {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState(ALL_CATEGORIES);
  const [statusFilter, setStatusFilter] = useState(ALL_STATUSES);
  const [page, setPage] = useState(1);

  const [formOpen, setFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] =
    useState<AdminShopProduct | null>(null);
  const [productToDelete, setProductToDelete] =
    useState<AdminShopProduct | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const params = useMemo(
    () => ({
      search,
      page,
      limit: PAGE_SIZE,
      categoryId: categoryFilter === ALL_CATEGORIES ? undefined : categoryFilter,
      isActive:
        statusFilter === ALL_STATUSES ? undefined : statusFilter === "active",
    }),
    [search, page, categoryFilter, statusFilter],
  );

  const { data, isLoading, isFetching, isError, error } =
    useAdminShopProducts(params);
  const { data: categories = [] } = useActiveShopCategories();
  const deleteProduct = useDeleteShopProduct();

  const products = data?.items ?? [];
  const totalPages = data?.totalPages ?? 1;
  const isFiltering =
    search.trim().length > 0 ||
    categoryFilter !== ALL_CATEGORIES ||
    statusFilter !== ALL_STATUSES;

  const openCreate = () => {
    setEditingProduct(null);
    setFormOpen(true);
  };

  const openEdit = (product: AdminShopProduct) => {
    setEditingProduct(product);
    setFormOpen(true);
  };

  const confirmDelete = async () => {
    if (!productToDelete) return;
    try {
      await deleteProduct.mutateAsync(productToDelete.id);
      setProductToDelete(null);
    } catch {
      // hook surfaces the error; keep the dialog open so it can be retried
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <h2 className="font-semibold text-2xl tracking-normal text-foreground sm:text-3xl">
            Shop Products
          </h2>
          <p className="max-w-2xl text-sm text-foreground/70 sm:text-base">
            Manage gemstones, bracelets and other devotional products.
          </p>
        </div>

        <Button
          type="button"
          onClick={openCreate}
          className="shrink-0 bg-[#803003] text-white hover:bg-[#6B2802]"
        >
          <Plus className="h-4 w-4" />
          Add Product
        </Button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative max-w-md flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/70" />
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by product name or slug…"
            className="border-border bg-card pl-9 text-foreground placeholder:text-foreground/70"
          />
          {isFetching && !isLoading && (
            <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-foreground/70" />
          )}
        </div>

        <Select
          value={categoryFilter}
          onValueChange={(value) => {
            setCategoryFilter(value);
            setPage(1);
          }}
        >
          <SelectTrigger className="border-border bg-card text-foreground sm:w-52">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_CATEGORIES}>All categories</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={statusFilter}
          onValueChange={(value) => {
            setStatusFilter(value);
            setPage(1);
          }}
        >
          <SelectTrigger className="border-border bg-card text-foreground sm:w-40">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_STATUSES}>All statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader />
        </div>
      ) : isError ? (
        <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-6 text-center">
          <p className="text-sm text-red-800">
            {(error as Error)?.message ?? "Could not load products"}
          </p>
        </div>
      ) : products.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border py-16 text-center">
          <ShoppingBag className="h-10 w-10 text-foreground/70" />
          {isFiltering ? (
            <p className="text-sm text-foreground/70">
              No products match your filters.
            </p>
          ) : (
            <>
              <p className="text-foreground/80">No products added yet.</p>
              <p className="text-sm text-foreground/70">
                Add your first product to start building the shop catalog.
              </p>
              <Button
                type="button"
                onClick={openCreate}
                className="mt-1 bg-[#803003] text-white hover:bg-[#6B2802]"
              >
                <Plus className="h-4 w-4" />
                Add Product
              </Button>
            </>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-foreground/70">Product</TableHead>
                <TableHead className="text-foreground/70">Category</TableHead>
                <TableHead className="text-foreground/70">Price</TableHead>
                <TableHead className="hidden sm:table-cell text-foreground/70">Status</TableHead>
                <TableHead className="hidden 2xl:table-cell text-foreground/70">Created</TableHead>
                <TableHead className="text-right text-foreground/70 max-md:sticky max-md:right-0 max-md:z-10 max-md:bg-card max-md:shadow-[-8px_0_8px_-8px_rgba(31,27,22,0.15)]">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((product) => (
                <TableRow
                  key={product.id}
                  className="border-border hover:bg-muted"
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div
                        className="h-11 w-11 shrink-0 overflow-hidden rounded-md border border-border bg-card"
                        style={
                          !product.image && product.gradient
                            ? { background: product.gradient }
                            : undefined
                        }
                      >
                        {product.image ? (
                          <img
                            src={product.image}
                            alt=""
                            loading="lazy"
                            className="h-full w-full object-cover"
                          />
                        ) : null}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-medium text-foreground">
                          {product.name}
                        </p>
                        <p className="truncate text-xs text-foreground/70">
                          /{product.slug}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-foreground/70">
                    {product.categoryName}
                  </TableCell>
                  <TableCell>
                    <p className="text-sm text-[#803003]">
                      {formatPrice(product.price)}
                    </p>
                    {product.originalPrice && (
                      <p className="text-xs text-foreground/70 line-through">
                        {formatPrice(product.originalPrice)}
                      </p>
                    )}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <Badge
                      variant="outline"
                      className={
                        product.isActive
                          ? "border-emerald-500/30 text-emerald-800"
                          : "border-border text-foreground/70"
                      }
                    >
                      {product.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden 2xl:table-cell whitespace-nowrap text-sm text-foreground/70">
                    {formatDate(product.createdAt)}
                  </TableCell>
                  <TableCell className="max-md:sticky max-md:right-0 max-md:z-10 max-md:bg-card max-md:shadow-[-8px_0_8px_-8px_rgba(31,27,22,0.15)]">
                    <div className="flex justify-end gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => openEdit(product)}
                        className="text-foreground/70 hover:bg-muted hover:text-foreground"
                        aria-label={`Edit ${product.name}`}
                        title="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => setProductToDelete(product)}
                        className="text-foreground/70 hover:bg-red-500/10 hover:text-red-800"
                        aria-label={`Delete ${product.name}`}
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
            Page {data?.page} of {totalPages} · {data?.total} product(s)
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page <= 1 || isFetching}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="border-border bg-transparent text-foreground hover:bg-muted hover:text-foreground"
            >
              Previous
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page >= totalPages || isFetching}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="border-border bg-transparent text-foreground hover:bg-muted hover:text-foreground"
            >
              Next
            </Button>
          </div>
        </div>
      )}

      <ProductFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        product={editingProduct}
      />

      <AlertDialog
        open={Boolean(productToDelete)}
        onOpenChange={(next) => !next && setProductToDelete(null)}
      >
        <AlertDialogContent className="border-border bg-white text-foreground">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-semibold text-lg tracking-normal text-foreground">
              Delete {productToDelete?.name}?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-foreground/70">
              This will permanently delete the product. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={deleteProduct.isPending}
              className="border-border bg-transparent text-foreground hover:bg-muted hover:text-foreground"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                confirmDelete();
              }}
              disabled={deleteProduct.isPending}
              className="bg-red-600 text-white hover:bg-red-600/90"
            >
              {deleteProduct.isPending && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              Delete Product
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
