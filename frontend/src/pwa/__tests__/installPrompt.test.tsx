import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import InstallPrompt from "../InstallPrompt";

const fire = (outcome: "accepted" | "dismissed" = "accepted") => {
  const e = new Event("beforeinstallprompt", { cancelable: true }) as Event & { prompt: ReturnType<typeof vi.fn>; userChoice: Promise<{ outcome: string }> };
  e.prompt = vi.fn(async () => {});
  e.userChoice = Promise.resolve({ outcome });
  act(() => { window.dispatchEvent(e); });
  return e;
};

beforeEach(() => {
  localStorage.clear();
  window.matchMedia = vi.fn().mockReturnValue({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }) as never;
});

describe("InstallPrompt", () => {
  it("shows nothing until the browser says the app can be installed", () => {
    render(<InstallPrompt />);
    expect(screen.queryByTestId("install-prompt")).toBeNull();
    fire();
    expect(screen.getByTestId("install-prompt")).toBeInTheDocument();
  });

  it("Install opens the browser's install dialog once and hides the bar", async () => {
    render(<InstallPrompt />);
    const e = fire();
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: /^install$/i })); });
    expect(e.prompt).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId("install-prompt")).toBeNull();
  });

  it("'Not now' hides it and it stays away on the next visit", () => {
    const first = render(<InstallPrompt />);
    fire();
    fireEvent.click(screen.getByRole("button", { name: /not now/i }));
    expect(screen.queryByTestId("install-prompt")).toBeNull();
    first.unmount();
    render(<InstallPrompt />);
    fire();
    expect(screen.queryByTestId("install-prompt")).toBeNull();
  });

  it("never shows inside the installed app", () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }) as never;
    render(<InstallPrompt />);
    fire();
    expect(screen.queryByTestId("install-prompt")).toBeNull();
  });

  it("still works when browser storage is blocked", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("blocked"); });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("blocked"); });
    render(<InstallPrompt />);
    fire();
    expect(screen.getByTestId("install-prompt")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /not now/i }));
    expect(screen.queryByTestId("install-prompt")).toBeNull();
    vi.restoreAllMocks();
  });
});
