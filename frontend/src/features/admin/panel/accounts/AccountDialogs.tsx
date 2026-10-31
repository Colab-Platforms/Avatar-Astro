import { useState, type FormEvent, type ReactNode } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { panelSend, errorMessage } from "../api";
import { Field, ghostBtn, inputClass, primaryBtn } from "../ui";

export type AccountKind = "customer" | "admin";
export type AdminRole = "ADMIN" | "SUPERADMIN";
export interface AccountLike {
  id: string; email: string; firstName: string | null; lastName: string | null; phoneNo: string | null;
  isActive: boolean; role: string; authProvider?: string;
}
const base = (k: AccountKind) => (k === "admin" ? "/admins" : "/customers");
const word = (k: AccountKind) => (k === "admin" ? "administrator" : "customer");

/** Same strength rule the server enforces (it is checked there again): 8+ chars with upper, lower and a digit. */
export const passwordProblem = (p: string): string | null =>
  p.length < 8 ? "At least 8 characters." : !/[a-z]/.test(p) || !/[A-Z]/.test(p) || !/\d/.test(p) ? "Use an uppercase letter, a lowercase letter and a number." : p.length > 72 ? "At most 72 characters." : null;

function useInvalidate() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ["admin-panel"] });
}

function Shell({ open, onClose, title, description, children }: { open: boolean; onClose: () => void; title: string; description?: string; children: ReactNode }) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto border-[#E8E3DC] bg-white text-[#1F1B16] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">{title}</DialogTitle>
          {description && <DialogDescription className="text-[#6B6259]">{description}</DialogDescription>}
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}

const ErrorLine = ({ text }: { text: string | null }) => (text ? <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-900">{text}</p> : null);

export function CreateAccountDialog({ kind, open, onClose, onCreated, allowedRoles = ["ADMIN", "SUPERADMIN"] }: {
  kind: AccountKind; open: boolean; onClose: () => void; onCreated: (email: string) => void; allowedRoles?: AdminRole[];
}) {
  const invalidate = useInvalidate();
  const empty = { firstName: "", lastName: "", email: "", phoneNo: "", password: "", confirmPassword: "", role: "ADMIN" as AdminRole, status: "active" };
  const [f, setF] = useState(empty);
  const [err, setErr] = useState<string | null>(null);
  const set = (k: keyof typeof empty) => (e: { target: { value: string } }) => setF((p) => ({ ...p, [k]: e.target.value }));
  const m = useMutation({
    mutationFn: () => panelSend("POST", base(kind), { ...f, ...(kind === "customer" ? { role: undefined } : {}) }),
    onSuccess: () => { invalidate(); onCreated(f.email.trim().toLowerCase()); setF(empty); setErr(null); onClose(); },
    onError: (e) => setErr(errorMessage(e)),
  });
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const pp = passwordProblem(f.password);
    if (pp) return setErr(`Password: ${pp}`);
    if (f.password !== f.confirmPassword) return setErr("Password and confirmation do not match.");
    setErr(null);
    m.mutate();
  };
  const id = (n: string) => `new-${kind}-${n}`;
  return (
    <Shell open={open} onClose={() => { setErr(null); onClose(); }} title={kind === "admin" ? "Create administrator" : "Create customer"}
      description={kind === "admin" ? "Only a SUPERADMIN can do this. The person signs in on the normal sign-in page and must verify their email once." : "Creates a normal customer account (USER role). The customer signs in on the normal sign-in page and verifies their email."}>
      <form onSubmit={submit} className="space-y-3" noValidate>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="First name" htmlFor={id("first")}><input id={id("first")} className={inputClass} value={f.firstName} onChange={set("firstName")} required autoComplete="off" /></Field>
          <Field label="Last name" htmlFor={id("last")}><input id={id("last")} className={inputClass} value={f.lastName} onChange={set("lastName")} required autoComplete="off" /></Field>
        </div>
        <Field label="Email" htmlFor={id("email")}><input id={id("email")} type="email" className={inputClass} value={f.email} onChange={set("email")} required autoComplete="off" /></Field>
        <Field label="Phone (optional)" htmlFor={id("phone")} hint="10-digit Indian mobile number."><input id={id("phone")} inputMode="numeric" className={inputClass} value={f.phoneNo} onChange={set("phoneNo")} autoComplete="off" /></Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={kind === "admin" ? "Initial password" : "Password"} htmlFor={id("pw")} hint="8+ characters with upper, lower and a number."><input id={id("pw")} type="password" className={inputClass} value={f.password} onChange={set("password")} required autoComplete="new-password" /></Field>
          <Field label="Confirm password" htmlFor={id("pw2")}><input id={id("pw2")} type="password" className={inputClass} value={f.confirmPassword} onChange={set("confirmPassword")} required autoComplete="new-password" /></Field>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {kind === "admin" ? (
            <Field label="Role" htmlFor={id("role")}>
              <select id={id("role")} className={inputClass} value={f.role} onChange={set("role")}>
                {allowedRoles.map((r) => <option key={r} value={r}>{r === "SUPERADMIN" ? "SUPERADMIN (full access)" : "ADMIN"}</option>)}
              </select>
            </Field>
          ) : (
            <Field label="Role"><input className={inputClass} value="USER (customer)" disabled readOnly /></Field>
          )}
          <Field label="Account status" htmlFor={id("status")}>
            <select id={id("status")} className={inputClass} value={f.status} onChange={set("status")}><option value="active">Active</option><option value="inactive">Deactivated</option></select>
          </Field>
        </div>
        <ErrorLine text={err} />
        <DialogFooter className="gap-2 sm:gap-2">
          <button type="button" className={ghostBtn} onClick={onClose}>Cancel</button>
          <button type="submit" className={primaryBtn} disabled={m.isPending}>{m.isPending ? "Creating…" : kind === "admin" ? "Create administrator" : "Create customer"}</button>
        </DialogFooter>
      </form>
    </Shell>
  );
}

