import { useRef, useState, useCallback } from "react";

interface SpeechRecognitionOptions {
  lang?: string;
  onResult?: (transcript: string, isFinal: boolean) => void;
  onEnd?: () => void;
  onError?: (error: string) => void;
}

export function useSpeechRecognition(options: SpeechRecognitionOptions = {}) {
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const recognitionRef = useRef<any>(null);
  const [listening, setListening] = useState(false);

  const supported =
    typeof window !== "undefined" &&
    !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

  const start = useCallback(() => {
    const SR =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    if (!SR) {
      optionsRef.current.onError?.(
        "Speech recognition is not supported in this browser. Please use Chrome or Edge."
      );
      return;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {}
    }

    const { lang = "hi-IN" } = optionsRef.current;
    const rec = new SR();
    rec.continuous = false;
    rec.interimResults = true;
    rec.lang = lang;

    rec.onresult = (e: any) => {
      const t = Array.from(e.results as any[])
        .map((r: any) => r[0].transcript)
        .join(" ");
      const isFinal = e.results[e.results.length - 1].isFinal;
      optionsRef.current.onResult?.(t, isFinal);
    };

    rec.onerror = (e: any) => {
      setListening(false);
      optionsRef.current.onError?.(e.error || "recognition-error");
    };

    rec.onend = () => {
      setListening(false);
      optionsRef.current.onEnd?.();
    };

    rec.start();
    recognitionRef.current = rec;
    setListening(true);
  }, []);

  const stop = useCallback(() => {
    try {
      recognitionRef.current?.stop();
    } catch {}
    setListening(false);
  }, []);

  return { start, stop, listening, supported };
}
