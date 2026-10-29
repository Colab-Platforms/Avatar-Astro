import type { ReactNode } from "react";
import {
  Sparkles, Gem, Orbit, Wallet, HeartHandshake, Briefcase,
  Palette, CalendarDays, Hash, Sparkle, PenLine, Smartphone,
} from "lucide-react";
import type { NameVariant } from "@/lib/numerology";
import type { UseNameReport } from "../useNameReport";

function Card({ icon: Icon, title, children }: { icon: any; title: string; children: ReactNode }) {
  return (
    <div className="glass-card-hover rounded-2xl p-6 sm:p-7 flex flex-col">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-gold to-gold-dim flex items-center justify-center shrink-0">
          <Icon size={18} className="text-cosmic-dark" />
        </div>
        <h4 className="font-bold text-foreground text-base sm:text-lg">{title}</h4>
      </div>
      <div className="text-sm text-muted-foreground leading-relaxed flex-1">{children}</div>
    </div>
  );
}

const PLANET_ICONS: Record<string, string> = {
  Sun: "☉", Moon: "☽", Mercury: "☿", Venus: "♀", Saturn: "♄", Jupiter: "♃", Mars: "♂",
};

export default function CoreNumbersGrid({ report, name }: { report: UseNameReport; name: string }) {
  const { profile, topVariants, lucky, narrative, narrativeLoading } = report;

  return (
    <div className="px-6 sm:px-10 pb-12">
      <h3
        className="text-2xl sm:text-3xl font-bold text-foreground text-center mb-8 uppercase tracking-wide"
        style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}
      >
        Inside Your Report
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

        {/* 1. Name Energy Analysis */}
        <Card icon={Sparkles} title="Name Energy Analysis">
          <p className="mb-2"><b className="text-foreground">Current Vibration:</b> Number {profile.destiny} ({profile.destinyPlanet})</p>
          <p className="mb-2"><b className="text-foreground">Strengths:</b> Strong {profile.destinyPlanet}-ruled clarity, expression, and drive.</p>
          <p className="mb-2"><b className="text-foreground">Weaknesses:</b> May clash under stress with your Life Path {profile.lifePath} ({profile.lifePathPlanet}) energy.</p>
          <p><b className="text-foreground">Hidden Energy:</b> Soul Urge {profile.soulUrge} suggests a quiet desire that shapes your choices.</p>
        </Card>

        {/* 2. Best Name Spellings */}
        <Card icon={Gem} title="Best Name Spellings">
          <div className="space-y-2">
            {topVariants.slice(0, 5).map((v: NameVariant) => (
              <div key={v.spelling} className="flex items-center justify-between rounded-xl bg-muted/60 px-3 py-2">
                <span className="font-medium text-foreground">{v.spelling}</span>
                <span className="text-xs font-bold text-gold">{v.score}%</span>
              </div>
            ))}
          </div>
        </Card>

        {/* 3. Planet Compatibility — full width sub-grid */}
        <div className="md:col-span-2 lg:col-span-3 glass-card-hover rounded-2xl p-6 sm:p-7">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-gold to-gold-dim flex items-center justify-center shrink-0">
              <Orbit size={18} className="text-cosmic-dark" />
            </div>
            <h4 className="font-bold text-foreground text-base sm:text-lg">Planet Compatibility</h4>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            {profile.planetCompat.map((p) => (
              <div key={p.planet} className="rounded-2xl bg-muted/60 p-3 text-center">
                <div className="text-2xl mb-1">{PLANET_ICONS[p.planet] || "★"}</div>
                <div className="text-xs font-semibold text-foreground/80">{p.planet}</div>
                <div
                  className={`text-xs font-bold mt-1 ${
                    p.verdict === "friendly" ? "text-emerald-800" : p.verdict === "friction" ? "text-rose-800" : "text-muted-foreground"
                  }`}
                >
                  {p.score}%
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 4. Wealth Potential */}
        <Card icon={Wallet} title="Wealth Potential">
          {narrativeLoading ? <Skeleton /> : <p>{narrative?.wealthPotential}</p>}
        </Card>

        {/* 5. Relationship Energy */}
        <Card icon={HeartHandshake} title="Relationship Energy">
          {narrativeLoading ? <Skeleton /> : <p>{narrative?.relationshipEnergy}</p>}
        </Card>

        {/* 6. Career Alignment */}
        <Card icon={Briefcase} title="Career Alignment">
          {narrativeLoading ? <Skeleton /> : <p>{narrative?.careerAlignment}</p>}
        </Card>

        {/* 7. Lucky Colors */}
        <Card icon={Palette} title="Lucky Colors">
          <div className="flex flex-wrap gap-2">
            {lucky.colors.map((c: string) => (
              <span key={c} className="px-3 py-1.5 rounded-full bg-muted/60 text-gold text-xs font-semibold">{c}</span>
            ))}
          </div>
        </Card>

        {/* 8. Lucky Dates */}
        <Card icon={CalendarDays} title="Lucky Dates">
          <p className="mb-1">Favorable days of the month:</p>
          <div className="flex flex-wrap gap-2">
            {lucky.dates.map((d: number) => (
              <span key={d} className="w-9 h-9 rounded-full bg-muted/60 text-gold text-xs font-bold flex items-center justify-center">{d}</span>
            ))}
          </div>
        </Card>

        {/* 9. Lucky Numbers */}
        <Card icon={Hash} title="Lucky Numbers">
          <div className="flex flex-wrap gap-2">
            {lucky.numbers.map((n: number) => (
              <span key={n} className="w-9 h-9 rounded-full bg-gradient-to-br from-gold to-gold-dim text-cosmic-dark text-xs font-bold flex items-center justify-center">{n}</span>
            ))}
          </div>
        </Card>

        {/* 10. Personalized Remedies */}
        <Card icon={Sparkle} title="Personalized Remedies">
          {narrativeLoading ? (
            <Skeleton lines={4} />
          ) : (
            <ul className="list-disc pl-4 space-y-1">
              {(narrative?.remedies || []).map((r, i) => <li key={i}>{r}</li>)}
            </ul>
          )}
        </Card>

        {/* 11. Signature Analysis */}
        <Card icon={PenLine} title="Signature Analysis">
          {narrativeLoading ? <Skeleton /> : <p>{narrative?.signatureAnalysisNote}</p>}
        </Card>

        {/* 12. Digital Energy */}
        <Card icon={Smartphone} title="Digital Energy">
          <p className="mb-1"><b className="text-foreground">Lucky mobile last digit:</b> {lucky.digital.mobileLastDigit}</p>
          <p className="mb-1"><b className="text-foreground">Username pattern:</b> {lucky.digital.usernamePattern}</p>
          <p><b className="text-foreground">Domain suggestion:</b> {lucky.digital.domainSuggestion}</p>
        </Card>
      </div>
    </div>
  );
}

function Skeleton({ lines = 2 }: { lines?: number }) {
  return (
    <div className="space-y-2 animate-pulse">
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="h-3 rounded bg-muted" style={{ width: `${90 - i * 12}%` }} />
      ))}
    </div>
  );
}
