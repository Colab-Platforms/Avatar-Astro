import * as AccordionPrimitive from "@radix-ui/react-accordion";
import { Minus, Plus } from "lucide-react";
import { usePublicContent } from "@/lib/publicContent";
import { homeFaqs } from "@/data/homeFaqs";

const FaqSection = () => {
  // FAQs published from the admin panel are listed after the built-in ones.
  const published = usePublicContent("FAQ").map((f) => ({ question: f.title, answer: f.body }));
  const allFaqs = [...homeFaqs, ...published];
  return (
  <section className="hl-section relative z-10 w-full border-t border-home-line" aria-labelledby="home-faq-h">
    <div className="container relative mx-auto px-4 md:px-6">
      <div className="grid gap-6 lg:grid-cols-[0.8fr_1.3fr] lg:gap-12">
        <div className="text-center lg:text-left">
          <p className="hl-eyebrow mb-3">Questions, Answered</p>
          <h2 id="home-faq-h" className="hl-serif text-3xl font-bold leading-tight text-home-ink sm:text-4xl md:text-[2.5rem]">
            Curious About Your <span className="text-home-gerua">Bhagya?</span>
          </h2>
          <p className="mx-auto mt-4 max-w-sm font-home-sans text-base italic leading-relaxed text-home-muted lg:mx-0">
            From ancient wisdom to everyday questions, find your answers here.
          </p>
        </div>

        <AccordionPrimitive.Root type="single" collapsible defaultValue="faq-0" className="w-full space-y-2">
          {allFaqs.map((faq, i) => (
            <AccordionPrimitive.Item
              key={`${i}-${faq.question}`}
              value={`faq-${i}`}
              className="group rounded-2xl border border-home-line bg-home-ivory transition-[border-color,box-shadow] duration-300 hover:border-home-gerua/40 hover:shadow-[0_6px_18px_-12px_rgba(89,34,9,0.45)] data-[state=open]:border-home-gerua/40"
            >
              <AccordionPrimitive.Header>
                <AccordionPrimitive.Trigger className="flex w-full items-center justify-between gap-4 rounded-2xl px-5 py-4 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-home-gerua">
                  <span className="font-home-sans text-base font-semibold text-home-ink sm:text-lg">
                    {faq.question}
                  </span>
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-home-line text-home-ink transition-colors duration-300 group-data-[state=open]:border-transparent group-data-[state=open]:bg-home-gerua group-data-[state=open]:text-home-ivory">
                    <Plus className="h-4 w-4 group-data-[state=open]:hidden" aria-hidden="true" />
                    <Minus className="hidden h-4 w-4 group-data-[state=open]:block" aria-hidden="true" />
                  </span>
                </AccordionPrimitive.Trigger>
              </AccordionPrimitive.Header>
              <AccordionPrimitive.Content className="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
                <p className="px-5 pb-4 pr-14 font-home-sans text-sm leading-[1.6] text-home-muted sm:text-base">
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
};

export default FaqSection;
