import { describe, it, expect, vi, beforeEach } from "vitest";

// Public gemstone endpoints must send the signed-in visitor's token (so activity is attributed to them) without ever
// refreshing or signing out on a response, and must send nothing for anonymous visitors.
const authRequest = vi.fn();
vi.mock("@/lib/authClient", () => ({ authRequest: (...a: unknown[]) => authRequest(...a) }));

import { ratnaApi } from "./api";
import { kundaliApi } from "../kundali/api";

beforeEach(() => { authRequest.mockReset(); authRequest.mockResolvedValue({}); });

describe("gemstone API calls", () => {
  it("the public lookups send the token when present and never refresh", async () => {
    await ratnaApi.searchLocations("pune");
    await ratnaApi.products("ruby");
    expect(authRequest).toHaveBeenCalledTimes(2);
    for (const [, opts] of authRequest.mock.calls) {
      expect(opts).toMatchObject({ skipAuth: true, sendTokenIfPresent: true });
    }
  });

  it("the result-generating calls are authenticated (the server answers 401 without a token) and refresh an expired one", async () => {
    await ratnaApi.calculate({} as never);
    await kundaliApi.calculate({} as never);
    expect(authRequest).toHaveBeenCalledTimes(2);
    for (const [, opts] of authRequest.mock.calls) {
      expect(opts).not.toHaveProperty("skipAuth");
      expect(opts).toMatchObject({ method: "POST" });
    }
  });
});
