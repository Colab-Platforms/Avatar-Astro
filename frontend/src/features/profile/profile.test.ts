import { describe, expect, it } from "vitest";
import { buildSavePatch, fromPlaceResult, hasNeed, missingNeeds, pendingSave, splitName, toPlaceResult, type CentralProfile, type EnteredDetails } from "./profile";

const pune = { name: "Pune", admin1: "Maharashtra", country: "India", latitude: 18.5204, longitude: 73.8567, timezone: "Asia/Kolkata" };
const full: CentralProfile = { fullName: "Asha Rao", firstName: "Asha", lastName: "Rao", email: "a@example.test", phone: null, gender: "Female", dateOfBirth: "1990-05-17", birthTime: "06:45", birthTimeUnknown: false, birthPlace: pune, preferredLanguage: null, birthDetailsUpdatedAt: null };
const blank: EnteredDetails = { fullName: "", gender: "", dateOfBirth: "", birthTime: "", birthTimeUnknown: false, birthPlace: null };
const typed = (o: Partial<EnteredDetails> = {}): EnteredDetails => ({ fullName: "Asha Rao", gender: "Female", dateOfBirth: "1990-05-17", birthTime: "06:45", birthTimeUnknown: false, birthPlace: toPlaceResult(pune), ...o });
const ALL = ["name", "gender", "dateOfBirth", "birthTime", "birthPlace"] as const;

describe("what the profile already satisfies", () => {
  it("a complete profile has nothing missing", () => expect(missingNeeds(full, ALL)).toEqual([]));
  it("no profile means everything is missing (nothing is assumed)", () => {
    expect(missingNeeds(null, ALL)).toEqual([...ALL]);
    expect(missingNeeds(undefined, ["name"])).toEqual(["name"]);
  });
  it("only the gap is reported: birthplace missing, the rest present", () => expect(missingNeeds({ ...full, birthPlace: null }, ALL)).toEqual(["birthPlace"]));
  it("'I don't know my birth time' counts as an answer, a blank does not", () => {
    expect(hasNeed({ ...full, birthTime: null, birthTimeUnknown: true }, "birthTime")).toBe(true);
    expect(hasNeed({ ...full, birthTime: null, birthTimeUnknown: false }, "birthTime")).toBe(false);
  });
  it("a one-letter name is not a name", () => expect(hasNeed({ ...full, fullName: "A" }, "name")).toBe(false));
  it("only the needs a feature lists matter (a tarot-style feature ignores birth details)", () => expect(missingNeeds({ ...full, birthPlace: null, dateOfBirth: null }, ["name"])).toEqual([]));
});

describe("birthplace conversion keeps exact coordinates", () => {
  it("round-trips without altering latitude, longitude or time zone", () => {
    const p = toPlaceResult(pune)!;
    expect(p.label).toBe("Pune, Maharashtra, India");
    expect(fromPlaceResult(p)).toEqual(pune);
  });
  it("no saved place -> null", () => expect(toPlaceResult(null)).toBeNull());
});

describe("splitName", () => {
  it("first word is the first name, the rest the last name", () => {
    expect(splitName("  Asha   Kumari  Rao ")).toEqual({ firstName: "Asha", lastName: "Kumari Rao" });
    expect(splitName("Asha")).toEqual({ firstName: "Asha", lastName: null });
  });
});

describe("pendingSave: never silently overwrite", () => {
  it("identical to the profile -> nothing to save", () => expect(pendingSave(full, typed(), ALL)).toEqual({ added: [], changed: [] }));
  it("a value for a missing field is an addition", () => expect(pendingSave({ ...full, birthPlace: null }, typed(), ALL)).toEqual({ added: ["birthPlace"], changed: [] }));
  it("a different value for a saved field is a change, reported separately", () => {
    expect(pendingSave(full, typed({ birthTime: "07:00" }), ALL)).toEqual({ added: [], changed: ["birthTime"] });
    expect(pendingSave(full, typed({ dateOfBirth: "1991-01-01" }), ALL).changed).toEqual(["dateOfBirth"]);
  });
  it("an empty field is never offered for saving", () => expect(pendingSave(null, blank, ALL)).toEqual({ added: [], changed: [] }));
  it("re-picking the same place is not a change; a different place is", () => {
    expect(pendingSave(full, typed({ birthPlace: toPlaceResult({ ...pune }) }), ALL).changed).toEqual([]);
    expect(pendingSave(full, typed({ birthPlace: toPlaceResult({ ...pune, name: "Mumbai", latitude: 19.07, longitude: 72.87 }) }), ALL).changed).toEqual(["birthPlace"]);
  });
  it("switching to 'time unknown' is a change of the saved time", () => expect(pendingSave(full, typed({ birthTimeUnknown: true, birthTime: "" }), ALL).changed).toEqual(["birthTime"]));
});

describe("buildSavePatch sends only what was asked for", () => {
  it("one need -> only that field", () => expect(buildSavePatch(["birthPlace"], typed())).toEqual({ birth: { birthPlace: pune }, account: {} }));
  it("time unknown clears the time", () => expect(buildSavePatch(["birthTime"], typed({ birthTimeUnknown: true, birthTime: "10:10" })).birth).toEqual({ birthTimeUnknown: true, birthTime: null }));
  it("name and gender go to the account, the rest to the birth profile", () => {
    const p = buildSavePatch(["name", "gender", "dateOfBirth"], typed());
    expect(p.account).toEqual({ firstName: "Asha", lastName: "Rao", gender: "Female" });
    expect(p.birth).toEqual({ dateOfBirth: "1990-05-17" });
  });
  it("no needs -> empty patch", () => expect(buildSavePatch([], typed())).toEqual({ birth: {}, account: {} }));
});
