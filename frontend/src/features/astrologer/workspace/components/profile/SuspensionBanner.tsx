import { ShieldAlert } from "lucide-react";

interface SuspensionBannerProps {
  suspendedAt: string | null;
  suspensionReason: string | null;
}

export function SuspensionBanner({ suspendedAt, suspensionReason }: SuspensionBannerProps) {
  if (!suspendedAt) return null;

  return (
    <div
      role="alert"
      className="mb-6 flex items-start gap-3.5 rounded-2xl border border-red-200 bg-red-50/90 p-4 sm:p-5 text-red-900 shadow-sm"
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-700">
        <ShieldAlert className="h-5 w-5" aria-hidden="true" />
      </div>
      <div className="min-w-0">
        <h3 className="font-semibold text-red-950">Your astrologer workspace is currently suspended</h3>
        <p className="mt-1 text-sm text-red-800">
          {suspensionReason || "Your profile and chat consultation abilities have been paused by administration. Please contact support for assistance."}
        </p>
      </div>
    </div>
  );
}

