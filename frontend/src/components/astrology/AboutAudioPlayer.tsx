import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Pause, Play, Volume2 } from "lucide-react";
import { AUDIO_LANGUAGES, useAstrologyAudio, type AudioLanguage } from "@/lib/astrologyAudio";

const SPEEDS = [0.75, 1, 1.25, 1.5, 2] as const;

const fmt = (s: number) => {
  if (!Number.isFinite(s) || s < 0) return "0:00";
  const m = Math.floor(s / 60);
  return `${m}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
};

interface Props {
  /** Tool slug, e.g. "tarot". Must match the feature id in featureCatalog. */
  toolSlug: string;
}

/**
 * Listen-to-this-section player for a tool's About block. It only asks the API which audio is published;
 * the MP3 (hosted on Cloudinary) is not downloaded until Play is pressed, and ElevenLabs is never involved.
 */
export default function AboutAudioPlayer({ toolSlug }: Props) {
  const [language, setLanguage] = useState<AudioLanguage>("en");
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [rate, setRate] = useState<number>(1);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const rateRef = useRef(rate);
  rateRef.current = rate;

  const q = useAstrologyAudio(toolSlug, language);
  const url = q.data?.available ? q.data.url : null;
  const metaDuration = q.data?.available ? q.data.durationSeconds : null;

  const release = useCallback(() => {
    const a = audioRef.current;
    if (a) {
      a.pause();
      a.removeAttribute("src");
      a.load();
    }
    audioRef.current = null;
    setPlaying(false);
    setLoading(false);
    setTime(0);
  }, []);

  // Switching language (or the published file changing) stops the old audio so two never play at once.
  useEffect(() => {
    release();
    setFailed(false);
    setDuration(metaDuration ?? 0);
    return release;
  }, [language, url, metaDuration, release]);

  const ensureAudio = () => {
    if (audioRef.current || !url) return audioRef.current;
    const a = new Audio();
    a.preload = "none";
    a.src = url; // the download starts on play(), not here
    a.playbackRate = rateRef.current;
    a.addEventListener("timeupdate", () => setTime(a.currentTime));
    a.addEventListener("loadedmetadata", () => Number.isFinite(a.duration) && setDuration(a.duration));
    a.addEventListener("waiting", () => setLoading(true));
    a.addEventListener("playing", () => { setLoading(false); setPlaying(true); });
    a.addEventListener("pause", () => setPlaying(false));
    a.addEventListener("ended", () => { setPlaying(false); setTime(0); a.currentTime = 0; });
    a.addEventListener("error", () => { setFailed(true); setLoading(false); setPlaying(false); });
    audioRef.current = a;
    return a;
  };

  const toggle = async () => {
    const a = ensureAudio();
    if (!a) return;
    if (!a.paused) return a.pause();
    setFailed(false);
    setLoading(true);
    try {
      await a.play();
    } catch {
      setFailed(true);
      setLoading(false);
    }
  };

  const seek = (v: number) => {
    if (audioRef.current) audioRef.current.currentTime = v;
    setTime(v);
  };

  const changeRate = (r: number) => {
    setRate(r);
    if (audioRef.current) audioRef.current.playbackRate = r;
  };

  const langLabel = AUDIO_LANGUAGES.find((l) => l.code === language)!.label;

  return (
    <div
      data-testid="about-audio-player"
      role="group"
      aria-label="Listen to this section"
      className="mx-auto mb-6 w-full max-w-xl rounded-2xl border border-[#592209]/15 bg-white/[0.06] p-3 sm:p-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-sm font-semibold text-[#592209]">
          <Volume2 className="h-4 w-4" aria-hidden="true" /> Listen to this section
        </p>
        <div role="radiogroup" aria-label="Audio language" className="flex gap-1">
          {AUDIO_LANGUAGES.map((l) => (
            <button
              key={l.code}
              type="button"
              role="radio"
              aria-checked={language === l.code}
              onClick={() => setLanguage(l.code)}
              className={`rounded-full px-2.5 py-1 text-xs font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#592209] ${
                language === l.code ? "bg-[#592209] text-white" : "border border-[#592209]/25 text-[#592209] hover:bg-[#592209]/10"
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>

      {q.isLoading ? (
        <p className="mt-3 flex items-center gap-2 text-sm text-[#6B4A37]" role="status">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Checking for audio…
        </p>
      ) : q.isError ? (
        <p className="mt-3 text-sm text-[#6B4A37]" role="status">
          Audio could not be checked right now.{" "}
          <button type="button" onClick={() => q.refetch()} className="font-medium text-[#592209] underline">Try again</button>
        </p>
      ) : !url ? (
        <p className="mt-3 text-sm text-[#6B4A37]" role="status" data-testid="audio-unavailable">
          Audio for this section is not available in {langLabel} yet.
        </p>
      ) : (
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={toggle}
            aria-label={playing ? "Pause audio" : "Play audio"}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#592209] text-white transition hover:bg-[#6f2b0d] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#592209]"
          >
            {loading ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> : playing ? <Pause className="h-5 w-5" aria-hidden="true" /> : <Play className="h-5 w-5 translate-x-px" aria-hidden="true" />}
          </button>
          <div className="min-w-[8rem] flex-1">
            <input
              type="range"
              aria-label="Audio progress"
              min={0}
              max={duration > 0 ? duration : 1}
              step={0.1}
              value={Math.min(time, duration || 0)}
              disabled={!audioRef.current || duration <= 0}
              onChange={(e) => seek(Number(e.target.value))}
              className="h-1.5 w-full cursor-pointer accent-[#592209] disabled:cursor-default"
            />
            <div className="mt-1 flex justify-between text-xs tabular-nums text-[#6B4A37]">
              <span>{fmt(time)}</span>
              <span>{duration > 0 ? fmt(duration) : "--:--"}</span>
            </div>
          </div>
          <label className="flex items-center gap-1 text-xs text-[#6B4A37]">
            <span className="sr-only">Playback speed</span>
            <select
              value={rate}
              onChange={(e) => changeRate(Number(e.target.value))}
              aria-label="Playback speed"
              className="rounded-md border border-[#592209]/25 bg-transparent px-1.5 py-1 text-xs text-[#592209]"
            >
              {SPEEDS.map((s) => <option key={s} value={s}>{s}×</option>)}
            </select>
          </label>
          {failed && <p className="basis-full text-sm text-red-800" role="alert">The audio could not be played. Please try again.</p>}
        </div>
      )}
    </div>
  );
}
