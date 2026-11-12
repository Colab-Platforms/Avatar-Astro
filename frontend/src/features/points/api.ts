import { authRequest } from "@/lib/authClient";

/** Typed access to the shared Reward Points ledger (not the paid Coins Wallet). The server derives identity from the token, dates from the Kolkata clock and amounts from its own config; nothing here sends any of them. */

export interface NextMilestone { days: number; bonus: number; progress: number; remaining: number }
export interface WeekDay { date: string; completed: boolean; isToday: boolean }
export interface HoroscopeSummary {
  today: string; completedToday: boolean; currentStreak: number; bestStreak: number; totalDays: number; lastDate: string | null;
  todayPoints: number; totalPoints: number; week: WeekDay[]; nextMilestone: NextMilestone | null;
  rewards: { dailyPoints: number; milestones: readonly { days: number; bonus: number }[] };
}
export interface CompleteResult { alreadyCompleted: boolean; awarded: { daily: number; milestone: { days: number; bonus: number } | null }; balance: number; summary: HoroscopeSummary }
export interface KarmaSummary {
  today: string; todayPoints: number; totalPoints: number; currentStreak: number; bestStreak: number; totalDays: number; awardedToday: string[]; nextMilestone: NextMilestone | null;
}
export interface KarmaAward { awarded: { practices: string[]; points: number; milestone: { days: number; bonus: number } | null }; balance: number; summary: KarmaSummary }
export interface RewardsOverview { balance: number; bySource: { source: string; points: number; count: number }[] }
export interface Transaction { id: string; source: string; refKey: string; points: number; createdAt: string }
export interface TransactionPage { items: Transaction[]; page: number; pageSize: number; total: number; totalPages: number }

export const pointsApi = {
  horoscope: () => authRequest<HoroscopeSummary>("/me/horoscope/streak"),
  completeHoroscope: (body: { sign: string; horoscopeDate?: string; steps: { read: boolean; shuffled: boolean; revealed: boolean } }) =>
    authRequest<CompleteResult>("/me/horoscope/complete", { method: "POST", body }),
  karma: () => authRequest<KarmaSummary>("/me/karma/summary"),
  karmaPractices: (practices: string[]) => authRequest<KarmaAward>("/me/karma/practices", { method: "POST", body: { practices } }),
  rewards: () => authRequest<RewardsOverview>("/me/rewards"),
  transactions: (page: number) => authRequest<TransactionPage>(`/me/rewards/transactions?page=${page}&pageSize=20`),
};
