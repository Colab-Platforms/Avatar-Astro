import { forwardRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { GuruMessage } from "./types";

interface GuruConversationProps {
  messages: GuruMessage[];
  loading: boolean;
}

/**
 * The live conversation, rendered full-width in the center content column
 * (same place the welcome/cards/timeline live) — this is the ChatGPT/Claude
 * pattern: welcome screen OR conversation, never both, never split across
 * columns.
 */
const GuruConversation = forwardRef<HTMLDivElement, GuruConversationProps>(
  ({ messages, loading }, bottomRef) => (
    <div className="flex w-full flex-col gap-5 py-2">
      <AnimatePresence initial={false}>
        {messages.map((msg, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className={`flex items-start gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
          >
            <div
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-base ${
                msg.role === "user"
                  ? "bg-card ring-1 ring-primary/25"
                  : "bg-gradient-to-br from-[#592209]/40 to-[#592209]/15 ring-1 ring-[#592209]/30"
              }`}
            >
              {msg.role === "user" ? "🙏" : "🧘"}
            </div>
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 text-[15px] leading-relaxed ${
                msg.role === "user"
                  ? "rounded-tr-sm bg-gradient-to-br from-[#592209] to-[#592209] text-[#F5E9D6]"
                  : "rounded-tl-sm border border-primary/15 bg-[#FBF5EC] text-[#301607] shadow-[0_2px_16px_rgba(89,34,9,0.12)] [&_a]:text-[#592209] [&_a]:underline [&_strong]:font-semibold [&_strong]:text-[#301607] [&_em]:text-[#301607] [&_blockquote]:border-l-2 [&_blockquote]:border-[#E58A45] [&_blockquote]:pl-3"
              }`}
            >
              {typeof msg.content === "string"
                ? msg.content
                : msg.content?.message || msg.content?.guidance || "…"}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      {loading && (
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#592209]/40 to-[#592209]/15 text-base ring-1 ring-[#592209]/30">
            🧘
          </div>
          <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-sm border border-primary/15 bg-[#FBF5EC] px-4 py-3.5">
            {[0, 1, 2].map((d) => (
              <motion.span
                key={d}
                className="h-1.5 w-1.5 rounded-full bg-[#592209]"
                animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }}
                transition={{ duration: 0.9, repeat: Infinity, delay: d * 0.15 }}
              />
            ))}
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  ),
);

GuruConversation.displayName = "GuruConversation";

export default GuruConversation;
