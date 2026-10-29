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
      <DialogContent className="w-[calc(100%-2rem)] max-w-md border-[#BC6A4D]/30 bg-[#0B1020] text-white">
        <DialogHeader>
          <DialogTitle className="text-xl text-[#D9895F]">Sign in to continue</DialogTitle>
          <DialogDescription className="text-white/75">
            This feature needs a free account so we can keep your readings private. Sign in or create an account and you will come straight back here.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-2 flex flex-col gap-3 sm:flex-row">
          <Link
            to="/login"
            state={{ from }}
            onClick={hide}
            className="flex-1 rounded-lg bg-[#BC6A4D] px-5 py-3 text-center text-sm font-bold uppercase tracking-wider text-white hover:bg-[#a85a3e]"
          >
            Sign in
          </Link>
          <Link
            to="/register"
            state={{ from }}
            onClick={hide}
            className="flex-1 rounded-lg border border-[#BC6A4D]/50 px-5 py-3 text-center text-sm font-bold uppercase tracking-wider text-[#D9895F] hover:bg-[#BC6A4D]/10"
          >
            Create account
          </Link>
        </div>
        <button type="button" onClick={hide} className="mt-1 text-center text-sm text-white/60 underline underline-offset-2 hover:text-white">
          Not now
        </button>
      </DialogContent>
    </Dialog>
  );
};

export default SignInPrompt;
