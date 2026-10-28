import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import LocationPicker from "../LocationPicker";
import { ratnaApi } from "../api";
import type { PlaceResult } from "../types";

vi.mock("../api", () => ({
  ratnaApi: { searchLocations: vi.fn(), calculate: vi.fn(), products: vi.fn() },
}));
const search = vi.mocked(ratnaApi.searchLocations);

const place = (name: string, admin1: string): PlaceResult => ({
  id: name + admin1, name, admin1, country: "India", latitude: 19.36, longitude: 72.79,
  timezone: "Asia/Kolkata", label: `${name}, ${admin1}, India`,
});
const vasaiMh = place("Vasai", "Maharashtra");
const vasaiGj = place("Vasai", "Gujarat");

const Harness = ({ onSelect }: { onSelect?: (p: PlaceResult | null) => void }) => {
  const [v, setV] = useState<PlaceResult | null>(null);
  return <LocationPicker value={v} onSelect={(p) => { setV(p); onSelect?.(p); }} />;
};
const type = (t: string) => fireEvent.change(screen.getByRole("combobox"), { target: { value: t } });

beforeEach(() => vi.clearAllMocks());

describe("LocationPicker", () => {
  it("shows Vasai suggestions with region and country and selects with the mouse", async () => {
    search.mockResolvedValue([vasaiMh, vasaiGj]);
    const onSelect = vi.fn();
    render(<Harness onSelect={onSelect} />);
    type("Vasai");
    expect(await screen.findByRole("option", { name: "Vasai, Gujarat, India" })).toBeInTheDocument();
    fireEvent.mouseDown(screen.getByRole("option", { name: "Vasai, Maharashtra, India" }));
    expect(onSelect).toHaveBeenLastCalledWith(vasaiMh);
    expect(screen.getByText(/Selected: Vasai, Maharashtra, India \(Asia\/Kolkata\)/)).toBeInTheDocument();
  });

  it("selects with the keyboard", async () => {
    search.mockResolvedValue([vasaiMh, vasaiGj]);
    const onSelect = vi.fn();
    render(<Harness onSelect={onSelect} />);
    type("Vasai");
    await screen.findAllByRole("option");
    const box = screen.getByRole("combobox");
    fireEvent.keyDown(box, { key: "ArrowDown" });
    fireEvent.keyDown(box, { key: "ArrowDown" });
    fireEvent.keyDown(box, { key: "Enter" });
    expect(onSelect).toHaveBeenLastCalledWith(vasaiGj);
  });

  it("debounces: rapid typing sends one request, and one-character queries send none", async () => {
    search.mockResolvedValue([vasaiMh]);
    render(<Harness />);
    type("V");
    type("Va");
    type("Vas");
    type("Vasai");
    await screen.findByRole("option");
    expect(search).toHaveBeenCalledTimes(1);
    expect(search.mock.calls[0][0]).toBe("Vasai");
    search.mockClear();
    type("M");
    await new Promise((r) => setTimeout(r, 500));
    expect(search).not.toHaveBeenCalled();
  });

  it("aborts the previous request and ignores a stale response", async () => {
    let resolveOld!: (v: PlaceResult[]) => void;
    const signals: AbortSignal[] = [];
    search.mockImplementationOnce((_q, s) => { signals.push(s!); return new Promise((r) => (resolveOld = r)); });
    search.mockImplementationOnce(async (_q, s) => { signals.push(s!); return [place("Mumbai", "Maharashtra")]; });
    render(<Harness />);
    type("Vasai");
    await waitFor(() => expect(search).toHaveBeenCalledTimes(1));
    type("Mumbai");
    expect(await screen.findByRole("option", { name: "Mumbai, Maharashtra, India" })).toBeInTheDocument();
    expect(signals[0].aborted).toBe(true);
    resolveOld([vasaiMh]); // late, stale answer
    await new Promise((r) => setTimeout(r, 50));
    expect(screen.queryByRole("option", { name: /Vasai/ })).toBeNull();
  });

  it("shows a clear no-results state", async () => {
    search.mockResolvedValue([]);
    render(<Harness />);
    type("Zzzzqq");
    expect(await screen.findByText(/No places found/)).toBeInTheDocument();
  });

  it("shows the provider error with a working Retry", async () => {
    search.mockRejectedValueOnce(Object.assign(new Error("Location search is busy or unreachable right now. Please try again in a moment."), { status: 503 }));
    search.mockResolvedValueOnce([vasaiMh]);
    render(<Harness />);
    type("Vasai");
    expect(await screen.findByText(/busy or unreachable/)).toBeInTheDocument();
    fireEvent.mouseDown(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByRole("option", { name: "Vasai, Maharashtra, India" })).toBeInTheDocument();
  });

  it("explains a server that lacks the endpoint (404)", async () => {
    search.mockRejectedValue(Object.assign(new Error("Unexpected response from server."), { status: 404 }));
    render(<Harness />);
    type("Vasai");
    expect(await screen.findByText(/not available on the server you are connected to/)).toBeInTheDocument();
  });

  it("editing after a selection clears the confirmed place", async () => {
    search.mockResolvedValue([vasaiMh]);
    const onSelect = vi.fn();
    render(<Harness onSelect={onSelect} />);
    type("Vasai");
    fireEvent.mouseDown(await screen.findByRole("option"));
    type("Vasa");
    expect(onSelect).toHaveBeenLastCalledWith(null);
    expect(screen.queryByText(/Selected:/)).toBeNull();
  });
});
