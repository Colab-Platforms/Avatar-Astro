import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useSignInPrompt } from "@/lib/authedFetch";

/**
 * Global "Sign in to continue" dialog, opened by requireSignIn()/authedFetch() when a signed-out
 * visitor tries a feature that needs an account. After signing in, LoginPage returns them to the
 * page they were on (location.state.from).
 */
const SignInPrompt = () => {
  const { open, hide } = useSignInPrompt();
  const location = useLocation();
  const from = location.pathname + location.search;

  // Close if the visitor navigates elsewhere while it is open.
  useEffect(() => {
    hide();
  }, [location.pathname, hide]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && hide()}>
      <DialogContent className="w-[calc(100%-2rem)] max-w-md border-[#592209]/30 bg-[#FBF5EC] text-[#301607]">
        <DialogHeader>
          <DialogTitle className="text-xl text-[#592209]">Sign in to continue</DialogTitle>
          <DialogDescription className="text-[#4A2E1F]">
            This feature needs a free account so we can keep your readings private. Sign in or create an account and you will come straight back here.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-2 flex flex-col gap-3 sm:flex-row">
          <Link
            to="/login"
            state={{ from }}
            onClick={hide}
            className="flex-1 rounded-lg bg-[#592209] px-5 py-3 text-center text-sm font-bold uppercase tracking-wider text-[#F5E9D6] hover:bg-[#461B07]"
          >
            Sign in
          </Link>
          <Link
            to="/register"
            state={{ from }}
            onClick={hide}
            className="flex-1 rounded-lg border border-[#592209]/50 px-5 py-3 text-center text-sm font-bold uppercase tracking-wider text-[#592209] hover:bg-[#592209]/10"
          >
            Create account
          </Link>
        </div>
        <button type="button" onClick={hide} className="mt-1 text-center text-sm text-[#6B4A37] underline underline-offset-2 hover:text-[#301607]">
          Not now
        </button>
      </DialogContent>
    </Dialog>
  );
};

export default SignInPrompt;
