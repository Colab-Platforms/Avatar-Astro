import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { CalendarDays, HandHeart, Heart, Lightbulb, Mic, MicOff, RotateCcw, Send, Sparkles, TriangleAlert, User } from "lucide-react";
import LotusOm from "@/components/ai-guru/LotusOm";
import { requireSignIn } from "@/lib/authedFetch";
import { useAuthStore } from "@/store/authStore";
import { fetchTodayCalendar, type TodayCalendar } from "@/lib/karmaCalendar";
import { BASE_QUESTION_KEYS, calendarMeaning, localizedFacts, tithiQuestion } from "@/lib/karmaLanguage";
import { replyLanguage } from "@/i18n/aiLanguage";
import { LOCALES } from "@/i18n/languages";
import { askKarma, KarmaReadingError, MAX_SITUATION_CHARS, MIN_SITUATION_CHARS, type KarmaAnswer, type KarmaTurn } from "@/lib/karmaReading";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SpeechCtor = new () => any;
type SpeechWindow = { SpeechRecognition?: SpeechCtor; webkitSpeechRecognition?: SpeechCtor };

type Message =
  | { id: number; role: "user"; text: string }
  | { id: number; role: "bot"; answer: KarmaAnswer; hasCalendar: boolean }
  | { id: number; role: "error"; text: string; retry: string };

type CalendarState = { status: "loading" } | { status: "signin" } | { status: "unavailable" } | { status: "ready"; data: TodayCalendar };

const SectionHeading = ({ icon: Icon, children }: { icon: typeof Sparkles; children: string }) => (
  <div className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#B9722F]">
    <Icon className="h-3.5 w-3.5" aria-hidden="true" />
    {children}
  </div>
);

/** The verified calendar facts as small chips. Only the values that exist are shown. */
const CalendarChips = ({ calendar }: { calendar: TodayCalendar }) => {
  const { t } = useTranslation();
  return (
  <ul className="flex flex-wrap gap-2" aria-label={t("karma.aria.calendar")}>
    {localizedFacts(calendar).map((f) => (
      <li key={f.label} className="rounded-full border border-[#E58A45]/45 bg-[#F5E9D6] px-3 py-1 text-[13px] text-[#4A2E1F]">
        <span className="text-[#6B4A37]">{f.label}: </span>
        <span className="font-semibold text-[#592209]">{f.value}</span>
      </li>
    ))}
  </ul>
  );
};

const BotAvatar = () => (
  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#FFFBF3] ring-1 ring-[#E58A45]/50">
    <LotusOm size={26} />
  </span>
);

function BotAnswer({ answer, hasCalendar }: { answer: KarmaAnswer; hasCalendar: boolean }) {
  const { t } = useTranslation();
  return (
    <div className="space-y-4 text-[15px] leading-relaxed text-[#301607]" data-testid="karma-answer">
      {!hasCalendar && (
        <p className="rounded-xl bg-[#F5E9D6] px-3 py-2 text-[13px] text-[#6B4A37]">{t("karma.noCalNote")}</p>
      )}
      <section>
        <SectionHeading icon={Lightbulb}>{t("karma.thought")}</SectionHeading>
        <p>{answer.thought}</p>
      </section>
      <section>
        <SectionHeading icon={HandHeart}>{t("karma.action")}</SectionHeading>
        <p>{answer.action}</p>
      </section>
      {answer.remember && (
        <section>
          <SectionHeading icon={Heart}>{t("karma.remember")}</SectionHeading>
          <p className="italic">{answer.remember}</p>
        </section>
      )}
      <p className="border-t border-[#592209]/10 pt-2 text-[11px] text-[#6B4A37]">{t("karma.footer")}</p>
    </div>
  );
}

