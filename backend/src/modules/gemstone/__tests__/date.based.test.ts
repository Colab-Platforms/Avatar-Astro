import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { calculateRatna, parseInput, DATE_METHOD, ValidationError } from "../gemstone.service.js";
import { BirthTimeError } from "../birth.time.js";
import { localWeekdayIndex, selectByBirthDate, sunriseOnLocalDate, WEEKDAY_TABLE } from "../date.based.js";
import {
  buildDateRuleExplanation,
  generateDateExplanation,
  validateDateExplanation,
  type DateExplanationContext,
} from "../explanation.service.js";
import { GEMSTONES, STONE_FOR_PLANET } from "../gemstone.catalogue.js";

const delhi = { name: "New Delhi", admin1: "Delhi", country: "India", latitude: 28.6139, longitude: 77.209, timezone: "Asia/Kolkata" };
const auckland = { name: "Auckland", admin1: "Auckland", country: "New Zealand", latitude: -36.85, longitude: 174.76, timezone: "Pacific/Auckland" };
const tromso = { name: "Tromsø", admin1: "Troms", country: "Norway", latitude: 69.65, longitude: 18.96, timezone: "Europe/Oslo" };

const unknown = (dateOfBirth: string, place: typeof delhi = delhi) =>
  parseInput({ dateOfBirth, timeOfBirth: null, timeUnknown: true, place });

beforeEach(() => {
  delete process.env.GROQ_API_KEY;
});

describe("local weekday", () => {
  test("matches independently known dates", () => {
    const day = (y: number, m: number, d: number) => localWeekdayIndex({ year: y, month: m, day: d });
    assert.equal(day(1947, 8, 15), 5); // Friday
    assert.equal(day(1969, 7, 20), 0); // Sunday
    assert.equal(day(2000, 1, 1), 6); // Saturday
    assert.equal(day(2024, 2, 29), 4); // Thursday (leap day)
    assert.equal(day(1999, 12, 31), 5); // Friday
  });
});

describe("Birth-Date & Place method: gemstone selection", () => {
  test("each weekday selects its documented planet and stone", async () => {
    // 2–8 January 2000 is Sunday..Saturday
    const expected = [
      ["Sunday", "Sun", "ruby"],
      ["Monday", "Moon", "pearl"],
      ["Tuesday", "Mars", "red-coral"],
      ["Wednesday", "Mercury", "emerald"],
      ["Thursday", "Jupiter", "yellow-sapphire"],
      ["Friday", "Venus", "diamond"],
      ["Saturday", "Saturn", "blue-sapphire"],
    ] as const;
    for (let i = 0; i < 7; i++) {
      const r = await calculateRatna(unknown(`2000-01-0${i + 2}`));
      const [weekday, planet, stone] = expected[i];
      assert.equal(r.status, "date_based");
      assert.equal(r.dateBased?.weekday, weekday);
      assert.equal(r.dateBased?.weekdayLord, planet);
      assert.equal(r.primary.planet, planet);
      assert.equal(r.primary.stone.key, stone);
      assert.equal(r.primary.basis, "birth-weekday");
    }
  });

  test("the published table is the same mapping", () => {
    assert.deepEqual(
      WEEKDAY_TABLE.map((r) => [r.weekday, r.planet, r.stone]),
      [
        ["Sunday", "Sun", "Ruby"],
        ["Monday", "Moon", "Pearl"],
        ["Tuesday", "Mars", "Red Coral"],
        ["Wednesday", "Mercury", "Emerald"],
        ["Thursday", "Jupiter", "Yellow Sapphire"],
        ["Friday", "Venus", "Diamond or White Sapphire"],
        ["Saturday", "Saturn", "Blue Sapphire"],
      ],
    );
  });

  test("is not rejected because the time is unknown, and is labelled correctly", async () => {
    const r = await calculateRatna(unknown("1947-08-15"));
    assert.equal(r.status, "date_based");
    assert.equal(r.method.name, "Birth-Date & Place Gemstone Method");
    assert.equal(r.method.id, "birth-date-place");
    assert.equal(r.dateBased?.weekday, "Friday");
    assert.equal(r.primary.stone.key, "diamond");
    assert.ok(r.wearing); // wearing guidance is available
    assert.equal(r.wearing?.weekday, "Friday");
    assert.deepEqual(r.dateBased?.table, WEEKDAY_TABLE);
    assert.equal(r.birth.timeOfBirth, null);
  });

  test("never fabricates an Ascendant, houses or the Lagna-lord recommendation", async () => {
    const r = await calculateRatna(unknown("1990-05-05"));
    assert.equal(r.chart, null);
    assert.equal(r.recommendation, null);
    const everything = JSON.stringify([r.primary, r.dateBased, r.explanation.text]);
    assert.doesNotMatch(r.primary.summary, /ascendant|lagna|house/i);
    assert.doesNotMatch(JSON.stringify(r.primary.factors), /ascendant|lagna|house/i);
    assert.match(r.explanation.text, /no Ascendant or houses were used/);
    assert.ok(everything.length > 0);
    assert.match(DATE_METHOD.houses, /Not calculated/);
  });

  test("the stable-sign context is real: Sun on 2 Jan 2000 is sidereal Sagittarius all day", async () => {
    const r = await calculateRatna(unknown("2000-01-02")); // Sunday
    assert.equal(r.dateBased?.weekdayLordSign, "Sagittarius");
    assert.ok(r.primary.factors.some((f) => f.label === "Sun on that date" && /Sagittarius/.test(f.value)));
  });

  test("a weekday lord that changes sign during the date is not reported as stable", () => {
    // The Moon was in Libra all of 1 Jan 2000 (stable); find a date where it is not by scanning.
    let found = false;
    for (let d = 1; d <= 28 && !found; d++) {
      const sel = selectByBirthDate({ year: 2000, month: 2, day: d }, delhi);
      if (sel.weekday === "Monday" && sel.weekdayLordSign === null) found = true;
    }
    // Monday dates in Feb 2000 are 7, 14, 21, 28; the Moon changes sign about every 2.3 days,
    // so at least one of them must show a sign change within the day.
    assert.ok(found);
  });
});

