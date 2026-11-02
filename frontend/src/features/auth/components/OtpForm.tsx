import { useCallback, useEffect, useRef, useState } from "react";
import {
  AnimatePresence,
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
  type AnimationPlaybackControls,
} from "framer-motion";
import { InputOTP } from "@/components/ui/input-otp";
import { AuthSubmitButton } from "./AuthSubmitButton";

const RESEND_COOLDOWN_SECONDS = 60;
const OTP_LENGTH = 6;
/** Minimum time the orbit animation is shown, even if the server answers sooner. */
const MIN_VERIFY_MS = 1700;
/** How long the success state is held before continuing to the next step. */
const SUCCESS_HOLD_MS = 2100;
/** How long the error state is shown before the user may re-enter the code. */
const ERROR_HOLD_MS = 1300;

const TILE_GAP = 8;
const ORBIT_RADIUS = 76;
const STAGE_HEIGHT = 240;
const EASE_OUT: [number, number, number, number] = [0.22, 1, 0.36, 1];

type Phase = "input" | "verifying" | "success" | "error";

interface OtpFormProps {
  email: string;
  resending?: boolean;
  /**
   * Performs server-side verification. Must reject when the code is invalid —
   * the success animation only plays once this promise resolves.
   */
  onSubmit: (otp: string) => Promise<unknown> | void;
  /** Called after the success animation has finished. */
  onVerified?: () => void;
  onResend: () => void;
  /** When true, skip auto-submit on 6 digits and wait for button. */
  requireConfirm?: boolean;
}

const wait = (ms: number) => new Promise<void>((r) => window.setTimeout(r, ms));

function errorText(err: unknown) {
  if (err instanceof Error && err.message) return err.message;
  return "That code didn't match. Please try again.";
}

