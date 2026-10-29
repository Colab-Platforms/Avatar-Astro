import { Heart, FlaskConical, X } from "lucide-react";
import type { UseNameReport } from "../useNameReport";
import type { NameVariant } from "@/lib/numerology";

export default function NameEvolutionLab({ report }: { report: UseNameReport }) {
  const {
    playgroundSpelling,
    setPlaygroundSpelling,
    playgroundProfile,
    favorites,
    addFavorite,
    removeFavorite,
  } = report;

  const currentAsVariant: NameVariant = {
    spelling: playgroundSpelling,
    score: playgroundProfile.overallScore,
    deltas: { career: 0, business: 0, wealth: 0, relationship: 0 },
    planet: playgroundProfile.destinyPlanet,
  };

  return (
    <div className="px-6 sm:px-10 pb-12">
      <div className="flex items-center justify-center gap-2 mb-2">
        <FlaskConical size={22} className="text-gold" />
        <h3
          className="text-2xl sm:text-3xl font-bold text-foreground text-center uppercase tracking-wide"
          style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}
        >
          Name Evolution Lab
        </h3>
      </div>
      <p className="text-center text-muted-foreground mb-6 text-sm">
        Try different spellings and watch your score update live — instantly, right here.
      </p>

      <div className="max-w-xl mx-auto">
        <input
          value={playgroundSpelling}
          onChange={(e) => setPlaygroundSpelling(e.target.value)}
          placeholder="Try a spelling..."
          className="input-cosmic w-full rounded-2xl px-5 py-3 text-lg font-medium text-foreground mb-5"
        />

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          <Stat label="Alignment" value={`${playgroundProfile.overallScore}%`} />
          <Stat label="Destiny #" value={playgroundProfile.destiny} />
          <Stat label="Ruled By" value={playgroundProfile.destinyPlanet} />
          <Stat label="Soul Urge" value={playgroundProfile.soulUrge} />
        </div>

        <div className="grid grid-cols-4 sm:grid-cols-7 gap-2 mb-5">
          {playgroundProfile.planetCompat.map((p) => (
            <div key={p.planet} className="rounded-xl bg-muted/60 p-2 text-center">
              <div className="text-[11px] font-semibold text-foreground/80">{p.planet}</div>
              <div className={`text-xs font-bold ${p.verdict === "friendly" ? "text-emerald-800" : p.verdict === "friction" ? "text-rose-800" : "text-muted-foreground"}`}>
                {p.score}%
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-center mb-8">
          <button
            onClick={() => addFavorite(currentAsVariant)}
            disabled={!playgroundSpelling.trim()}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-gold to-gold-dim text-cosmic-dark text-sm font-semibold disabled:opacity-40"
          >
            <Heart size={16} /> Save Favorite
          </button>
        </div>

        {favorites.length > 0 && (
          <div>
            <div className="text-xs font-bold text-muted-foreground uppercase mb-3 text-center">Saved Favorites</div>
            <div className="space-y-2">
              {favorites.map((f) => (
                <div key={f.spelling} className="flex items-center justify-between rounded-xl bg-card border border-border px-4 py-2.5">
                  <span className="font-medium text-foreground">{f.spelling}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-gold">{f.score}%</span>
                    <button onClick={() => removeFavorite(f.spelling)} className="text-muted-foreground hover:text-rose-800">
                      <X size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl bg-muted/60 p-3 text-center">
      <div className="text-[10px] font-bold text-gold uppercase tracking-wide">{label}</div>
      <div className="text-sm font-extrabold text-foreground mt-0.5">{value}</div>
    </div>
  );
}
