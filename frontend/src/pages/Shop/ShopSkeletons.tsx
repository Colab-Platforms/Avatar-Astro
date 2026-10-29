import DevotionLayout from '@/components/DevotionLayout';

const SHIMMER_CSS = `
  @keyframes shop-shimmer {
    0% {
      background-position: -200% 0;
    }
    100% {
      background-position: 200% 0;
    }
  }
  .shop-shimmer-bg {
    background: linear-gradient(90deg, #F0DFC7 25%, #FBF5EC 50%, #F0DFC7 75%);
    background-size: 200% 100%;
    animation: shop-shimmer 1.6s infinite linear;
  }
`;

export const ShopCardSkeleton = () => (
  <div
    style={{
      background: '#FFFFFF',
      borderRadius: 18,
      border: '1.5px solid rgba(89,34,9,0.13)',
      boxShadow: '0 4px 20px rgba(89,34,9,0.2)',
      overflow: 'hidden',
    }}
  >
    <div className="h-48 shop-shimmer-bg" />
    <div className="p-5" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div className="shop-shimmer-bg" style={{ width: '70%', height: 14, borderRadius: 4 }} />
      <div className="shop-shimmer-bg" style={{ width: '100%', height: 12, borderRadius: 4 }} />
      <div className="shop-shimmer-bg" style={{ width: '85%', height: 12, borderRadius: 4 }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
        <div className="shop-shimmer-bg" style={{ width: 60, height: 20, borderRadius: 4 }} />
        <div className="shop-shimmer-bg" style={{ width: 64, height: 26, borderRadius: 8 }} />
      </div>
    </div>
  </div>
);

export const ShopListSkeleton = () => (
  <>
    <style>{SHIMMER_CSS}</style>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {Array.from({ length: 8 }).map((_, i) => (
        <ShopCardSkeleton key={i} />
      ))}
    </div>
  </>
);

export const ShopDetailSkeleton = () => (
  <DevotionLayout>
    <style>{SHIMMER_CSS}</style>
    <div className="pt-24 pb-16 relative z-10">
      <div className="container mx-auto px-6 lg:px-16 py-10">
        <div className="shop-shimmer-bg" style={{ width: 110, height: 14, borderRadius: 4, marginBottom: 40 }} />

        <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-start">
          <div>
            <div className="rounded-3xl h-80 md:h-[420px] shop-shimmer-bg" />
            <div className="mt-4 glass-card rounded-xl p-4 flex items-center gap-3" style={{ background: '#FFFFFF' }}>
              <div className="w-5 h-5 rounded-full shop-shimmer-bg flex-shrink-0" />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div className="shop-shimmer-bg" style={{ width: '40%', height: 10, borderRadius: 4 }} />
                <div className="shop-shimmer-bg" style={{ width: '80%', height: 12, borderRadius: 4 }} />
              </div>
            </div>
          </div>

          <div className="flex flex-col" style={{ gap: 16 }}>
            <div className="shop-shimmer-bg" style={{ width: 120, height: 24, borderRadius: 99 }} />
            <div className="shop-shimmer-bg" style={{ width: '85%', height: 36, borderRadius: 6 }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div className="shop-shimmer-bg" style={{ width: '100%', height: 12, borderRadius: 4 }} />
              <div className="shop-shimmer-bg" style={{ width: '90%', height: 12, borderRadius: 4 }} />
              <div className="shop-shimmer-bg" style={{ width: '60%', height: 12, borderRadius: 4 }} />
            </div>
            <div className="shop-shimmer-bg" style={{ width: 160, height: 40, borderRadius: 6 }} />
            <div className="glass-card rounded-2xl p-5" style={{ background: '#FFFFFF' }}>
              <div className="shop-shimmer-bg" style={{ width: 140, height: 12, borderRadius: 4, marginBottom: 12 }} />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="shop-shimmer-bg" style={{ width: '90%', height: 12, borderRadius: 4 }} />
                ))}
              </div>
            </div>
            <div className="shop-shimmer-bg" style={{ width: '100%', height: 52, borderRadius: 12 }} />
            <div className="shop-shimmer-bg" style={{ width: '100%', height: 56, borderRadius: 12 }} />
          </div>
        </div>
      </div>
    </div>
  </DevotionLayout>
);
