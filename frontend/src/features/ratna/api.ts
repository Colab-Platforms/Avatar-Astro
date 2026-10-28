import { authRequest } from "@/lib/authClient";
import type {
  CalculateRequest,
  PlaceResult,
  RatnaResult,
  ShopMatches,
} from "./types";

// Public, stateless endpoints — no auth header, so no refresh round-trips.
export const ratnaApi = {
  searchLocations(q: string, signal?: AbortSignal) {
    return authRequest<PlaceResult[]>(
      `/gemstone-calculator/locations?q=${encodeURIComponent(q)}`,
      { skipAuth: true, signal },
    );
  },

  calculate(body: CalculateRequest) {
    return authRequest<RatnaResult>("/gemstone-calculator/calculate", {
      method: "POST",
      body,
      skipAuth: true,
    });
  },

  products(stoneKey: string) {
    return authRequest<ShopMatches>(
      `/gemstone-calculator/products/${encodeURIComponent(stoneKey)}`,
      { skipAuth: true },
    );
  },
};
