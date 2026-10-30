import { useEffect } from "react";
import type { FeatureMeta } from "@/data/featureCatalog";

/** Sets the browser tab title and meta description from the shared feature catalog, restoring them on unmount. */
export const useFeatureTitle = (feature: FeatureMeta): void => {
  useEffect(() => {
    const prevTitle = document.title;
    const meta = document.querySelector('meta[name="description"]');
    const prevDesc = meta?.getAttribute("content");
    document.title = `${feature.name} | MyBhagya`;
    meta?.setAttribute("content", feature.subtitle);
    return () => {
      document.title = prevTitle;
      if (meta && prevDesc != null) meta.setAttribute("content", prevDesc);
    };
  }, [feature]);
};
