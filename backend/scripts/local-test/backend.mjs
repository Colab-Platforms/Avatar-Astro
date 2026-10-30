// Starts the backend against the LOCAL test database with every external service switched off.
//   npm run local:backend   (http://localhost:5001)
import { spawn } from "child_process";
import { BACKEND_DIR, BACKEND_PORT, LOCAL_BACKEND_ENV, LOCAL_DATABASE_URL, loadProviderEnv, requestedProviders } from "./config.mjs";

console.log(`Backend (LOCAL test mode): http://localhost:${BACKEND_PORT}/api`);
const wanted = requestedProviders();
let providerEnv = {};
if (wanted.length) {
  const { env, report } = loadProviderEnv(wanted);
  providerEnv = env;
  console.log("Providers ENABLED by --with (real external calls are possible):");
  report.forEach((r) => console.log("  - " + r));
}
console.log(`Database: ${new URL(LOCAL_DATABASE_URL).host} (local throwaway). External services: ${wanted.length ? "only the ones listed above" : "all OFF"}.`);
const child = spawn("npx", ["tsx", "src/index.ts"], { cwd: BACKEND_DIR, shell: true, stdio: "inherit", env: { ...process.env, ...LOCAL_BACKEND_ENV, ...providerEnv } });
child.on("exit", (code) => process.exit(code ?? 0));
process.on("SIGINT", () => child.kill("SIGINT"));
