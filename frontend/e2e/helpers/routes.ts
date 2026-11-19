/** Public routes (no sign-in). Verified against src/App.tsx. Dynamic slugs excluded. */
export const PUBLIC_ROUTES = [
  "/", "/about", "/contact", "/faq", "/blog", "/horoscopes", "/zodiac", "/zodiac/aries", "/astrologers", "/shop", "/puja", "/chadhawa",
  "/avatar-live", "/avatar-live/darshan", "/avatar-live/family", "/devotion", "/devotion/books", "/devotion/mantras-chants", "/books-and-mantras",
  "/birth-chart", "/compatibility", "/tarot", "/palm-reading", "/baby-name-jyotish", "/name-destiny-report", "/lucky-vehicle-number",
  "/muhurat-finder", "/gemstone-calculator", "/ratna-jyotish", "/inner-voice", "/solar-system", "/login", "/register", "/forgot-password", "/become-astrologer",
] as const;

/** Routes that must bounce an anonymous visitor to /login (or home for admin). */
export const PROTECTED_ROUTES = ["/dashboard", "/dashboard/wallet", "/dashboard/chats", "/astrologer-dashboard"] as const;
export const ADMIN_ROUTES = ["/admin", "/admin/customers", "/admin/payments", "/admin/admins", "/admin/billing-failures", "/admin/tool-pricing"] as const;

export const API = process.env.E2E_API_URL ?? "https://avatar-astro33-backend.onrender.com/api";
