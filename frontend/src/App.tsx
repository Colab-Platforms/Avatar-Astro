import { lazy, Suspense, useEffect, useLayoutEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import Layout from "./components/Layout";
import { NavigationProvider } from "./context/NavigationContext";
import PageTransition from "./components/PageTransition";
import Index from "./pages/Index";
import DailyHoroscopes from "./pages/DailyHoroscopes";
import ZodiacSigns from "./pages/ZodiacSigns";
import ZodiacDetail from "./pages/ZodiacDetail";
import CompatibilityChecker from "./pages/CompatibilityChecker";
import BirthChart from "./pages/BirthChart";
import NameDestinyReportPage from "./pages/NameDestinyReportPage";
import Blog from "./pages/Blog";
import About from "./pages/About";
import Contact from "./pages/Contact";
import PalmReading from "./pages/PalmReading";
import InnerVoice from "./pages/InnerVoice";
import InnerVoiceChat from "./pages/InnerVoiceChat";
import InnerVoiceDashboard from "./pages/InnerVoiceDashboard";
import FutureLifePath from "./pages/FutureLifePath";
import InnerVoiceWisdom from "./pages/InnerVoiceWisdom";
import TarotExperience from "./pages/TarotExperience";
import SolarSystem from "./pages/SolarSystem";
import NotFound from "./pages/NotFound";
import { PublicRoute } from "./routes/PublicRoute";
import { GoogleOnboardingRoute, ProtectedRoute } from "./routes/ProtectedRoute";
import SignInPrompt from "./components/SignInPrompt";
import AnnouncementBar from "./components/AnnouncementBar";
import FeatureRouteGuard from "./components/FeatureRouteGuard";
import Faq from "./pages/Faq";
import { AdminRoute } from "./routes/AdminRoute";
import { LegacyShell, MainOnly } from "./features/admin/panel/guards";
import Loader from "./components/Loader/Loader";

const LoginPage = lazy(() => import("./features/auth/pages/LoginPage"));
const RegisterPage = lazy(() => import("./features/auth/pages/RegisterPage"));
const VerifyOtpPage = lazy(() => import("./features/auth/pages/VerifyOtpPage"));
const ForgotPasswordPage = lazy(
  () => import("./features/auth/pages/ForgotPasswordPage"),
);
const ResetPasswordPage = lazy(
  () => import("./features/auth/pages/ResetPasswordPage"),
);
const GoogleOnboardingPage = lazy(
  () => import("./features/auth/pages/GoogleOnboardingPage"),
);

const AdminLayout = lazy(
  () => import("./features/admin/components/AdminLayout"),
);
const AdminDashboardPage = lazy(
  () => import("./features/admin/pages/Dashboard"),
);
const AdminPujaPage = lazy(() => import("./features/admin/pages/Puja"));
const AdminUsersPage = lazy(() => import("./features/admin/panel/pages/UsersPage"));
const AdminToolsPage = lazy(() => import("./features/admin/panel/pages/ToolsPage"));
const AdminActivityPage = lazy(() => import("./features/admin/panel/pages/ActivityPage"));
const AdminInnerVoicePage = lazy(() => import("./features/admin/panel/pages/InnerVoiceAdminPage"));
const AdminDevotionPage = lazy(() => import("./features/admin/panel/pages/CatalogPages").then((m) => ({ default: m.DevotionAdminPage })));
const AdminShopOrdersPage = lazy(() => import("./features/admin/panel/pages/CatalogPages").then((m) => ({ default: m.ShopAdminPage })));
const AdminPaymentsPage = lazy(() => import("./features/admin/panel/pages/CatalogPages").then((m) => ({ default: m.PaymentsAdminPage })));
const AdminContentPage = lazy(() => import("./features/admin/panel/pages/ContentPage"));
const AdminIntegrationsPage = lazy(() => import("./features/admin/panel/pages/IntegrationsPage"));
const AdminReportsPage = lazy(() => import("./features/admin/panel/pages/ReportsPage"));
const AdminSettingsPage = lazy(() => import("./features/admin/panel/pages/SettingsAuditPage"));
const DashboardLayout = lazy(() => import("./features/dashboard/DashboardLayout"));
const DashboardHome = lazy(() => import("./features/dashboard/DashboardPages").then((m) => ({ default: m.DashboardHome })));
const MyAstrology = lazy(() => import("./features/dashboard/DashboardPages").then((m) => ({ default: m.MyAstrology })));
const MyInnerVoice = lazy(() => import("./features/dashboard/DashboardPages").then((m) => ({ default: m.MyInnerVoice })));
const MyDevotion = lazy(() => import("./features/dashboard/DashboardPages").then((m) => ({ default: m.MyDevotion })));
const ProfileSettings = lazy(() => import("./features/dashboard/DashboardPages").then((m) => ({ default: m.ProfileSettings })));
const AdminChadhawaPage = lazy(
  () => import("./features/admin/pages/Chadhawa"),
);
const AdminShopCategoriesPage = lazy(
  () => import("./features/admin/pages/ShopCategories"),
);
const AdminShopProductsPage = lazy(
  () => import("./features/admin/pages/ShopProducts"),
);

const PujaPage      = lazy(() => import("./pages/Puja/index"));
const PujaDetail    = lazy(() => import("./pages/Puja/PujaDetail"));
const ChadhawaPage  = lazy(() => import("./pages/Chadhawa/index"));
const ChadhawaDetail = lazy(() => import("./pages/Chadhawa/ChadhawaDetail"));
const RatnaJyotish = lazy(() => import("./pages/RatnaJyotish"));
const RatnaJyotishResult = lazy(() => import("./pages/RatnaJyotishResult"));
const ShopPage      = lazy(() => import("./pages/Shop/index"));
const ShopDetail    = lazy(() => import("./pages/Shop/ShopDetail"));
const AvatarLivePage   = lazy(() => import("./pages/AvatarLive/index"));
const DarshanPage      = lazy(() => import("./pages/AvatarLive/DarshanPage"));
const DarshanDetail    = lazy(() => import("./pages/AvatarLive/DarshanDetail"));
const FamilyPage       = lazy(() => import("./pages/AvatarLive/FamilyPage"));

const LazyFallback = () => <div className="min-h-screen" />;

const AdminLazyFallback = () => (
  <div className="flex min-h-screen items-center justify-center bg-[#FBF5EC]">
    <Loader />
  </div>
);

const queryClient = new QueryClient();

// Forces the viewport to the top, then re-asserts it for a few more animation
// frames. A single scrollTo call isn't reliable here: GSAP's ScrollTrigger
// (used for scroll-reveal animations on several pages) resets
// history.scrollRestoration back to "auto" on its own refresh cycle, which
// re-enables the browser's native back/forward scroll restoration — that
// native restore can land *after* a single corrective scrollTo call,
// especially on the Back/Forward buttons. Repeating the correction across a
// few frames wins that race regardless of exactly when it fires.
const forceScrollTop = () => {
  const toTop = () => window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
  toTop();
  let frames = 4;
  const reassert = () => {
    toTop();
    if (--frames > 0) requestAnimationFrame(reassert);
  };
  requestAnimationFrame(reassert);
};

const AnimatedRoutes = () => {
  const location = useLocation();

  // Reset scroll to top on every route change, before the browser paints —
  // so the new page always opens at its hero section, never at wherever the
  // previous page happened to be scrolled to.
  useLayoutEffect(() => {
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
    forceScrollTop();
  }, [location.pathname]);

  return (
    <AnimatePresence mode="wait" initial={false}>
      <Routes location={location} key={location.pathname}>
        <Route
          path="/"
          element={
            <PageTransition>
              <Index />
            </PageTransition>
          }
        />
        <Route
          path="/horoscopes"
          element={
            <PageTransition>
              <DailyHoroscopes />
            </PageTransition>
          }
        />
        <Route
          path="/zodiac"
          element={
            <PageTransition>
              <ZodiacSigns />
            </PageTransition>
          }
        />
        <Route
          path="/zodiac/:sign"
          element={
            <PageTransition>
              <ZodiacDetail />
            </PageTransition>
          }
        />
        <Route
          path="/compatibility"
          element={
            <PageTransition>
              <CompatibilityChecker />
            </PageTransition>
          }
        />
        <Route
          path="/birth-chart"
          element={
            <PageTransition>
              <BirthChart />
            </PageTransition>
          }
        />
        <Route
          path="/name-destiny-report"
          element={
            <PageTransition>
              <NameDestinyReportPage />
            </PageTransition>
          }
        />
        <Route
          path="/blog"
          element={
            <PageTransition>
              <Blog />
            </PageTransition>
          }
        />
        <Route
          path="/about"
          element={
            <PageTransition>
              <About />
            </PageTransition>
          }
        />
        <Route
          path="/faq"
          element={
            <PageTransition>
              <Faq />
            </PageTransition>
          }
        />
        <Route
          path="/contact"
          element={
            <PageTransition>
              <Contact />
            </PageTransition>
          }
        />
        <Route
          path="/palm-reading"
          element={
            <PageTransition>
              <PalmReading />
            </PageTransition>
          }
        />
        <Route
          path="/inner-voice"
          element={
            <PageTransition>
              <InnerVoice />
            </PageTransition>
          }
        />
        <Route
          path="/inner-voice/chat"
          element={
            <PageTransition>
              <InnerVoiceChat />
            </PageTransition>
          }
        />
        <Route
          path="/inner-voice/dashboard"
          element={
            <PageTransition>
              <InnerVoiceDashboard />
            </PageTransition>
          }
        />
        <Route
          path="/inner-voice/future-path"
          element={
            <PageTransition>
              <FutureLifePath />
            </PageTransition>
          }
        />
        {/* Karma Journal was replaced by Future Life Path Prediction; keep old links working. */}
        <Route path="/inner-voice/journal" element={<Navigate to="/inner-voice/future-path" replace />} />
        <Route
          path="/inner-voice/wisdom"
          element={
            <PageTransition>
              <InnerVoiceWisdom />
            </PageTransition>
          }
        />
        <Route
          path="/tarot"
          element={
            <PageTransition>
              <TarotExperience />
            </PageTransition>
          }
        />
        <Route
          path="/puja"
          element={
            <PageTransition>
              <Suspense fallback={<LazyFallback />}>
                <PujaPage />
              </Suspense>
            </PageTransition>
          }
        />
        <Route
          path="/puja/:slug"
          element={
            <PageTransition>
              <Suspense fallback={<LazyFallback />}>
                <PujaDetail />
              </Suspense>
            </PageTransition>
          }
        />
        <Route
          path="/chadhawa"
          element={
            <PageTransition>
              <Suspense fallback={<LazyFallback />}>
                <ChadhawaPage />
              </Suspense>
            </PageTransition>
          }
        />
        <Route
          path="/chadhawa/:slug"
          element={
            <PageTransition>
              <Suspense fallback={<LazyFallback />}>
                <ChadhawaDetail />
              </Suspense>
            </PageTransition>
          }
        />
        <Route
          path="/ratna-jyotish"
          element={
            <PageTransition>
              <Suspense fallback={<LazyFallback />}>
                <RatnaJyotish />
              </Suspense>
            </PageTransition>
          }
        />
        <Route
          path="/ratna-jyotish/result"
          element={
            <PageTransition>
              <Suspense fallback={<LazyFallback />}>
                <RatnaJyotishResult />
              </Suspense>
            </PageTransition>
          }
        />
        {/* Legacy alias: old gemstone-calculator links keep working. */}
        <Route path="/gemstone-calculator" element={<Navigate to="/ratna-jyotish" replace />} />
        <Route
          path="/shop"
          element={
            <PageTransition>
              <Suspense fallback={<LazyFallback />}>
                <ShopPage />
              </Suspense>
            </PageTransition>
          }
        />
        <Route
          path="/shop/:slug"
          element={
            <PageTransition>
              <Suspense fallback={<LazyFallback />}>
                <ShopDetail />
              </Suspense>
            </PageTransition>
          }
        />
        <Route
          path="/avatar-live"
          element={
            <PageTransition>
              <Suspense fallback={<LazyFallback />}>
                <AvatarLivePage />
              </Suspense>
            </PageTransition>
          }
        />
        <Route
          path="/avatar-live/darshan"
          element={
            <PageTransition>
              <Suspense fallback={<LazyFallback />}>
                <DarshanPage />
              </Suspense>
            </PageTransition>
          }
        />
        <Route
          path="/avatar-live/darshan/:slug"
          element={
            <PageTransition>
              <Suspense fallback={<LazyFallback />}>
                <DarshanDetail />
              </Suspense>
            </PageTransition>
          }
        />
        <Route
          path="/avatar-live/family"
          element={
            <PageTransition>
              <Suspense fallback={<LazyFallback />}>
                <FamilyPage />
              </Suspense>
            </PageTransition>
          }
        />
        <Route
          path="*"
          element={
            <PageTransition>
              <NotFound />
            </PageTransition>
          }
        />
      </Routes>
    </AnimatePresence>
  );
};

const App = () => {
  // Backstop for the browser Back/Forward buttons: native popstate scroll
  // restoration happens before any React re-render can run, so the
  // per-route useLayoutEffect above can lose that race. A direct popstate
  // listener corrects it immediately, independent of React's render timing.
  useEffect(() => {
    const handlePopState = () => forceScrollTop();
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  return (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <BrowserRouter>
        <Toaster />
        <Sonner />
        <SignInPrompt />
        <AnnouncementBar />
        <Routes>
          {/* Full-screen standalone pages (no Layout/Navbar) */}
          <Route path="/solar-system" element={<SolarSystem />} />

          {/* Auth — public (redirect if already signed in) */}
          <Route element={<PublicRoute />}>
            <Route
              path="/login"
              element={
                <Suspense fallback={<LazyFallback />}>
                  <LoginPage />
                </Suspense>
              }
            />
            <Route
              path="/register"
              element={
                <Suspense fallback={<LazyFallback />}>
                  <RegisterPage />
                </Suspense>
              }
            />
            <Route
              path="/verify-otp"
              element={
                <Suspense fallback={<LazyFallback />}>
                  <VerifyOtpPage />
                </Suspense>
              }
            />
            <Route
              path="/forgot-password"
              element={
                <Suspense fallback={<LazyFallback />}>
                  <ForgotPasswordPage />
                </Suspense>
              }
            />
            <Route
              path="/reset-password"
              element={
                <Suspense fallback={<LazyFallback />}>
                  <ResetPasswordPage />
                </Suspense>
              }
            />
          </Route>

          {/* Google onboarding — authenticated but profile incomplete */}
          <Route element={<GoogleOnboardingRoute />}>
            <Route
              path="/google-onboarding"
              element={
                <Suspense fallback={<LazyFallback />}>
                  <GoogleOnboardingPage />
                </Suspense>
              }
            />
          </Route>

          {/* Admin — own layout (no public CosmicBackground / Navbar) */}
          <Route element={<AdminRoute />}>
            <Route
              path="/admin"
              element={
                <Suspense fallback={<AdminLazyFallback />}>
                  <AdminLayout />
                </Suspense>
              }
            >
              <Route
                index
                element={
                  <Suspense fallback={<AdminLazyFallback />}>
                    <AdminDashboardPage />
                  </Suspense>
                }
              />
              <Route
                path="users"
                element={
                  <Suspense fallback={<AdminLazyFallback />}>
                    <MainOnly><AdminUsersPage /></MainOnly>
                  </Suspense>
                }
              />
              <Route
                path="activity"
                element={
                  <Suspense fallback={<AdminLazyFallback />}>
                    <MainOnly><AdminActivityPage /></MainOnly>
                  </Suspense>
                }
              />
              <Route
                path="tools"
                element={
                  <Suspense fallback={<AdminLazyFallback />}>
                    <MainOnly><AdminToolsPage /></MainOnly>
                  </Suspense>
                }
              />
              <Route
                path="inner-voice"
                element={
                  <Suspense fallback={<AdminLazyFallback />}>
                    <MainOnly><AdminInnerVoicePage /></MainOnly>
                  </Suspense>
                }
              />
              <Route
                path="devotion"
                element={
                  <Suspense fallback={<AdminLazyFallback />}>
                    <MainOnly><AdminDevotionPage /></MainOnly>
                  </Suspense>
                }
              />
              <Route
                path="shop-orders"
                element={
                  <Suspense fallback={<AdminLazyFallback />}>
                    <MainOnly><AdminShopOrdersPage /></MainOnly>
                  </Suspense>
                }
              />
              <Route
                path="content"
                element={
                  <Suspense fallback={<AdminLazyFallback />}>
                    <MainOnly><AdminContentPage /></MainOnly>
                  </Suspense>
                }
              />
              <Route
                path="payments"
                element={
                  <Suspense fallback={<AdminLazyFallback />}>
                    <MainOnly><AdminPaymentsPage /></MainOnly>
                  </Suspense>
                }
              />
              <Route
                path="integrations"
                element={
                  <Suspense fallback={<AdminLazyFallback />}>
                    <MainOnly><AdminIntegrationsPage /></MainOnly>
                  </Suspense>
                }
              />
              <Route
                path="reports"
                element={
                  <Suspense fallback={<AdminLazyFallback />}>
                    <MainOnly><AdminReportsPage /></MainOnly>
                  </Suspense>
                }
              />
              <Route
                path="settings"
                element={
                  <Suspense fallback={<AdminLazyFallback />}>
                    <MainOnly><AdminSettingsPage /></MainOnly>
                  </Suspense>
                }
              />
              <Route
                path="puja"
                element={
                  <Suspense fallback={<AdminLazyFallback />}>
                    <LegacyShell><AdminPujaPage /></LegacyShell>
                  </Suspense>
                }
              />
              <Route
                path="chadhawa"
                element={
                  <Suspense fallback={<AdminLazyFallback />}>
                    <LegacyShell><AdminChadhawaPage /></LegacyShell>
                  </Suspense>
                }
              />
              <Route
                path="shop/categories"
                element={
                  <Suspense fallback={<AdminLazyFallback />}>
                    <LegacyShell><AdminShopCategoriesPage /></LegacyShell>
                  </Suspense>
                }
              />
              <Route
                path="shop/products"
                element={
                  <Suspense fallback={<AdminLazyFallback />}>
                    <LegacyShell><AdminShopProductsPage /></LegacyShell>
                  </Suspense>
                }
              />
            </Route>
          </Route>

          {/* User dashboard — signed-in users only; data is scoped server-side by token */}
          <Route element={<ProtectedRoute />}>
            <Route
              path="/dashboard"
              element={
                <NavigationProvider>
                  <Layout>
                    <Suspense fallback={<LazyFallback />}>
                      <DashboardLayout />
                    </Suspense>
                  </Layout>
                </NavigationProvider>
              }
            >
              <Route index element={<Suspense fallback={<LazyFallback />}><DashboardHome /></Suspense>} />
              <Route path="astrology" element={<Suspense fallback={<LazyFallback />}><MyAstrology /></Suspense>} />
              <Route path="inner-voice" element={<Suspense fallback={<LazyFallback />}><MyInnerVoice /></Suspense>} />
              <Route path="devotion" element={<Suspense fallback={<LazyFallback />}><MyDevotion /></Suspense>} />
              <Route path="profile" element={<Suspense fallback={<LazyFallback />}><ProfileSettings /></Suspense>} />
            </Route>
          </Route>

          {/* All other pages with Layout */}
          <Route
            path="*"
            element={
              <>
                <NavigationProvider>
                  <Layout>
                    <FeatureRouteGuard>
                      <AnimatedRoutes />
                    </FeatureRouteGuard>
                  </Layout>
                </NavigationProvider>
              </>
            }
          />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  );
};

export default App;