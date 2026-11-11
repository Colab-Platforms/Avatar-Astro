import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import EducationSection, { EducationBlock } from "@/components/EducationSection";
import { FEATURES } from "@/data/featureCatalog";
import { FEATURE_FAQS } from "@/data/featureFaqs";

// The English text lives in the dictionary under tarot.education.*; the shape (block order, list lengths) is fixed here.
const blocks = (t: TFunction): EducationBlock[] => {
  const k = (key: string) => t(`tarot.education.${key}`);
  return [
    { heading: k("what.heading"), paragraphs: [k("what.p.0")] },
    { heading: k("how.heading"), list: [k("how.list.0"), k("how.list.1"), k("how.list.2")], ordered: true, after: [k("how.after.0")] },
    { heading: k("understand.heading"), paragraphs: [k("understand.p.0")] },
  ];
};

const faqs = FEATURE_FAQS.tarot;

export default function TarotEducation() {
  const { t } = useTranslation();
  return <EducationSection audioToolSlug={FEATURES.tarot.id} idPrefix="tarot" title={t("tarot.education.title")} blocks={blocks(t)} faqs={faqs} disclaimer={t("tarot.education.disclaimer")} />;
}
