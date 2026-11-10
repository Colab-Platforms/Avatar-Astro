import { useTranslation } from "react-i18next";

/**
 * A piece of translated text. `def` is the English text shown if the chosen language has no translation for `k`, so a missing
 * translation reads as English and never as the raw key. Use it where a component has no hook of its own (expression-bodied
 * components, or text that sits inside JSX next to markup).
 */
export function Tx({ k, def, values }: { k: string; def?: string; values?: Record<string, string | number> }) {
  const { t } = useTranslation();
  return <>{t(k, { defaultValue: def ?? "", ...(values ?? {}) })}</>;
}

export default Tx;
