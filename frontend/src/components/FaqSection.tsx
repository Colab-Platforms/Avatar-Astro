import * as AccordionPrimitive from "@radix-ui/react-accordion";
import { Plus } from "lucide-react";

const faqs = [
  {
    question: "What can I explore on Spiritual?",
    answer:
      "Spiritual brings astrology and spiritual guidance together in one place. You can explore Birth Charts, Tarot Readings, Name Analysis, Palm Reading, Compatibility, Daily Horoscope, AI Guru guidance, Live Darshan, and devotional experiences.",
  },
  {
    question: "How does the Spiritual Birth Chart work?",
    answer:
      "Enter your birth details to generate your personalized birth chart. Spiritual uses your birth information to present planetary positions and astrology-based insights in an easy-to-understand format.",
  },
  {
    question: "Can I use Spiritual without knowing much about astrology?",
    answer:
      "Yes. Spiritual is designed for both beginners and people who already follow astrology. Our tools explain insights in a simple way so you can explore your chart, predictions, and spiritual guidance without needing advanced astrology knowledge.",
  },
  {
    question: "What is AI Guru on Spiritual?",
    answer:
      "AI Guru is your conversational spiritual guide. You can ask questions about astrology, life situations, spirituality, and personal guidance and receive AI-powered responses based on the information available to the experience.",
  },
  {
    question: "Can I get a daily horoscope on Spiritual?",
    answer:
      "Yes. Spiritual provides daily horoscope guidance based on your zodiac sign, helping you explore themes and insights for your day.",
  },
  {
    question: "What other spiritual experiences are available?",
    answer:
      "Along with astrology tools, Spiritual includes Live Darshan, temples, festivals, Daily Aarti, spiritual books, Puja & Remedies, and Mantras & Chants, bringing multiple spiritual experiences together in one platform.",
  },
];

const FaqSection = () => (
  <section className="hl-section relative z-10 w-full border-t border-home-line" aria-labelledby="home-faq-h">
    <div className="container relative mx-auto px-4 md:px-6">
      <div className="grid gap-10 lg:grid-cols-[0.8fr_1.3fr] lg:gap-16">
        <div className="text-center lg:text-left">
          <p className="hl-eyebrow mb-3">Questions, Answered</p>
          <h2 id="home-faq-h" className="hl-serif text-3xl font-bold leading-tight text-home-ink sm:text-4xl md:text-[2.5rem]">
            Start Your Journey With <span className="text-home-gerua">Clarity.</span>
          </h2>
        </div>

        <AccordionPrimitive.Root type="single" collapsible defaultValue="faq-0" className="w-full space-y-3">
          {faqs.map((faq, i) => (
            <AccordionPrimitive.Item
              key={faq.question}
              value={`faq-${i}`}
              className="group rounded-2xl border border-home-line bg-home-ivory transition-colors data-[state=open]:border-home-gerua/40"
            >
              <AccordionPrimitive.Header>
                <AccordionPrimitive.Trigger className="flex w-full items-center justify-between gap-4 rounded-2xl px-5 py-4 text-left">
                  <span className="font-home-sans text-base font-semibold text-home-ink sm:text-lg">
                    {faq.question}
                  </span>
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-home-line text-home-ink transition-colors duration-300 group-data-[state=open]:border-transparent group-data-[state=open]:bg-home-gerua group-data-[state=open]:text-home-ivory">
                    <Plus className="h-4 w-4 transition-transform duration-300 group-data-[state=open]:rotate-45" />
                  </span>
                </AccordionPrimitive.Trigger>
              </AccordionPrimitive.Header>
              <AccordionPrimitive.Content className="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
                <p className="px-5 pb-5 pr-14 font-home-sans text-sm leading-relaxed text-home-muted sm:text-base">
                  {faq.answer}
                </p>
              </AccordionPrimitive.Content>
            </AccordionPrimitive.Item>
          ))}
        </AccordionPrimitive.Root>
      </div>
    </div>
  </section>
);

export default FaqSection;
