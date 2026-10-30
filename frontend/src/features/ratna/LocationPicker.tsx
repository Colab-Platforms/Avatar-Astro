import { useEffect, useId, useRef, useState } from "react";
import { ratnaApi } from "./api";
import type { PlaceResult } from "./types";

interface Props {
  value: PlaceResult | null;
  onSelect: (place: PlaceResult | null) => void;
  error?: string;
  disabled?: boolean;
}

/** Searchable birthplace combobox. Typed text alone is never a selection. */
const LocationPicker = ({ value, onSelect, error, disabled }: Props) => {
  const id = useId();
  const [text, setText] = useState(value?.label ?? "");
  const [options, setOptions] = useState<PlaceResult[]>([]);
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<"idle" | "loading" | "empty" | "error">("idle");
  const [active, setActive] = useState(-1);
  const [errorMsg, setErrorMsg] = useState("");
  const [retryTick, setRetryTick] = useState(0);
  const reqId = useRef(0);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = text.trim();
    if (value || q.length < 2) {
      setOptions([]);
      setState("idle");
      return;
    }
    const ctrl = new AbortController();
    const id = ++reqId.current;
    const timer = setTimeout(async () => {
      setState("loading");
      try {
        const res = await ratnaApi.searchLocations(q, ctrl.signal);
        if (id !== reqId.current) return; // an older response must not win
        setOptions(res);
        setState(res.length ? "idle" : "empty");
        setActive(-1);
      } catch (e) {
        if (id !== reqId.current || (e as Error)?.name === "AbortError") return;
        const err = e as { status?: number; message?: string };
        setErrorMsg(
          err.status === 404 || err.message === "Unexpected response from server."
            ? "Location search is not available on the server you are connected to. It may need to be updated."
            : err.message || "Location search is unavailable right now.",
        );
        setOptions([]);
        setState("error");
      }
    }, 350);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [text, value, retryTick]);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const choose = (p: PlaceResult) => {
    setText(p.label);
    setOpen(false);
    onSelect(p);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((a) => Math.min(a + 1, options.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter" && open && active >= 0 && options[active]) {
      e.preventDefault();
      choose(options[active]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  const showList = open && !value && text.trim().length >= 2;

  return (
    <div ref={wrapRef} className="relative">
      <input
        id={id}
        type="text"
        role="combobox"
        aria-label="Birthplace"
        aria-expanded={showList}
        aria-controls={`${id}-list`}
        aria-autocomplete="list"
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-err` : undefined}
        aria-activedescendant={active >= 0 ? `${id}-opt-${active}` : undefined}
        autoComplete="off"
        className="ratna-input pr-11"
        placeholder="Search city or town"
        value={text}
        disabled={disabled}
        onChange={(e) => {
          setText(e.target.value);
          setOpen(true);
          if (value) onSelect(null); // editing invalidates the confirmed place
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
      />
      <span className="ratna-combo-chevron" aria-hidden="true" />
      {value && (
        <p className="mt-1 text-sm font-medium text-[#2F6B3A]">
          Selected: {value.label} ({value.timezone})
        </p>
      )}
      {showList && (
        <ul
          id={`${id}-list`}
          role="listbox"
          className="ratna-listbox absolute z-30 mt-1 max-h-64 w-full overflow-auto"
        >
          {state === "loading" && <li className="px-4 py-3 text-[#4A2E1F]">Searching…</li>}
          {state === "empty" && <li className="px-4 py-3 text-[#4A2E1F]">No places found. Try a nearby larger town.</li>}
          {state === "error" && (
            <li className="px-4 py-3 text-[#7A2216]">
              {errorMsg}{" "}
              <button
                type="button"
                className="ml-1 underline"
                onMouseDown={(e) => {
                  e.preventDefault();
                  setRetryTick((n) => n + 1);
                }}
              >
                Retry
              </button>
            </li>
          )}
          {options.map((p, i) => (
            <li
              key={p.id}
              id={`${id}-opt-${i}`}
              role="option"
              aria-selected={i === active}
              className="ratna-option cursor-pointer px-4 py-2.5"
              onMouseDown={(e) => {
                e.preventDefault();
                choose(p);
              }}
            >
              {p.label}
            </li>
          ))}
        </ul>
      )}
      {error && (
        <p id={`${id}-err`} role="alert" className="mt-1 text-sm font-medium text-[#9B2C1D]">
          {error}
        </p>
      )}
    </div>
  );
};

export default LocationPicker;
