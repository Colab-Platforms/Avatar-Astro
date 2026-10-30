import type { RatnaResult } from "./types";

const Row = ({ label, children, testId }: { label: string; children: React.ReactNode; testId?: string }) => (
  <li className="min-w-0 rounded-xl border border-[#592209]/20 bg-[#FBF5EC] p-3" data-testid={testId}>
    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6B4A37]">{label}</p>
    <div className="mt-1 break-words text-lg leading-snug text-[#301607]">{children}</div>
  </li>
);

const Panel = ({ title, id, testId, children }: { title: string; id: string; testId: string; children: React.ReactNode }) => (
  <section className="ratna-card p-4 sm:p-6" aria-labelledby={id} data-testid={testId}>
    <h2 id={id} className="font-home-serif text-lg font-semibold text-[#592209] sm:text-xl">
      {title}
    </h2>
    <div className="mt-3 space-y-3">{children}</div>
  </section>
);

const NOT_WITHOUT_TIME = [
  "Lagna (Ascendant) and the twelve houses",
  "The house placement of every planet and the Lagna lord",
  "Which houses each planet rules, so functional benefic/malefic status",
  "The exact Moon sign and nakshatra when the Moon changes sign that day, and the Vimshottari dasha start point",
];

export const ProfilePanels = ({ result }: { result: RatnaResult }) => {
  const { profile, panchang, birth } = result;
  const analysis = result.recommendation?.analysis;
  const unknownTime = result.status === "date_based";
  const moonStable = result.stableSigns.find((s) => s.planet === "Moon");

  return (
    <div className="space-y-4 sm:space-y-5" data-testid="ratna-profile-panels">
      {profile && (
        <Panel title="Personal profile" id="ratna-profile-h" testId="ratna-profile">
          <ul className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-2 lg:grid-cols-4">
            <Row label="Name">{profile.fullName}</Row>
            <Row label="Gender">{profile.gender}</Row>
            <Row label="Weight">{profile.weightKg != null ? `${profile.weightKg} kg` : "Not provided"}</Row>
            <Row label="Birthplace">{birth.place}</Row>
          </ul>
        </Panel>
      )}

      {panchang && (
        <Panel title="Panchang birth details" id="ratna-panchang-h" testId="ratna-panchang">
          <ul className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-2 lg:grid-cols-3">
            <Row label="Vikram Samvat">{panchang.vikramSamvat}</Row>
            <Row label="Hindu month (Masa)">
              {panchang.masa.adhika ? "Adhika " : ""}
              {panchang.masa.name} ({panchang.masa.hindi})
            </Row>
            <Row label="Paksha">{panchang.paksha === "shukla" ? "Shukla (शुक्ल)" : "Krishna (कृष्ण)"}</Row>
            <Row label="Tithi" testId="panchang-tithi">
              {panchang.tithi.name} ({panchang.tithi.hindi}) · {panchang.tithi.numberInPaksha} of{" "}
              {panchang.paksha === "shukla" ? "Shukla" : "Krishna"}
            </Row>
            <Row label="Nakshatra">
              {panchang.nakshatra.name}, pada {panchang.nakshatra.pada}
            </Row>
            <Row label="Moon Rashi">{panchang.moonRashi}</Row>
            <Row label="Yoga">{panchang.yoga}</Row>
            <Row label="Karana">{panchang.karana}</Row>
            <Row label="Vara (weekday)">{panchang.vara.name}</Row>
            {panchang.sunrise && <Row label="Sunrise / sunset">{panchang.sunrise}{panchang.sunset ? ` / ${panchang.sunset}` : ""}</Row>}
            <Row label="Birth time">{birth.timeOfBirth ?? "Unknown"}</Row>
          </ul>
          <p className="text-base text-[#4A2E1F]" data-testid="panchang-convention">
            Calendar convention: {panchang.convention.label}. {panchang.convention.note}
          </p>
          {panchang.purnimantaMasa.name !== panchang.masa.name || panchang.purnimantaMasa.adhika !== panchang.masa.adhika ? (
            <p className="text-base text-[#4A2E1F]" data-testid="panchang-purnimanta">
              In the Purnimanta system this month is called{" "}
              <strong>
                {panchang.purnimantaMasa.adhika ? "Adhika " : ""}
                {panchang.purnimantaMasa.name} ({panchang.purnimantaMasa.hindi})
              </strong>
              .
            </p>
          ) : null}
          <p className="text-base text-[#4A2E1F]">
            Your tithi ran from <strong>{panchang.tithi.startLocal}</strong> to <strong>{panchang.tithi.endLocal}</strong>{" "}
            (local time at your birthplace, {birth.timeZone}).
          </p>
          {panchang.vara.note && <p className="text-sm text-[#6B4A37]">{panchang.vara.note}</p>}
          {panchang.uncertain && (
            <div
              className="rounded-lg border border-[#E58A45]/60 bg-[#E58A45]/10 p-3 text-sm text-[#301607]"
              data-testid="panchang-uncertain"
            >
              <p className="font-semibold">Uncertain without an exact birth time</p>
              <ul className="mt-1 list-disc space-y-1 pl-5">
                {panchang.uncertainties.map((u) => (
                  <li key={u}>{u}</li>
                ))}
              </ul>
            </div>
          )}
          {panchang.notes.map((n) => (
            <p key={n} className="text-sm text-[#6B4A37]">
              {n}
            </p>
          ))}
        </Panel>
      )}

      <Panel title="Rashi and Nakshatra" id="ratna-rashi-h" testId="ratna-rashi">
        {analysis ? (
          <ul className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-2 lg:grid-cols-4">
            <Row label="Rashi (Moon sign)">{analysis.moon.sign}</Row>
            <Row label="Nakshatra">
              {analysis.moon.nakshatra}, pada {analysis.moon.pada}
            </Row>
            <Row label="Lagna (Ascendant)">
              {analysis.lagna.sign} {analysis.lagna.degree}° · {analysis.lagna.nakshatra} pada {analysis.lagna.pada}
            </Row>
            <Row label="Current dasha">
              {analysis.dasha
                ? `${analysis.dasha.mahadasha.lord} / ${analysis.dasha.antardasha.lord}`
                : "Not calculated"}
            </Row>
          </ul>
        ) : (
          <p className="text-base text-[#4A2E1F]">
            {moonStable
              ? `The Moon stayed in ${moonStable.sign} (sidereal) throughout your birth date, but the nakshatra pada and dasha need an exact birth time.`
              : "The Moon changed sign during your birth date, so your Rashi cannot be stated without an exact birth time. Nakshatra and dasha are not calculated."}
            {panchang && !moonStable
              ? ` At sunrise the Moon was in ${panchang.moonRashi} (${panchang.nakshatra.name}); treat this as uncertain.`
              : ""}
          </p>
        )}
      </Panel>

      <Panel title="Calculation limitations" id="ratna-limits-h" testId="ratna-limitations">
        {unknownTime && (
          <div className="rounded-lg border border-[#E58A45]/60 bg-[#E58A45]/10 p-3 text-sm text-[#301607]">
            <p className="font-semibold">Birth time unknown: these are not calculated, and none is assumed.</p>
            <ul className="mt-1 list-disc space-y-1 pl-5">
              {NOT_WITHOUT_TIME.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          </div>
        )}
        <ul className="list-disc space-y-1 pl-5 text-base text-[#4A2E1F]">
          {result.method.limitations.map((l) => (
            <li key={l}>{l}</li>
          ))}
        </ul>
        {analysis && analysis.notCalculated.length > 0 && (
          <p className="text-sm text-[#6B4A37]">Not calculated: {analysis.notCalculated.join("; ")}.</p>
        )}
      </Panel>
    </div>
  );
};

export default ProfilePanels;
