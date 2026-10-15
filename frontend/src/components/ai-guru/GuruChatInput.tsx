import { forwardRef, type KeyboardEvent } from "react";
import { motion } from "framer-motion";
import { Sparkles, Smile, Mic, Paperclip, Send, CircleDot } from "lucide-react";

interface GuruChatInputProps {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  onKeyDown: (e: KeyboardEvent<HTMLTextAreaElement>) => void;
  listening: boolean;
  onToggleVoice: () => void;
  loading: boolean;
  /** Briefly true right after a suggested question is inserted, to pulse the glow. */
  glowPulse?: boolean;
}

const GuruChatInput = forwardRef<HTMLTextAreaElement, GuruChatInputProps>(
  ({ value, onChange, onSend, onKeyDown, listening, onToggleVoice, loading, glowPulse }, ref) => (
    <>
      <motion.div
        animate={
          glowPulse
            ? { boxShadow: "0 0 0 3px rgba(255,157,77,0.35)", borderColor: "rgba(255,157,77,0.5)" }
            : { boxShadow: "0 0 0 0px rgba(255,157,77,0)", borderColor: "rgba(255,255,255,0.08)" }
        }
        transition={{ duration: 0.28, ease: "easeInOut" }}
        className="flex w-full items-center gap-3 rounded-2xl border bg-[#17181F] px-4 py-2.5 focus-within:border-[#FF9D4D]/40 focus-within:shadow-[0_0_0_3px_rgba(255,157,77,0.12)]"
      >
        <Sparkles className="h-4 w-4 shrink-0 text-[#FF9D4D]" />
        <textarea
          ref={ref}
          rows={1}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={listening ? "Listening… speak now" : "Ask Pandit Ji anything…"}
          aria-label="Message Pandit Ji"
          className="min-h-[24px] max-h-[140px] flex-1 resize-none bg-transparent p-0 text-[15px] leading-6 text-white placeholder:text-[#6B7280] focus:outline-none"
        />
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            aria-label="Insert emoji"
            className="flex h-9 w-9 items-center justify-center rounded-full text-[#A3A3B2] transition-colors hover:bg-white/5 hover:text-white"
          >
            <Smile className="h-[18px] w-[18px]" />
          </button>
          <button
            type="button"
            onClick={onToggleVoice}
            aria-label={listening ? "Stop voice input" : "Start voice input"}
            className={`flex h-9 w-9 items-center justify-center rounded-full transition-colors ${
              listening
                ? "bg-[#FF9D4D]/20 text-[#FF9D4D]"
                : "text-[#A3A3B2] hover:bg-white/5 hover:text-white"
            }`}
          >
            {listening ? (
              <motion.span
                animate={{ opacity: [1, 0.4, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
              >
                <CircleDot className="h-[18px] w-[18px]" />
              </motion.span>
            ) : (
              <Mic className="h-[18px] w-[18px]" />
            )}
          </button>
          <button
            type="button"
            aria-label="Attach file"
            className="flex h-9 w-9 items-center justify-center rounded-full text-[#A3A3B2] transition-colors hover:bg-white/5 hover:text-white"
          >
            <Paperclip className="h-[18px] w-[18px]" />
          </button>
          <motion.button
            type="button"
            onClick={onSend}
            disabled={!value.trim() || loading}
            whileHover={value.trim() && !loading ? { scale: 1.08 } : undefined}
            whileTap={value.trim() && !loading ? { scale: 0.94 } : undefined}
            aria-label="Send message"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[#FF9D4D] to-[#E88B3D] text-[#1A0F08] shadow-[0_0_16px_rgba(255,157,77,0.4)] transition-opacity disabled:opacity-30 disabled:shadow-none"
          >
            <Send className="h-4 w-4" />
          </motion.button>
        </div>
      </motion.div>
      <p className="mt-2.5 text-center text-[11px] text-[#6B7280]">
        Press Enter to send · Shift + Enter for new line · 🎙️ for voice
      </p>
    </>
  ),
);

GuruChatInput.displayName = "GuruChatInput";

export default GuruChatInput;
