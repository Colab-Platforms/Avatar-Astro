import { authRequest } from "@/lib/authClient";
import type {
  CalculateRequest,
  PlaceResult,
  RatnaResult,
  ShopMatches,
} from "./types";

// Public, stateless endpoints. A signed-in visitor's token is sent so their activity is attributed to them (the server ignores it
// for access decisions and never rejects on it), without any refresh round-trips.
export const ratnaApi = {
  searchLocations(q: string, signal?: AbortSignal) {
    return authRequest<PlaceResult[]>(
      `/gemstone-calculator/locations?q=${encodeURIComponent(q)}`,
      { skipAuth: true, sendTokenIfPresent: true, signal },
    );
  },

  calculate(body: CalculateRequest) {
    return authRequest<RatnaResult>("/gemstone-calculator/calculate", {
      method: "POST",
      body,
      skipAuth: true,
      sendTokenIfPresent: true,
    });
  },

  products(stoneKey: string) {
    return authRequest<ShopMatches>(
      `/gemstone-calculator/products/${encodeURIComponent(stoneKey)}`,
      { skipAuth: true, sendTokenIfPresent: true },
    );
  },
};
