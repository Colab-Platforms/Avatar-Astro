import { lazy, Suspense, useEffect, useLayoutEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation, Navigate } from "react-router-dom";
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
import InnerVoiceJournal from "./pages/InnerVoiceJournal";
import InnerVoiceWisdom from "./pages/InnerVoiceWisdom";
import TarotExperience from "./pages/TarotExperience";
import SolarSystem from "./pages/SolarSystem";
import NotFound from "./pages/NotFound";
import CosmicBackground from "./components/CosmicBackground";
import HideOnHome from "./components/HideOnHome";
import { PublicRoute } from "./routes/PublicRoute";
import { GoogleOnboardingRoute } from "./routes/ProtectedRoute";
import { AdminRoute } from "./routes/AdminRoute";
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
  <div className="flex min-h-screen items-center justify-center bg-[#081426]">
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
          path="/inner-voice/journal"
          element={
            <PageTransition>
              <InnerVoiceJournal />
            </PageTransition>
          }
        />
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
                path="puja"
                element={
                  <Suspense fallback={<AdminLazyFallback />}>
                    <AdminPujaPage />
                  </Suspense>
                }
              />
              <Route
                path="chadhawa"
                element={
                  <Suspense fallback={<AdminLazyFallback />}>
                    <AdminChadhawaPage />
                  </Suspense>
                }
              />
              <Route
                path="shop/categories"
                element={
                  <Suspense fallback={<AdminLazyFallback />}>
                    <AdminShopCategoriesPage />
                  </Suspense>
                }
              />
              <Route
                path="shop/products"
                element={
                  <Suspense fallback={<AdminLazyFallback />}>
                    <AdminShopProductsPage />
                  </Suspense>
                }
              />
            </Route>
          </Route>

          {/* All other pages with Layout */}
          <Route
            path="*"
            element={
              <>
                <HideOnHome><CosmicBackground /></HideOnHome>
                <NavigationProvider>
                  <Layout>
                    <AnimatedRoutes />
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