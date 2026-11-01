import { authRequest } from "@/lib/authClient";
import type { KundaliRequest, KundaliResult } from "./types";

// Stateless (nothing is stored), but generating a result needs a signed-in user: the server returns 401 otherwise.
export const kundaliApi = {
  calculate(body: KundaliRequest) {
    return authRequest<KundaliResult>("/gemstone-calculator/kundali", { method: "POST", body });
  },
};
