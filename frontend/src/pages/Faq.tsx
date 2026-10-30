import { useEffect } from "react";
import FaqSection from "@/components/FaqSection";

/** Standalone FAQ page (the footer links here). Reuses the homepage FAQ, including FAQs published from the admin panel. */
const Faq = () => {
  useEffect(() => {
    document.title = "FAQ | Spiritual AI";
    return () => {
      document.title = "Spiritual AI";
    };
  }, []);

  return (
    <div className="relative z-10 min-h-screen bg-home-ivory pt-24">
      <FaqSection />
    </div>
  );
};

export default Faq;
