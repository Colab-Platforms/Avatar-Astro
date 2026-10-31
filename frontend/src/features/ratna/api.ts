import { authRequest } from "@/lib/authClient";
import type {
  CalculateRequest,
  PlaceResult,
  RatnaResult,
  ShopMatches,
} from "./types";

// Searching places and matching shop products are public. Generating a result (calculate) needs a signed-in
// user: the server returns 401 otherwise, so the access token is sent (and refreshed once if it expired).
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
    });
  },

  products(stoneKey: string) {
    return authRequest<ShopMatches>(
      `/gemstone-calculator/products/${encodeURIComponent(stoneKey)}`,
      { skipAuth: true, sendTokenIfPresent: true },
    );
  },
};