export function OtpForm({
  email,
  resending,
  onSubmit,
  onVerified,
  onResend,
  requireConfirm = false,
}: OtpFormProps) {
  const reduced = useReducedMotion() ?? false;
  const [otp, setOtp] = useState("");
  const [phase, setPhase] = useState<Phase>("input");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(RESEND_COOLDOWN_SECONDS);
  const [stageWidth, setStageWidth] = useState(360);

  const stageRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const mounted = useRef(true);
  const busy = useRef(false);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  // Resend countdown
  useEffect(() => {
    if (secondsLeft <= 0) return;
    const id = window.setInterval(() => setSecondsLeft((s) => s - 1), 1000);
    return () => window.clearInterval(id);
  }, [secondsLeft]);

  // Track stage width so tiles always fit (390px phones → 1440px desktops).
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    setStageWidth(el.clientWidth || 360);
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(([entry]) => {
      setStageWidth(entry.contentRect.width || 360);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Ring rotation, with counter-rotation so digits stay upright.
  const spin = useMotionValue(0);
  const counterSpin = useTransform(spin, (v) => -v);
  const spinCtl = useRef<AnimationPlaybackControls | null>(null);
  const orbiting = phase === "verifying" || phase === "success";

  useEffect(() => {
    spinCtl.current?.stop();
    if (orbiting && !reduced) {
      const start = spin.get();
      spinCtl.current = animate(spin, [start, start + 360], {
        duration: 18,
        ease: "linear",
        repeat: Infinity,
      });
    } else if (spin.get() !== 0) {
      const home = Math.round(spin.get() / 360) * 360;
      spinCtl.current = animate(spin, home, {
        duration: reduced ? 0.01 : 0.9,
        ease: EASE_OUT,
        onComplete: () => spin.set(0),
      });
    }
    return () => spinCtl.current?.stop();
  }, [orbiting, reduced, spin]);

  // Hand focus back to the input once the user may type again.
  useEffect(() => {
    if (phase === "input") inputRef.current?.focus();
  }, [phase]);

  const runVerify = useCallback(
    async (code: string) => {
      if (busy.current) return;
      busy.current = true;
      setErrorMsg(null);
      setPhase("verifying");

      const [result] = await Promise.allSettled([
        Promise.resolve(onSubmit(code)),
        wait(reduced ? 500 : MIN_VERIFY_MS),
      ]);
      if (!mounted.current) return;

      if (result.status === "rejected") {
        setErrorMsg(errorText(result.reason));
        setPhase("error");
        await wait(reduced ? 900 : ERROR_HOLD_MS);
        if (!mounted.current) return;
        setOtp("");
        setPhase("input");
        busy.current = false;
        return;
      }

      setPhase("success");
      await wait(reduced ? 900 : SUCCESS_HOLD_MS);
      if (!mounted.current) return;
      onVerified?.();
    },
    [onSubmit, onVerified, reduced],
  );

  const handleResend = () => {
    if (secondsLeft > 0 || resending || busy.current) return;
    onResend();
    setSecondsLeft(RESEND_COOLDOWN_SECONDS);
    setOtp("");
    setErrorMsg(null);
    setPhase("input");
    inputRef.current?.focus();
  };

  // ----- geometry -----
  const tile = Math.max(
    34,
    Math.min(48, (stageWidth - TILE_GAP * (OTP_LENGTH - 1) - 8) / OTP_LENGTH),
  );
  const radius = Math.min(ORBIT_RADIUS, stageWidth / 2 - tile * 0.75 - 6);
  const rowX = (i: number) => (i - (OTP_LENGTH - 1) / 2) * (tile + TILE_GAP);
  const orbitAngle = (i: number) => ((-90 + i * 60) * Math.PI) / 180;
  const orbitX = (i: number) => Math.cos(orbitAngle(i)) * radius;
  const orbitY = (i: number) => Math.sin(orbitAngle(i)) * radius;

  const hex = Array.from({ length: OTP_LENGTH }, (_, i) => [
    orbitX(i),
    orbitY(i),
  ]);
  const hexPath = `M${hex.map((p) => p.join(",")).join("L")}Z`;
  const starA = `M${hex[0]}L${hex[2]}L${hex[4]}Z`;
  const starB = `M${hex[1]}L${hex[3]}L${hex[5]}Z`;

  const tileTarget = (i: number) => {
    if (phase === "verifying") {
      return { x: orbitX(i), y: orbitY(i), scale: 0.92, opacity: 1 };
    }
    if (phase === "success") return { x: 0, y: 0, scale: 0.15, opacity: 0 };
    return { x: rowX(i), y: 0, scale: 1, opacity: 1 };
  };
  const tileTransition = (i: number) => {
    if (reduced) return { duration: 0.2 };
    if (phase === "verifying") {
      return { type: "spring" as const, stiffness: 70, damping: 15, delay: 0.3 + i * 0.07 };
    }
    if (phase === "success") {
      return { duration: 0.75, ease: [0.55, 0, 0.2, 1] as const, delay: i * 0.04 };
    }
    return { type: "spring" as const, stiffness: 190, damping: 22 };
  };

  const isError = phase === "error";
  const status =
    phase === "verifying"
      ? "Verifying your code…"
      : phase === "success"
        ? "Verified Successfully"
        : isError
          ? (errorMsg ?? "Invalid code")
          : null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.35 }}
      className="space-y-4"
    >
      <div className="relative overflow-hidden rounded-3xl border border-amber-200/20 bg-gradient-to-br from-[#2a1209] via-[#1a0b06] to-[#0f0603] px-3 pb-5 pt-5 shadow-[0_24px_60px_-20px_rgba(89,34,9,0.65),inset_0_1px_0_rgba(255,226,180,0.18)] sm:px-5">
        <Backdrop reduced={reduced} tone={isError ? "error" : phase === "success" ? "success" : "gold"} />

        <p className="relative text-center text-sm text-amber-100/70">
          Enter the 6-digit code sent to{" "}
          <span className="font-medium [overflow-wrap:anywhere] text-amber-50">{email}</span>
        </p>

        <motion.div
          ref={stageRef}
          animate={isError && !reduced ? { x: [0, -12, 12, -9, 9, -4, 0] } : { x: 0 }}
          transition={{ duration: 0.55, ease: "easeInOut" }}
          className="relative mt-2 w-full"
          style={{ height: STAGE_HEIGHT }}
        >
          <InputOTP
            ref={inputRef}
            maxLength={OTP_LENGTH}
            value={otp}
            onChange={setOtp}
            onComplete={(code) => {
              if (!requireConfirm) void runVerify(code);
            }}
            disabled={phase !== "input"}
            autoFocus
            inputMode="numeric"
            pushPasswordManagerStrategy="none"
            aria-label="6-digit verification code"
            containerClassName="absolute inset-0 block h-full w-full has-[:disabled]:opacity-100"
            render={({ slots }) => (
              <>
                {/* Rotating ring: holds the connecting geometry and the tiles. */}
                <motion.div
                  className="absolute left-1/2 top-1/2 h-0 w-0"
                  style={{ rotate: spin }}
                >
                  <svg
                    aria-hidden
                    className="pointer-events-none absolute overflow-visible"
                    style={{ left: 0, top: 0 }}
                    width="1"
                    height="1"
                  >
                    {[hexPath, starA, starB].map((d, idx) => (
                      <motion.path
                        key={idx}
                        d={d}
                        fill="none"
                        stroke="rgba(255,190,120,0.55)"
                        strokeWidth={idx === 0 ? 1.2 : 0.8}
                        strokeLinejoin="round"
                        initial={false}
                        animate={
                          phase === "verifying"
                            ? { pathLength: 1, opacity: idx === 0 ? 0.9 : 0.5 }
                            : { pathLength: 0, opacity: 0 }
                        }
                        transition={{
                          duration: reduced ? 0.2 : 1.1,
                          delay: phase === "verifying" && !reduced ? 0.9 + idx * 0.15 : 0,
                          ease: EASE_OUT,
                        }}
                      />
                    ))}
                  </svg>

                  {slots.map((slot, i) => (
                    <motion.div
                      key={i}
                      className="absolute"
                      style={{ width: tile, height: tile * 1.15, marginLeft: -tile / 2, marginTop: -(tile * 1.15) / 2 }}
                      initial={false}
                      animate={tileTarget(i)}
                      transition={tileTransition(i)}
                    >
                      <motion.div className="h-full w-full" style={{ rotate: counterSpin }}>
                        <Tile
                          char={slot.char}
                          active={slot.isActive && phase === "input"}
                          caret={slot.hasFakeCaret && phase === "input"}
                          orbit={phase === "verifying"}
                          error={isError}
                          reduced={reduced}
                          size={tile}
                        />
                      </motion.div>
                    </motion.div>
                  ))}
                </motion.div>
              </>
            )}
          />

          {/* Central core while verifying */}
          <AnimatePresence>
            {phase === "verifying" && (
              <motion.div
                key="core"
                aria-hidden
                className="pointer-events-none absolute left-1/2 top-1/2 -ml-8 -mt-8 h-16 w-16 rounded-full"
                style={{
                  background:
                    "radial-gradient(circle, rgba(255,214,150,0.95) 0%, rgba(240,140,60,0.55) 40%, rgba(240,140,60,0) 72%)",
                }}
                initial={{ scale: 0, opacity: 0 }}
                animate={
                  reduced
                    ? { scale: 1, opacity: 0.8 }
                    : { scale: [0.7, 1.15, 0.7], opacity: [0.6, 1, 0.6] }
                }
                exit={{ scale: 2.4, opacity: 0, transition: { duration: 0.5 } }}
                transition={
                  reduced
                    ? { duration: 0.2 }
                    : { duration: 1.8, repeat: Infinity, ease: "easeInOut", delay: 0.6 }
                }
              />
            )}
          </AnimatePresence>

          <AnimatePresence>
            {phase === "success" && <SuccessBadge key="ok" reduced={reduced} />}
          </AnimatePresence>
        </motion.div>

        <div
          role="status"
          aria-live="polite"
          className="relative flex h-7 items-center justify-center"
        >
          <AnimatePresence mode="wait">
            {status && (
              <motion.p
                key={status}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: reduced ? 0.1 : 0.35, delay: phase === "success" && !reduced ? 0.55 : 0 }}
                className={
                  phase === "success"
                    ? "text-base font-semibold tracking-wide text-emerald-300"
                    : isError
                      ? "text-sm font-medium text-red-300"
                      : "text-sm text-amber-100/80"
                }
              >
                {status}
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        {requireConfirm && (
          <div className="relative mt-3">
            <AuthSubmitButton
              loading={phase === "verifying"}
              loadingText="Verifying…"
              disabled={otp.length !== OTP_LENGTH || phase !== "input"}
              onClick={(e) => {
                e.preventDefault();
                if (otp.length === OTP_LENGTH) void runVerify(otp);
              }}
            >
              Verify OTP
            </AuthSubmitButton>
          </div>
        )}

        <div className="relative mt-2 text-center text-sm text-amber-100/70">
          {secondsLeft > 0 ? (
            <span>
              Resend available in{" "}
              <span className="tabular-nums text-amber-50">{secondsLeft}s</span>
            </span>
          ) : (
            <button
              type="button"
              onClick={handleResend}
              disabled={resending || phase === "verifying" || phase === "success"}
              className="font-medium text-amber-300 transition-colors hover:text-amber-200 disabled:opacity-60"
            >
              {resending ? "Sending…" : "Resend OTP"}
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */

function Tile({
  char,
  active,
  caret,
  orbit,
  error,
  reduced,
  size,
}: {
  char: string | null;
  active: boolean;
  caret: boolean;
  orbit: boolean;
  error: boolean;
  reduced: boolean;
  size: number;
}) {
  const filled = !!char;
  const border = error
    ? "rgba(248,113,113,0.85)"
    : active
      ? "rgba(255,190,110,0.95)"
      : filled
        ? "rgba(255,200,140,0.55)"
        : "rgba(255,226,180,0.2)";
  const glow = error
    ? "0 0 22px rgba(239,68,68,0.45)"
    : active
      ? "0 0 24px rgba(255,150,60,0.5)"
      : filled
        ? "0 0 18px rgba(255,150,60,0.3)"
        : "0 0 0 rgba(0,0,0,0)";

  return (
    <motion.div
      className="relative flex h-full w-full items-center justify-center overflow-hidden backdrop-blur-md"
      initial={false}
      animate={{
        rotate: orbit ? 45 : 0,
        borderRadius: orbit ? size * 0.22 : size * 0.26,
        borderColor: border,
        boxShadow: `${glow}, inset 0 1px 0 rgba(255,236,205,0.25)`,
      }}
      transition={{ duration: reduced ? 0.1 : 0.5, ease: EASE_OUT }}
      style={{
        border: "1px solid",
        background:
          "linear-gradient(145deg, rgba(255,236,205,0.16) 0%, rgba(255,200,140,0.05) 55%, rgba(255,160,70,0.1) 100%)",
      }}
    >
      {/* glass reflection */}
      <span
        aria-hidden
        className="pointer-events-none absolute -left-1/4 top-0 h-1/2 w-[150%] -rotate-12 bg-gradient-to-b from-white/20 to-transparent"
      />
      <motion.span
        className="relative font-display text-xl font-semibold text-amber-50 sm:text-2xl"
        initial={false}
        animate={{ rotate: orbit ? -45 : 0 }}
        transition={{ duration: reduced ? 0.1 : 0.5, ease: EASE_OUT }}
        style={{ textShadow: "0 0 14px rgba(255,170,80,0.7)" }}
      >
        <AnimatePresence mode="popLayout" initial={false}>
          {char ? (
            <motion.span
              key={char}
              className="block"
              initial={reduced ? { opacity: 0 } : { scale: 0.3, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.6 }}
              transition={{ type: "spring", stiffness: 420, damping: 18 }}
            >
              {char}
            </motion.span>
          ) : (
            <motion.span key="empty" className="block h-1 w-1 rounded-full bg-amber-100/25" />
          )}
        </AnimatePresence>
      </motion.span>
      {caret && (
        <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="animate-caret-blink h-5 w-px bg-amber-200" />
        </span>
      )}
    </motion.div>
  );
}

function SuccessBadge({ reduced }: { reduced: boolean }) {
  const particles = Array.from({ length: 14 }, (_, i) => i);
  return (
    <motion.div
      className="pointer-events-none absolute left-1/2 top-1/2 -ml-[46px] -mt-[46px] h-[92px] w-[92px]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ delay: reduced ? 0 : 0.5, duration: 0.2 }}
    >
      {!reduced &&
        [0, 1].map((n) => (
          <motion.span
            key={n}
            className="absolute inset-0 rounded-full border border-emerald-400/60"
            initial={{ scale: 1, opacity: 0.7 }}
            animate={{ scale: 2.6, opacity: 0 }}
            transition={{ duration: 1.4, delay: 0.7 + n * 0.25, ease: "easeOut" }}
          />
        ))}
      {!reduced &&
        particles.map((i) => {
          const a = (i / particles.length) * Math.PI * 2;
          const d = 80 + (i % 3) * 18;
          return (
            <motion.span
              key={i}
              className="absolute left-1/2 top-1/2 -ml-[3px] -mt-[3px] h-1.5 w-1.5 rounded-full bg-emerald-300"
              initial={{ x: 0, y: 0, opacity: 0, scale: 0.4 }}
              animate={{ x: Math.cos(a) * d, y: Math.sin(a) * d, opacity: [0, 1, 0], scale: [0.4, 1, 0.2] }}
              transition={{ duration: 1.1, delay: 0.75, ease: "easeOut" }}
            />
          );
        })}
      <motion.div
        className="relative flex h-full w-full items-center justify-center rounded-full"
        style={{
          background: "radial-gradient(circle at 35% 30%, #6ee7b7 0%, #10b981 55%, #047857 100%)",
          boxShadow: "0 0 44px rgba(16,185,129,0.65), inset 0 2px 6px rgba(255,255,255,0.4)",
        }}
        initial={{ scale: reduced ? 1 : 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 190, damping: 13, delay: reduced ? 0 : 0.5 }}
      >
        <svg viewBox="0 0 24 24" className="h-11 w-11" fill="none">
          <motion.path
            d="M5.5 12.5l4.2 4.2L18.5 7.8"
            stroke="white"
            strokeWidth="2.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: reduced ? 1 : 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.45, delay: reduced ? 0 : 0.95, ease: EASE_OUT }}
          />
        </svg>
      </motion.div>
    </motion.div>
  );
}

/** Ambient glass-panel decoration: light streaks, floating geometry, glow. */
function Backdrop({ reduced, tone }: { reduced: boolean; tone: "gold" | "error" | "success" }) {
  const glow =
    tone === "error"
      ? "rgba(239,68,68,0.28)"
      : tone === "success"
        ? "rgba(16,185,129,0.3)"
        : "rgba(240,140,60,0.3)";
  const shapes = [
    { left: "8%", top: "58%", size: 26, rot: 20, round: "6px", dur: 7 },
    { left: "86%", top: "14%", size: 20, rot: 45, round: "4px", dur: 8.5 },
    { left: "78%", top: "72%", size: 34, rot: 0, round: "999px", dur: 9.5 },
    { left: "14%", top: "12%", size: 16, rot: 30, round: "3px", dur: 6.5 },
  ];
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <motion.div
        className="absolute left-1/2 top-[48%] h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl"
        animate={{ backgroundColor: glow }}
        transition={{ duration: 0.8 }}
      />
      {[0, 1].map((n) => (
        <motion.div
          key={n}
          className="absolute -top-10 h-[130%] w-14 -skew-x-[24deg] bg-gradient-to-b from-transparent via-amber-200/20 to-transparent blur-[2px]"
          initial={{ left: n === 0 ? "-20%" : "-35%" }}
          animate={reduced ? { left: n === 0 ? "22%" : "64%" } : { left: ["-20%", "120%"] }}
          transition={reduced ? { duration: 0 } : { duration: 7 + n * 2.5, repeat: Infinity, ease: "linear", delay: n * 2.2 }}
        />
      ))}
      {shapes.map((s, i) => (
        <motion.span
          key={i}
          className="absolute border border-amber-200/25 bg-amber-200/[0.04]"
          style={{ left: s.left, top: s.top, width: s.size, height: s.size, borderRadius: s.round, rotate: s.rot }}
          animate={
            reduced
              ? undefined
              : { y: [0, -14, 0], rotate: [s.rot, s.rot + 40, s.rot] }
          }
          transition={{ duration: s.dur, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}
    </div>
  );
}
