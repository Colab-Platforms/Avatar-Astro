import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FEATURES, type FeatureKey } from "@/data/featureCatalog";
import { requireSignIn } from "@/lib/authedFetch";
import { MAX_GURU_INPUT_CHARS } from "@/lib/guruChat";
import { saveHandoff } from "@/lib/guruHandoff";

const MIN_CHARS = 5;

interface Props {
  /** The feature whose result is on screen. */
  feature: FeatureKey;
  /** Short plain-text summary of the user's own result, shared with Divya Margdarshak along with the question. */
  context: string;
  className?: string;
}

/**
 * "Need More Guidance?" box shown under a result. Sending opens Divya Margdarshak with the question and a
 * summary of this result already filled in. Signed-out visitors go through the central sign-in gate and the
 * question is sent once they have signed in.
 */
const AskDivyaSection = ({ feature, context, className = "" }: Props) => {
  const navigate = useNavigate();
  const [question, setQuestion] = useState("");
  const [error, setError] = useState("");

  const go = (q: string) => {
    saveHandoff({ question: q, feature, featureName: FEATURES[feature].name, context });
    navigate(FEATURES.guru.path);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = question.trim();
    if (q.length < MIN_CHARS) {
      setError("Please write your question first.");
      return;
    }
    setError("");
    if (!requireSignIn(() => go(q))) return; // signed out: sign in first, the question stays in the box
    go(q);
  };

  return (
    <section
      aria-labelledby={`ask-divya-${feature}`}
      data-testid="ask-divya"
      className={`mx-auto mt-8 w-full max-w-3xl rounded-2xl border border-[#592209]/20 bg-[#FBF5EC] p-5 text-left shadow-[0_6px_24px_rgba(89,34,9,0.06)] ${className}`}
    >
      <h2 id={`ask-divya-${feature}`} className="font-home-serif text-xl font-semibold text-[#592209] sm:text-2xl">
        Need More Guidance?
      </h2>
      <p className="mt-1 text-base text-[#4A2E1F]">
        Have more questions about your reading? Connect with Divya Margdarshak for deeper guidance.
      </p>
      <form onSubmit={submit} className="mt-3 flex flex-col gap-2 sm:flex-row" noValidate>
        <label htmlFor={`ask-divya-q-${feature}`} className="sr-only">
          Your question
        </label>
        <input
          id={`ask-divya-q-${feature}`}
          type="text"
          value={question}
          maxLength={MAX_GURU_INPUT_CHARS}
          onChange={(e) => {
            setQuestion(e.target.value);
            setError("");
          }}
          placeholder="Ask a question about your result..."
          aria-invalid={!!error}
          aria-describedby={error ? `ask-divya-err-${feature}` : undefined}
          className="min-w-0 flex-1 rounded-lg border border-[#592209]/30 bg-white px-4 py-3 text-base text-[#301607] placeholder:text-[#6B4A37]/80 focus:border-[#E58A45] focus:outline-none focus:ring-2 focus:ring-[#E58A45]/40"
        />
        <button
          type="submit"
          className="rounded-lg bg-[#592209] px-6 py-3 text-base font-semibold text-[#F5E9D6] transition-colors hover:bg-[#461B07] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E58A45]"
        >
          Ask Divya
        </button>
      </form>
      {error && (
        <p id={`ask-divya-err-${feature}`} role="alert" className="mt-1.5 text-sm font-medium text-[#9B2C1D]">
          {error}
        </p>
      )}
    </section>
  );
};

export default AskDivyaSection;
