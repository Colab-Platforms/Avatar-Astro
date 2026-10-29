import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, ShoppingCart, Zap, Shield, CheckCircle } from 'lucide-react';
import { useShopProduct, isNotFoundError } from '@/features/shop/hooks';
import { ShopDetailSkeleton } from './ShopSkeletons';
import DevotionLayout from '@/components/DevotionLayout';

const ShopDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const { data: product, isLoading, isError, error } = useShopProduct(slug);
  const [qty, setQty] = useState(1);

  if (isLoading) {
    return <ShopDetailSkeleton />;
  }

  if (!product || (isError && isNotFoundError(error))) {
    return (
      <DevotionLayout>
        <div className="min-h-screen pt-24 flex items-center justify-center">
          <div className="text-center">
            <p className="font-display text-3xl tracking-wider text-muted-foreground mb-4">
              Product not found
            </p>
            <Link
              to="/shop"
              className="btn-outline-cosmic px-6 py-3 rounded-lg inline-flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Shop
            </Link>
          </div>
        </div>
      </DevotionLayout>
    );
  }

  if (isError) {
    return (
      <DevotionLayout>
        <div className="min-h-screen pt-24 flex items-center justify-center">
          <div className="text-center">
            <p className="font-display text-3xl tracking-wider text-muted-foreground mb-4">
              Could not load product
            </p>
            <Link
              to="/shop"
              className="btn-outline-cosmic px-6 py-3 rounded-lg inline-flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Shop
            </Link>
          </div>
        </div>
      </DevotionLayout>
    );
  }

  return (
    <DevotionLayout>
    <div className="pt-24 pb-16 relative z-10">
      <div className="container mx-auto px-6 lg:px-16 py-10">

        <Link
          to="/shop"
          className="inline-flex items-center gap-2 text-xs text-primary/70 hover:text-primary mb-10 transition-colors font-display tracking-wider"
        >
          <ArrowLeft className="w-3 h-3" /> Back to shop
        </Link>

        <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-start">

          {/* ── Left — image + authenticity ─────────────────────────────── */}
          <div>
            {/* Gradient always shows as background/fallback */}
            <div
              className="rounded-3xl h-80 md:h-[420px] relative overflow-hidden"
              style={{ background: product.gradient ?? undefined }}
            >
              {product.image && (
                <img
                  src={product.image}
                  alt={product.name}
                  className="absolute inset-0 w-full h-full object-cover"
                  onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/20" />
            </div>

            {/* Authenticity badge */}
            <div className="mt-4 glass-card rounded-xl p-4 flex items-center gap-3">
              <Shield className="w-5 h-5 text-primary flex-shrink-0" />
              <div>
                <p className="text-xs font-display tracking-[0.15em] uppercase text-primary/70 mb-0.5">
                  Authenticity
                </p>
                <p className="text-xs text-foreground/65">{product.authenticity}</p>
              </div>
            </div>
          </div>

          {/* ── Right — details ─────────────────────────────────────────── */}
          <div className="flex flex-col">
            <span className="text-[11px] font-display tracking-[0.2em] uppercase text-primary/70 bg-primary/10 border border-primary/30 px-3 py-1 rounded-full w-fit mb-4">
              {product.category.name}
            </span>

            <h1 className="font-display text-3xl md:text-4xl tracking-widest uppercase text-foreground leading-tight mb-4">
              {product.name}
            </h1>

            <p className="text-foreground/70 text-sm leading-relaxed mb-6">
              {product.description}
            </p>

            {/* Price */}
            <div className="flex items-baseline gap-3 mb-8">
              <span className="text-primary font-bold text-4xl">
                ₹{product.price.toLocaleString()}
              </span>
              {product.originalPrice && (
                <span className="text-muted-foreground text-lg line-through">
                  ₹{product.originalPrice.toLocaleString()}
                </span>
              )}
            </div>

            {/* Benefits */}
            <div className="glass-card rounded-2xl p-5 mb-8">
              <p className="text-xs font-display tracking-[0.2em] uppercase text-primary/70 mb-3">
                Spiritual Benefits
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {product.benefits.map(b => (
                  <div key={b} className="flex items-start gap-2">
                    <CheckCircle className="w-3.5 h-3.5 text-primary/60 flex-shrink-0 mt-0.5" />
                    <span className="text-xs text-foreground/65">{b}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Quantity + cart */}
            <div className="flex items-center gap-3 mb-4">
              <div className="flex items-center border border-border/30 rounded-xl overflow-hidden">
                <button
                  onClick={() => setQty(q => Math.max(1, q - 1))}
                  className="px-4 py-3 text-foreground/70 hover:text-primary hover:bg-primary/10 transition-colors text-lg leading-none"
                  aria-label="Decrease quantity"
                >
                  −
                </button>
                <span className="px-5 font-display text-foreground">{qty}</span>
                <button
                  onClick={() => setQty(q => q + 1)}
                  className="px-4 py-3 text-foreground/70 hover:text-primary hover:bg-primary/10 transition-colors text-lg leading-none"
                  aria-label="Increase quantity"
                >
                  +
                </button>
              </div>
              <button className="btn-outline-cosmic btn-pulse flex-1 py-3 rounded-xl text-sm tracking-wider inline-flex items-center justify-center gap-2">
                <ShoppingCart className="w-4 h-4" /> Add to Cart
              </button>
            </div>

            <button className="btn-cosmic w-full py-4 rounded-xl text-sm tracking-wider inline-flex items-center justify-center gap-2">
              <Zap className="w-4 h-4" /> Buy Now
            </button>
          </div>
        </div>
      </div>
    </div>
    </DevotionLayout>
  );
};

export default ShopDetail;