describe("birthplace and time zone", () => {
  test("weekday follows the local date, not the UTC date (Auckland sunrise is the previous UTC day)", async () => {
    const r = await calculateRatna(unknown("2000-01-02", auckland)); // Sunday locally
    assert.equal(r.dateBased?.weekday, "Sunday");
    assert.equal(r.primary.stone.key, "ruby");
    const rise = sunriseOnLocalDate({ year: 2000, month: 1, day: 2 }, auckland.latitude, auckland.longitude, auckland.timezone);
    assert.ok(rise);
    // 05:xx-06:xx NZDT on 2 Jan is still 1 Jan in UTC; a UTC-based weekday would be Saturday.
    assert.equal(rise!.toISOString().slice(0, 10), "2000-01-01");
    assert.match(r.dateBased?.sunrise?.local ?? "", /^0[5-6]:\d\d$/);
    assert.equal(r.dateBased?.sunrise?.timeZone, "Pacific/Auckland");
  });

  test("Delhi sunrise on the birth date and the classical-reckoning note", async () => {
    const r = await calculateRatna(unknown("2000-01-02"));
    assert.match(r.dateBased?.sunrise?.local ?? "", /^07:[0-3]\d$/);
    assert.match(r.dateBased?.classicalNote ?? "", /previous weekday, Saturday \(Saturn\)/);
    assert.match(r.dateBased?.classicalNote ?? "", /calendar weekday/);
  });

  test("polar birthplaces are supported honestly: no sunrise, no fabricated time", async () => {
    const r = await calculateRatna(unknown("2000-06-21", tromso)); // midnight sun
    assert.equal(r.status, "date_based");
    assert.equal(r.dateBased?.sunrise, null);
    assert.match(r.dateBased?.classicalNote ?? "", /could not be calculated/);
    // the exact-time method still refuses this latitude
    await assert.rejects(
      calculateRatna(parseInput({ dateOfBirth: "2000-06-21", timeOfBirth: "10:00", timeUnknown: false, place: tromso })),
      /66°/,
    );
  });
});

describe("invalid unknown-time input is handled honestly", () => {
  test("rejects impossible, future and out-of-range dates", async () => {
    await assert.rejects(calculateRatna(unknown("2023-02-31")), BirthTimeError);
    await assert.rejects(calculateRatna(unknown("1700-01-01")), /between 1800/);
    const next = new Date().getUTCFullYear() + 1;
    await assert.rejects(calculateRatna(unknown(`${next}-01-01`)), BirthTimeError);
  });
  test("rejects an unknown time zone and invalid coordinates", async () => {
    await assert.rejects(calculateRatna(unknown("1990-05-05", { ...delhi, timezone: "Mars/Olympus" })), BirthTimeError);
    await assert.rejects(calculateRatna(unknown("1990-05-05", { ...delhi, latitude: 123 })), /Invalid geographic/);
    await assert.rejects(calculateRatna(unknown("1990-05-05", { ...delhi, longitude: 400 })), ValidationError);
  });
  test("still requires a selected birthplace and a valid date format", () => {
    assert.throws(() => parseInput({ dateOfBirth: "1990-05-05", timeUnknown: true }), /select your birthplace/);
    assert.throws(() => parseInput({ dateOfBirth: "05/05/1990", timeUnknown: true, place: delhi }), /YYYY-MM-DD/);
  });
});

