import { useCallback, useEffect, useRef } from "react";
import { useUserProfile } from "./useUserProfile";
import { buildSavePatch, pendingSave, type CentralProfile, type EnteredDetails, type ProfileNeed } from "./profile";

/**
 * For forms that keep their own fields: fills them from the saved profile, and remembers what the user enters.
 *
 * - `apply(profile)` runs once, when the profile first arrives. Use functional setters (`v => v || saved`)
 *   so anything already typed, or restored from a draft, is never overwritten.
 * - `saveNew(entered)` is called on submit. It saves only details that are NOT yet in the profile; a value
 *   that differs from a saved one is left alone (the dashboard's Birth details page is where those are edited).
 *   It is best effort: the feature never waits on it or fails because of it.
 */
export function usePrefill(needs: readonly ProfileNeed[], apply: (profile: CentralProfile) => void) {
  const { profile, save } = useUserProfile();
  const applied = useRef(false);
  const applyRef = useRef(apply);
  applyRef.current = apply;

  useEffect(() => {
    if (!profile || applied.current) return;
    applied.current = true;
    applyRef.current(profile);
  }, [profile]);

  const saveNew = useCallback(
    (entered: EnteredDetails) => {
      if (!profile) return;
      const { added } = pendingSave(profile, entered, needs);
      if (added.length === 0) return;
      void save(buildSavePatch(added, entered)).catch(() => undefined);
    },
    [profile, save, needs],
  );

  return { profile, saveNew };
}
