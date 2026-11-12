// Process lifecycle: graceful shutdown and fatal-error handling.
//
// Policy
//  - SIGTERM / SIGINT (a deploy or a manual stop): graceful. Run the shutdown steps in order (stop
//    accepting work, stop timers, close sockets/HTTP, disconnect the database), bounded by a timeout,
//    then exit 0 — or 1 if the steps failed or timed out. A second SIGINT/SIGTERM forces an immediate exit.
//  - uncaughtException / unhandledRejection: the process is in an undefined state, so it does NOT keep
//    serving. The error is logged (secrets stripped), a short best-effort cleanup runs, and the process
//    exits with code 1 so the host restarts it. Recovery of in-flight chats is done by the database
//    state on the next boot (resumeAllActiveSessions), not by limping on here.

import { describeError } from "./safeError.js";

export type ShutdownStep = { name: string; run: () => void | Promise<void> };
export type ShutdownKind = "graceful" | "fatal";

export type ShutdownOptions = {
  steps: ShutdownStep[];
  exit: (code: number) => void;
  gracefulTimeoutMs?: number;
  fatalTimeoutMs?: number;
  log?: { info: (msg: string) => void; error: (msg: string, detail?: unknown) => void };
};

export type ShutdownController = {
  shutdown: (reason: string, kind: ShutdownKind) => Promise<void>;
  forceExit: (reason: string) => void;
  isShuttingDown: () => boolean;
};

export function createShutdownController(opts: ShutdownOptions): ShutdownController {
  const log = opts.log ?? { info: (m: string) => console.log(m), error: (m: string, d?: unknown) => console.error(m, d) };
  const gracefulTimeoutMs = opts.gracefulTimeoutMs ?? 10_000;
  const fatalTimeoutMs = opts.fatalTimeoutMs ?? 2_000;

  let started: Promise<void> | null = null;
  let exited = false;

  const exitOnce = (code: number) => {
    if (exited) return;
    exited = true;
    opts.exit(code);
  };

  const runSteps = async (): Promise<boolean> => {
    let allOk = true;
    for (const step of opts.steps) {
      try {
        await step.run();
      } catch (err) {
        allOk = false;
        log.error(`[shutdown] step "${step.name}" failed:`, describeError(err));
      }
    }
    return allOk;
  };

  const shutdown = (reason: string, kind: ShutdownKind): Promise<void> => {
    if (started) return started;
    started = (async () => {
      log.info(`[shutdown] ${kind} shutdown started (${reason})`);
      const timeoutMs = kind === "fatal" ? fatalTimeoutMs : gracefulTimeoutMs;
      let timer: NodeJS.Timeout | undefined;
      const timedOut = new Promise<"timeout">((resolve) => {
        timer = setTimeout(() => resolve("timeout"), timeoutMs);
      });
      const outcome = await Promise.race([runSteps(), timedOut]);
      if (timer) clearTimeout(timer);

      if (outcome === "timeout") log.error(`[shutdown] steps did not finish within ${timeoutMs}ms — exiting anyway`);
      const clean = outcome === true && kind === "graceful";
      log.info(`[shutdown] exiting (${clean ? "clean" : "with error"})`);
      exitOnce(clean ? 0 : 1);
    })();
    return started;
  };

  return {
    shutdown,
    forceExit: (reason: string) => {
      log.error(`[shutdown] forced exit (${reason})`);
      exitOnce(1);
    },
    isShuttingDown: () => started !== null,
  };
}

/** The slice of `process` this module needs — lets tests pass an EventEmitter instead of the real thing. */
export type ProcessLike = {
  on: (event: string, listener: (...args: any[]) => void) => unknown;
};

export function installProcessHandlers(
  proc: ProcessLike,
  controller: ShutdownController,
  log: { error: (msg: string, detail?: unknown) => void } = { error: (m, d) => console.error(m, d) },
): void {
  const onSignal = (signal: string) => {
    if (controller.isShuttingDown()) {
      controller.forceExit(`second ${signal} during shutdown`);
      return;
    }
    void controller.shutdown(signal, "graceful");
  };
  proc.on("SIGTERM", () => onSignal("SIGTERM"));
  proc.on("SIGINT", () => onSignal("SIGINT"));

  const onFatal = (kind: string, err: unknown) => {
    log.error(`[fatal] ${kind} — the process will exit and be restarted by the host:`, describeError(err));
    if (controller.isShuttingDown()) {
      controller.forceExit(`${kind} during shutdown`);
      return;
    }
    void controller.shutdown(kind, "fatal");
  };
  proc.on("uncaughtException", (err: unknown) => onFatal("uncaughtException", err));
  proc.on("unhandledRejection", (reason: unknown) => onFatal("unhandledRejection", reason));
}
