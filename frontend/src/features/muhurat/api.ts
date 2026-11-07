import { authRequest } from "@/lib/authClient";
import type { MuhuratResult, MuhuratSearchRequest } from "./types";

// Stateless, but a search needs a signed-in user: the server returns 401 otherwise.
export const muhuratApi = {
  search(body: MuhuratSearchRequest) {
    return authRequest<MuhuratResult>("/gemstone-calculator/muhurat/search", { method: "POST", body });
  },
};
