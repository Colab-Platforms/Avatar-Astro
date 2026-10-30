import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { safeHref, usePublicContent } from "@/lib/publicContent";

/**
 * Banners published from the admin panel (GET /api/public/content, published and
 * in-schedule only). Renders nothing when there are none or the API is down, so
 * the homepage is unchanged until the admin publishes a banner.
 */
export default function PublishedBanners() {
  const banners = usePublicContent("BANNER");
  if (banners.length === 0) return null;

  return (
    <section className="hl-section relative z-10 w-full" aria-label="Announcements and offers">
      <div className="container mx-auto px-4 md:px-6">
        <ul className={`grid gap-4 ${banners.length > 1 ? "md:grid-cols-2" : ""}`}>
          {banners.map((b) => {
            const href = safeHref(b.linkUrl);
            const img = safeHref(b.imageUrl);
            const cta = href && (
              <span className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-home-gerua">
                Learn more <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </span>
            );
            const inner = (
              <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-home-line bg-home-ivory transition-colors hover:border-home-gerua/40 sm:flex-row">
                {img && <img src={img} alt="" loading="lazy" referrerPolicy="no-referrer" className="h-44 w-full object-cover sm:h-auto sm:w-2/5" />}
                <div className="flex flex-1 flex-col justify-center p-5">
                  <h2 className="hl-serif text-xl font-bold text-home-ink">{b.title}</h2>
                  {b.body && <p className="mt-2 line-clamp-4 whitespace-pre-line font-home-sans text-sm leading-relaxed text-home-muted">{b.body}</p>}
                  {cta}
                </div>
              </div>
            );
            return (
              <li key={b.id}>
                {href ? (
                  href.startsWith("/") ? <Link to={href} className="block h-full">{inner}</Link> : <a href={href} target="_blank" rel="noopener noreferrer" className="block h-full">{inner}</a>
                ) : inner}
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
