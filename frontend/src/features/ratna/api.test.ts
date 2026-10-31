import { describe, it, expect, vi, beforeEach } from "vitest";

// Public gemstone endpoints must send the signed-in visitor's token (so activity is attributed to them) without ever
// refreshing or signing out on a response, and must send nothing for anonymous visitors.
const authRequest = vi.fn();
vi.mock("@/lib/authClient", () => ({ authRequest: (...a: unknown[]) => authRequest(...a) }));

import { ratnaApi } from "./api";
import { kundaliApi } from "../kundali/api";

beforeEach(() => { authRequest.mockReset(); authRequest.mockResolvedValue({}); });

describe("public gemstone API calls", () => {
  it("ask the client to send the token when present, on every call, and never to refresh", async () => {
    await ratnaApi.searchLocations("pune");
    await ratnaApi.calculate({} as never);
    await ratnaApi.products("ruby");
    await kundaliApi.calculate({} as never);
    expect(authRequest).toHaveBeenCalledTimes(4);
    for (const [, opts] of authRequest.mock.calls) {
      expect(opts).toMatchObject({ skipAuth: true, sendTokenIfPresent: true });
    }
  });
});
