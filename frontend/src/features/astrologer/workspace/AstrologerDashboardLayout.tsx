import { useState, useEffect } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { ExternalLink, LogOut, Menu, MessageCircle, PanelLeftClose, PanelLeftOpen, ShieldAlert, UserCog, X, type LucideIcon } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useLogoutMutation } from "@/features/auth/hooks/useAuthMutations";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ErrorBox, Loading } from "@/features/dashboard/library/ui";
import { useAstrologerAccess } from "./hooks/useAstrologerWorkspace";
import { useSetAstrologerOnline } from "@/features/chat/hooks/useAstrologerConversations";
import { connectSocket } from "@/features/chat/lib/socket";
import { astrologerChatApi, type ChatSession } from "@/features/chat/api/chatApi";
import { playConsultationChime } from "@/features/chat/lib/notificationSound";
import IncomingRequestModal from "@/features/chat/components/IncomingRequestModal";
import type { AstrologerProfileSelf } from "./types";

interface Item {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
}

const NAV: Item[] = [
  { to: "/astrologer-dashboard", label: "Profile", icon: UserCog, end: true },
  { to: "/astrologer-dashboard/chat", label: "Chats", icon: MessageCircle },
];

const TITLE_BY_PATH: Record<string, string> = {
  "/astrologer-dashboard": "Your Astrologer Profile",
};

function getTitle(pathname: string): string {
  if (TITLE_BY_PATH[pathname]) return TITLE_BY_PATH[pathname];
  if (pathname.startsWith("/astrologer-dashboard/chat")) return "Chats";
  return "Astrologer Workspace";
}

const KEY = "mb-astrologer-sidebar-collapsed";
const readCollapsed = () => {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
};
const saveCollapsed = (v: boolean) => {
  try {
    localStorage.setItem(KEY, v ? "1" : "0");
  } catch {
    /* private mode */
  }
};

function Initials({ name, photo, size = "md" }: { name: string; photo?: string | null; size?: "sm" | "md" }) {
  const t = name.split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase() || "A";
  const sizeCls = size === "sm" ? "h-7 w-7 text-xs" : "h-9 w-9 text-xs";
  if (photo) {
    return <img src={photo} alt="" aria-hidden="true" className={cn("shrink-0 rounded-lg object-cover", sizeCls)} />;
  }
  return (
    <span aria-hidden="true" className={cn("flex shrink-0 items-center justify-center rounded-lg bg-[#3A1C0C] font-semibold text-[#F3E8D4]", sizeCls)}>
      {t}
    </span>
  );
}

