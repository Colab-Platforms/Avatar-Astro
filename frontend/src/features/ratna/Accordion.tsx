import { useId, useState } from "react";

interface Props {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

/**
 * Disclosure with a smooth height transition (grid 0fr -> 1fr). Closed content
 * is `visibility: hidden`, so it leaves the tab order and the accessibility tree.
 */
const Accordion = ({ title, children, defaultOpen = false }: Props) => {
  const [open, setOpen] = useState(defaultOpen);
  const uid = useId();
  return (
    <div className="ratna-acc" data-open={open}>
      <h3>
        <button
          type="button"
          id={`${uid}-btn`}
          className="ratna-acc-btn"
          aria-expanded={open}
          aria-controls={`${uid}-panel`}
          onClick={() => setOpen((o) => !o)}
        >
          <span>{title}</span>
          <span className="ratna-acc-chev" aria-hidden="true" />
        </button>
      </h3>
      <div
        id={`${uid}-panel`}
        role="region"
        aria-labelledby={`${uid}-btn`}
        className="ratna-acc-panel"
        data-open={open}
      >
        <div className="ratna-acc-inner">
          <div className="space-y-3 pb-4 pt-1 text-base text-muted-foreground">{children}</div>
        </div>
      </div>
    </div>
  );
};

export default Accordion;
