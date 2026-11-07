import { BookOpen, Download } from "lucide-react";
import DevotionLayout from "@/components/DevotionLayout";
import Loader from "@/components/Loader/Loader";
import { devotionLibraryApi } from "@/features/devotionLibrary/api";
import { useSpiritualBooks } from "@/features/devotionLibrary/hooks";

export default function SpiritualBooksPage() {
  const { data: books, isLoading, isError } = useSpiritualBooks();

  return (
    <DevotionLayout>
      <div className="relative z-10 mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <span className="mb-2 inline-block font-home-sans text-[0.75rem] font-bold uppercase tracking-[0.2em] text-home-gerua">
            Devotion & Spirituality
          </span>
          <h1 className="hl-serif mb-3 text-3xl font-semibold text-home-ink sm:text-4xl">Spiritual Books</h1>
          <p className="font-home-sans text-home-muted">
            Read sacred verses with their meanings and timeless wisdom for everyday life. Download any book to keep for offline reading.
          </p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader />
          </div>
        ) : isError ? (
          <p className="text-center text-home-muted">Could not load books right now. Please try again shortly.</p>
        ) : !books?.length ? (
          <div className="flex flex-col items-center gap-3 py-20 text-center">
            <BookOpen className="h-10 w-10 text-home-gerua" />
            <p className="text-home-muted">No books have been published yet. Check back soon.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {books.map((book) => (
              <div key={book.id} className="hl-card flex flex-col overflow-hidden rounded-xl border border-home-line">
                <div className="aspect-[4/3] w-full bg-home-ivory">
                  {book.coverImageUrl ? (
                    <img src={book.coverImageUrl} alt={book.title} className="h-full w-full object-cover" loading="lazy" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <BookOpen className="h-10 w-10 text-home-gerua/50" />
                    </div>
                  )}
                </div>
                <div className="flex flex-1 flex-col p-4">
                  <span className="mb-1 font-home-sans text-xs font-semibold uppercase tracking-wide text-home-gerua">{book.category}</span>
                  <h2 className="hl-serif mb-1 text-lg font-semibold text-home-ink">{book.title}</h2>
                  {book.author && <p className="mb-2 text-sm text-home-muted">by {book.author}</p>}
                  <p className="mb-4 line-clamp-3 flex-1 text-sm text-home-ink/80">{book.description}</p>
                  {book.hasFile ? (
                    <a
                      href={devotionLibraryApi.bookDownloadUrl(book.id)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center justify-center gap-2 rounded-full bg-home-gerua px-4 py-2 text-sm font-semibold text-home-ivory transition-colors hover:bg-home-gold"
                    >
                      <Download className="h-4 w-4" /> Download PDF
                    </a>
                  ) : (
                    <p className="text-xs text-home-muted">Coming soon</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DevotionLayout>
  );
}
