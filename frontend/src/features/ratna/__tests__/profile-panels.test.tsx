import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ResultView } from "../ResultView";
import type { PanchangDetails, RatnaResult } from "../types";
import { complete, dateBased, emptyShop } from "./fixtures";
import { ratnaApi } from "../api";

vi.mock("../api", () => ({
  ratnaApi: { searchLocations: vi.fn(), calculate: vi.fn(), products: vi.fn() },
}));

const panchang: PanchangDetails = {
  convention: { id: "amanta-chaitradi", label: "Amanta months · Vikram Samvat (Chaitradi) · Lahiri sidereal", note: "Months run new moon to new moon." },
  basis: "birth-time",
  reckonedAtUtc: "2025-04-06T04:30:00.000Z",
  vikramSamvat: 2082,
  masa: { name: "Chaitra", hindi: "चैत्र", adhika: false },
  purnimantaMasa: { name: "Chaitra", hindi: "चैत्र", adhika: false },
  paksha: "shukla",
  tithi: {
    number: 9,
    numberInPaksha: 9,
    name: "Navami",
    hindi: "नवमी",
    startLocal: "Sat, 5 Apr 2025, 19:26",
    endLocal: "Sun, 6 Apr 2025, 19:22",
    startUtc: "2025-04-05T13:56:00.000Z",
    endUtc: "2025-04-06T13:52:00.000Z",
  },
  nakshatra: { name: "Ashlesha", pada: 2, lord: "Mercury" },
  moonRashi: "Cancer",
  yoga: "Shula",
  karana: "Taitila",
  vara: { name: "Sunday", note: null },
  sunrise: "06:00",
  sunset: "18:40",
  uncertain: false,
  uncertainties: [],
  notes: [],
};

const withExtras = (base: RatnaResult): RatnaResult => ({
  ...base,
  profile: { fullName: "Asha Verma", gender: "Female", weightKg: 58 },
  panchang,
  audit: {
    localDate: "2025-04-06",
    resolvedInstantUtc: "2025-04-06T04:30:00.000Z",
    utcOffsetMinutes: 330,
    timeZone: "Asia/Kolkata",
    latitude: 28.6,
    longitude: 77.2,
    ayanamsa: "Lahiri (Chitrapaksha), mean",
    ayanamsaDegrees: 24.2,
  },
  wearing: base.wearing && {
    ...base.wearing,
    weight: {
      weightKg: 58,
      rattiApprox: 5.8,
      caratApprox: 5.3,
      text: "A commonly quoted traditional rule of thumb.",
      disclaimer: "This is traditional guidance only. It is not a scientific formula.",
    },
  },
});

const show = (r: RatnaResult) => {
  vi.mocked(ratnaApi.products).mockResolvedValue(emptyShop);
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter>
        <ResultView result={r} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
};

describe("results: profile, calculated Panchang, weight and limitations", () => {
  it("shows the entered profile and the calculated Panchang details", () => {
    show(withExtras(complete));
    const profile = screen.getByTestId("ratna-profile");
    expect(within(profile).getByText("Asha Verma")).toBeInTheDocument();
    expect(within(profile).getByText("58 kg")).toBeInTheDocument();
    const p = screen.getByTestId("ratna-panchang");
    expect(within(p).getByText("2082")).toBeInTheDocument();
    expect(screen.getByTestId("panchang-tithi")).toHaveTextContent("Navami (नवमी)");
    expect(within(p).getByText(/Chaitra \(चैत्र\)/)).toBeInTheDocument();
    expect(within(p).getByText("Shukla (शुक्ल)")).toBeInTheDocument();
    expect(within(p).getByText(/Ashlesha, pada 2/)).toBeInTheDocument();
    expect(within(p).getByText("Cancer")).toBeInTheDocument();
    expect(screen.getByTestId("panchang-convention")).toHaveTextContent("Amanta");
    expect(screen.queryByTestId("panchang-uncertain")).toBeNull();
    expect(screen.queryByTestId("panchang-purnimanta")).toBeNull(); // same name in both systems
    expect(screen.getByTestId("ratna-rashi")).toBeInTheDocument();
  });

  it("shows the Purnimanta name when it differs", () => {
    show({ ...withExtras(complete), panchang: { ...panchang, paksha: "krishna", purnimantaMasa: { name: "Vaishakha", hindi: "वैशाख", adhika: false } } });
    expect(screen.getByTestId("panchang-purnimanta")).toHaveTextContent("Vaishakha");
  });

  it("flags time-dependent Panchang elements as uncertain when the birth time is unknown", () => {
    const unsure: PanchangDetails = {
      ...panchang,
      basis: "sunrise",
      uncertain: true,
      uncertainties: ["Tithi changes during this date (shukla 9 to shukla 10); the exact value needs your birth time."],
      notes: ["Birth time is unknown, so the Panchang is reckoned at local sunrise on your birth date."],
    };
    show({ ...withExtras(dateBased), panchang: unsure });
    expect(screen.getByTestId("panchang-uncertain")).toHaveTextContent(/Tithi changes/);
  });

  it("labels weight guidance as traditional", () => {
    show(withExtras(complete));
    const g = screen.getByTestId("ratna-weight-guidance");
    expect(g).toHaveTextContent("58 kg");
    expect(g).toHaveTextContent(/traditional guidance only/i);
    expect(g).toHaveTextContent(/not a scientific formula/i);
  });

  it("omits profile and weight guidance when absent", () => {
    show(complete);
    expect(screen.queryByTestId("ratna-weight-guidance")).toBeNull();
    expect(screen.queryByTestId("ratna-profile")).toBeNull();
    expect(screen.queryByTestId("ratna-panchang")).toBeNull();
  });

  it("unknown birth time lists what is not calculated and shows no Lagna", () => {
    show(withExtras(dateBased));
    const l = screen.getByTestId("ratna-limitations");
    expect(l).toHaveTextContent(/none is assumed/i);
    expect(l).toHaveTextContent(/Lagna \(Ascendant\) and the twelve houses/);
    expect(screen.getByTestId("ratna-rashi")).not.toHaveTextContent(/Lagna \(Ascendant\)/);
  });
});
