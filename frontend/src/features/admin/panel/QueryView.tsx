import type { ReactNode } from "react";
import type { UseQueryResult } from "@tanstack/react-query";
import { AuthApiError } from "@/lib/authClient";
import { ErrorState, Loading } from "./ui";

/** Standard loading / error / success rendering for a panel query. */
export function QueryView<T>({ q, children }: { q: UseQueryResult<T, Error>; children: (data: T) => ReactNode }) {
  if (q.isLoading) return <Loading />;
  if (q.error) {
    const forbidden = q.error instanceof AuthApiError && q.error.status === 403;
    return (
      <ErrorState
        message={forbidden ? "Only the main admin can open this section." : q.error.message || "Could not load this section."}
        onRetry={forbidden ? undefined : () => q.refetch()}
      />
    );
  }
  if (q.data === undefined) return <Loading />;
  return <>{children(q.data)}</>;
}
