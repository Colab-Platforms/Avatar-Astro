import { useId } from "react";
import type { GemstoneInfo } from "./types";

export const GemIllustration = ({ stone, size = 120 }: { stone: GemstoneInfo; size?: number | string }) => {
  const uid = useId().replace(/:/g, "");
  return (
    <svg role="img" aria-label={`${stone.name} illustration`} width={size} height={size} viewBox="0 0 120 120">
      <defs>
        <linearGradient id={`${uid}-g`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.55" />
          <stop offset="0.45" stopColor={stone.colour} />
          <stop offset="1" stopColor="#000000" stopOpacity="0.45" />
        </linearGradient>
      </defs>
      <polygon points="30,38 90,38 108,58 60,108 12,58" fill={stone.colour} stroke="#B9722F" strokeWidth="2" />
      <polygon points="30,38 90,38 108,58 60,108 12,58" fill={`url(#${uid}-g)`} opacity="0.7" />
      <polygon points="30,38 60,58 12,58" fill="#ffffff" opacity="0.22" />
      <polygon points="90,38 60,58 108,58" fill="#000000" opacity="0.14" />
      <polygon points="60,58 108,58 60,108" fill="#000000" opacity="0.22" />
      <polygon points="12,58 60,58 60,108" fill="#ffffff" opacity="0.08" />
      <polygon points="30,38 60,14 90,38" fill={stone.colour} stroke="#B9722F" strokeWidth="2" opacity="0.9" />
      <polygon points="30,38 60,14 60,38" fill="#ffffff" opacity="0.2" />
    </svg>
  );
};
