/** A registration number on a plain plate. Deliberately simple: an ordinary number should not look like a premium plate. Leading zeros are kept. */
export default function NumberPlate({ number, size = "lg", label }: { number: string; size?: "lg" | "md" | "sm"; label?: string }) {
  const text = size === "lg" ? "text-5xl sm:text-6xl" : size === "md" ? "text-4xl" : "text-2xl";
  const pad = size === "sm" ? "px-4 py-1.5" : size === "md" ? "px-5 py-2.5" : "px-6 py-3.5";
  return (
    <div
      role="img"
      aria-label={label ?? `Vehicle number ${number.split("").join(" ")}`}
      className={`mx-auto w-fit max-w-full rounded-xl border-2 border-[#592209]/70 bg-[#FFFDF6] shadow-sm ${pad}`}
    >
      <p aria-hidden="true" data-testid="plate-number" className={`px-2 text-center font-bold leading-none tracking-[0.12em] text-[#301607] ${text}`} style={{ fontFamily: "'Astra','Cinzel',Georgia,serif" }}>
        {number}
      </p>
    </div>
  );
}