export function EditAccountDialog({ kind, account, self, open, onClose, onSaved }: {
  kind: AccountKind; account: AccountLike; self?: boolean; open: boolean; onClose: () => void; onSaved: () => void;
}) {
  const invalidate = useInvalidate();
  const [f, setF] = useState({ firstName: account.firstName ?? "", lastName: account.lastName ?? "", email: account.email, phoneNo: account.phoneNo ?? "", role: (account.role === "SUPERADMIN" ? "SUPERADMIN" : "ADMIN") as AdminRole });
  const [err, setErr] = useState<string | null>(null);
  const googleLinked = account.authProvider === "GOOGLE";
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF((p) => ({ ...p, [k]: e.target.value }));
  const m = useMutation({
    mutationFn: () => {
      const body: Record<string, unknown> = { firstName: f.firstName, lastName: f.lastName, phoneNo: f.phoneNo };
      if (!self && !googleLinked) body.email = f.email;
      if (kind === "admin" && !self) body.role = f.role;
      return panelSend("PATCH", `${base(kind)}/${account.id}`, body);
    },
    onSuccess: () => { invalidate(); onSaved(); onClose(); },
    onError: (e) => setErr(errorMessage(e)),
  });
  const emailChanged = f.email.trim().toLowerCase() !== account.email.toLowerCase();
  const roleChanged = kind === "admin" && !self && f.role !== account.role;
  const id = (n: string) => `edit-${kind}-${n}`;
  return (
    <Shell open={open} onClose={onClose} title={`Edit ${word(kind)}`} description={account.email}>
      <form onSubmit={(e) => { e.preventDefault(); setErr(null); m.mutate(); }} className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="First name" htmlFor={id("first")}><input id={id("first")} className={inputClass} value={f.firstName} onChange={set("firstName")} required /></Field>
          <Field label="Last name" htmlFor={id("last")}><input id={id("last")} className={inputClass} value={f.lastName} onChange={set("lastName")} required /></Field>
        </div>
        <Field label="Email" htmlFor={id("email")}
          hint={self ? "Change your own email from your profile." : googleLinked ? "Linked to a Google account; the email comes from Google and cannot be changed here." : "Changing the email signs the person out and requires them to verify the new address."}>
          <input id={id("email")} type="email" className={inputClass} value={f.email} onChange={set("email")} disabled={self || googleLinked} />
        </Field>
        <Field label="Phone" htmlFor={id("phone")} hint="A changed number is marked unverified."><input id={id("phone")} inputMode="numeric" className={inputClass} value={f.phoneNo} onChange={set("phoneNo")} /></Field>
        {kind === "admin" && (
          <Field label="Role" htmlFor={id("role")} hint={self ? "You cannot change your own role." : "A role change signs the administrator out of all sessions."}>
            <select id={id("role")} className={inputClass} value={f.role} onChange={set("role")} disabled={self}>
              <option value="ADMIN">ADMIN</option><option value="SUPERADMIN">SUPERADMIN</option>
            </select>
          </Field>
        )}
        {(emailChanged || roleChanged) && <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">{[emailChanged && "The email change ends all their sessions and marks the new address unverified.", roleChanged && `The role will change from ${account.role} to ${f.role}.`].filter(Boolean).join(" ")}</p>}
        <ErrorLine text={err} />
        <DialogFooter className="gap-2 sm:gap-2">
          <button type="button" className={ghostBtn} onClick={onClose}>Cancel</button>
          <button type="submit" className={primaryBtn} disabled={m.isPending}>{m.isPending ? "Saving…" : "Save changes"}</button>
        </DialogFooter>
      </form>
    </Shell>
  );
}

export function PasswordDialog({ kind, account, open, onClose, onDone }: { kind: AccountKind; account: AccountLike; open: boolean; onClose: () => void; onDone: (text: string) => void }) {
  const invalidate = useInvalidate();
  const [mode, setMode] = useState<"link" | "set">("link");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const m = useMutation({
    mutationFn: () => (mode === "link"
      ? panelSend<{ emailSent: boolean }>("POST", `${base(kind)}/${account.id}/password-reset-link`)
      : panelSend<{ sessionsEnded: boolean }>("POST", `${base(kind)}/${account.id}/password`, { password: pw, confirmPassword: pw2 })),
    onSuccess: (d: any) => {
      invalidate();
      onDone(mode === "link" ? (d?.emailSent === false ? "Reset link created, but the email could not be sent (email is not configured)." : "Password-reset link emailed. It works once and expires in one hour.") : "Password updated. The old password no longer works and every session was signed out.");
      setPw(""); setPw2(""); onClose();
    },
    onError: (e) => setErr(errorMessage(e)),
  });
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (mode === "set") {
      const pp = passwordProblem(pw);
      if (pp) return setErr(`Password: ${pp}`);
      if (pw !== pw2) return setErr("Password and confirmation do not match.");
    }
    setErr(null);
    m.mutate();
  };
  return (
    <Shell open={open} onClose={onClose} title="Reset password" description={`${account.email}. Passwords are never shown; they are stored only as a secure hash.`}>
      <form onSubmit={submit} className="space-y-3">
        <fieldset className="space-y-2">
          <legend className="sr-only">How to reset</legend>
          <label className="flex items-start gap-2 text-sm"><input type="radio" name="pw-mode" checked={mode === "link"} onChange={() => setMode("link")} className="mt-1" /><span><strong>Email a reset link</strong> (recommended). The person chooses their own password.</span></label>
          <label className="flex items-start gap-2 text-sm"><input type="radio" name="pw-mode" checked={mode === "set"} onChange={() => setMode("set")} className="mt-1" /><span><strong>Set a new password now.</strong> Share it with the person through a secure channel; they should change it after signing in.</span></label>
        </fieldset>
        {mode === "set" && (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="New password" htmlFor="reset-pw"><input id="reset-pw" type="password" className={inputClass} value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" required /></Field>
            <Field label="Confirm password" htmlFor="reset-pw2"><input id="reset-pw2" type="password" className={inputClass} value={pw2} onChange={(e) => setPw2(e.target.value)} autoComplete="new-password" required /></Field>
          </div>
        )}
        <p className="text-xs text-[#6B6259]">{mode === "set" ? "All of their sessions are signed out and the old password stops working immediately." : "Their current password keeps working until they use the link."}</p>
        <ErrorLine text={err} />
        <DialogFooter className="gap-2 sm:gap-2">
          <button type="button" className={ghostBtn} onClick={onClose}>Cancel</button>
          <button type="submit" className={primaryBtn} disabled={m.isPending}>{m.isPending ? "Working…" : mode === "link" ? "Send reset link" : "Set password"}</button>
        </DialogFooter>
      </form>
    </Shell>
  );
}

