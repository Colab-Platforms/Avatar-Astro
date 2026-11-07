import { BookOpen } from "lucide-react";
import DevotionLayout from "@/components/DevotionLayout";
import Loader from "@/components/Loader/Loader";
import { devotionLibraryApi } from "@/features/devotionLibrary/api";
import { useSpiritualBooks } from "@/features/devotionLibrary/hooks";

export default function SpiritualBooksPage() {
  const { data: books, isLoading, isError } = useSpiritualBooks();

  return (
    <DevotionLayout>
      <div className="relative z-10 mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mb-14 max-w-xl">
          <h1 className="hl-serif mb-3 text-3xl font-semibold text-home-ink sm:text-4xl">Spiritual Books</h1>
          <p className="font-home-sans leading-relaxed text-home-muted">
            Sacred verses with their meanings, for reading now or keeping close. Each title opens as a PDF, free to download and read anywhere.
          </p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader />
          </div>
        ) : isError ? (
          <p className="text-home-muted">Could not load books right now. Please try again shortly.</p>
        ) : !books?.length ? (
          <div className="flex flex-col items-start gap-3 py-16">
            <BookOpen className="h-9 w-9 text-home-gerua" />
            <p className="text-home-muted">The shelf is empty for now. New titles are added regularly — check back soon.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-x-6 gap-y-14 sm:grid-cols-3 lg:grid-cols-4">
            {books.map((book) => (
              <div key={book.id} className="book-shelf-item flex flex-col">
                <div className="book-cover aspect-[2/3] w-full overflow-hidden bg-home-ivory">
                  {book.coverImageUrl ? (
                    <img src={book.coverImageUrl} alt={book.title} className="h-full w-full object-cover" loading="lazy" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <BookOpen className="h-8 w-8 text-home-gerua/40" />
                    </div>
                  )}
                </div>

                <div className="mt-4 flex flex-1 flex-col">
                  <p className="font-home-sans text-xs font-semibold text-home-gerua">{book.category}</p>
                  <h2 className="hl-serif mt-1 text-base font-semibold leading-snug text-home-ink">{book.title}</h2>
                  {book.author && <p className="mt-0.5 font-home-sans text-sm italic text-home-muted">by {book.author}</p>}

                  <div className="mt-auto pt-3">
                    {book.hasFile ? (
                      <a
                        href={devotionLibraryApi.bookDownloadUrl(book.id)}
                        target="_blank"
                        rel="noreferrer"
                        className="font-home-sans text-sm font-semibold text-home-gerua underline decoration-home-gold decoration-2 underline-offset-4 transition-colors hover:text-home-gerua/80"
                      >
                        Download PDF
                      </a>
                    ) : (
                      <p className="font-home-sans text-sm text-home-muted">Coming soon</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DevotionLayout>
  );
}
