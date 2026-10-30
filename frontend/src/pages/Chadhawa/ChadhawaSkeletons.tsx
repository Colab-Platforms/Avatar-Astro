import DevotionLayout from '@/components/DevotionLayout';

// ── Custom Shimmer Animation CSS ──────────────────────────────────────────────
const SHIMMER_CSS = `
  @keyframes chadhawa-shimmer {
    0% {
      background-position: -200% 0;
    }
    100% {
      background-position: 200% 0;
    }
  }
  .chadhawa-shimmer-bg {
    background: linear-gradient(90deg, #F0DFC7 25%, #FBF5EC 50%, #F0DFC7 75%);
    background-size: 200% 100%;
    animation: chadhawa-shimmer 1.6s infinite linear;
  }
`;

// ── Chadhawa Detail Skeleton ──────────────────────────────────────────────────
export const ChadhawaDetailSkeleton = () => (
  <DevotionLayout>
    <style>{SHIMMER_CSS}</style>
    <div className="pt-24 pb-32 lg:pb-16 relative z-10">

      {/* Breadcrumb Skeleton */}
      <div className="border-b border-border/20">
        <div className="mx-auto px-6 lg:px-16 py-3" style={{ maxWidth: 1400 }}>
          <div className="flex items-center gap-2">
            <div className="chadhawa-shimmer-bg" style={{ width: 40, height: 12, borderRadius: 4 }} />
            <span className="text-muted-foreground">/</span>
            <div className="chadhawa-shimmer-bg" style={{ width: 110, height: 12, borderRadius: 4 }} />
            <span className="text-muted-foreground">/</span>
            <div className="chadhawa-shimmer-bg" style={{ width: 80, height: 12, borderRadius: 4 }} />
          </div>
        </div>
      </div>

      <div className="mx-auto px-6 lg:px-16 py-8" style={{ maxWidth: 1400 }}>

        {/* Hero Section (2 Columns) */}
        <div className="flex flex-col lg:flex-row gap-10 lg:gap-14 mb-16">
          
          {/* Left Column: Image Carousel Placeholder */}
          <div className="lg:w-[56%] flex flex-col gap-3">
            <div className="rounded-[20px] overflow-hidden relative" style={{ height: 420, background: '#F0DFC7' }}>
              <div className="chadhawa-shimmer-bg absolute inset-0" />
            </div>
            {/* Carousel Dots */}
            <div className="flex justify-center gap-2">
              <div className="chadhawa-shimmer-bg" style={{ width: 24, height: 6, borderRadius: 99 }} />
              <div className="chadhawa-shimmer-bg" style={{ width: 6, height: 6, borderRadius: 99 }} />
              <div className="chadhawa-shimmer-bg" style={{ width: 6, height: 6, borderRadius: 99 }} />
            </div>
          </div>

          {/* Right Column: Info Placeholder */}
          <div className="lg:w-[44%] flex flex-col gap-5">
            {/* Trust Badge */}
            <div className="chadhawa-shimmer-bg" style={{ width: 180, height: 28, borderRadius: 99 }} />

            {/* Temple Name */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div className="chadhawa-shimmer-bg" style={{ width: '90%', height: 44, borderRadius: 8 }} />
              <div className="chadhawa-shimmer-bg" style={{ width: '60%', height: 20, borderRadius: 6 }} />
            </div>

            {/* Description Paragraph */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div className="chadhawa-shimmer-bg" style={{ width: '100%', height: 14, borderRadius: 4 }} />
              <div className="chadhawa-shimmer-bg" style={{ width: '95%', height: 14, borderRadius: 4 }} />
              <div className="chadhawa-shimmer-bg" style={{ width: '70%', height: 14, borderRadius: 4 }} />
            </div>

            {/* Price Callout Card */}
            <div className="glass-card rounded-2xl px-5 py-4 flex items-center justify-between" style={{ background: '#FFFFFF' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div className="chadhawa-shimmer-bg" style={{ width: 120, height: 10, borderRadius: 4 }} />
                <div className="chadhawa-shimmer-bg" style={{ width: 80, height: 28, borderRadius: 6 }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
                <div className="chadhawa-shimmer-bg" style={{ width: 60, height: 10, borderRadius: 4 }} />
                <div className="chadhawa-shimmer-bg" style={{ width: 110, height: 18, borderRadius: 4 }} />
              </div>
            </div>

            {/* Features Highlight Grid */}
            <div className="grid grid-cols-2 gap-2.5">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="glass-card rounded-xl px-3 py-2.5 flex items-center gap-2" style={{ background: '#FFFFFF' }}>
                  <div className="w-5 h-5 rounded-full chadhawa-shimmer-bg flex-shrink-0" />
                  <div className="chadhawa-shimmer-bg" style={{ width: '70%', height: 12, borderRadius: 4 }} />
                </div>
              ))}
            </div>

            {/* CTA Buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 4 }}>
              <div className="chadhawa-shimmer-bg" style={{ width: '100%', height: 52, borderRadius: 12 }} />
              <div className="chadhawa-shimmer-bg" style={{ width: '100%', height: 48, borderRadius: 12 }} />
            </div>
          </div>
        </div>

        {/* Choose Your Offering Section */}
        <section className="mb-16">
          <div className="text-center mb-10">
            <div className="flex justify-center mb-3">
              <div className="chadhawa-shimmer-bg" style={{ width: 100, height: 14, borderRadius: 4 }} />
            </div>
            <div className="flex justify-center mb-3">
              <div className="chadhawa-shimmer-bg" style={{ width: 280, height: 36, borderRadius: 6 }} />
            </div>
            <div className="flex justify-center">
              <div className="chadhawa-shimmer-bg" style={{ width: 340, height: 14, borderRadius: 4 }} />
            </div>
          </div>

          <div className="flex flex-col lg:flex-row gap-8 items-start">
            {/* Offering Grid */}
            <div className="flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="glass-card rounded-2xl p-4 flex gap-4 items-start" style={{ background: '#FFFFFF' }}>
                    {/* Emoji placeholder */}
                    <div className="w-16 h-16 rounded-xl chadhawa-shimmer-bg flex-shrink-0" />
                    
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div className="chadhawa-shimmer-bg" style={{ width: 90, height: 16, borderRadius: 4 }} />
                        <div className="chadhawa-shimmer-bg" style={{ width: 40, height: 16, borderRadius: 4 }} />
                      </div>
                      <div className="chadhawa-shimmer-bg" style={{ width: '100%', height: 12, borderRadius: 4 }} />
                      <div className="chadhawa-shimmer-bg" style={{ width: '80%', height: 12, borderRadius: 4 }} />
                      <div className="chadhawa-shimmer-bg" style={{ width: 68, height: 28, borderRadius: 8, marginTop: 4 }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Sidebar Summary */}
            <div className="lg:w-72 xl:w-80 flex-shrink-0">
              <div className="glass-card rounded-2xl border border-border/30 overflow-hidden" style={{ background: 'rgba(89,34,9,0.25)' }}>
                <div className="border-b border-border/20 px-5 py-4">
                  <div className="chadhawa-shimmer-bg" style={{ width: 140, height: 18, borderRadius: 4 }} />
                </div>
                <div className="px-5 py-4" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div className="text-center py-6" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                    <div className="w-12 h-12 rounded-full chadhawa-shimmer-bg" />
                    <div className="chadhawa-shimmer-bg" style={{ width: 160, height: 12, borderRadius: 4 }} />
                  </div>
                  <div className="border-t border-border/20 pt-3 space-y-2">
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <div className="chadhawa-shimmer-bg" style={{ width: 40, height: 12, borderRadius: 4 }} />
                      <div className="chadhawa-shimmer-bg" style={{ width: 20, height: 12, borderRadius: 4 }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <div className="chadhawa-shimmer-bg" style={{ width: 80, height: 14, borderRadius: 4 }} />
                      <div className="chadhawa-shimmer-bg" style={{ width: 40, height: 14, borderRadius: 4 }} />
                    </div>
                  </div>
                  <div className="chadhawa-shimmer-bg" style={{ width: '100%', height: 48, borderRadius: 12 }} />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Process Timeline Section */}
        <section className="mb-16">
          <div className="text-center mb-12">
            <div className="flex justify-center mb-3">
              <div className="chadhawa-shimmer-bg" style={{ width: 100, height: 14, borderRadius: 4 }} />
            </div>
            <div className="flex justify-center">
              <div className="chadhawa-shimmer-bg" style={{ width: 260, height: 36, borderRadius: 6 }} />
            </div>
          </div>
          <div className="hidden lg:flex justify-between gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, gap: 10, textAlign: 'center' }}>
                <div className="w-16 h-16 rounded-2xl chadhawa-shimmer-bg" />
                <div className="chadhawa-shimmer-bg" style={{ width: 80, height: 14, borderRadius: 4 }} />
                <div className="chadhawa-shimmer-bg" style={{ width: '90%', height: 10, borderRadius: 4 }} />
              </div>
            ))}
          </div>
        </section>

      </div>
    </div>
  </DevotionLayout>
);
