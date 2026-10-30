import { useQuery } from "@tanstack/react-query";
import { authRequest } from "@/lib/authClient";

export interface MyDashboard {
  profile: {
    id: string; firstName: string | null; lastName: string | null; email: string; phoneNo: string | null; gender: string | null;
    city: string | null; state: string | null; country: string | null; authProvider: string;
    isEmailVerified: boolean; isPhoneVerified: boolean; profileCompleted: boolean; createdAt: string;
  };
  activeSessions: number;
  usage: { windowDays: number; byFeature: { feature: string; label: string; count: number }[] };
  recentActivity: { id: string; feature: string; label: string; status: string; at: string }[];
  hasTrackedActivity: boolean;
  persistence: { savedReports: boolean; innerVoiceHistory: boolean; bookings: boolean; note: string };
}

/** The signed-in user's own dashboard data; the server scopes it by the verified token. */
export function useMyDashboard() {
  return useQuery<MyDashboard, Error>({
    queryKey: ["my-dashboard"],
    queryFn: () => authRequest<MyDashboard>("/me/dashboard"),
    retry: 1,
    refetchOnWindowFocus: false,
  });
}
