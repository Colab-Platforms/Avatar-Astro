import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

// The network is MOCKED; this checks rendering of what the public API returns.
const items = [
  { id: "a1", type: "ANNOUNCEMENT", title: "Diwali hours", body: "Open all week", linkUrl: "javascript:alert(1)", imageUrl: null },
  { id: "f1", type: "FAQ", title: "Q?", body: "A.", linkUrl: null, imageUrl: null },
];

describe("AnnouncementBar", () => {
  beforeEach(() => {
    vi.resetModules();
    sessionStorage.clear();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ success: true, data: items }) }));
  });

  it("shows the published announcement, never renders an unsafe link, and can be dismissed", async () => {
    const { default: AnnouncementBar } = await import("./AnnouncementBar");
    render(<MemoryRouter><AnnouncementBar /></MemoryRouter>);
    await waitFor(() => expect(screen.getByText("Diwali hours")).toBeInTheDocument());
    expect(screen.queryByRole("link")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /dismiss/i }));
    expect(screen.queryByText("Diwali hours")).toBeNull();
  });

  it("renders nothing when the API fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("down")));
    const { default: AnnouncementBar } = await import("./AnnouncementBar");
    const { container } = render(<MemoryRouter><AnnouncementBar /></MemoryRouter>);
    await new Promise((r) => setTimeout(r, 50));
    expect(container.firstChild).toBeNull();
  });
});
