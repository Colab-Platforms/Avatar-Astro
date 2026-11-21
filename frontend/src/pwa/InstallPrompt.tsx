import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";
import { useTranslation } from "react-i18next";

// Chrome/Edge/Android fire this when the site can be installed; Safari on iPhone never does (users use Share > Add to Home Screen).
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const KEY = "bhagya.installPrompt.dismissedAt";
const SNOOZE_MS = 14 * 24 * 60 * 60 * 1000;

const recentlyDismissed = () => {
  try {
    const at = Number(localStorage.getItem(KEY));
    return Number.isFinite(at) && at > 0 && Date.now() - at < SNOOZE_MS;
  } catch {
    return false;
  }
};
const remember = () => { try { localStorage.setItem(KEY, String(Date.now())); } catch { /* private mode: it just shows again next visit */ } };
const isInstalled = () => window.matchMedia?.("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;

/** A small, dismissible "Install Bhagya" bar. It appears only when the browser says the app can be installed. */
export default function InstallPrompt() {
  const { t } = useTranslation();
  const [event, setEvent] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (isInstalled() || recentlyDismissed()) return;
    const onPrompt = (e: Event) => { e.preventDefault(); setEvent(e as BeforeInstallPromptEvent); };
    const onInstalled = () => setEvent(null);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => { window.removeEventListener("beforeinstallprompt", onPrompt); window.removeEventListener("appinstalled", onInstalled); };
  }, []);

  if (!event) return null;
  const dismiss = () => { remember(); setEvent(null); };
  const install = async () => {
    const e = event;
    setEvent(null); // a captured prompt can only be used once
    try {
      await e.prompt();
      const { outcome } = await e.userChoice;
      if (outcome === "dismissed") remember();
    } catch { /* the browser declined to show it; nothing to do */ }
  };

  return (
    <div role="region" aria-label={t("pwa.install.title")} data-testid="install-prompt"
      className="fixed inset-x-3 bottom-3 z-[60] mx-auto flex max-w-md items-center gap-3 rounded-2xl border border-[#C18A3D] bg-[#FFFBF3] p-3 pr-2 shadow-lg">
      <img src="/icons/icon-192.png" alt="" width={44} height={44} className="h-11 w-11 shrink-0 rounded-xl" />
      <div className="min-w-0 flex-1">
        <p className="m-0 text-sm font-semibold text-[#54230F]">{t("pwa.install.title")}</p>
        <p className="m-0 text-xs text-[#6B4A37]">{t("pwa.install.body")}</p>
      </div>
      <button type="button" onClick={() => void install()} className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[#803003] px-3.5 py-2 text-sm font-semibold text-[#F5E9D6] hover:bg-[#54230F] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#C18A3D]">
        <Download className="h-4 w-4" aria-hidden="true" />{t("pwa.install.action")}
      </button>
      <button type="button" onClick={dismiss} aria-label={t("pwa.install.dismiss")} className="shrink-0 rounded-full p-2 text-[#6B4A37] hover:bg-[#F5E9D6]"><X className="h-4 w-4" /></button>
    </div>
  );
}
