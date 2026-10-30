import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

// useMainAdmin is MOCKED: these tests cover what the UI shows for each access outcome.
// (The real enforcement is the backend and is covered by the backend integration tests.)
const state = { isMain: false, denied: false, isLoading: false, error: null as Error | null };
vi.mock("./api", () => ({ useMainAdmin: () => state }));

import { MainOnly } from "./guards";

const show = () => render(<MemoryRouter><MainOnly><p>SECRET ADMIN CONTENT</p></MainOnly></MemoryRouter>);

describe("MainOnly guard", () => {
  beforeEach(() => Object.assign(state, { isMain: false, denied: false, isLoading: false, error: null }));

  it("renders the admin content only when the backend confirmed main-admin access", () => {
    state.isMain = true;
    show();
    expect(screen.getByText("SECRET ADMIN CONTENT")).toBeInTheDocument();
  });
  it("shows a loading state without rendering the content", () => {
    state.isLoading = true;
    show();
    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.queryByText("SECRET ADMIN CONTENT")).toBeNull();
  });
  it("blocks a denied user with a clear message", () => {
    state.denied = true;
    show();
    expect(screen.getByText("Main admin only")).toBeInTheDocument();
    expect(screen.queryByText("SECRET ADMIN CONTENT")).toBeNull();
  });
  it("fails closed on a verification error (never shows the content)", () => {
    state.error = new Error("network");
    show();
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.queryByText("SECRET ADMIN CONTENT")).toBeNull();
  });
  it("fails closed when access is simply not confirmed", () => {
    show();
    expect(screen.getByText("Main admin only")).toBeInTheDocument();
    expect(screen.queryByText("SECRET ADMIN CONTENT")).toBeNull();
  });
});