export function StatusDialog({ kind, account, open, onClose, onDone }: { kind: AccountKind; account: AccountLike; open: boolean; onClose: () => void; onDone: (text: string) => void }) {
  const invalidate = useInvalidate();
  const [err, setErr] = useState<string | null>(null);
  const next = !account.isActive;
  const m = useMutation({
    mutationFn: () => panelSend("PATCH", `${base(kind)}/${account.id}/status`, { isActive: next }),
    onSuccess: () => { invalidate(); onDone(next ? `${account.email} reactivated.` : `${account.email} deactivated and signed out of all sessions.`); onClose(); },
    onError: (e) => setErr(errorMessage(e)),
  });
  return (
    <Shell open={open} onClose={onClose} title={next ? `Reactivate ${word(kind)}?` : `Deactivate ${word(kind)}?`}
      description={next ? `${account.email} will be able to sign in again.` : `${account.email} is signed out immediately and cannot sign in or use any protected page until reactivated. Their data is kept.`}>
      <ErrorLine text={err} />
      <DialogFooter className="gap-2 sm:gap-2">
        <button type="button" className={ghostBtn} onClick={onClose}>Cancel</button>
        <button type="button" className={primaryBtn} disabled={m.isPending} onClick={() => { setErr(null); m.mutate(); }}>{m.isPending ? "Working…" : next ? "Reactivate" : "Deactivate"}</button>
      </DialogFooter>
    </Shell>
  );
}

