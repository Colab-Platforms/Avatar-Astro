import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { homeBlogPosts } from "@/data/homeBlog";

const formatDate = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });

const HomeBlogSection = () => (
  <section className="relative z-10 w-full py-12 md:py-16" aria-labelledby="home-blog-h">
    <div className="mx-auto w-full max-w-[1440px] px-4 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col gap-5 text-center sm:flex-row sm:items-end sm:justify-between sm:text-left">
        <div>
          <p className="mb-2 font-home-sans text-xs font-semibold uppercase tracking-[0.25em] text-home-deep">
            Insights &amp; Stories
          </p>
          <h2
            id="home-blog-h"
            className="hl-serif text-3xl font-semibold normal-case leading-[1.15] tracking-[0.02em] text-home-ink sm:text-4xl md:text-[2.6rem]"
          >
            Read from our <span className="text-home-rust">blog.</span>
          </h2>
        </div>
        <Link to="/blog" className="hl-btn group h-11 shrink-0 self-center px-6 text-sm sm:self-auto">
          View all blogs
          <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1 motion-reduce:transition-none" />
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {homeBlogPosts.map((post) => (
          <Link key={post.slug} to="/blog" className="hl-card group flex flex-col overflow-hidden">
            <div className="hl-img-zoom aspect-video w-full overflow-hidden bg-home-cream">
              <img
                src={post.image}
                alt={post.imageAlt}
                width={800}
                height={450}
                loading="lazy"
                decoding="async"
                className="h-full w-full object-cover"
                style={{ objectPosition: post.focus }}
              />
            </div>
            <article className="flex flex-1 flex-col p-5">
              <span className="font-home-sans text-xs font-semibold uppercase tracking-wider text-home-deep">
                {post.category}
              </span>
              <h3 className="hl-serif mb-2 mt-2 text-[1.05rem] font-semibold normal-case leading-snug text-home-ink transition-colors group-hover:text-home-deep">
                {post.title}
              </h3>
              <p className="mb-4 line-clamp-3 font-home-sans text-sm leading-relaxed text-home-muted">{post.excerpt}</p>
              <div className="mt-auto flex items-center gap-2 font-home-sans text-xs text-home-muted">
                <time dateTime={post.date}>{formatDate(post.date)}</time>
                <span aria-hidden="true">·</span>
                <span>{post.readTime}</span>
              </div>
            </article>
          </Link>
        ))}
      </div>
    </div>
  </section>
);

export default HomeBlogSection;
