import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import EducationSection, { EducationBlock } from "@/components/EducationSection";
import { FEATURES } from "@/data/featureCatalog";
import { FEATURE_FAQS } from "@/data/featureFaqs";

// The English text lives in the dictionary under compat.edu.*; the shape (block order, list lengths) is fixed here.
const blocks = (t: TFunction): EducationBlock[] => {
  const k = (key: string) => t(`compat.edu.${key}`);
  const list = (key: string, n: number) => Array.from({ length: n }, (_, i) => k(`${key}.${i}`));
  return [
    { heading: k("what.heading"), paragraphs: list("what.p", 2) },
    { heading: k("how.heading"), list: list("how.list", 3), ordered: true },
    { heading: k("details.heading"), list: list("details.list", 3), after: list("details.after", 1) },
    {
      heading: k("calc.heading"),
      paragraphs: list("calc.p", 1),
      list: list("calc.list", 2),
      table: {
        caption: k("calc.table.caption"),
        head: list("calc.table.head", 3),
        rows: [
          ["0", k("calc.table.r0.aspect"), k("calc.table.r0.tone")],
          ["1", k("calc.table.r1.aspect"), k("calc.table.r1.tone")],
          ["2", k("calc.table.r2.aspect"), k("calc.table.r2.tone")],
          ["3", k("calc.table.r3.aspect"), k("calc.table.r3.tone")],
          ["4", k("calc.table.r4.aspect"), k("calc.table.r4.tone")],
          ["5", k("calc.table.r5.aspect"), k("calc.table.r5.tone")],
          ["6", k("calc.table.r6.aspect"), k("calc.table.r6.tone")],
        ],
      },
      after: list("calc.after", 2),
    },
    { heading: k("understand.heading"), list: list("understand.list", 3), after: list("understand.after", 1) },
  ];
};

const faqs = FEATURE_FAQS.compatibility;


export default function CompatibilityEducation() {
  const { t } = useTranslation();
  return <EducationSection audioToolSlug={FEATURES.compatibility.id} idPrefix="compat" title={t("compat.edu.title")} blocks={blocks(t)} faqs={faqs} disclaimer={t("compat.edu.disclaimer")} />;
}
