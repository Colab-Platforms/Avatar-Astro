import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ArrowRight, Calendar } from 'lucide-react';
import { blogPosts } from '@/data/blogPosts';
import PublishedArticles from '@/components/PublishedArticles';

gsap.registerPlugin(ScrollTrigger);

/** Card picture. If the file cannot load, a plain tinted box with the post's symbol is shown instead of an empty space. */
const BlogThumb = ({ src, symbol, alt }: { src: string; symbol: string; alt: string }) => {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <div className="flex h-48 items-center justify-center bg-gradient-to-br from-[#F5E9D6] to-[#E9B887]" role="img" aria-label={alt}>
        <span className="text-6xl text-[#592209]" aria-hidden="true">{symbol}</span>
      </div>
    );
  }
  return (
    <div className="h-48 overflow-hidden bg-[#F5E9D6]">
      <img src={src} alt={alt} loading="lazy" onError={() => setFailed(true)} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
    </div>
  );
};

const Blog = () => {
  const pageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo('.page-title', { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' });
      
      gsap.fromTo('.blog-card', 
        { opacity: 0, y: 40 },
        {
          opacity: 1,
          y: 0,
          stagger: 0.1,
          duration: 0.6,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: '.blog-grid',
            start: 'top 85%',
          },
        }
      );
    }, pageRef);

    return () => ctx.revert();
  }, []);

  return (
    <div ref={pageRef} className="min-h-screen pt-24 pb-12 relative z-10">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="page-title font-display text-4xl md:text-5xl lg:text-6xl text-glow text-primary mb-4">
            Celestial Blog
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Explore the wisdom of the stars through our curated articles and guides
          </p>
        </div>

        <PublishedArticles />

        {/* Blog Grid */}
        <div className="blog-grid grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {blogPosts.map((post) => (
            <article key={post.id} className="blog-card glass-card-hover rounded-2xl overflow-hidden group">
              {/* Thumbnail */}
              <BlogThumb src={post.image} symbol={post.symbol} alt={post.title} />
              
              {/* Content */}
              <div className="p-6">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">
                    {post.category}
                  </span>
                  <span className="text-xs text-muted-foreground">{post.readTime}</span>
                </div>
                
                <h2 className="font-display text-lg text-foreground mb-2 group-hover:text-primary transition-colors">
                  {post.title}
                </h2>
                
                <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
                  {post.excerpt}
                </p>
                
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(post.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                  <Link 
                    to={`/blog/${post.id}`}
                    className="text-primary text-sm flex items-center gap-1 hover:gap-2 transition-all"
                  >
                    Read More
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Blog;
