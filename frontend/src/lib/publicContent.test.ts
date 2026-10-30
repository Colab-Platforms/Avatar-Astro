import { describe, it, expect } from "vitest";
import { safeHref } from "./publicContent";

describe("safeHref (links published from the admin panel)", () => {
  it("allows same-site paths and http(s) URLs", () => {
    expect(safeHref("/blog")).toBe("/blog");
    expect(safeHref("https://example.com/x")).toBe("https://example.com/x");
  });
  it("rejects script, data and protocol-relative links", () => {
    expect(safeHref("javascript:alert(1)")).toBeNull();
    expect(safeHref("data:text/html,x")).toBeNull();
    expect(safeHref("//evil.example")).toBeNull();
    expect(safeHref("not a url")).toBeNull();
    expect(safeHref(null)).toBeNull();
    expect(safeHref("")).toBeNull();
  });
});
