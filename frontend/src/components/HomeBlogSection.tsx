import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { blogPosts } from "@/data/blogPosts";

/**
 * Continues the Hero/AstrologyToolsSection's Inter-based visual language
 * rather than the Iceland/uppercase display styling used elsewhere on the page.
 */
const HomeBlogSection = () => {
  const posts = blogPosts.slice(0, 4);

  return (
    <section className="relative z-10 w-full py-16 md:py-20">
      <div className="container relative mx-auto px-4 md:px-6">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6 mb-10 md:mb-12 text-center sm:text-left">
          <div>
            <p className="font-['Inter'] text-xs font-semibold tracking-[0.25em] uppercase text-[#e8935f] mb-3">
              Insights &amp; Stories
            </p>
            <h2 className="font-['Inter'] font-bold tracking-tight leading-tight text-3xl sm:text-4xl md:text-5xl text-white">
              Read from our{" "}
              <span className="text-[#e8935f]">blog.</span>
            </h2>
          </div>

          <Link
            to="/blog"
            className="group inline-flex items-center gap-2 self-center sm:self-auto rounded-full px-6 py-3 font-['Inter'] font-semibold text-sm text-[#1a0f08] transition-transform duration-300 hover:-translate-y-0.5 shrink-0"
            style={{
              background: "linear-gradient(135deg, #f2a35f, #d9895f)",
              boxShadow: "0 0 32px rgba(217,137,95,0.35)",
            }}
          >
            View all blogs
            <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
          </Link>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {posts.map((post) => (
            <Link
              key={post.id}
              to="/blog"
              className="group rounded-2xl overflow-hidden border border-white/10 bg-white/[0.03] transition-all duration-300 hover:border-white/20 hover:-translate-y-1"
            >
              <div className="h-40 bg-gradient-to-br from-[#123a75]/60 to-[#0b1c3d]/60 flex items-center justify-center">
                <span className="text-5xl">{post.image}</span>
              </div>

              <div className="p-5">
                <span className="font-['Inter'] text-xs font-semibold tracking-wider uppercase text-[#e8935f]">
                  {post.category}
                </span>

                <h3 className="font-['Inter'] font-semibold text-white text-base leading-snug mt-2 mb-3 line-clamp-2 transition-colors group-hover:text-[#e8935f]">
                  {post.title}
                </h3>

                <div className="flex items-center justify-between font-['Inter'] text-xs text-white/45">
                  <span>{post.readTime}</span>
                  <span>
                    {new Date(post.date).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HomeBlogSection;
