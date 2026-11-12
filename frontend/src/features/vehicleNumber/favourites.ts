import { useCallback, useEffect, useState } from "react";

const KEY = "lucky-vehicle-favourites-v1";
const MAX = 30;

const read = (): string[] => {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && /^\d{4}$/.test(x)).slice(0, MAX) : [];
  } catch {
    return [];
  }
};

/**
 * Saved numbers live only in this browser. Bhagya has no table for saved vehicle numbers, and adding one would be a database
 * change, so nothing is sent to the server and nothing is attached to the account. The page says so.
 */
export function useVehicleFavourites() {
  const [saved, setSaved] = useState<string[]>(read);
  useEffect(() => {
    const onStorage = (e: StorageEvent) => { if (e.key === KEY) setSaved(read()); };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);
  const toggle = useCallback((n: string) => {
    setSaved((cur) => {
      const next = cur.includes(n) ? cur.filter((x) => x !== n) : [...cur, n].slice(-MAX);
      try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* private mode: lasts for this visit only */ }
      return next;
    });
  }, []);
  return { saved, toggle, isSaved: (n: string) => saved.includes(n) };
}
