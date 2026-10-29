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
            ? { boxShadow: "0 0 0 3px rgba(89,34,9,0.35)", borderColor: "rgba(89,34,9,0.5)" }
            : { boxShadow: "0 0 0 0px rgba(89,34,9,0)", borderColor: "rgba(89,34,9,0.2)" }
        }
        transition={{ duration: 0.28, ease: "easeInOut" }}
        className="flex w-full items-center gap-3 rounded-2xl border bg-[#FBF5EC] px-4 py-2.5 focus-within:border-[#592209]/40 focus-within:shadow-[0_0_0_3px_rgba(255,157,77,0.12)]"
      >
        <Sparkles className="h-4 w-4 shrink-0 text-[#592209]" />
        <textarea
          ref={ref}
          rows={1}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={listening ? "Listening… speak now" : "Ask Pandit Ji anything…"}
          aria-label="Message Pandit Ji"
          className="min-h-[24px] max-h-[140px] flex-1 resize-none bg-transparent p-0 text-[15px] leading-6 text-foreground placeholder:text-muted-foreground focus:outline-none"
        />
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            aria-label="Insert emoji"
            className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-primary/10 hover:text-foreground"
          >
            <Smile className="h-[18px] w-[18px]" />
          </button>
          <button
            type="button"
            onClick={onToggleVoice}
            aria-label={listening ? "Stop voice input" : "Start voice input"}
            className={`flex h-9 w-9 items-center justify-center rounded-full transition-colors ${
              listening
                ? "bg-[#592209]/20 text-[#FF9D4D]"
                : "text-muted-foreground hover:bg-primary/10 hover:text-foreground"
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
            className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-primary/10 hover:text-foreground"
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
            className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[#592209] to-[#592209] text-[#F5E9D6] shadow-[0_0_16px_rgba(255,157,77,0.4)] transition-opacity disabled:opacity-30 disabled:shadow-none"
          >
            <Send className="h-4 w-4" />
          </motion.button>
        </div>
      </motion.div>
      <p className="mt-2.5 text-center text-[11px] text-muted-foreground">
        Press Enter to send · Shift + Enter for new line · 🎙️ for voice
      </p>
    </>
  ),
);

GuruChatInput.displayName = "GuruChatInput";

export default GuruChatInput;
