import { authRequest } from "@/lib/authClient";
import type { KundaliRequest, KundaliResult } from "./types";

// Public, stateless endpoint (nothing is stored), like the Ratna Jyotish calculation.
export const kundaliApi = {
  calculate(body: KundaliRequest) {
    return authRequest<KundaliResult>("/gemstone-calculator/kundali", { method: "POST", body, skipAuth: true });
  },
};
