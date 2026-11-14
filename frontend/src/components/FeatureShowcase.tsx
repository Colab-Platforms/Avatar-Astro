import FeaturedCarousel from "./FeaturedCarousel";
import LiveDarshanCard from "./LiveDarshanCard";
import AIGuruCard from "./AIGuruCard";

const FeatureShowcase = () => (
  <section className="relative w-full scroll-mt-16 py-6 md:py-8" aria-label="Featured experiences">
    <div className="relative z-10 mx-auto flex w-full max-w-[1520px] flex-col gap-4 px-4 sm:px-6 lg:px-8">
      <FeaturedCarousel />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <LiveDarshanCard index={0} />
        <AIGuruCard index={1} />
      </div>
    </div>
  </section>
);

export default FeatureShowcase;
