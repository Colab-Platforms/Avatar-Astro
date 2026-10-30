/**
 * Activity taxonomy. ONE table (usage_events) stores everything; `eventType` says what kind of event it is.
 * Only "feature.request" rows feed the "feature requests / failures" metrics. The others are customer activity.
 */
export const EVENT_TYPES = {
  featureRequest: "feature.request", // an API call to a feature (result in `status`)
  featureOpened: "feature.opened", // the user opened a feature's page (NOT proof the feature was used or succeeded)
  authRegister: "auth.register", // account created (metadata.method: email | google)
  authLogin: "auth.login", // a session was issued (metadata.method: password | otp | phone_otp | google)
  authLoginFailed: "auth.login_failed", // wrong password, inactive account, unverified account (metadata.reason)
  profileUpdated: "profile.updated", // metadata.fields: names of the fields changed (never the values)
} as const;

export type EventType = (typeof EVENT_TYPES)[keyof typeof EVENT_TYPES];
export const ALL_EVENT_TYPES: string[] = Object.values(EVENT_TYPES);

export const EVENT_LABELS: Record<string, string> = {
  "feature.request": "Used",
  "feature.opened": "Opened",
  "auth.register": "Account created",
  "auth.login": "Signed in",
  "auth.login_failed": "Sign-in failed",
  "profile.updated": "Profile updated",
};

/** Pseudo feature name for events that are not tied to a product feature. */
export const AUTH_FEATURE = "auth";
export const PROFILE_FEATURE = "profile";
