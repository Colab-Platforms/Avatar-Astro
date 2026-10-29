import DevotionLayout from '@/components/DevotionLayout';

// ── Custom Shimmer Animation CSS ──────────────────────────────────────────────
const SHIMMER_CSS = `
  @keyframes puja-shimmer {
    0% {
      background-position: -200% 0;
    }
    100% {
      background-position: 200% 0;
    }
  }
  .puja-shimmer-bg {
    background: linear-gradient(90deg, #F0DFC7 25%, #FBF5EC 50%, #F0DFC7 75%);
    background-size: 200% 100%;
    animation: puja-shimmer 1.6s infinite linear;
  }
`;

// ── Puja Card Skeleton (used in the list page) ──────────────────────────────────
export const PujaCardSkeleton = () => (
  <div
    style={{
      background: '#FFFFFF',
      borderRadius: 20,
      border: '1.5px solid rgba(89,34,9,0.13)',
      boxShadow: '0 4px 20px rgba(89,34,9,0.2), 0 1px 3px rgba(89,34,9,0.2)',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
    }}
  >
    {/* Image placeholder (4:3 aspect ratio) */}
    <div
      style={{
        position: 'relative',
        width: '100%',
        paddingBottom: '75%',
        background: '#F0DFC7',
        borderRadius: '18px 18px 0 0',
        overflow: 'hidden',
      }}
    >
      <div className="puja-shimmer-bg absolute inset-0" />
    </div>

    {/* Body placeholder */}
    <div style={{ padding: '22px 24px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Badge */}
      <div className="puja-shimmer-bg" style={{ width: 100, height: 22, borderRadius: 99 }} />

      {/* Temple Title (2 lines) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div className="puja-shimmer-bg" style={{ width: '85%', height: 28, borderRadius: 6 }} />
        <div className="puja-shimmer-bg" style={{ width: '50%', height: 28, borderRadius: 6 }} />
      </div>

      {/* Subtitle */}
      <div className="puja-shimmer-bg" style={{ width: '40%', height: 18, borderRadius: 4, marginTop: 4 }} />

      {/* Location */}
      <div className="puja-shimmer-bg" style={{ width: '60%', height: 16, borderRadius: 4 }} />

      {/* Divider */}
      <div style={{ height: 1, background: 'rgba(89,34,9,0.08)', marginTop: 8, marginBottom: 8 }} />

      {/* Price & CTA */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div className="puja-shimmer-bg" style={{ width: 60, height: 10, borderRadius: 2 }} />
          <div className="puja-shimmer-bg" style={{ width: 80, height: 26, borderRadius: 4 }} />
        </div>
        <div className="puja-shimmer-bg" style={{ width: 120, height: 44, borderRadius: 12 }} />
      </div>
    </div>
  </div>
);

// ── Puja List Skeleton ─────────────────────────────────────────────────────────
export const PujaListSkeleton = () => (
  <>
    <style>{SHIMMER_CSS}</style>
    <div
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
      style={{ gap: 24 }}
    >
      {Array.from({ length: 6 }).map((_, i) => (
        <PujaCardSkeleton key={i} />
      ))}
    </div>
  </>
);

// ── Puja Detail Skeleton ───────────────────────────────────────────────────────
export const PujaDetailSkeleton = () => (
  <DevotionLayout>
    <style>{SHIMMER_CSS}</style>
    <div className="pt-24 pb-24 lg:pb-16 relative z-10">
      <div className="container mx-auto px-6 lg:px-16">
        
        {/* Back Link Skeleton */}
        <div className="inline-flex items-center gap-2 mb-10">
          <div className="puja-shimmer-bg" style={{ width: 16, height: 16, borderRadius: '50%' }} />
          <div className="puja-shimmer-bg" style={{ width: 150, height: 16, borderRadius: 4 }} />
        </div>

        {/* Hero Section (2 Columns) */}
        <div className="flex flex-col lg:flex-row gap-10 lg:gap-16 mb-24">
          
          {/* Left Column: Image Carousel Placeholder */}
          <div className="lg:w-[58%] flex flex-col gap-4">
            <div className="rounded-2xl overflow-hidden relative" style={{ aspectRatio: '4/3', background: '#F0DFC7' }}>
              <div className="puja-shimmer-bg absolute inset-0" />
            </div>
            {/* Carousel Dots */}
            <div className="flex justify-center gap-2">
              <div className="puja-shimmer-bg" style={{ width: 24, height: 6, borderRadius: 99 }} />
              <div className="puja-shimmer-bg" style={{ width: 6, height: 6, borderRadius: 99 }} />
              <div className="puja-shimmer-bg" style={{ width: 6, height: 6, borderRadius: 99 }} />
            </div>
          </div>

          {/* Right Column: Info Placeholder */}
          <div className="lg:w-[42%] flex flex-col gap-6">
            {/* Deity Badge */}
            <div className="puja-shimmer-bg" style={{ width: 120, height: 32, borderRadius: 99 }} />

            {/* Temple Name */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div className="puja-shimmer-bg" style={{ width: '90%', height: 44, borderRadius: 8 }} />
              <div className="puja-shimmer-bg" style={{ width: '60%', height: 24, borderRadius: 6 }} />
            </div>

            {/* Info Cards (Location, Timing, Availability) */}
            <div className="flex flex-col gap-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="glass-card rounded-2xl px-5 py-4 flex items-center gap-4" style={{ background: '#FFFFFF' }}>
                  <div className="w-10 h-10 rounded-xl puja-shimmer-bg flex-shrink-0" />
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div className="puja-shimmer-bg" style={{ width: 80, height: 10, borderRadius: 4 }} />
                    <div className="puja-shimmer-bg" style={{ width: '70%', height: 16, borderRadius: 4 }} />
                  </div>
                </div>
              ))}
            </div>

            {/* Description Paragraph */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
              <div className="puja-shimmer-bg" style={{ width: '100%', height: 16, borderRadius: 4 }} />
              <div className="puja-shimmer-bg" style={{ width: '95%', height: 16, borderRadius: 4 }} />
              <div className="puja-shimmer-bg" style={{ width: '98%', height: 16, borderRadius: 4 }} />
              <div className="puja-shimmer-bg" style={{ width: '60%', height: 16, borderRadius: 4 }} />
            </div>

            {/* CTA Button */}
            <div className="puja-shimmer-bg" style={{ width: '100%', height: 56, borderRadius: 16 }} />
          </div>
        </div>

        {/* How It Works Section */}
        <section className="mb-24">
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 56 }}>
            <div className="puja-shimmer-bg" style={{ width: 220, height: 36, borderRadius: 6 }} />
          </div>
          <div className="flex flex-col md:flex-row gap-6 justify-between">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, padding: '0 12px', gap: 12 }}>
                <div className="w-20 h-20 rounded-2xl puja-shimmer-bg" />
                <div className="puja-shimmer-bg" style={{ width: 100, height: 16, borderRadius: 4 }} />
                <div className="puja-shimmer-bg" style={{ width: 80, height: 12, borderRadius: 4 }} />
              </div>
            ))}
          </div>
        </section>

        {/* Available Pujas Section */}
        <section className="mb-24">
          <div className="puja-shimmer-bg" style={{ width: 280, height: 36, borderRadius: 6, marginBottom: 8 }} />
          <div className="puja-shimmer-bg" style={{ width: 420, height: 18, borderRadius: 4, marginBottom: 48 }} />
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="glass-card rounded-2xl p-8 flex flex-col gap-6" style={{ background: '#FFFFFF', minHeight: 340 }}>
                <div className="puja-shimmer-bg" style={{ width: '80%', height: 26, borderRadius: 6 }} />
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
                  <div className="puja-shimmer-bg" style={{ width: 100, height: 36, borderRadius: 6 }} />
                  <div className="puja-shimmer-bg" style={{ width: 60, height: 16, borderRadius: 4 }} />
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div className="puja-shimmer-bg" style={{ width: 60, height: 10, borderRadius: 4 }} />
                  <div className="puja-shimmer-bg" style={{ width: '90%', height: 14, borderRadius: 4 }} />
                  <div className="puja-shimmer-bg" style={{ width: '75%', height: 14, borderRadius: 4 }} />
                  <div className="puja-shimmer-bg" style={{ width: '85%', height: 14, borderRadius: 4 }} />
                </div>
                <div className="puja-shimmer-bg" style={{ width: '100%', height: 48, borderRadius: 12 }} />
              </div>
            ))}
          </div>
        </section>

      </div>
    </div>
  </DevotionLayout>
);