const ctx = (over: Partial<DateExplanationContext> = {}): DateExplanationContext => ({
  stone: GEMSTONES["blue-sapphire"],
  weekday: "Saturday",
  weekdayLord: "Saturn",
  weekdayLordSign: "Capricorn",
  stableSigns: [{ planet: "Saturn", sign: "Capricorn" }, { planet: "Sun", sign: "Aries" }],
  place: "Vasai, Palghar, Maharashtra, India",
  localDate: "Saturday, 5 May 1990",
  ...over,
});
const okPost = (explanation: string) => (async () => ({ data: { choices: [{ message: { content: JSON.stringify({ explanation }) } }] } })) as any;

describe("AI wording for the date-based result", () => {
  const good =
    "You were born on a Saturday in Vasai, and Saturday is ruled by Saturn in the traditional weekday convention. The gemstone traditionally associated with Saturn is Blue Sapphire. Saturn stayed in Capricorn across that date. Because your birth time is unknown, no Ascendant or houses are used, so this is less specific than a full chart and not a guarantee of any outcome.";

  test("the rule-based text passes its own validator and states the limits", () => {
    const c = ctx();
    const t = buildDateRuleExplanation(c);
    assert.equal(validateDateExplanation(t, c), null);
    assert.match(t, /Blue Sapphire/);
    assert.match(t, /less specific/);
  });

  test("accepts grounded AI text and reports its source", async () => {
    const e = await generateDateExplanation(ctx(), { apiKey: "k", post: okPost(good) });
    assert.equal(e.source, "ai");
  });

  const bad: [string, string][] = [
    ["other gemstone", good.replace("Blue Sapphire", "Ruby")],
    ["extra gemstone", good + " You might also add an Emerald for balance in your daily life."],
    ["ascendant claim", good + " Your Ascendant is Taurus, which strengthens this."],
    ["house claim", good + " Saturn sits in your 10th house, so work matters most."],
    ["sign not established", good + " Mars was in Leo, adding some drive to the day."],
    ["contradicted sign", good.replace("Saturn stayed in Capricorn", "Saturn stayed in Aquarius")],
    ["wrong weekday", good.replace("a Saturday", "a Tuesday")],
    ["guarantee", good + " This gemstone will definitely bring you wealth and success."],
  ];
  for (const [name, text] of bad) {
    test(`rejects: ${name}`, async () => {
      assert.notEqual(validateDateExplanation(text, ctx()), null);
      const e = await generateDateExplanation(ctx(), { apiKey: "k", post: okPost(text) });
      assert.equal(e.source, "rules");
      assert.match(e.fallbackReason ?? "", /rejected/);
      assert.equal(e.text, buildDateRuleExplanation(ctx()));
    });
  }

  test("falls back when AI is not configured or the provider fails", async () => {
    const none = await generateDateExplanation(ctx());
    assert.equal(none.source, "rules");
    assert.match(none.fallbackReason ?? "", /not configured/);
    const throwing = (async () => { throw new Error("timeout"); }) as any;
    assert.equal((await generateDateExplanation(ctx(), { apiKey: "k", post: throwing })).source, "rules");
  });

  test("AI cannot change which gemstone is chosen", async () => {
    process.env.GROQ_API_KEY = "k";
    const r = await calculateRatna(unknown("2000-01-04"), {
      explain: { apiKey: "k", post: okPost("Tuesday is ruled by Mars, so Red Coral is traditionally linked. Try Pearl instead of it, which suits you better overall in life.") },
    });
    assert.equal(r.primary.stone.key, "red-coral");
    assert.equal(r.explanation.source, "rules");
  });
});

describe("catalogue data used by the new UI", () => {
  test("every stone has traditional themes and none make personal claims", () => {
    for (const s of Object.values(GEMSTONES)) {
      assert.ok(s.themes.length >= 2, s.key);
      for (const t of s.themes) {
        assert.ok(t.label && t.note, s.key);
        assert.doesNotMatch(`${t.label} ${t.note}`, /\byou (have|will|are)\b|guarantee|cure|definitely/i, s.key);
      }
    }
  });
  test("weekday rulers map to the planet's stone", () => {
    for (const row of WEEKDAY_TABLE) assert.equal(STONE_FOR_PLANET[row.planet].name, row.stone);
  });
});
