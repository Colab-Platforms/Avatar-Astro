import { useCallback, useEffect, useState } from "react";
import type { MuhuratPlace, MuhuratWindow } from "./types";

const KEY = "muhurat-saved-v1";
const MAX = 40;

export interface SavedMuhurat {
  /** event + place + start instant: one saved entry per window. */
  id: string;
  eventId: string;
  eventLabel: string;
  place: MuhuratPlace;
  window: MuhuratWindow;
  savedAt: string;
}

export const savedId = (eventId: string, place: MuhuratPlace, w: Pick<MuhuratWindow, "startUtc">): string =>
  `${eventId}|${place.latitude.toFixed(3)},${place.longitude.toFixed(3)}|${w.startUtc}`;

const valid = (x: unknown): x is SavedMuhurat => {
  const s = x as SavedMuhurat;
  return !!s && typeof s.id === "string" && typeof s.eventLabel === "string" && !!s.place && typeof s.place.timezone === "string" && !!s.window && typeof s.window.startUtc === "string" && typeof s.window.date === "string";
};

const read = (): SavedMuhurat[] => {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(v) ? v.filter(valid).slice(0, MAX) : [];
  } catch {
    return [];
  }
};

/**
 * Saved Muhurats live only in this browser: MyBhagya has no table for them, and adding one is a database change. Nothing is
 * sent to the server or attached to the account, and the page says so.
 */
export function useSavedMuhurats() {
  const [saved, setSaved] = useState<SavedMuhurat[]>(read);
  useEffect(() => {
    const onStorage = (e: StorageEvent) => { if (e.key === KEY) setSaved(read()); };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);
  const write = (next: SavedMuhurat[]) => { try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* private mode: lasts for this visit only */ } };
  const toggle = useCallback((entry: Omit<SavedMuhurat, "savedAt">) => {
    setSaved((cur) => {
      const next = cur.some((s) => s.id === entry.id) ? cur.filter((s) => s.id !== entry.id) : [{ ...entry, savedAt: new Date().toISOString() }, ...cur].slice(0, MAX);
      write(next);
      return next;
    });
  }, []);
  const remove = useCallback((id: string) => {
    setSaved((cur) => { const next = cur.filter((s) => s.id !== id); write(next); return next; });
  }, []);
  return { saved, toggle, remove, isSaved: (id: string) => saved.some((s) => s.id === id) };
}
