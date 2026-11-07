import { useEffect, useMemo, useState } from "react";
import { BookOpen, Download, Headphones, Loader2, Music, Pencil, Play, Plus, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { BookDialog } from "../components/devotionLibrary/BookDialog";
import { MantraDialog } from "../components/devotionLibrary/MantraDialog";
import {
  useAdminBooks,
  useAdminMantras,
  useDeleteBook,
  useDeleteMantra,
  useDevotionLibraryStats,
} from "../hooks/useDevotionLibraryAdmin";
import type { AdminMantraChant, AdminSpiritualBook } from "../types/devotionLibrary";
import { formatDate } from "../utils/devotionLibrary";

const PAGE_SIZE = 20;

function StatCard({ label, value, icon: Icon }: { label: string; value: string | number; icon: typeof BookOpen }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#803003]/10 text-[#803003]">
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="truncate text-xs text-foreground/70">{label}</p>
        <p className="text-xl font-semibold text-foreground">{value}</p>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: "DRAFT" | "PUBLISHED" }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
        status === "PUBLISHED" ? "bg-emerald-100 text-emerald-900" : "bg-amber-100 text-amber-900"
      }`}
    >
      {status === "PUBLISHED" ? "Published" : "Draft"}
    </span>
  );
}

function useSearchAndPage() {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const params = useMemo(() => ({ search, page, limit: PAGE_SIZE }), [search, page]);
  return { searchInput, setSearchInput, search, page, setPage, params };
}

function BooksTab() {
  const { searchInput, setSearchInput, search, page, setPage, params } = useSearchAndPage();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<AdminSpiritualBook | null>(null);
  const [toDelete, setToDelete] = useState<AdminSpiritualBook | null>(null);

  const { data, isLoading, isFetching, isError, error } = useAdminBooks(params);
  const deleteBook = useDeleteBook();

  const books = data?.items ?? [];
  const totalPages = data?.totalPages ?? 1;

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (book: AdminSpiritualBook) => {
    setEditing(book);
    setFormOpen(true);
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    try {
      await deleteBook.mutateAsync(toDelete.id);
      setToDelete(null);
    } catch {
      // hook surfaces the error
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-md flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/70" />
          <Input value={searchInput} onChange={(e) => setSearchInput(e.target.value)} placeholder="Search by title, author or category…" className="border-border bg-card pl-9 text-foreground placeholder:text-foreground/70" />
          {isFetching && !isLoading && <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-foreground/70" />}
        </div>
        <Button type="button" onClick={openCreate} className="shrink-0 bg-[#803003] text-white hover:bg-[#6B2802]">
          <Plus className="h-4 w-4" /> Add Book
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><Loader /></div>
      ) : isError ? (
        <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-6 text-center">
          <p className="text-sm text-red-800">{(error as Error)?.message ?? "Could not load books"}</p>
        </div>
      ) : books.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border py-16 text-center">
          <BookOpen className="h-10 w-10 text-foreground/70" />
          {search.trim() ? (
            <p className="text-sm text-foreground/70">No books match "{search}".</p>
          ) : (
            <>
              <p className="text-foreground/80">No spiritual books added yet.</p>
              <Button type="button" onClick={openCreate} className="mt-1 bg-[#803003] text-white hover:bg-[#6B2802]">
                <Plus className="h-4 w-4" /> Add Book
              </Button>
            </>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-foreground/70">Book</TableHead>
                <TableHead className="hidden sm:table-cell text-foreground/70">Category</TableHead>
                <TableHead className="text-foreground/70">Status</TableHead>
                <TableHead className="text-foreground/70">Downloads</TableHead>
                <TableHead className="hidden lg:table-cell text-foreground/70">Created</TableHead>
                <TableHead className="text-right text-foreground/70">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {books.map((book) => (
                <TableRow key={book.id} className="border-border hover:bg-muted">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="h-11 w-11 shrink-0 overflow-hidden rounded-md border border-border bg-card">
                        {book.coverImageUrl && <img src={book.coverImageUrl} alt="" loading="lazy" className="h-full w-full object-cover" />}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-medium text-foreground">{book.title}</p>
                        <p className="truncate text-xs text-foreground/70">{book.author || "Unknown author"}{!book.fileUrl && " · No PDF yet"}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-sm text-foreground/70">{book.category}</TableCell>
                  <TableCell><StatusBadge status={book.status} /></TableCell>
                  <TableCell className="text-sm text-[#803003]"><span className="inline-flex items-center gap-1"><Download className="h-3.5 w-3.5" />{book.downloadCount}</span></TableCell>
                  <TableCell className="hidden lg:table-cell whitespace-nowrap text-sm text-foreground/70">{formatDate(book.createdAt)}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button type="button" variant="ghost" size="icon" onClick={() => openEdit(book)} className="text-foreground/70 hover:bg-muted hover:text-foreground" aria-label={`Edit ${book.title}`} title="Edit"><Pencil className="h-4 w-4" /></Button>
                      <Button type="button" variant="ghost" size="icon" onClick={() => setToDelete(book)} className="text-foreground/70 hover:bg-red-500/10 hover:text-red-800" aria-label={`Delete ${book.title}`} title="Delete"><Trash2 className="h-4 w-4" /></Button>
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
          <p className="text-sm text-foreground/70">Page {data?.page} of {totalPages} · {data?.total} book(s)</p>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" disabled={page <= 1 || isFetching} onClick={() => setPage((p) => Math.max(1, p - 1))} className="border-border bg-transparent text-foreground hover:bg-muted">Previous</Button>
            <Button type="button" variant="outline" size="sm" disabled={page >= totalPages || isFetching} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} className="border-border bg-transparent text-foreground hover:bg-muted">Next</Button>
          </div>
        </div>
      )}

      <BookDialog open={formOpen} onOpenChange={setFormOpen} book={editing} />

      <AlertDialog open={Boolean(toDelete)} onOpenChange={(next) => !next && setToDelete(null)}>
        <AlertDialogContent className="border-border bg-white text-foreground">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-semibold text-lg tracking-normal text-foreground">Delete {toDelete?.title}?</AlertDialogTitle>
            <AlertDialogDescription className="text-foreground/70">This permanently deletes the book record, its PDF and cover image. This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteBook.isPending} className="border-border bg-transparent text-foreground hover:bg-muted">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); confirmDelete(); }} disabled={deleteBook.isPending} className="bg-red-600 text-white hover:bg-red-600/90">
              {deleteBook.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Delete Book
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function MantrasTab() {
  const { searchInput, setSearchInput, search, page, setPage, params } = useSearchAndPage();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<AdminMantraChant | null>(null);
  const [toDelete, setToDelete] = useState<AdminMantraChant | null>(null);

  const { data, isLoading, isFetching, isError, error } = useAdminMantras(params);
  const deleteMantra = useDeleteMantra();

  const mantras = data?.items ?? [];
  const totalPages = data?.totalPages ?? 1;

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (mantra: AdminMantraChant) => {
    setEditing(mantra);
    setFormOpen(true);
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    try {
      await deleteMantra.mutateAsync(toDelete.id);
      setToDelete(null);
    } catch {
      // hook surfaces the error
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-md flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/70" />
          <Input value={searchInput} onChange={(e) => setSearchInput(e.target.value)} placeholder="Search by title, deity or category…" className="border-border bg-card pl-9 text-foreground placeholder:text-foreground/70" />
          {isFetching && !isLoading && <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-foreground/70" />}
        </div>
        <Button type="button" onClick={openCreate} className="shrink-0 bg-[#803003] text-white hover:bg-[#6B2802]">
          <Plus className="h-4 w-4" /> Add Mantra
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><Loader /></div>
      ) : isError ? (
        <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-6 text-center">
          <p className="text-sm text-red-800">{(error as Error)?.message ?? "Could not load mantras"}</p>
        </div>
      ) : mantras.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border py-16 text-center">
          <Music className="h-10 w-10 text-foreground/70" />
          {search.trim() ? (
            <p className="text-sm text-foreground/70">No mantras match "{search}".</p>
          ) : (
            <>
              <p className="text-foreground/80">No mantras or chants added yet.</p>
              <Button type="button" onClick={openCreate} className="mt-1 bg-[#803003] text-white hover:bg-[#6B2802]">
                <Plus className="h-4 w-4" /> Add Mantra
              </Button>
            </>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-foreground/70">Mantra</TableHead>
                <TableHead className="hidden sm:table-cell text-foreground/70">Category</TableHead>
                <TableHead className="text-foreground/70">Status</TableHead>
                <TableHead className="text-foreground/70">Plays</TableHead>
                <TableHead className="text-foreground/70">Downloads</TableHead>
                <TableHead className="hidden lg:table-cell text-foreground/70">Created</TableHead>
                <TableHead className="text-right text-foreground/70">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mantras.map((mantra) => (
                <TableRow key={mantra.id} className="border-border hover:bg-muted">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="h-11 w-11 shrink-0 overflow-hidden rounded-md border border-border bg-card">
                        {mantra.coverImageUrl && <img src={mantra.coverImageUrl} alt="" loading="lazy" className="h-full w-full object-cover" />}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-medium text-foreground">{mantra.title}</p>
                        <p className="truncate text-xs text-foreground/70">{mantra.deity || "—"}{!mantra.audioUrl && " · No audio yet"}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-sm text-foreground/70">{mantra.category}</TableCell>
                  <TableCell><StatusBadge status={mantra.status} /></TableCell>
                  <TableCell className="text-sm text-[#803003]"><span className="inline-flex items-center gap-1"><Play className="h-3.5 w-3.5" />{mantra.playCount}</span></TableCell>
                  <TableCell className="text-sm text-[#803003]"><span className="inline-flex items-center gap-1"><Download className="h-3.5 w-3.5" />{mantra.downloadCount}</span></TableCell>
                  <TableCell className="hidden lg:table-cell whitespace-nowrap text-sm text-foreground/70">{formatDate(mantra.createdAt)}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button type="button" variant="ghost" size="icon" onClick={() => openEdit(mantra)} className="text-foreground/70 hover:bg-muted hover:text-foreground" aria-label={`Edit ${mantra.title}`} title="Edit"><Pencil className="h-4 w-4" /></Button>
                      <Button type="button" variant="ghost" size="icon" onClick={() => setToDelete(mantra)} className="text-foreground/70 hover:bg-red-500/10 hover:text-red-800" aria-label={`Delete ${mantra.title}`} title="Delete"><Trash2 className="h-4 w-4" /></Button>
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
          <p className="text-sm text-foreground/70">Page {data?.page} of {totalPages} · {data?.total} mantra(s)</p>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" disabled={page <= 1 || isFetching} onClick={() => setPage((p) => Math.max(1, p - 1))} className="border-border bg-transparent text-foreground hover:bg-muted">Previous</Button>
            <Button type="button" variant="outline" size="sm" disabled={page >= totalPages || isFetching} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} className="border-border bg-transparent text-foreground hover:bg-muted">Next</Button>
          </div>
        </div>
      )}

      <MantraDialog open={formOpen} onOpenChange={setFormOpen} mantra={editing} />

      <AlertDialog open={Boolean(toDelete)} onOpenChange={(next) => !next && setToDelete(null)}>
        <AlertDialogContent className="border-border bg-white text-foreground">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-semibold text-lg tracking-normal text-foreground">Delete {toDelete?.title}?</AlertDialogTitle>
            <AlertDialogDescription className="text-foreground/70">This permanently deletes the mantra record, its audio and cover image. This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMantra.isPending} className="border-border bg-transparent text-foreground hover:bg-muted">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); confirmDelete(); }} disabled={deleteMantra.isPending} className="bg-red-600 text-white hover:bg-red-600/90">
              {deleteMantra.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Delete Mantra
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function DevotionLibraryPage() {
  const { data: stats } = useDevotionLibraryStats();

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="space-y-2">
        <h2 className="font-semibold text-2xl tracking-normal text-foreground sm:text-3xl">Spiritual Books & Mantras</h2>
        <p className="max-w-2xl text-sm text-foreground/70 sm:text-base">Manage the Devotion & Spirituality library: upload spiritual books (PDF) and mantras/chants (audio), and track engagement.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Total Books" value={stats?.books.total ?? "—"} icon={BookOpen} />
        <StatCard label="Book Downloads" value={stats?.books.totalDownloads ?? "—"} icon={Download} />
        <StatCard label="Total Mantras" value={stats?.mantras.total ?? "—"} icon={Music} />
        <StatCard label="Mantra Plays" value={stats?.mantras.totalPlays ?? "—"} icon={Headphones} />
      </div>

      {stats && (stats.books.top.length > 0 || stats.mantras.top.length > 0) && (
        <div className="grid gap-4 lg:grid-cols-2">
          {stats.books.top.length > 0 && (
            <div className="rounded-lg border border-border bg-card p-4">
              <p className="mb-2 text-sm font-medium text-foreground">Most downloaded books</p>
              <ul className="space-y-1.5">
                {stats.books.top.map((b) => (
                  <li key={b.id} className="flex items-center justify-between text-sm">
                    <span className="truncate text-foreground/80">{b.title}</span>
                    <span className="shrink-0 text-[#803003]">{b.downloadCount}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {stats.mantras.top.length > 0 && (
            <div className="rounded-lg border border-border bg-card p-4">
              <p className="mb-2 text-sm font-medium text-foreground">Most played mantras</p>
              <ul className="space-y-1.5">
                {stats.mantras.top.map((m) => (
                  <li key={m.id} className="flex items-center justify-between text-sm">
                    <span className="truncate text-foreground/80">{m.title}</span>
                    <span className="shrink-0 text-[#803003]">{m.playCount}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <Tabs defaultValue="books">
        <TabsList>
          <TabsTrigger value="books">Spiritual Books</TabsTrigger>
          <TabsTrigger value="mantras">Mantras & Chants</TabsTrigger>
        </TabsList>
        <TabsContent value="books" className="pt-4"><BooksTab /></TabsContent>
        <TabsContent value="mantras" className="pt-4"><MantrasTab /></TabsContent>
      </Tabs>
    </div>
  );
}
