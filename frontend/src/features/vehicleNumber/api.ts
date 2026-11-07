import { authRequest } from "@/lib/authClient";
import type { VehicleProfileRequest, VehicleProfileResult } from "./types";

// Stateless, but generating a result needs a signed-in user: the server returns 401 otherwise.
export const vehicleNumberApi = {
  profile(body: VehicleProfileRequest) {
    return authRequest<VehicleProfileResult>("/gemstone-calculator/vehicle-number", { method: "POST", body });
  },
};
