/** Small "NEW • ADVANCED" tag shown beside Karma Mirror. Decorative styling only; the text is real, so it is read aloud. */
const NewAdvancedBadge = ({ className = "" }: { className?: string }) => (
  <span
    data-testid="new-advanced-badge"
    className={`inline-flex shrink-0 items-center whitespace-nowrap rounded-full border border-[#B8892B]/70 bg-gradient-to-r from-[#FFF1CC] to-[#F7DC8A] px-2 py-0.5 align-middle font-sans text-[0.62rem] font-bold uppercase leading-none tracking-[0.08em] text-[#592209] shadow-[0_0_10px_rgba(229,138,69,0.45)] ${className}`}
  >
    NEW • ADVANCED
  </span>
);

export default NewAdvancedBadge;
