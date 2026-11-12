// Run with: npm run test:security
// Checkpoint 0 — graceful shutdown and fatal-error policy. Uses an EventEmitter in place of `process`
// and a recording `exit`, so nothing here ever signals or terminates the real test process.
import { test } from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { createShutdownController, installProcessHandlers } from "../../utils/lifecycle.js";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const quietLog = { info: () => undefined, error: () => undefined };

function setup(steps: Array<{ name: string; run: () => void | Promise<void> }>, extra: { gracefulTimeoutMs?: number; fatalTimeoutMs?: number } = {}) {
  const exits: number[] = [];
  const controller = createShutdownController({ steps, exit: (c) => exits.push(c), log: quietLog, ...extra });
  const proc = new EventEmitter();
  installProcessHandlers(proc, controller, quietLog);
  return { exits, controller, proc };
}

test("SIGTERM runs every step in order, then exits 0", async () => {
  const order: string[] = [];
  const { exits, proc, controller } = setup([
    { name: "timers", run: () => void order.push("timers") },
    { name: "server", run: async () => { await sleep(10); order.push("server"); } },
    { name: "db", run: () => void order.push("db") },
  ]);
  proc.emit("SIGTERM");
  await controller.shutdown("SIGTERM", "graceful"); // returns the in-flight shutdown
  assert.deepEqual(order, ["timers", "server", "db"]);
  assert.deepEqual(exits, [0]);
});

test("SIGINT behaves the same as SIGTERM", async () => {
  const { exits, proc, controller } = setup([{ name: "only", run: () => undefined }]);
  proc.emit("SIGINT");
  await controller.shutdown("SIGINT", "graceful");
  assert.deepEqual(exits, [0]);
});

test("a failing step does not stop the remaining steps, but the exit code reports the failure", async () => {
  const ran: string[] = [];
  const { exits, proc, controller } = setup([
    { name: "a", run: () => { throw new Error("a failed"); } },
    { name: "b", run: () => void ran.push("b") },
  ]);
  proc.emit("SIGTERM");
  await controller.shutdown("x", "graceful");
  assert.deepEqual(ran, ["b"]);
  assert.deepEqual(exits, [1]);
});

test("a hung step cannot block exit forever: the graceful timeout forces exit 1", async () => {
  const { exits, proc, controller } = setup([{ name: "hangs", run: () => new Promise<void>(() => undefined) }], { gracefulTimeoutMs: 60 });
  proc.emit("SIGTERM");
  await controller.shutdown("x", "graceful");
  assert.deepEqual(exits, [1]);
});

test("repeated SIGTERM does not start a second shutdown or exit twice", async () => {
  let runs = 0;
  const { exits, proc, controller } = setup([{ name: "slow", run: async () => { runs++; await sleep(30); } }]);
  proc.emit("SIGTERM");
  proc.emit("SIGTERM"); // a second signal while shutting down forces exit
  await sleep(60);
  await controller.shutdown("x", "graceful");
  assert.equal(runs, 1, "steps run exactly once");
  assert.equal(exits.length, 1, "exit is invoked exactly once");
});

test("uncaughtException exits non-zero and does NOT keep the process running", async () => {
  const ran: string[] = [];
  const { exits, proc, controller } = setup([{ name: "cleanup", run: () => void ran.push("cleanup") }]);
  proc.emit("uncaughtException", new Error("something impossible happened"));
  await controller.shutdown("x", "fatal");
  assert.deepEqual(ran, ["cleanup"], "best-effort cleanup still runs");
  assert.deepEqual(exits, [1], "fatal errors always exit 1, even if cleanup succeeds");
});

test("unhandledRejection is treated as fatal too", async () => {
  const { exits, proc, controller } = setup([{ name: "cleanup", run: () => undefined }]);
  proc.emit("unhandledRejection", new Error("nobody awaited this"));
  await controller.shutdown("x", "fatal");
  assert.deepEqual(exits, [1]);
});

test("fatal cleanup is bounded by the short fatal timeout, not the graceful one", async () => {
  const started = Date.now();
  const { exits, proc, controller } = setup([{ name: "hangs", run: () => new Promise<void>(() => undefined) }], { gracefulTimeoutMs: 10_000, fatalTimeoutMs: 50 });
  proc.emit("uncaughtException", new Error("boom"));
  await controller.shutdown("x", "fatal");
  assert.deepEqual(exits, [1]);
  assert.ok(Date.now() - started < 2_000, "must not wait out the 10s graceful timeout");
});

test("a second fatal error during shutdown forces an immediate exit", async () => {
  const { exits, proc } = setup([{ name: "hangs", run: () => new Promise<void>(() => undefined) }], { fatalTimeoutMs: 5_000 });
  proc.emit("uncaughtException", new Error("first"));
  proc.emit("uncaughtException", new Error("second"));
  assert.deepEqual(exits, [1], "exited immediately on the second error without waiting for the hung step");
});

test("a fatal error is logged with secrets stripped", async () => {
  const logged: unknown[][] = [];
  const exits: number[] = [];
  const controller = createShutdownController({ steps: [], exit: (c) => exits.push(c), log: quietLog });
  const proc = new EventEmitter();
  installProcessHandlers(proc, controller, { error: (...a: unknown[]) => void logged.push(a) });
  const err: any = new Error("failed calling provider with Bearer abcDEF1234567890xyz");
  proc.emit("uncaughtException", err);
  await controller.shutdown("x", "fatal");
  assert.ok(logged.length >= 1);
  assert.ok(!JSON.stringify(logged).includes("abcDEF1234567890xyz"));
});
