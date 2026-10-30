import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { Search, ShoppingBag } from "lucide-react";
import gsap from "gsap";
import { useShopCategories, useShopProducts } from "@/features/shop/hooks";
import { ShopListSkeleton } from "./ShopSkeletons";
import DevotionLayout from "@/components/DevotionLayout";

const ShopPage = () => {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const pageRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  const { data: categoriesData } = useShopCategories();
  const { data: productsData, isLoading, isError } = useShopProducts();

  const categories = categoriesData ?? [];
  const products = productsData ?? [];

  const filtered = products.filter((p) => {
    const matchCat =
      activeCategory === "All" || p.category.slug === activeCategory;
    const matchQ =
      !query ||
      p.name.toLowerCase().includes(query.toLowerCase()) ||
      p.category.name.toLowerCase().includes(query.toLowerCase()) ||
      p.description.toLowerCase().includes(query.toLowerCase());
    return matchCat && matchQ;
  });

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".shop-hero-title",
        { opacity: 0, y: 40 },
        { opacity: 1, y: 0, duration: 0.9, ease: "power3.out" },
      );
    }, pageRef);
    return () => ctx.revert();
  }, []);

  useEffect(() => {
    if (!gridRef.current || !productsData) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".shop-product-card",
        { opacity: 0, y: 40 },
        { opacity: 1, y: 0, stagger: 0.07, duration: 0.5, ease: "power3.out" },
      );
    }, gridRef);
    return () => ctx.revert();
  }, [activeCategory, query, productsData]);

  return (
    <DevotionLayout>
      <div className="relative z-10" ref={pageRef}>
        {/* ── Hero ──────────────────────────────────────────────────────────── */}
        <section
          className="relative z-10 text-center"
          style={{ paddingTop: 100, paddingBottom: 56 }}
        >
          <div
            style={{
              maxWidth: 900,
              margin: "0 auto",
              paddingLeft: 24,
              paddingRight: 24,
            }}
          >
            {/* Eyebrow */}
            <div className="flex items-center justify-center gap-3 mb-5">
              <div
                style={{
                  height: 1,
                  width: 56,
                  background:
                    "linear-gradient(to right, transparent, rgba(89,34,9,0.5))",
                }}
              />
              <p
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.32em",
                  color: "#592209",
                  textTransform: "uppercase",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <span>✦</span> Divine Store <span>✦</span>
              </p>
              <div
                style={{
                  height: 1,
                  width: 56,
                  background:
                    "linear-gradient(to left, transparent, rgba(89,34,9,0.5))",
                }}
              />
            </div>

            <h1
              className="shop-hero-title font-display font-bold tracking-widest uppercase leading-none mb-5"
              style={{ fontSize: "clamp(54px, 8vw, 96px)" }}
            >
              <span style={{ color: "#301607" }}>Divine </span>
              <span
                style={{
                  background:
                    "linear-gradient(135deg, #592209 0%, #592209 60%, #592209 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                Shop
              </span>
            </h1>

            <p
              style={{
                fontSize: 16,
                color: "rgba(48,22,7,0.55)",
                lineHeight: 1.7,
                marginBottom: 32,
              }}
            >
              Authentic spiritual products — gemstones, rudraksha, yantras,
              <br />
              and sacred prasad
            </p>

            <div style={{ maxWidth: 560, margin: "0 auto" }}>
              <div style={{ position: "relative" }}>
                <Search
                  style={{
                    position: "absolute",
                    left: 18,
                    top: "50%",
                    transform: "translateY(-50%)",
                    width: 20,
                    height: 20,
                    color: "#592209",
                    pointerEvents: "none",
                  }}
                />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search products…"
                  style={{
                    width: "100%",
                    height: 56,
                    paddingLeft: 52,
                    paddingRight: 20,
                    fontSize: 15,
                    color: "#301607",
                    background: "#FFFFFF",
                    border: "1.5px solid rgba(89,34,9,0.22)",
                    borderRadius: 16,
                    boxShadow: "0 4px 20px rgba(89,34,9,0.08)",
                    outline: "none",
                  }}
                  onFocus={(e) => {
                    (e.target as HTMLInputElement).style.borderColor =
                      "rgba(89,34,9,0.55)";
                  }}
                  onBlur={(e) => {
                    (e.target as HTMLInputElement).style.borderColor =
                      "rgba(89,34,9,0.22)";
                  }}
                />
              </div>
            </div>
          </div>
        </section>

        {/* ── Content ────────────────────────────────────────────────────── */}
        <div className="pb-16">
          {/* ── Category filter ───────────────────────────────────────────────── */}
          <div
            className="sticky top-[68px] z-40 py-4 border-b border-[#E8DED0]"
            style={{
              background: "rgba(248,242,232,0.92)",
              backdropFilter: "blur(12px)",
            }}
          >
            <div className="container mx-auto px-6 lg:px-16">
              <div className="flex gap-2 overflow-x-auto pb-1">
                {[
                  { slug: "All", name: "All" },
                  ...categories.map((c) => ({ slug: c.slug, name: c.name })),
                ].map((cat) => (
                  <button
                    key={cat.slug}
                    onClick={() => setActiveCategory(cat.slug)}
                    className={`flex-shrink-0 font-display text-xs tracking-wider px-4 py-2 rounded-full border transition-all duration-200 ${
                      activeCategory === cat.slug
                        ? "border-[#592209] text-[#592209]"
                        : "border-[#D4B896] text-muted-foreground hover:border-[#592209] hover:text-[#592209]"
                    }`}
                    style={
                      activeCategory === cat.slug
                        ? { background: "rgba(89,34,9,0.08)" }
                        : { background: "transparent" }
                    }
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ── Product grid ──────────────────────────────────────────────────── */}
          <section className="relative z-10 py-8">
            <div className="container mx-auto px-6 lg:px-16">
              {isLoading ? (
                <ShopListSkeleton />
              ) : (
              <div
                ref={gridRef}
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
              >
                {filtered.map((product) => (
                  <Link
                    key={product.id}
                    to={`/shop/${product.slug}`}
                    className="shop-product-card group block"
                    style={{
                      background: "#FFFFFF",
                      borderRadius: 18,
                      border: "1.5px solid rgba(89,34,9,0.13)",
                      boxShadow: "0 4px 20px rgba(89,34,9,0.2)",
                      overflow: "hidden",
                      textDecoration: "none",
                      transition:
                        "transform 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease",
                    }}
                    onMouseEnter={(e) => {
                      const el = e.currentTarget as HTMLElement;
                      el.style.transform = "translateY(-4px)";
                      el.style.boxShadow = "0 12px 36px rgba(120,60,20,0.12)";
                      el.style.borderColor = "rgba(89,34,9,0.35)";
                    }}
                    onMouseLeave={(e) => {
                      const el = e.currentTarget as HTMLElement;
                      el.style.transform = "translateY(0)";
                      el.style.boxShadow = "0 4px 20px rgba(120,60,20,0.07)";
                      el.style.borderColor = "rgba(89,34,9,0.13)";
                    }}
                  >
                    {/* Image */}
                    <div
                      className="h-48 relative overflow-hidden"
                      style={{ background: product.gradient ?? undefined }}
                    >
                      {product.image && (
                        <img
                          src={product.image}
                          alt={product.name}
                          className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display =
                              "none";
                          }}
                        />
                      )}
                      <div className="absolute top-3 left-3">
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 600,
                            letterSpacing: "0.12em",
                            textTransform: "uppercase",
                            color: "#301607",
                            background: "#FBF5EC",
                            backdropFilter: "blur(6px)",
                            padding: "3px 10px",
                            borderRadius: 99,
                          }}
                        >
                          {product.category.name}
                        </span>
                      </div>
                      {product.originalPrice && (
                        <div className="absolute top-3 right-3">
                          <span
                            style={{
                              fontSize: 10,
                              color: "#301607",
                              background: "#FBF5EC",
                              padding: "3px 8px",
                              borderRadius: 99,
                              fontWeight: 700,
                            }}
                          >
                            SALE
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Card content */}
                    <div className="p-5">
                      <h3
                        className="font-display text-sm tracking-wider uppercase mb-2 line-clamp-1 group-hover:text-[#592209] transition-colors duration-300"
                        style={{ color: "#301607" }}
                      >
                        {product.name}
                      </h3>
                      <p
                        className="text-xs leading-relaxed mb-4 line-clamp-2"
                        style={{ color: "#7A5C42" }}
                      >
                        {product.description}
                      </p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-[#592209] font-bold text-lg">
                            ₹{product.price.toLocaleString()}
                          </span>
                          {product.originalPrice && (
                            <span
                              className="text-xs line-through"
                              style={{ color: "#A08068" }}
                            >
                              ₹{product.originalPrice.toLocaleString()}
                            </span>
                          )}
                        </div>
                        <span className="btn-cosmic text-xs px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5">
                          <ShoppingBag className="w-3 h-3" /> Buy
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
              )}

              {!isLoading && isError && (
                <div
                  style={{
                    textAlign: "center",
                    paddingTop: 80,
                    paddingBottom: 80,
                  }}
                >
                  <p
                    style={{
                      fontSize: 22,
                      color: "#9C7B62",
                      fontFamily: "'DM Sans', system-ui, sans-serif",
                      letterSpacing: "0.1em",
                    }}
                  >
                    Could not load products
                  </p>
                  <p style={{ fontSize: 14, color: "#B09070", marginTop: 8 }}>
                    Please check your connection and try again
                  </p>
                </div>
              )}

              {!isLoading && !isError && filtered.length === 0 && (
                <div
                  style={{
                    textAlign: "center",
                    paddingTop: 80,
                    paddingBottom: 80,
                  }}
                >
                  <p
                    style={{
                      fontSize: 22,
                      color: "#9C7B62",
                      fontFamily: "'DM Sans', system-ui, sans-serif",
                      letterSpacing: "0.1em",
                    }}
                  >
                    No products found
                  </p>
                  <p style={{ fontSize: 14, color: "#B09070", marginTop: 8 }}>
                    Try a different search or category
                  </p>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </DevotionLayout>
  );
};

export default ShopPage;
