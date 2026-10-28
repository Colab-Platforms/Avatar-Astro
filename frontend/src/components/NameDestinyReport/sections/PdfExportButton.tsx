import { Download, Loader2 } from "lucide-react";
import { downloadDestinyReportPDF } from "../lib/pdfExport";
import type { UseNameReport } from "../useNameReport";

export default function PdfExportButton({ name, dob, report }: { name: string; dob: string; report: UseNameReport }) {
  const { profile, topVariants, narrative, narrativeLoading } = report;

  function handleDownload() {
    downloadDestinyReportPDF({ name, dob, profile, narrative, topVariants });
  }

  return (
    <div className="px-6 sm:px-10 pb-2 flex justify-center">
      <button
        onClick={handleDownload}
        disabled={narrativeLoading}
        className="inline-flex items-center gap-2 px-6 py-3 rounded-full border-2 border-gold/40 text-gold font-semibold text-sm uppercase tracking-wide hover:bg-gold/10 transition-colors disabled:opacity-40"
      >
        {narrativeLoading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
        Download Cosmic Blueprint as PDF
      </button>
    </div>
  );
}
