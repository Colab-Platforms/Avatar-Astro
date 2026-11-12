import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { Award } from "lucide-react";
import { intlTag } from "@/features/muhurat/format";
import { pointsApi } from "./api";
import { POINTS_KEYS } from "./hooks";

const KNOWN = ["horoscope_daily", "horoscope_milestone", "karma_practice", "karma_milestone"];
const fmtDate = (iso: string) => new Intl.DateTimeFormat(intlTag(), { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" }).format(new Date(iso));

/** Reward Points: one total, split by source, with the ledger (history) underneath. Positive-only for now; nothing can be spent. Separate from the paid Coins Wallet. */
export default function RewardsPage() {
  const { t } = useTranslation();
  const rewards = useQuery({ queryKey: POINTS_KEYS.rewards, queryFn: pointsApi.rewards, refetchOnWindowFocus: false, retry: false });
  const tx = useInfiniteQuery({ queryKey: [...POINTS_KEYS.rewards, "tx"], queryFn: ({ pageParam }) => pointsApi.transactions(pageParam), initialPageParam: 1, getNextPageParam: (l) => (l.page < l.totalPages ? l.page + 1 : undefined), refetchOnWindowFocus: false, retry: false });
  const [, force] = useState(0);
  const label = (s: string) => t(`points.rewards.sources.${KNOWN.includes(s) ? s : "other"}`);
  const sum = (prefix: string) => (rewards.data?.bySource ?? []).filter((b) => b.source.startsWith(prefix)).reduce((n, b) => n + b.points, 0);
  const items = tx.data?.pages.flatMap((p) => p.items) ?? [];

  if (rewards.isError || tx.isError) {
    return (
      <div role="alert" className="rounded-2xl border border-[#592209]/25 bg-[#FBF5EC] p-6" data-testid="rewards-error">
        <p className="font-semibold text-[#592209]">{t("points.common.loadError")}</p>
        <button type="button" onClick={() => { void rewards.refetch(); void tx.refetch(); force((n) => n + 1); }} className="mt-3 rounded-full bg-[#592209] px-5 py-2 text-sm font-semibold text-[#F5E9D6]">{t("points.common.retry")}</button>
      </div>
    );
  }
  const card = (l: string, v: number, big = false) => (
    <div className={`rounded-2xl p-4 text-center ${big ? "bg-gradient-to-br from-[#4A1A07] to-[#2A0F04] text-[#F5E9D6]" : "border border-[#592209]/20 bg-[#FBF5EC] text-[#592209]"}`}>
      <p className={`font-extrabold ${big ? "text-4xl text-[#F6C86A]" : "text-2xl"}`}>{rewards.isLoading ? "…" : v}</p>
      <p className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] opacity-80">{l}</p>
    </div>
  );
  return (
    <div className="space-y-6" data-testid="rewards-page">
      <h1 className="flex items-center gap-2 text-2xl font-bold text-[#592209]"><Award className="h-6 w-6" aria-hidden /> {t("points.rewards.title")}</h1>
      <div className="grid gap-3 sm:grid-cols-3">
        {card(t("points.rewards.totalPoints"), rewards.data?.balance ?? 0, true)}
        {card(t("points.rewards.horoscopePoints"), sum("horoscope_"))}
        {card(t("points.rewards.karmaPoints"), sum("karma_"))}
      </div>
      <p className="text-sm text-[#4A3022]">{t("points.rewards.note")}</p>

      <section aria-label={t("points.rewards.recent")}>
        <h2 className="mb-2 text-lg font-bold text-[#592209]">{t("points.rewards.recent")}</h2>
        {tx.isLoading ? <div role="status" aria-label={t("points.common.loading")} className="h-24 animate-pulse rounded-2xl bg-[#592209]/10" /> : items.length === 0 ? (
          <p className="rounded-2xl border border-[#592209]/20 bg-[#FBF5EC] p-5 text-[#4A3022]" data-testid="rewards-empty">{t("points.rewards.empty")}</p>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-[#592209]/20 bg-[#FBF5EC]">
            <table className="w-full min-w-[420px] text-left text-sm" data-testid="rewards-table">
              <thead className="text-xs uppercase tracking-wider text-[#6B4A37]"><tr><th scope="col" className="px-4 py-3">{t("points.rewards.colSource")}</th><th scope="col" className="px-4 py-3">{t("points.rewards.colDate")}</th><th scope="col" className="px-4 py-3 text-right">{t("points.rewards.colPoints")}</th></tr></thead>
              <tbody className="divide-y divide-[#592209]/10">
                {items.map((r) => (
                  <tr key={r.id}><td className="px-4 py-3 text-[#301607]">{label(r.source)}</td><td className="px-4 py-3 text-[#4A3022]">{fmtDate(r.createdAt)}</td><td className="px-4 py-3 text-right font-bold text-[#592209]">+{r.points}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {tx.hasNextPage && <button type="button" onClick={() => void tx.fetchNextPage()} disabled={tx.isFetchingNextPage} className="mt-3 rounded-full border border-[#592209] px-5 py-2 text-sm font-semibold text-[#592209] hover:bg-[#592209]/10 disabled:opacity-60">{t("points.rewards.more")}</button>}
      </section>
    </div>
  );
}