function OnlineToggle({
  isOnline,
  pending,
  onToggle,
  compact,
}: {
  isOnline: boolean;
  pending: boolean;
  onToggle: () => void;
  compact?: boolean;
}) {
  if (compact) {
    return (
      <button
        type="button"
        title={isOnline ? "Online for chats — tap to go offline" : "Offline — tap to go online"}
        onClick={onToggle}
        disabled={pending}
        className="flex h-9 w-9 items-center justify-center rounded-lg text-[#5A493C] transition-colors hover:bg-[#F6EEDF] disabled:opacity-50"
      >
        <span className={cn("h-2.5 w-2.5 rounded-full", isOnline ? "bg-[#2F7D4B]" : "bg-[#9A8575]")} aria-hidden="true" />
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={pending}
      className={cn(
        "flex w-full items-center gap-2 rounded-lg border px-2.5 py-2 text-xs font-medium transition disabled:opacity-50",
        isOnline ? "border-[#2F7D4B]/40 bg-[#2F7D4B]/10 text-[#2F7D4B]" : "border-[#E0D2BA] bg-white text-[#6E5D4E]"
      )}
    >
      <span className={cn("h-2 w-2 rounded-full", isOnline ? "bg-[#2F7D4B]" : "bg-[#9A8575]")} aria-hidden="true" />
      {isOnline ? "Online for chats" : "Offline"}
    </button>
  );
}

/** Astrologer workspace context handed down through <Outlet context> so child pages (profile
 * editor, chat) don't each have to re-run the requireAstrologer access check themselves. */
export interface AstrologerOutletContext {
  profile: AstrologerProfileSelf;
}

/**
 * Sidebar shell for the astrologer workspace, structurally mirroring the customer-facing
 * features/dashboard/DashboardLayout.tsx (same palette, same collapse/mobile-drawer behavior)
 * so both dashboards feel like one product. Owns the requireAstrologer access gate so every
 * nested page can assume an approved profile is already available.
 */
export default function AstrologerDashboardLayout() {
  const access = useAstrologerAccess();
  const setOnline = useSetAstrologerOnline();
  const [collapsed, setCollapsed] = useState(readCollapsed);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [incomingSession, setIncomingSession] = useState<ChatSession | null>(null);
  const [incomingModalOpen, setIncomingModalOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const logoutMutation = useLogoutMutation();

  const isFullBleed = location.pathname.startsWith("/astrologer-dashboard/chat");
  const title = getTitle(location.pathname);

  const toggle = () => {
    setCollapsed((c) => {
      const next = !c;
      saveCollapsed(next);
      return next;
    });
  };

  const handleToggleOnline = (target: boolean) => {
    if (target && "Notification" in window && Notification.permission === "default") {
      Notification.requestPermission().catch(() => {});
    }
    setOnline.mutate(target);
  };

  useEffect(() => {
    const socket = connectSocket();

    const onNewSession = async (payload: { sessionId: string }) => {
      try {
        const fullSession = await astrologerChatApi.getSession(payload.sessionId);
        if (fullSession.status === "REQUESTED") {
          setIncomingSession(fullSession);
          setIncomingModalOpen(true);
          playConsultationChime();

          if ("Notification" in window && Notification.permission === "granted") {
            const clientName = [fullSession.user?.firstName, fullSession.user?.lastName].filter(Boolean).join(" ") || "Client";
            new Notification("New Consultation Request", {
              body: `${clientName} has requested a consultation with you.`,
            });
          }
        }
      } catch (err) {
        console.error("Could not fetch incoming session details:", err);
      }
    };

    const onSessionEnded = (payload: { sessionId: string }) => {
      if (incomingSession?.id === payload.sessionId) {
        setIncomingModalOpen(false);
        setIncomingSession(null);
        toast.info("The consultation request was cancelled or expired.");
      }
    };

    socket.on("chat:new-session", onNewSession);
    socket.on("chat:session-ended", onSessionEnded);

    return () => {
      socket.off("chat:new-session", onNewSession);
      socket.off("chat:session-ended", onSessionEnded);
    };
  }, [incomingSession?.id]);

  const handleAcceptIncoming = async () => {
    if (!incomingSession) return;
    try {
      await astrologerChatApi.acceptSession(incomingSession.id);
      setIncomingModalOpen(false);
      navigate(`/astrologer-dashboard/chat/${incomingSession.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not accept consultation");
    }
  };

  const handleRejectIncoming = async () => {
    if (!incomingSession) return;
    try {
      await astrologerChatApi.rejectSession(incomingSession.id);
      setIncomingModalOpen(false);
      setIncomingSession(null);
      toast.info("Consultation request declined");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not decline consultation");
    }
  };

  const handleLogout = async () => {
    try {
      await logoutMutation.mutateAsync();
    } finally {
      navigate("/login", { replace: true });
    }
  };

  if (access.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FAF8F5] p-6">
        <Loading label="Loading your astrologer workspace…" />
      </div>
    );
  }

  if (access.denied) {
    return (
      <section className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center gap-3 bg-[#FAF8F5] px-4 text-center">
        <ShieldAlert className="h-8 w-8 text-[#A8803A]" aria-hidden="true" />
        <h1 className="font-home-serif text-xl font-semibold text-[#2A1A10]">Astrologer access required</h1>
        <p className="text-sm text-[#6E5D4E]">
          This workspace is only available once your astrologer application has been approved. Check your application status from your dashboard.
        </p>
        <Link to="/dashboard" className="rounded-xl border border-[#E0D2BA] bg-white px-3.5 py-2 text-sm font-medium text-[#2A1A10] hover:bg-[#F6EEDF]">
          Back to dashboard
        </Link>
      </section>
    );
  }

  if (access.error || !access.profile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FAF8F5] p-6">
        <ErrorBox error={access.error} onRetry={() => access.refetch()} />
      </div>
    );
  }

  const profile = access.profile;
  const name = profile.displayName || "Astrologer";

  return (
    <div className="flex h-screen overflow-hidden bg-[#FAF8F5] text-[#2A1A10]">
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "hidden h-screen shrink-0 flex-col border-r border-[#E9DDC9] bg-[#FFFDF8] transition-[width] duration-200 ease-in-out lg:flex",
          collapsed ? "w-20" : "w-64"
        )}
      >
        <div className={cn("flex h-14 items-center border-b border-[#E9DDC9] px-4", collapsed ? "justify-center px-0" : "justify-start")}>
          {collapsed ? (
            <Link to="/" className="flex items-center justify-center" title="Bhagya - Go to website homepage">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#3A1C0C] text-xs font-semibold text-[#F3E8D4]">MB</span>
            </Link>
          ) : (
            <Link to="/" className="flex min-w-0 items-center gap-2.5" title="Go to website homepage">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#3A1C0C] text-xs font-semibold text-[#F3E8D4]">MB</span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold tracking-tight text-[#2A1A10]">Bhagya</p>
                <p className="truncate text-[0.68rem] text-[#8C7A6B]">Astrologer workspace</p>
              </div>
            </Link>
          )}
        </div>

        <nav aria-label="Astrologer workspace sections" className="flex-1 overflow-y-auto px-3 py-3">
          <ul className="space-y-1">
            {NAV.map(({ to, label, icon: Icon, end }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  end={end}
                  title={collapsed ? label : undefined}
                  className={({ isActive }) =>
                    cn(
                      "group relative flex items-center rounded-xl text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#803003]",
                      collapsed ? "h-10 w-full justify-center px-0" : "gap-3 px-3 py-2",
                      isActive ? "bg-[#F3E8D4] font-semibold text-[#803003]" : "text-[#5A493C] hover:bg-[#F6EEDF] hover:text-[#2A1A10]"
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      <Icon
                        className={cn("h-4 w-4 shrink-0 transition-colors", isActive ? "text-[#803003]" : "text-[#8C7A6B] group-hover:text-[#2A1A10]")}
                        aria-hidden="true"
                      />
                      {!collapsed && <span className="truncate">{label}</span>}
                      {collapsed && <span className="sr-only">{label}</span>}
                    </>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="border-t border-[#E9DDC9] p-3">
          {!collapsed ? (
            <div className="space-y-3">
              <OnlineToggle isOnline={profile.isOnline} pending={setOnline.isPending} onToggle={() => handleToggleOnline(!profile.isOnline)} />

              <div className="flex items-center gap-3 px-1">
                <Initials name={name} photo={profile.profilePhotoUrl} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-[#2A1A10]">{name}</p>
                  <p className="truncate text-xs text-[#8C7A6B]">{profile.isPublished ? "Published" : "Not published"}</p>
                </div>
              </div>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start gap-2.5 rounded-lg px-2.5 text-xs font-medium text-[#5A493C] hover:bg-[#F6EEDF] hover:text-[#2A1A10]"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    <span>Log out</span>
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="border-[#E9DDC9] bg-white text-[#2A1A10]">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-lg font-semibold">Confirm logout</AlertDialogTitle>
                    <AlertDialogDescription className="text-[#6E5D4E]">
                      Are you sure you want to log out of your astrologer workspace?
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="border-[#E0D2BA] bg-white text-[#2A1A10] hover:bg-[#F6EEDF]">Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleLogout} className="bg-[#803003] text-white hover:bg-[#6B2802]">
                      Log out
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <OnlineToggle isOnline={profile.isOnline} pending={setOnline.isPending} onToggle={() => handleToggleOnline(!profile.isOnline)} compact />
              <div title={name}>
                <Initials name={name} photo={profile.profilePhotoUrl} />
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <button
                    type="button"
                    title="Log out"
                    aria-label="Log out"
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-[#5A493C] transition-colors hover:bg-[#F6EEDF] hover:text-[#2A1A10]"
                  >
                    <LogOut className="h-4 w-4" />
                  </button>
                </AlertDialogTrigger>
                <AlertDialogContent className="border-[#E9DDC9] bg-white text-[#2A1A10]">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-lg font-semibold">Confirm logout</AlertDialogTitle>
                    <AlertDialogDescription className="text-[#6E5D4E]">
                      Are you sure you want to log out of your astrologer workspace?
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="border-[#E0D2BA] bg-white text-[#2A1A10] hover:bg-[#F6EEDF]">Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleLogout} className="bg-[#803003] text-white hover:bg-[#6B2802]">
                      Log out
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
        </div>
      </aside>

      {/* Mobile drawer */}
      <div className={cn("fixed inset-0 z-50 lg:hidden", mobileOpen ? "pointer-events-auto" : "pointer-events-none")}>
        <div
          className={cn("absolute inset-0 bg-black/40 backdrop-blur-xs transition-opacity duration-200", mobileOpen ? "opacity-100" : "opacity-0")}
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
        <aside
          className={cn(
            "absolute left-0 top-0 flex h-full w-72 max-w-[85vw] flex-col border-r border-[#E9DDC9] bg-[#FFFDF8] shadow-2xl transition-transform duration-200 ease-out",
            mobileOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          <div className="flex h-14 items-center justify-between border-b border-[#E9DDC9] px-4">
            <Link to="/" onClick={() => setMobileOpen(false)} className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#3A1C0C] text-xs font-semibold text-[#F3E8D4]">MB</span>
              <div>
                <p className="text-sm font-semibold tracking-tight text-[#2A1A10]">Bhagya</p>
                <p className="text-[0.68rem] text-[#8C7A6B]">Astrologer workspace</p>
              </div>
            </Link>
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-[#5A493C] hover:bg-[#F6EEDF]"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto px-3 py-4">
            <ul className="space-y-1">
              {NAV.map(({ to, label, icon: Icon, end }) => (
                <li key={to}>
                  <NavLink
                    to={to}
                    end={end}
                    onClick={() => setMobileOpen(false)}
                    className={({ isActive }) =>
                      cn(
                        "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                        isActive ? "bg-[#F3E8D4] font-semibold text-[#803003]" : "text-[#5A493C] hover:bg-[#F6EEDF] hover:text-[#2A1A10]"
                      )
                    }
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span>{label}</span>
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>

          <div className="border-t border-[#E9DDC9] p-4">
            <div className="mb-3">
              <OnlineToggle isOnline={profile.isOnline} pending={setOnline.isPending} onToggle={() => handleToggleOnline(!profile.isOnline)} />
            </div>
            <div className="mb-3 flex items-center gap-3">
              <Initials name={name} photo={profile.profilePhotoUrl} />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-[#2A1A10]">{name}</p>
                <p className="truncate text-xs text-[#8C7A6B]">{profile.isPublished ? "Published" : "Not published"}</p>
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              onClick={handleLogout}
              className="w-full justify-start gap-3 rounded-xl px-3 text-[#5A493C] hover:bg-[#F6EEDF] hover:text-[#2A1A10]"
            >
              <LogOut className="h-4 w-4" /> Log out
            </Button>
          </div>
        </aside>
      </div>

      {/* Main content column */}
      <div className="flex h-full min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center justify-between border-b border-[#E9DDC9] bg-[#FFFDF8]/90 px-4 backdrop-blur-sm sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="Open sidebar menu"
              className="flex h-9 w-9 items-center justify-center rounded-lg text-[#2A1A10] hover:bg-[#F6EEDF] lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>

            <button
              type="button"
              onClick={toggle}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              className="hidden h-9 w-9 items-center justify-center rounded-lg text-[#5A493C] transition-colors hover:bg-[#F6EEDF] hover:text-[#2A1A10] lg:flex"
            >
              {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
            </button>

            <div className="hidden h-4 w-px bg-[#E9DDC9] sm:block" />

            <div className="min-w-0">
              <h1 className="truncate text-sm font-semibold tracking-tight text-[#2A1A10] sm:text-base">{title}</h1>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs sm:gap-4 sm:text-sm">
            <Link
              to={`/astrologers/${profile.slug}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 font-medium text-[#6E5D4E] transition-colors hover:text-[#803003]"
              title="View your public profile"
            >
              <span>Public profile</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>

            <div className="hidden h-4 w-px bg-[#E9DDC9] sm:block" />

            <Link to="/astrologer-dashboard" className="flex items-center gap-2 rounded-lg p-1 transition-colors hover:bg-[#F6EEDF]" title="Profile settings">
              <Initials name={name} photo={profile.profilePhotoUrl} size="sm" />
              <span className="hidden max-w-[10rem] truncate font-medium text-[#2A1A10] sm:inline-block">{name}</span>
            </Link>
          </div>
        </header>

        <main id="astrologer-dashboard-main" className={cn("flex-1 bg-[#FAF8F5]", isFullBleed ? "overflow-hidden" : "overflow-y-auto p-4 sm:p-6 lg:p-8")}>
          {isFullBleed ? (
            <Outlet context={{ profile } satisfies AstrologerOutletContext} />
          ) : (
            <div className="mx-auto w-full max-w-3xl">
              <Outlet context={{ profile } satisfies AstrologerOutletContext} />
            </div>
          )}
        </main>
      </div>

      <IncomingRequestModal
        open={incomingModalOpen}
        session={incomingSession}
        onAccept={handleAcceptIncoming}
        onReject={handleRejectIncoming}
        onClose={() => setIncomingModalOpen(false)}
      />
    </div>
  );
}
