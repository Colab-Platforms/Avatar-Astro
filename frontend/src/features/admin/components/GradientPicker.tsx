import { useEffect, useState } from "react";
import { Palette } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";

const PRESETS: { label: string; from: string; to: string; angle: number }[] = [
  { label: "Sapphire", from: "#0A0A2E", to: "#4444CC", angle: 135 },
  { label: "Gold", from: "#3D2A00", to: "#D4A017", angle: 135 },
  { label: "Emerald", from: "#003300", to: "#00AA44", angle: 135 },
  { label: "Ruby", from: "#4D0000", to: "#CC3333", angle: 135 },
  { label: "Amethyst", from: "#1A0033", to: "#CC4499", angle: 135 },
  { label: "Copper", from: "#4D2900", to: "#FF9933", angle: 135 },
  { label: "Ocean", from: "#001A33", to: "#0055AA", angle: 135 },
  { label: "Midnight", from: "#0A0A0A", to: "#3D3D00", angle: 135 },
];

const GRADIENT_RE =
  /^linear-gradient\(\s*(\d+)deg\s*,\s*(#[0-9a-fA-F]{6})\s*(?:0%)?\s*,\s*(#[0-9a-fA-F]{6})\s*(?:100%)?\s*\)$/;

function buildGradient(from: string, to: string, angle: number): string {
  return `linear-gradient(${angle}deg, ${from} 0%, ${to} 100%)`;
}

function parseGradient(
  value: string,
): { from: string; to: string; angle: number } | null {
  const match = value.trim().match(GRADIENT_RE);
  if (!match) return null;
  return { angle: Number(match[1]), from: match[2], to: match[3] };
}

interface GradientPickerProps {
  value: string;
  onChange: (value: string) => void;
}

export function GradientPicker({ value, onChange }: GradientPickerProps) {
  const parsed = parseGradient(value);
  const [advanced, setAdvanced] = useState(Boolean(value) && !parsed);
  const [from, setFrom] = useState(parsed?.from ?? "#2D1B69");
  const [to, setTo] = useState(parsed?.to ?? "#592209");
  const [angle, setAngle] = useState(parsed?.angle ?? 135);

  // Re-sync local color state when a different product is loaded into the form.
  useEffect(() => {
    const next = parseGradient(value);
    if (next) {
      setFrom(next.from);
      setTo(next.to);
      setAngle(next.angle);
      setAdvanced(false);
    } else {
      setAdvanced(Boolean(value));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value === "" ? "" : undefined]);

  const applyColors = (nextFrom: string, nextTo: string, nextAngle: number) => {
    setFrom(nextFrom);
    setTo(nextTo);
    setAngle(nextAngle);
    onChange(buildGradient(nextFrom, nextTo, nextAngle));
  };

  const preview = advanced ? value : buildGradient(from, to, angle);

  return (
    <div className="space-y-3">
      <div
        className="h-10 w-full rounded-md border border-primary/15"
        style={{ background: preview || undefined }}
      />

      {!advanced ? (
        <>
          <div className="flex items-end gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-foreground/70">Start color</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={from}
                  onChange={(e) => applyColors(e.target.value, to, angle)}
                  className="h-9 w-9 cursor-pointer rounded border border-primary/15 bg-transparent p-0"
                  aria-label="Start color"
                />
                <Input
                  value={from}
                  onChange={(e) => applyColors(e.target.value, to, angle)}
                  className="w-24 border-primary/15 bg-card text-foreground"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-foreground/70">End color</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={to}
                  onChange={(e) => applyColors(from, e.target.value, angle)}
                  className="h-9 w-9 cursor-pointer rounded border border-primary/15 bg-transparent p-0"
                  aria-label="End color"
                />
                <Input
                  value={to}
                  onChange={(e) => applyColors(from, e.target.value, angle)}
                  className="w-24 border-primary/15 bg-card text-foreground"
                />
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-foreground/70">Angle</Label>
              <span className="text-xs text-foreground/70">{angle}°</span>
            </div>
            <Slider
              value={[angle]}
              min={0}
              max={360}
              step={5}
              onValueChange={([next]: number[]) => applyColors(from, to, next)}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {PRESETS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                title={preset.label}
                onClick={() => applyColors(preset.from, preset.to, preset.angle)}
                className="h-7 w-7 rounded-full border border-primary/25 transition hover:scale-110 hover:border-primary/35"
                style={{
                  background: buildGradient(preset.from, preset.to, preset.angle),
                }}
              />
            ))}
          </div>
        </>
      ) : (
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="linear-gradient(135deg, #2D1B69 0%, #592209 100%)"
          className="border-primary/15 bg-card text-foreground"
        />
      )}

      <button
        type="button"
        onClick={() => {
          if (advanced) {
            const next = parseGradient(value) ?? { from, to, angle };
            setFrom(next.from);
            setTo(next.to);
            setAngle(next.angle);
            onChange(buildGradient(next.from, next.to, next.angle));
          }
          setAdvanced((prev) => !prev);
        }}
        className="flex items-center gap-1.5 text-xs text-foreground/70 hover:text-foreground/80"
      >
        <Palette className="h-3.5 w-3.5" />
        {advanced ? "Use color picker" : "Enter CSS gradient manually"}
      </button>
    </div>
  );
}

export default GradientPicker;
