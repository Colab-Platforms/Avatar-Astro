import { useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown, Globe } from "lucide-react";
import { useTranslation } from "react-i18next";
import { LOCALES, isLocale, localeInfo, TRANSLATION_STATUS, type LocaleCode } from "@/i18n/languages";
import { setLanguage } from "@/i18n";

interface Props {
  /** "desktop": a compact button with a dropdown. "mobile": a full-width row that opens a list inside the menu. */
  variant?: "desktop" | "mobile";
  lightNav?: boolean;
}

/**
 * Language selector. Names are written in each language's own script so a reader can find theirs. Switching re-renders the app in
 * place (the page, scroll position and form entries are kept) and the choice is remembered in this browser.
 */
export default function LanguageSelector({ variant = "desktop", lightNav = false }: Props) {
  const { t, i18n } = useTranslation();
  const current = localeInfo(isLocale(i18n.language) ? i18n.language : "en");
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const listId = useId();

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open]);

  // Keyboard: opening the list puts focus on the selected language; Arrow Up/Down, Home and End move between languages.
  useEffect(() => {
    if (!open) return;
    const items = wrap.current?.querySelectorAll<HTMLButtonElement>("[role=option] button");
    const selected = Array.from(items ?? []).find((b) => b.closest("[role=option]")?.getAttribute("aria-selected") === "true");
    (selected ?? items?.[0])?.focus();
  }, [open]);
  const onListKey = (e: React.KeyboardEvent<HTMLUListElement>) => {
    const items = Array.from(wrap.current?.querySelectorAll<HTMLButtonElement>("[role=option] button") ?? []);
    const at = items.indexOf(document.activeElement as HTMLButtonElement);
    const move = e.key === "ArrowDown" ? at + 1 : e.key === "ArrowUp" ? at - 1 : e.key === "Home" ? 0 : e.key === "End" ? items.length - 1 : null;
    if (move === null || items.length === 0) return;
    e.preventDefault();
    items[(move + items.length) % items.length].focus();
  };

  const choose = async (code: LocaleCode) => {
    if (busy) return;
    setBusy(true);
    setFailed(false);
    const ok = await setLanguage(code);
    setBusy(false);
    if (ok) setOpen(false); else setFailed(true);
  };

  const tone = lightNav ? "text-[#2C1810]/80" : "text-foreground/80";
  const mobile = variant === "mobile";

  return (
    <div ref={wrap} className={`relative ${mobile ? "w-full" : ""}`} data-testid="language-selector">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={`${t("language.label")}: ${current.native}`}
        className={`inline-flex items-center gap-1.5 rounded-full border border-[#BC6A4D]/40 bg-[#BC6A4D]/10 px-3 py-2 text-xs font-semibold transition-colors hover:bg-[#BC6A4D]/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#BC6A4D] ${tone} ${mobile ? "w-full justify-between px-4 py-2.5 text-sm" : ""}`}
      >
        <span className="inline-flex items-center gap-1.5"><Globe size={14} aria-hidden="true" className="text-[#BC6A4D]" /><span lang={current.tag.split("-")[0]} data-testid="language-current">{current.native}</span></span>
        <ChevronDown size={14} aria-hidden="true" className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <ul
          id={listId}
          role="listbox"
          aria-label={t("language.choose")}
          onKeyDown={onListKey}
          className={`z-[70] grid max-h-[70vh] grid-cols-1 gap-0.5 overflow-auto rounded-xl border border-[#592209]/20 bg-[#FBF5EC] p-1.5 shadow-xl ${mobile ? "mt-2" : "absolute right-0 top-full mt-2 w-60"}`}
        >
          {LOCALES.map((l) => {
            const selected = l.code === current.code;
            return (
              <li key={l.code} role="option" aria-selected={selected}>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => choose(l.code)}
                  data-testid={`language-option-${l.code}`}
                  className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#BC6A4D] ${selected ? "bg-[#592209]/10 font-semibold text-[#301607]" : "text-[#301607] hover:bg-[#592209]/5"}`}
                >
                  <span>
                    <span lang={l.tag.split("-")[0]} className="block text-base">{l.native}</span>
                    {l.code !== "en" && <span className="block text-[11px] text-[#6B4A37]">{l.english}{TRANSLATION_STATUS[l.code] === "draft" ? ` · ${t("language.draft")}` : ""}</span>}
                  </span>
                  {selected && <Check size={16} aria-hidden="true" className="shrink-0 text-[#592209]" />}
                </button>
              </li>
            );
          })}
          {failed && <li role="alert" className="px-3 py-2 text-xs text-[#9B2C1D]">{t("language.loadFailed")}</li>}
        </ul>
      )}
    </div>
  );
}