export function DeleteDialog({ kind, account, open, onClose, onDone }: { kind: AccountKind; account: AccountLike; open: boolean; onClose: () => void; onDone: (text: string) => void }) {
  const invalidate = useInvalidate();
  const [typed, setTyped] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const m = useMutation({
    mutationFn: () => panelSend("DELETE", `${base(kind)}/${account.id}`, { confirmEmail: typed }),
    onSuccess: () => { invalidate(); onDone(`${account.email} deleted.`); setTyped(""); onClose(); },
    onError: (e) => setErr(errorMessage(e)),
  });
  const match = typed.trim().toLowerCase() === account.email.toLowerCase();
  return (
    <Shell open={open} onClose={onClose} title={`Delete ${word(kind)}`} description={`${account.email} · ${account.role}`}>
      <div className="space-y-3 text-sm">
        <ul className="list-disc space-y-1 pl-5 text-[#4A423A]">
          <li>The account is closed for good: it can no longer sign in, and every session ends now.</li>
          <li>Name, email, phone, password and profile details are erased; only an anonymous placeholder row remains.</li>
          <li>Their saved readings, conversations and personal activity timeline are permanently deleted.</li>
          <li>Anonymous usage statistics and AI cost totals are kept, no longer linked to the person.</li>
          <li>The admin audit history of this and earlier actions is kept.</li>
          {kind === "admin" && <li>Content they created stays; they lose all administrator access.</li>}
        </ul>
        <Field label={`Type ${account.email} to confirm`} htmlFor="confirm-delete">
          <input id="confirm-delete" className={inputClass} value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" />
        </Field>
        <ErrorLine text={err} />
      </div>
      <DialogFooter className="gap-2 sm:gap-2">
        <button type="button" className={ghostBtn} onClick={onClose}>Cancel</button>
        <button type="button" className="inline-flex items-center justify-center rounded-lg bg-red-700 px-4 py-2 text-sm font-medium text-white hover:bg-red-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700 disabled:cursor-not-allowed disabled:opacity-50" disabled={!match || m.isPending} onClick={() => { setErr(null); m.mutate(); }}>
          {m.isPending ? "Deleting…" : `Delete ${word(kind)}`}
        </button>
      </DialogFooter>
    </Shell>
  );
}
