import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { usePrefill } from "./usePrefill";
import { toPlaceResult, type CentralProfile } from "./profile";

const hook = vi.hoisted(() => ({ profile: null as unknown, save: vi.fn() }));
vi.mock("./useUserProfile", () => ({ useUserProfile: () => ({ profile: hook.profile, save: hook.save }) }));

const pune = { name: "Pune", admin1: "Maharashtra", country: "India", latitude: 18.5204, longitude: 73.8567, timezone: "Asia/Kolkata" };
const saved = (o: Partial<CentralProfile> = {}): CentralProfile => ({ fullName: "Asha Rao", firstName: "Asha", lastName: "Rao", email: "a@example.test", phone: null, gender: "Female", dateOfBirth: "1990-05-17", birthTime: "06:45", birthTimeUnknown: false, birthPlace: pune, preferredLanguage: null, birthDetailsUpdatedAt: null, ...o });

// A tiny form that uses the hook the way the real ones do.
function Demo({ initialDob = "" }: { initialDob?: string }) {
  const [dob, setDob] = useState(initialDob);
  const [time, setTime] = useState("");
  const [placeLabel, setPlaceLabel] = useState("");
  const { saveNew } = usePrefill(["dateOfBirth", "birthTime", "birthPlace"], (p) => {
    if (p.dateOfBirth) setDob((v) => v || p.dateOfBirth!);
    if (p.birthTime) setTime((v) => v || p.birthTime!);
    if (p.birthPlace) setPlaceLabel((v) => v || toPlaceResult(p.birthPlace)!.label);
  });
  return (
    <form onSubmit={(e) => { e.preventDefault(); saveNew({ fullName: "", gender: "", dateOfBirth: dob, birthTime: time, birthTimeUnknown: false, birthPlace: placeLabel ? toPlaceResult(pune) : null }); }}>
      <input aria-label="dob" value={dob} onChange={(e) => setDob(e.target.value)} />
      <input aria-label="time" value={time} onChange={(e) => setTime(e.target.value)} />
      <input aria-label="place" value={placeLabel} onChange={(e) => setPlaceLabel(e.target.value)} />
      <button>go</button>
    </form>
  );
}

beforeEach(() => { vi.clearAllMocks(); hook.profile = null; hook.save.mockResolvedValue(undefined); });

describe("usePrefill", () => {
  it("fills empty fields from the saved profile on the second use", () => {
    hook.profile = saved();
    render(<Demo />);
    expect(screen.getByLabelText("dob")).toHaveValue("1990-05-17");
    expect(screen.getByLabelText("time")).toHaveValue("06:45");
    expect(screen.getByLabelText("place")).toHaveValue("Pune, Maharashtra, India");
  });

  it("fills in when the profile arrives after the form is already on screen", () => {
    const { rerender } = render(<Demo />);
    expect(screen.getByLabelText("dob")).toHaveValue("");
    hook.profile = saved();
    rerender(<Demo />);
    expect(screen.getByLabelText("dob")).toHaveValue("1990-05-17");
  });

  it("never overwrites something already typed or restored", () => {
    hook.profile = saved();
    render(<Demo initialDob="2001-02-03" />);
    expect(screen.getByLabelText("dob")).toHaveValue("2001-02-03");
  });

  it("leaves fields empty when nothing is saved (nothing is invented)", () => {
    hook.profile = saved({ dateOfBirth: null, birthTime: null, birthPlace: null });
    render(<Demo />);
    expect(screen.getByLabelText("dob")).toHaveValue("");
    expect(screen.getByLabelText("place")).toHaveValue("");
  });

  it("first use: saves what was entered for the details that were missing", async () => {
    hook.profile = saved({ dateOfBirth: null, birthTime: null, birthPlace: null });
    render(<Demo />);
    fireEvent.change(screen.getByLabelText("dob"), { target: { value: "1992-01-02" } });
    fireEvent.change(screen.getByLabelText("time"), { target: { value: "10:15" } });
    fireEvent.change(screen.getByLabelText("place"), { target: { value: "Pune" } });
    fireEvent.click(screen.getByText("go"));
    await waitFor(() => expect(hook.save).toHaveBeenCalledTimes(1));
    expect(hook.save.mock.calls[0][0]).toEqual({ birth: { dateOfBirth: "1992-01-02", birthTimeUnknown: false, birthTime: "10:15", birthPlace: pune }, account: {} });
  });

  it("does not replace a saved value with a different one, and saves nothing when nothing is new", () => {
    hook.profile = saved();
    render(<Demo />);
    fireEvent.change(screen.getByLabelText("time"), { target: { value: "09:00" } });
    fireEvent.click(screen.getByText("go"));
    expect(hook.save).not.toHaveBeenCalled();
  });
});
