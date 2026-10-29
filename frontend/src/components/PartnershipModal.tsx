import { useRef, useState } from "react";
import { Loader2, CheckCircle2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EMPTY_PARTNERSHIP, submitPartnership, validatePartnership, type PartnershipErrors, type PartnershipForm } from "@/lib/inquiry";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const inputCls =
  "w-full rounded-lg border border-[#592209]/30 bg-white px-3 py-2.5 text-base text-[#2C1810] placeholder:text-[#2C1810]/35 focus:border-[#592209] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#592209]/40";
const labelCls = "mb-1 block text-sm font-semibold text-[#2C1810]";
const errCls = "mt-1 text-sm text-red-700";

const PartnershipModal = ({ open, onOpenChange }: Props) => {
  const [form, setForm] = useState<PartnershipForm>(EMPTY_PARTNERSHIP);
  const [errors, setErrors] = useState<PartnershipErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [done, setDone] = useState(false);
  // A ref (not state) so a fast double-click cannot start two submissions before React re-renders.
  const inFlight = useRef(false);

  const set = (k: keyof PartnershipForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    if (errors[k]) setErrors((er) => ({ ...er, [k]: undefined }));
  };

  const handleOpenChange = (next: boolean) => {
    // Never discard what was typed while a request is running.
    if (!next && submitting) return;
    onOpenChange(next);
    if (!next && done) {
      // Fresh form next time, but only after a confirmed delivery.
      setForm(EMPTY_PARTNERSHIP);
      setDone(false);
      setErrors({});
      setFormError("");
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (inFlight.current) return;
    const found = validatePartnership(form);
    setErrors(found);
    setFormError("");
    if (Object.keys(found).length) return;
    inFlight.current = true;
    setSubmitting(true);
    try {
      const result = await submitPartnership(form);
      if (result.ok) setDone(true);
      else {
        setFormError(result.message || "We couldn't send your message. Please try again.");
        if (result.fields) setErrors(result.fields);
      }
    } finally {
      inFlight.current = false;
      setSubmitting(false);
    }
  };

  const field = (k: keyof PartnershipForm, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <div>
      <label htmlFor={`pm-${k}`} className={labelCls}>
        {label}
      </label>
      <input
        id={`pm-${k}`}
        value={form[k]}
        onChange={set(k)}
        className={inputCls}
        aria-invalid={!!errors[k]}
        aria-describedby={errors[k] ? `pm-${k}-err` : undefined}
        disabled={submitting}
        {...props}
      />
      {errors[k] && (
        <p id={`pm-${k}-err`} className={errCls}>
          {errors[k]}
        </p>
      )}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] w-[calc(100%-2rem)] max-w-lg overflow-y-auto border-[#592209]/25 bg-[#FFFBF5] p-5 text-[#2C1810] sm:p-7">
        {done ? (
          <div className="py-6 text-center" role="status">
            <CheckCircle2 className="mx-auto mb-3 text-[#592209]" size={44} aria-hidden="true" />
            <DialogTitle className="mb-2 text-xl">Thank you</DialogTitle>
            <DialogDescription className="text-[#2C1810]/75">
              Our team has received your partnership enquiry and will reply to {form.email.trim()}.
            </DialogDescription>
            <button
              type="button"
              onClick={() => handleOpenChange(false)}
              className="mt-6 rounded-lg bg-[#592209] px-6 py-2.5 text-sm font-bold uppercase tracking-wider text-[#F5E9D6] hover:bg-[#461B07]"
            >
              Close
            </button>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="text-xl">Partner With Us</DialogTitle>
              <DialogDescription className="text-[#2C1810]/70">
                Tell us about your temple and we will get back to you about bringing your darshan online.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={onSubmit} noValidate className="space-y-3.5" aria-busy={submitting}>
              {field("name", "Your name", { autoComplete: "name", maxLength: 100 })}
              {field("email", "Email", { type: "email", autoComplete: "email", maxLength: 254 })}
              {field("phone", "Phone", { type: "tel", autoComplete: "tel", maxLength: 30, placeholder: "+91 98765 43210" })}
              {field("organisation", "Temple / organisation", { maxLength: 150 })}
              {field("city", "City", { maxLength: 100 })}
              <div>
                <label htmlFor="pm-message" className={labelCls}>
                  How would you like to partner?
                </label>
                <textarea
                  id="pm-message"
                  rows={4}
                  maxLength={2000}
                  value={form.message}
                  onChange={set("message")}
                  className={inputCls}
                  aria-invalid={!!errors.message}
                  aria-describedby={errors.message ? "pm-message-err" : undefined}
                  disabled={submitting}
                />
                {errors.message && (
                  <p id="pm-message-err" className={errCls}>
                    {errors.message}
                  </p>
                )}
              </div>
              {/* Honeypot: hidden from people and assistive tech; bots tend to fill it. */}
              <div aria-hidden="true" style={{ position: "absolute", left: "-9999px", height: 0, overflow: "hidden" }}>
                <label htmlFor="pm-website">Website</label>
                <input id="pm-website" tabIndex={-1} autoComplete="off" value={form.website} onChange={set("website")} />
              </div>
              {formError && (
                <div role="alert" className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">
                  {formError}
                </div>
              )}
              <button
                type="submit"
                disabled={submitting}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#592209] px-6 py-3 text-sm font-bold uppercase tracking-wider text-[#F5E9D6] transition hover:bg-[#461B07] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? (
                  <>
                    <Loader2 className="animate-spin" size={16} aria-hidden="true" /> Sending…
                  </>
                ) : formError ? (
                  "Try again"
                ) : (
                  "Send enquiry"
                )}
              </button>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default PartnershipModal;
