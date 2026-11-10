import { ArrowLeft, Menu } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { PersonaHeader } from "./PersonaCard";
import { getFallback, hasPreviousAppEntry } from "@/components/BackButton";
import type { Astrologer } from "@/data/astrologers";

interface GuruTopHeaderProps {
  onOpenSidebar: () => void;
  persona?: Astrologer | null;
}

/** Slim header. The product name lives in the sidebar only; the guidance profile appears here once assigned. */
const GuruTopHeader = ({ onOpenSidebar, persona }: GuruTopHeaderProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  // Same rule as the site-wide back button, which is hidden on this page: go to the previous page,
  // or to the logical parent when there is none (deep link or refresh).
  const goBack = () => {
    if (hasPreviousAppEntry(location.key)) navigate(-1);
    else navigate(getFallback(location.pathname), { replace: true });
  };
  return (
    <header className="flex min-h-[56px] items-center gap-3 border-b border-primary/15 bg-[#FBF5EC]/80 px-4 py-2 backdrop-blur-xl md:px-6">
      <button
        onClick={onOpenSidebar}
        className="rounded-lg border border-primary/15 p-2 text-muted-foreground hover:bg-primary/10 lg:hidden"
        aria-label={t("guru.header.openMenu")}
      >
        <Menu className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={goBack}
        aria-label={t("guru.header.goBack")}
        className="flex items-center gap-1.5 rounded-lg border border-[#592209]/25 px-3 py-2 text-sm text-[#592209] transition-colors hover:border-[#E58A45] hover:bg-[#592209]/5"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        {t("common.back")}
      </button>
      {persona && <PersonaHeader persona={persona} />}
    </header>
  );
};

export default GuruTopHeader;
