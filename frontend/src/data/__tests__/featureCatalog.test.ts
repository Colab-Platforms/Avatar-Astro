import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { ASTROLOGY_SEVA_NAV, FEATURES, INNER_VOICE_NAV } from "../featureCatalog";

describe("feature catalog", () => {
  it("holds the twelve approved names, subtitles and unchanged routes", () => {
    const expected: [string, string, string][] = [
      ["Tarot Drishti", "/tarot", "Discover the messages within the cards and find clarity for the questions on your mind."],
      ["Rashi Chakra", "/zodiac", "Explore your zodiac sign, planetary influences and the qualities that shape your personality."],
      ["Janma Kundali", "/birth-chart", "Understand your life's cosmic blueprint through the positions of planets at your birth."],
      ["Jodi Jyotish", "/compatibility", "Explore your connection, compatibility and relationship harmony through Vedic astrology."],
      ["Hasta Rekha", "/palm-reading", "Discover what the lines and patterns of your palm reveal in traditional palmistry."],
      ["Ratna Jyotish", "/ratna-jyotish", "Know your Rashi Ratna and explore traditional gemstone guidance based on your Kundali."],
      ["Know Your Karma", "/inner-voice", "Reflect on your actions, choices and the karmic patterns shaping your journey."],
      ["Divya Margdarshak", "/inner-voice/chat", "Find thoughtful spiritual guidance and answers to the questions guiding your life."],
      ["Karma Sankhya", "/inner-voice/dashboard", "Explore your karma score through your actions, intentions and personal reflections."],
      ["Bhavishya Marg", "/inner-voice/future-path", "Explore possible life paths and discover traditional astrological insights for your future."],
      ["Divya Shloka", "/inner-voice/wisdom", "Discover sacred verses, their meanings and timeless wisdom for everyday life."],
      ["Naamank Jyotish", "/name-destiny-report", "Discover what your name and date of birth reveal through traditional numerology."],
    ];
    const all = Object.values(FEATURES);
    expect(all).toHaveLength(12);
    for (const [name, path, subtitle] of expected) {
      const f = all.find((x) => x.name === name);
      expect(f, name).toBeDefined();
      expect(f!.path).toBe(path);
      expect(f!.subtitle).toBe(subtitle);
    }
  });

  it("navigation groups match the approved lists and order", () => {
    expect(ASTROLOGY_SEVA_NAV.map((f) => f.name)).toEqual([
      "Tarot Drishti", "Rashi Chakra", "Janma Kundali", "Jodi Jyotish", "Hasta Rekha", "Ratna Jyotish", "Naamank Jyotish",
    ]);
    expect(INNER_VOICE_NAV.map((f) => f.name)).toEqual([
      "Know Your Karma", "Divya Margdarshak", "Karma Sankhya", "Bhavishya Marg", "Divya Shloka",
    ]);
  });
});

/**
 * Guards the "Seva, not Tools" branding. It reads quoted strings and JSX text only, skips comments,
 * imports, URL/image paths and identifiers, and ignores the admin area and tests.
 */
describe("no user-facing 'Tools' wording", () => {
  const root = join(__dirname, "..", "..");
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name);
      if (statSync(p).isDirectory()) {
        if (["__tests__", "admin", "node_modules"].includes(name)) continue;
        walk(p);
      } else if (/\.(tsx|ts)$/.test(name) && !/\.test\./.test(name)) files.push(p);
    }
  };
  walk(root);

  const visibleText = (line: string): string => {
    const quoted = [...line.matchAll(/(["'`])((?:(?!\1).)*)\1/g)].map((m) => m[2]);
    const jsx = line.match(/>([^<>{}]+)</g) ?? [];
    return [...quoted, ...jsx]
      .filter((t) => !/^[#/.]|^[\w-]+$|\.(jpg|png|webp|svg)/.test(t.trim())) // paths, ids, single tokens
      .join(" ");
  };

  it("finds none in visible strings", () => {
    const offenders: string[] = [];
    for (const f of files) {
      readFileSync(f, "utf8").split("\n").forEach((line, i) => {
        const t = line.trim();
        if (t.startsWith("//") || t.startsWith("*") || t.startsWith("/*") || t.startsWith("import ")) return;
        if (/\btools?\b/i.test(visibleText(line))) offenders.push(`${f.replace(root, "src")}:${i + 1}: ${t.slice(0, 110)}`);
      });
    }
    expect(offenders).toEqual([]);
  });
});

describe("no unfinished-product wording in visible text", () => {
  const root = join(__dirname, "..", "..");
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name);
      if (statSync(p).isDirectory()) {
        if (["__tests__", "admin", "node_modules"].includes(name)) continue;
        walk(p);
      } else if (/.(tsx|ts)$/.test(name) && !/.test./.test(name)) files.push(p);
    }
  };
  walk(root);
  it("finds no 'coming soon', 'not available yet', 'sample profile' or 'placeholder' messages", () => {
    const bad = /coming soon|not available yet|sample profile|sample figures|not real|are placeholders/i;
    const hits: string[] = [];
    for (const f of files) {
      readFileSync(f, "utf8").split(/\r?\n/).forEach((line, i) => {
        const t = line.trim();
        if (t.startsWith("//") || t.startsWith("*") || t.startsWith("/*") || t.startsWith("{/*")) return;
        if (bad.test(line)) hits.push(`${f.replace(root, "src")}:${i + 1}: ${t.slice(0, 90)}`);
      });
    }
    expect(hits).toEqual([]);
  });
});
