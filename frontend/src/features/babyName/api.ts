import { authRequest } from "@/lib/authClient";
import type { BabyNameRequest, BabyNameResult } from "./types";

// Stateless, but generating a result needs a signed-in user: the server returns 401 otherwise.
export const babyNameApi = {
  calculate(body: BabyNameRequest) {
    return authRequest<BabyNameResult>("/gemstone-calculator/baby-name", { method: "POST", body });
  },
};
