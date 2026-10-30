import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import FullScreenLoader from "../FullScreenLoader";

const src = (rel: string) => readFileSync(join(__dirname, "..", "..", "..", rel), "utf8");

describe("one shared loader", () => {
  it("renders the orbital animation with a title, description and staged captions", () => {
    const { container } = render(<FullScreenLoader title="Reading Your Cards" description="Interpreting your spread…" steps={["One", "Two"]} />);
    expect(screen.getByTestId("feature-loader")).toBeInTheDocument();
    expect(container.querySelector(".orbital-loader")).not.toBeNull();
    expect(container.querySelectorAll(".orbital-ring").length).toBe(3);
    expect(screen.getByRole("status")).toHaveTextContent("Reading Your Cards");
    expect(container.querySelectorAll(".orbital-step").length).toBe(2);
  });

  it("every feature waits behind the shared loader, with no bespoke spinner left", () => {
    for (const page of [
      "pages/TarotExperience.tsx",
      "pages/BirthChart.tsx",
      "pages/CompatibilityChecker.tsx",
      "pages/InnerVoice.tsx",
      "pages/InnerVoiceWisdom.tsx",
      "pages/InnerVoiceChat.tsx",
      "pages/FutureLifePath.tsx",
    ]) {
      expect(src(page), page).toContain("<FullScreenLoader");
    }
    const tarot = src("pages/TarotExperience.tsx");
    expect(tarot).not.toContain("Akashic");
    expect(src("features/ratna/RatnaLoader.tsx")).toContain("OrbitalLoader");
  });
});
