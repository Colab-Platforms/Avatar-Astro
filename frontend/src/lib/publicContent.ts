import { useEffect, useState } from "react";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export interface PublicContentItem {
  id: string;
  type: "BANNER" | "ANNOUNCEMENT" | "FAQ" | "ARTICLE";
  title: string;
  body: string;
  linkUrl: string | null;
  imageUrl: string | null;
}

let cached: PublicContentItem[] | null = null;
let inflight: Promise<PublicContentItem[]> | null = null;

/** Only same-site paths or http(s) links are ever rendered as hrefs. */
export function safeHref(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith("/") && !url.startsWith("//")) return url;
  try {
    const u = new URL(url);
    return u.protocol === "https:" || u.protocol === "http:" ? url : null;
  } catch {
    return null;
  }
}

function load(): Promise<PublicContentItem[]> {
  if (cached) return Promise.resolve(cached);
  inflight ??= fetch(`${API}/public/content`)
    .then((r) => (r.ok ? r.json() : null))
    .then((b) => (cached = Array.isArray(b?.data) ? (b.data as PublicContentItem[]) : []))
    .catch(() => (cached = []))
    .finally(() => { inflight = null; });
  return inflight;
}

/** Published content from the admin panel. Failure or an empty list simply renders nothing extra. */
export function usePublicContent(type: PublicContentItem["type"]): PublicContentItem[] {
  const [items, setItems] = useState<PublicContentItem[]>(() => (cached ?? []).filter((i) => i.type === type));
  useEffect(() => {
    let live = true;
    load().then((all) => live && setItems(all.filter((i) => i.type === type)));
    return () => { live = false; };
  }, [type]);
  return items;
}
