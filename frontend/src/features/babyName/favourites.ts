import { useCallback, useEffect, useState } from "react";

const KEY = "baby-name-favourites-v1";
const MAX = 50;

const read = (): string[] => {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string").slice(0, MAX) : [];
  } catch {
    return [];
  }
};

/** Saved names live only in this browser (nothing is sent to the server and no account data changes). */
export function useFavourites() {
  const [saved, setSaved] = useState<string[]>(read);
  useEffect(() => {
    const onStorage = (e: StorageEvent) => { if (e.key === KEY) setSaved(read()); };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);
  const toggle = useCallback((name: string) => {
    setSaved((cur) => {
      const next = cur.includes(name) ? cur.filter((x) => x !== name) : [...cur, name].slice(-MAX);
      try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* private mode: lasts for this visit only */ }
      return next;
    });
  }, []);
  return { saved, toggle, isSaved: (name: string) => saved.includes(name) };
}
