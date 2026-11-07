import { useState } from "react";
import { useParams } from "react-router-dom";
import { ErrorState, fmtDate, ghostBtn, inputClass, Loading, PageHeader, primaryBtn } from "@/features/admin/panel/ui";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  useAddNote, useAdminApplication, useAdminReadiness, useApproveApplication, useRecordInterview,
  useReinstateAstrologer, useRejectApplication, useReviewDocument, useSetPublication, useSuspendAstrologer,
  useTransitionStatus, useViewSignedDocument,
} from "../hooks/useAdminAstrologers";
import type { AdminDocument, AstrologerApplicationStatus, DocumentVerificationStatus } from "../types";

function ReasonDialog({ trigger, title, description, onConfirm, confirmLabel = "Confirm", busy }: {
  trigger: React.ReactNode; title: string; description: string; onConfirm: (reason: string) => void; confirmLabel?: string; busy?: boolean;
}) {
  const [reason, setReason] = useState("");
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent className="border-[#E8E3DC] bg-white text-[#1F1B16]">
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription className="text-[#6B6259]">{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <textarea className={inputClass} rows={3} placeholder="Reason (required)" value={reason} onChange={(e) => setReason(e.target.value)} />
        <AlertDialogFooter>
          <AlertDialogCancel className="border-[#DDD6CC] bg-white text-[#1F1B16] hover:bg-[#F7F4EF]">Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={!reason.trim() || busy}
            onClick={(e) => { if (!reason.trim()) { e.preventDefault(); return; } onConfirm(reason.trim()); }}
            className="bg-[#803003] text-white hover:bg-[#6B2802]"
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default function AstrologerApplicationDetailPage() {
  const { id = "" } = useParams();
  const detail = useAdminApplication(id);
  const readiness = useAdminReadiness(id);
  const approve = useApproveApplication(id);
  const reject = useRejectApplication(id);
  const suspend = useSuspendAstrologer(id);
  const reinstate = useReinstateAstrologer(id);
  const transition = useTransitionStatus(id);
  const setPublication = useSetPublication(id);

  if (detail.isLoading) return <Loading label="Loading application…" />;
  if (detail.error || !detail.data) return <ErrorState message="Could not load this application." onRetry={() => detail.refetch()} />;

  const a = detail.data;
  const status = a.status as AstrologerApplicationStatus;

  return (
    <div>
      <PageHeader
        title={a.displayName || a.fullLegalName || "Application"}
        subtitle={`${a.user.email} · Attempt #${a.attemptNumber} · ${status.replace(/_/g, " ")}`}
        actions={
          <div className="flex flex-wrap gap-2">
            {status === "SUBMITTED" && (
              <button className={primaryBtn} onClick={() => transition.mutate({ toStatus: "UNDER_REVIEW" })} disabled={transition.isPending}>Start review</button>
            )}
            {(status === "UNDER_REVIEW" || status === "INTERVIEW_PENDING") && (
              <>
                <ReasonDialog
                  trigger={<button className={ghostBtn}>Request more info</button>}
                  title="Request more information"
                  description="This moves the application back to the applicant with your note."
                  confirmLabel="Request"
                  busy={transition.isPending}
                  onConfirm={(reason) => transition.mutate({ toStatus: "MORE_INFORMATION_REQUIRED", reason })}
                />
                {status === "UNDER_REVIEW" && (
                  <button className={ghostBtn} onClick={() => transition.mutate({ toStatus: "INTERVIEW_PENDING" })} disabled={transition.isPending}>Mark interview pending</button>
                )}
                <button
                  className={primaryBtn}
                  disabled={!readiness.data?.ready || approve.isPending}
                  title={readiness.data && !readiness.data.ready ? readiness.data.blockers.join("; ") : undefined}
                  onClick={() => approve.mutate()}
                >
                  Approve
                </button>
                <ReasonDialog
                  trigger={<button className={`${ghostBtn} border-red-200 text-red-800 hover:bg-red-50`}>Reject</button>}
                  title="Reject application"
                  description="A reason is required and will be shown to the applicant."
                  confirmLabel="Reject"
                  busy={reject.isPending}
                  onConfirm={(reason) => reject.mutate(reason)}
                />
              </>
            )}
            {status === "APPROVED" && (
              <>
                <button className={ghostBtn} onClick={() => setPublication.mutate(!a.profile?.isPublished)} disabled={setPublication.isPending}>
                  {a.profile?.isPublished ? "Unpublish profile" : "Publish profile"}
                </button>
                <ReasonDialog
                  trigger={<button className={`${ghostBtn} border-red-200 text-red-800 hover:bg-red-50`}>Suspend</button>}
                  title="Suspend astrologer"
                  description="This revokes their astrologer access and unpublishes their profile."
                  confirmLabel="Suspend"
                  busy={suspend.isPending}
                  onConfirm={(reason) => suspend.mutate(reason)}
                />
              </>
            )}
            {status === "SUSPENDED" && (
              <button className={primaryBtn} onClick={() => reinstate.mutate()} disabled={reinstate.isPending}>Reinstate</button>
            )}
          </div>
        }
      />

      {readiness.data && !readiness.data.ready && (status === "UNDER_REVIEW" || status === "INTERVIEW_PENDING") && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <p className="font-medium">Not ready for approval:</p>
          <ul className="mt-1 list-disc pl-5">{readiness.data.blockers.map((b) => <li key={b}>{b}</li>)}</ul>
        </div>
      )}

      <Tabs defaultValue="personal">
        <TabsList>
          <TabsTrigger value="personal">Personal</TabsTrigger>
          <TabsTrigger value="professional">Professional</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="interview">Interview</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
        </TabsList>

        <TabsContent value="personal">
          <dl className="grid gap-4 rounded-xl border border-[#E8E3DC] bg-white p-5 sm:grid-cols-2">
            <Fact k="Full legal name" v={a.fullLegalName} />
            <Fact k="Display name" v={a.displayName} />
            <Fact k="Email" v={a.email} />
            <Fact k="Phone" v={a.phone} />
            <Fact k="City / State / Country" v={[a.city, a.state, a.country].filter(Boolean).join(", ")} />
            <Fact k="Bio" v={a.bio} />
            <Fact k="Account active" v={a.user.isActive ? "Yes" : "No"} />
          </dl>
        </TabsContent>

        <TabsContent value="professional">
          <dl className="grid gap-4 rounded-xl border border-[#E8E3DC] bg-white p-5 sm:grid-cols-2">
            <Fact k="Specialties" v={a.specialties.map((s) => `${s.customLabel?.trim() || s.specialty.label}${s.isPrimary ? " (primary)" : ""}`).join(", ")} />
            <Fact k="Languages" v={a.languages.join(", ")} />
            <Fact k="Years of experience" v={a.yearsOfExperience?.toString()} />
            <Fact k="Education / training" v={a.educationBackground} />
            <Fact k="Certifications" v={a.certificationsText} />
            <Fact k="Professional intro" v={a.professionalIntro} />
            <Fact k="Consultation experience" v={a.consultationExperience} />
            <Fact k="Areas of expertise" v={a.areasOfExpertise} />
          </dl>
        </TabsContent>

        <TabsContent value="documents">
          <div className="space-y-3">
            {a.documents.length === 0 && <p className="text-sm text-[#6B6259]">No documents uploaded.</p>}
            {a.documents.filter((d) => d.isCurrent).map((d) => <DocumentRow key={d.id} doc={d} />)}
          </div>
        </TabsContent>

        <TabsContent value="interview">
          <InterviewTab applicationId={id} interviews={a.interviews} />
        </TabsContent>

        <TabsContent value="notes">
          <NotesTab applicationId={id} notes={a.notes} />
        </TabsContent>

        <TabsContent value="timeline">
          <ul className="space-y-2 rounded-xl border border-[#E8E3DC] bg-white p-5 text-sm">
            {a.statusHistory.slice().reverse().map((h) => (
              <li key={h.id} className="border-b border-[#EEE9E2] pb-2 last:border-0">
                <span className="font-medium text-[#1F1B16]">{h.fromStatus ? `${h.fromStatus} → ${h.toStatus}` : h.toStatus}</span>
                <span className="ml-2 text-[#6B6259]">{fmtDate(h.createdAt)}</span>
                {h.reason && <p className="mt-0.5 text-[#6B6259]">{h.reason}</p>}
              </li>
            ))}
          </ul>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Fact({ k, v }: { k: string; v?: string | null }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wider text-[#6B6259]">{k}</dt>
      <dd className="mt-0.5 text-sm text-[#1F1B16]">{v || "—"}</dd>
    </div>
  );
}

const DOC_STATUS_OPTIONS: DocumentVerificationStatus[] = ["VERIFIED", "REJECTED", "RESUBMISSION_REQUIRED"];

function DocumentRow({ doc }: { doc: AdminDocument }) {
  const review = useReviewDocument();
  const viewDoc = useViewSignedDocument();
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState(doc.reviewNotes ?? "");

  const canVerify = doc.scanStatus === "CLEAN" || doc.scanStatus === "SKIPPED";

  return (
    <div className="rounded-xl border border-[#E8E3DC] bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-medium text-[#1F1B16]">{doc.requirement?.label ?? "Supporting document"} — {doc.fileName}</p>
          <p className="text-xs text-[#6B6259]">v{doc.version} · uploaded {fmtDate(doc.uploadedAt)} · scan: {doc.scanStatus}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-[#F1ECE5] px-2 py-0.5 text-xs font-medium text-[#4A423A]">{doc.verificationStatus.replace(/_/g, " ")}</span>
          <button className={ghostBtn} onClick={() => viewDoc.mutate(doc.id)} disabled={viewDoc.isPending}>View</button>
        </div>
      </div>
      {doc.rejectionReason && <p className="mt-2 text-sm text-red-700">{doc.rejectionReason}</p>}

      <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
        <input className={inputClass} placeholder="Reason (for reject / resubmission)" value={reason} onChange={(e) => setReason(e.target.value)} />
        <input className={inputClass} placeholder="Internal review notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
        <div className="flex gap-2">
          <button
            className={primaryBtn}
            title={canVerify ? undefined : "Blocked: document has not been scanned clean"}
            disabled={!canVerify || review.isPending}
            onClick={() => review.mutate({ documentId: doc.id, verificationStatus: "VERIFIED", reviewNotes: notes || undefined })}
          >
            Verify
          </button>
          <button
            className={`${ghostBtn} border-red-200 text-red-800 hover:bg-red-50`}
            disabled={!reason.trim() || review.isPending}
            onClick={() => review.mutate({ documentId: doc.id, verificationStatus: "REJECTED", rejectionReason: reason, reviewNotes: notes || undefined })}
          >
            Reject
          </button>
          <button
            className={ghostBtn}
            disabled={!reason.trim() || review.isPending}
            onClick={() => review.mutate({ documentId: doc.id, verificationStatus: "RESUBMISSION_REQUIRED", rejectionReason: reason, reviewNotes: notes || undefined })}
          >
            Resubmission
          </button>
        </div>
      </div>
    </div>
  );
}

function InterviewTab({ applicationId, interviews }: { applicationId: string; interviews: { id: string; isRequired: boolean; isWaived: boolean; outcome: string; notes: string | null; createdAt: string }[] }) {
  const record = useRecordInterview(applicationId);
  const [form, setForm] = useState({ isRequired: true, isWaived: false, outcome: "PENDING", communicationScore: "", domainKnowledgeScore: "", professionalConductScore: "", notes: "" });

  return (
    <div className="space-y-4">
      <ul className="space-y-2">
        {interviews.length === 0 && <li className="text-sm text-[#6B6259]">No interview recorded yet.</li>}
        {interviews.map((i) => (
          <li key={i.id} className="rounded-xl border border-[#E8E3DC] bg-white p-4 text-sm">
            <p className="font-medium text-[#1F1B16]">{i.outcome} {i.isWaived && "(waived)"}</p>
            {i.notes && <p className="mt-1 text-[#6B6259]">{i.notes}</p>}
            <p className="mt-1 text-xs text-[#6B6259]">{fmtDate(i.createdAt)}</p>
          </li>
        ))}
      </ul>
      <div className="rounded-xl border border-[#E8E3DC] bg-white p-4">
        <p className="mb-2 font-medium text-[#1F1B16]">Record interview</p>
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isRequired} onChange={(e) => setForm((f) => ({ ...f, isRequired: e.target.checked }))} /> Required</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isWaived} onChange={(e) => setForm((f) => ({ ...f, isWaived: e.target.checked }))} /> Waived</label>
          <select className={inputClass} value={form.outcome} onChange={(e) => setForm((f) => ({ ...f, outcome: e.target.value }))}>
            {["PENDING", "PASS", "FAIL", "RESCHEDULE"].map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
          <input className={inputClass} type="number" min={0} max={10} placeholder="Communication score" value={form.communicationScore} onChange={(e) => setForm((f) => ({ ...f, communicationScore: e.target.value }))} />
          <input className={inputClass} type="number" min={0} max={10} placeholder="Domain knowledge score" value={form.domainKnowledgeScore} onChange={(e) => setForm((f) => ({ ...f, domainKnowledgeScore: e.target.value }))} />
          <input className={inputClass} type="number" min={0} max={10} placeholder="Professional conduct score" value={form.professionalConductScore} onChange={(e) => setForm((f) => ({ ...f, professionalConductScore: e.target.value }))} />
        </div>
        <textarea className={`${inputClass} mt-2`} rows={2} placeholder="Notes" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
        <button
          className={`${primaryBtn} mt-2`}
          disabled={record.isPending}
          onClick={() =>
            record.mutate({
              isRequired: form.isRequired,
              isWaived: form.isWaived,
              outcome: form.outcome,
              notes: form.notes || undefined,
              communicationScore: form.communicationScore ? Number(form.communicationScore) : undefined,
              domainKnowledgeScore: form.domainKnowledgeScore ? Number(form.domainKnowledgeScore) : undefined,
              professionalConductScore: form.professionalConductScore ? Number(form.professionalConductScore) : undefined,
            })
          }
        >
          Save interview record
        </button>
      </div>
    </div>
  );
}

function NotesTab({ applicationId, notes }: { applicationId: string; notes: { id: string; note: string; createdAt: string }[] }) {
  const addNote = useAddNote(applicationId);
  const [text, setText] = useState("");
  return (
    <div className="space-y-3">
      <ul className="space-y-2">
        {notes.length === 0 && <li className="text-sm text-[#6B6259]">No internal notes yet.</li>}
        {notes.map((n) => (
          <li key={n.id} className="rounded-xl border border-[#E8E3DC] bg-white p-3 text-sm">
            <p className="text-[#1F1B16]">{n.note}</p>
            <p className="mt-1 text-xs text-[#6B6259]">{fmtDate(n.createdAt)}</p>
          </li>
        ))}
      </ul>
      <div className="flex gap-2">
        <input className={inputClass} placeholder="Add an internal note (never shown to the applicant)" value={text} onChange={(e) => setText(e.target.value)} />
        <button className={primaryBtn} disabled={!text.trim() || addNote.isPending} onClick={() => { addNote.mutate(text.trim()); setText(""); }}>Add</button>
      </div>
    </div>
  );
}
