import { useState } from "react";
import { GemIllustration } from "./GemIllustration";
import { ratnaImageSrc, stoneLabel } from "./ratnaCatalog";
import type { GemstoneInfo } from "./types";

/**
 * Real photograph of the Ratna in a fixed square frame (object-cover keeps every
 * stone the same size). If the file is missing or fails to load, the stylised
 * illustration is shown instead so the card never has a broken image.
 */
const RatnaImage = ({
  stone,
  className = "",
  priority = false,
}: {
  stone: Pick<GemstoneInfo, "key" | "name" | "colour" | "hindi" | "sanskrit">;
  className?: string;
  priority?: boolean;
}) => {
  const [failed, setFailed] = useState(false);
  const src = ratnaImageSrc(stone.key);
  const label = stoneLabel(stone);

  if (!src || failed) {
    return (
      <div
        data-testid="ratna-image-fallback"
        className={`flex aspect-square items-center justify-center overflow-hidden bg-[#F5E9D6] ${className}`}
      >
        <GemIllustration stone={stone as GemstoneInfo} size="62%" />
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={`${label} Ratna photograph`}
      width={640}
      height={640}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      onError={() => setFailed(true)}
      className={`aspect-square w-full bg-[#F5E9D6] object-cover ${className}`}
    />
  );
};

export default RatnaImage;
