import { useState } from "react";
import { Link } from "react-router-dom";
import { safeHref, usePublicContent } from "@/lib/publicContent";

/**
 * Articles published from the admin panel, shown on the Blog page above the built-in posts.
 * Body text is rendered as plain text (never as HTML). Renders nothing when there are none.
 */
export default function PublishedArticles() {
  const articles = usePublicContent("ARTICLE");
  const [open, setOpen] = useState<string | null>(null);
  if (articles.length === 0) return null;

  return (
    <section className="mb-12" aria-labelledby="published-articles-h">
      <h2 id="published-articles-h" className="mb-4 text-center font-display text-2xl text-primary">Latest from MyBhagya</h2>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {articles.map((a) => {
          const img = safeHref(a.imageUrl);
          const href = safeHref(a.linkUrl);
          const expanded = open === a.id;
          const paragraphs = a.body.split(/\n{2,}/).filter(Boolean);
          return (
            <article key={a.id} className="glass-card flex flex-col overflow-hidden rounded-2xl">
              {img && <img src={img} alt="" loading="lazy" referrerPolicy="no-referrer" className="h-44 w-full object-cover" />}
              <div className="flex flex-1 flex-col p-5">
                <h3 className="font-display text-lg text-foreground">{a.title}</h3>
                <div className={`mt-2 space-y-2 text-sm text-muted-foreground ${expanded ? "" : "line-clamp-3"}`}>
                  {paragraphs.map((p, i) => <p key={i} className="whitespace-pre-line">{p}</p>)}
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-4 text-sm">
                  {a.body.length > 160 && (
                    <button type="button" className="font-medium text-primary hover:underline" aria-expanded={expanded} onClick={() => setOpen(expanded ? null : a.id)}>
                      {expanded ? "Show less" : "Read more"}
                    </button>
                  )}
                  {href && (href.startsWith("/")
                    ? <Link to={href} className="font-medium text-primary hover:underline">Open</Link>
                    : <a href={href} target="_blank" rel="noopener noreferrer" className="font-medium text-primary hover:underline">Open</a>)}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