export default function KarmaBot({ onAnswered }: { onAnswered?: (summary: string) => void }) {
  const reduce = useReducedMotion();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user) as { firstName?: string } | null;
  const { t, i18n } = useTranslation(); // the ONE site language: labels follow i18n.language, the reply follows replyLanguage()
  const [calendar, setCalendar] = useState<CalendarState>({ status: "loading" });
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const busy = useRef(false); // a question is sent once, even if the button is pressed twice
  const nextId = useRef(1);
  const bottomRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<{ stop: () => void } | null>(null);

  // The calendar needs a signed-in session (the backend checks it). Sign-in later fills it in.
  useEffect(() => {
    if (!isAuthenticated) { setCalendar({ status: "signin" }); return; }
    let cancelled = false;
    setCalendar({ status: "loading" });
    fetchTodayCalendar()
      .then((data) => { if (!cancelled) setCalendar(data ? { status: "ready", data } : { status: "unavailable" }); })
      .catch(() => { if (!cancelled) setCalendar({ status: "unavailable" }); });
    return () => { cancelled = true; };
  }, [isAuthenticated]);

  useEffect(() => { bottomRef.current?.scrollIntoView?.({ behavior: reduce ? "auto" : "smooth", block: "end" }); }, [messages, loading, reduce]);

  const calendarData = calendar.status === "ready" ? calendar.data : null;
  const asked = useMemo(() => new Set(messages.filter((m) => m.role === "user").map((m) => (m as { text: string }).text)), [messages]);
  const suggestions = useMemo(() => {
    const base = BASE_QUESTION_KEYS.map((k) => t(k));
    const list = calendarData ? [tithiQuestion(calendarData), ...base] : base;
    const open = list.filter((q) => !asked.has(q));
    return open.slice(0, messages.length > 1 ? 3 : 6);
  }, [calendarData, asked, messages.length, t, i18n.language]);

  const turns = (): KarmaTurn[] => {
    const out: KarmaTurn[] = [];
    messages.forEach((m, i) => {
      if (m.role !== "bot") return;
      const q = messages.slice(0, i).reverse().find((x) => x.role === "user") as { text: string } | undefined;
      if (q) out.push({ question: q.text, answer: m.answer });
    });
    return out;
  };

  const send = useCallback(async (raw: string, opts: { retry?: boolean } = {}) => {
    const question = raw.trim().slice(0, MAX_SITUATION_CHARS);
    if (question.length < MIN_SITUATION_CHARS || busy.current) return;
    if (!requireSignIn(() => { void send(raw, opts); })) return; // signed out: ask first, the typed text stays
    busy.current = true;
    setInput("");
    setMessages((prev) => {
      const cleaned = prev.filter((m) => m.role !== "error");
      return opts.retry ? cleaned : [...cleaned, { id: nextId.current++, role: "user", text: question }];
    });
    setLoading(true);
    try {
      const answer = await askKarma(question, calendarData, turns(), replyLanguage());
      setMessages((prev) => [...prev, { id: nextId.current++, role: "bot", answer, hasCalendar: !!calendarData }]);
      onAnswered?.(`${answer.thought} ${answer.action}`);
    } catch (e) {
      console.error("[Know Your Karma] request failed:", e);
      const text = e instanceof KarmaReadingError ? e.message : t("karma.errors.generic");
      setMessages((prev) => [...prev, { id: nextId.current++, role: "error", text, retry: question }]);
    } finally {
      busy.current = false;
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calendarData, messages, t]);

  const toggleVoice = () => {
    const w = window as unknown as SpeechWindow;
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SR) { setMessages((p) => [...p, { id: nextId.current++, role: "error", text: t("karma.errors.voice"), retry: "" }]); return; }
    if (listening) { recognitionRef.current?.stop(); setListening(false); return; }
    const rec = new SR();
    rec.continuous = false; rec.interimResults = true; rec.lang = `${LOCALES.some((l) => l.code === i18n.language) ? i18n.language : "en"}-IN`;
    rec.onresult = (e: { results: ArrayLike<{ 0: { transcript: string } }> }) => setInput(Array.from(e.results).map((r) => r[0].transcript).join(" "));
    rec.onend = () => setListening(false);
    rec.start(); recognitionRef.current = rec; setListening(true);
  };

  const fade = reduce ? {} : { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.28 } };
  const first = user?.firstName?.trim();

  return (
    <section aria-label={t("karma.aria.guide")} className="mx-auto w-full max-w-4xl overflow-hidden rounded-[28px] border border-[#E58A45]/50 bg-gradient-to-b from-[#FFFBF3] to-[#FBF5EC] shadow-[0_24px_60px_-34px_rgba(89,34,9,0.55)]">
      {/* Today's calendar, shown once for the whole conversation */}
      <div className="border-b border-[#E58A45]/25 px-5 py-4" data-testid="karma-calendar" title={calendar.status === "ready" ? t("karma.calendar.calculatedFor", { place: calendar.data.place }) : undefined}>
        {calendar.status === "loading" && <p className="text-xs text-[#6B4A37]">{t("karma.calLoading")}</p>}
        {calendar.status === "signin" && (
          <p className="text-xs text-[#6B4A37]">
            <button type="button" className="underline underline-offset-2" onClick={() => requireSignIn()}>{t("karma.signIn")}</button>{" "}{t("karma.signInRest")}
          </p>
        )}
        {calendar.status === "unavailable" && <p className="text-xs text-[#6B4A37]">{t("karma.calUnavailable")}</p>}
        {calendar.status === "ready" && (
          <>
            <SectionHeading icon={CalendarDays}>{t("karma.calendarTitle")}</SectionHeading>
            <CalendarChips calendar={calendar.data} />
            <div className="mt-3 rounded-xl bg-white/70 px-3 py-2.5" data-testid="karma-calendar-meaning">
              <SectionHeading icon={Sparkles}>{t("karma.meaning")}</SectionHeading>
              <p className="text-[13px] leading-relaxed text-[#4A2E1F]">{calendarMeaning(calendar.data)}</p>
            </div>
          </>
        )}
      </div>

      <div className="max-h-[560px] min-h-[260px] space-y-5 overflow-y-auto px-4 py-5 sm:px-6" role="log" aria-live="polite" aria-label={t("karma.aria.conversation")}>
        {/* Welcome */}
        <motion.div className="flex items-start gap-3" {...fade}>
          <BotAvatar />
          <div className="max-w-[88%] rounded-2xl rounded-tl-sm border border-[#592209]/12 bg-white/80 px-4 py-3.5 text-[15px] leading-relaxed text-[#301607] shadow-sm">
            <p className="font-medium text-[#592209]">{t("karma.hello")}{first ? `, ${first}` : ""}.</p>
            <p className="mt-1">{t("karma.intro")}</p>
          </div>
        </motion.div>

        <AnimatePresence initial={false}>
          {messages.map((m) =>
            m.role === "user" ? (
              <motion.div key={m.id} className="flex items-start justify-end gap-3" {...fade}>
                <div className="max-w-[82%] rounded-2xl rounded-tr-sm bg-[#592209] px-4 py-3 text-[15px] leading-relaxed text-[#FBF5EC] shadow-sm">{m.text}</div>
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#F5E9D6] text-[#592209] ring-1 ring-[#592209]/20"><User className="h-4 w-4" aria-hidden="true" /></span>
              </motion.div>
            ) : m.role === "bot" ? (
              <motion.div key={m.id} className="flex items-start gap-3" {...fade}>
                <BotAvatar />
                <div className="max-w-[92%] rounded-2xl rounded-tl-sm border border-[#592209]/12 bg-white/85 px-4 py-4 shadow-sm">
                  <BotAnswer answer={m.answer} hasCalendar={m.hasCalendar} />
                </div>
              </motion.div>
            ) : (
              <motion.div key={m.id} className="flex items-start gap-3" {...fade}>
                <BotAvatar />
                <div role="alert" className="max-w-[88%] rounded-2xl rounded-tl-sm border border-[#B5502F]/35 bg-[#FBEDE6] px-4 py-3 text-sm text-[#7A2E14]">
                  <TriangleAlert className="mr-1.5 inline h-4 w-4 align-[-2px]" aria-hidden="true" />
                  {m.text}
                  {m.retry && (
                    <button type="button" onClick={() => void send(m.retry, { retry: true })} className="ml-3 inline-flex items-center gap-1 font-semibold underline underline-offset-2">
                      <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" /> {t("karma.tryAgain")}
                    </button>
                  )}
                </div>
              </motion.div>
            ),
          )}
        </AnimatePresence>

        {loading && (
          <div className="flex items-start gap-3" role="status" aria-label={t("karma.aria.thinking")} data-testid="karma-typing">
            <BotAvatar />
            <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-sm border border-[#592209]/12 bg-white/85 px-4 py-4">
              {[0, 1, 2].map((d) => (
                <motion.span
                  key={d}
                  className="h-2 w-2 rounded-full bg-[#E58A45]"
                  animate={reduce ? { opacity: 0.7 } : { opacity: [0.3, 1, 0.3], y: [0, -3, 0] }}
                  transition={reduce ? undefined : { duration: 0.9, repeat: Infinity, delay: d * 0.15 }}
                />
              ))}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Suggested questions */}
      {suggestions.length > 0 && (
        <div className="border-t border-[#E58A45]/20 px-4 pb-1 pt-4 sm:px-6">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#6B4A37]">{messages.length > 1 ? t("karma.askAnother") : t("karma.tryAsking")}</p>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2" data-testid="karma-suggestions">
            {suggestions.map((q) => (
              <motion.button
                key={q}
                type="button"
                onClick={() => void send(q)}
                disabled={loading}
                whileHover={reduce ? undefined : { y: -2 }}
                whileTap={reduce ? undefined : { scale: 0.98 }}
                className="flex min-h-[52px] items-center rounded-2xl border border-[#E58A45]/45 bg-[#FFFBF3] px-4 py-3 text-left text-[14px] leading-snug text-[#4A2E1F] transition-colors hover:border-[#E58A45] hover:bg-[#F5E9D6] disabled:opacity-60"
              >
                {q}
              </motion.button>
            ))}
          </div>
        </div>
      )}

      {/* Composer */}
      <form
        className="flex items-end gap-2 px-4 pb-5 pt-4 sm:px-6"
        onSubmit={(e) => { e.preventDefault(); void send(input); }}
      >
        <label htmlFor="karma-input" className="sr-only">{t("karma.aria.input")}</label>
        <textarea
          id="karma-input"
          rows={1}
          value={input}
          maxLength={MAX_SITUATION_CHARS}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(input); } }}
          placeholder={t("karma.placeholder")}
          className="min-h-[48px] flex-1 resize-none rounded-2xl border border-[#592209]/25 bg-white px-4 py-3 text-[15px] text-[#301607] placeholder:text-[#6B4A37]/80 focus:border-[#E58A45] focus:outline-none focus:ring-2 focus:ring-[#E58A45]/30"
        />
        <button type="button" onClick={toggleVoice} aria-label={listening ? t("karma.aria.stopListening") : t("karma.aria.speak")} className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-[#592209]/25 bg-white text-[#592209] transition-colors hover:bg-[#F5E9D6]">
          {listening ? <MicOff className="h-4 w-4" aria-hidden="true" /> : <Mic className="h-4 w-4" aria-hidden="true" />}
        </button>
        <button type="submit" aria-label={t("karma.aria.send")} disabled={loading || input.trim().length < MIN_SITUATION_CHARS} className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#592209] text-[#F5E9D6] transition-opacity disabled:opacity-45">
          <Send className="h-4 w-4" aria-hidden="true" />
        </button>
      </form>
    </section>
  );
}
