import { useQuery } from "@tanstack/react-query";
import { API_BASE_URL } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import i18n from "@/i18n";
import { currentWeek } from "./week";

export interface WeeklySections {
  overview: string; career: string; love: string; finance: string; health: string; family: string; advice: string;
  lucky?: { color?: string; number?: string };
}
export interface WeeklyHoroscopeData {
  sign: string; weekStart: string; weekEnd: string; timezone: string; system: string; sections: WeeklySections; cached: boolean;
}

/**
 * The stored weekly reading for one Sun sign. Cached per sign and per week, so switching tabs or signs back and forth
 * does not call the server again, and a new week (the key changes on Monday, IST) is fetched fresh.
 */
export function useWeeklyHoroscope(sign: string | null, enabled = true) {
  const week = currentWeek().start;
  return useQuery<WeeklyHoroscopeData>({
    queryKey: ["weekly-horoscope", sign, week],
    enabled: enabled && !!sign,
    staleTime: 60 * 60 * 1000,
    retry: false,
    queryFn: async () => {
      const token = useAuthStore.getState().accessToken;
      const res = await fetch(`${API_BASE_URL}/interpretation/horoscope/weekly/${sign}`, token ? { headers: { Authorization: `Bearer ${token}` } } : undefined);
      if (!res.ok) throw new Error(i18n.t("horoscope.weekly.error"));
      const body = await res.json();
      if (!body?.data?.sections) throw new Error(i18n.t("horoscope.weekly.error"));
      return body.data as WeeklyHoroscopeData;
    },
  });
}
