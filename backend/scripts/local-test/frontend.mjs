// Starts the frontend pointed at the LOCAL test backend (not at production or at your usual dev backend).
//   npm run local:frontend  (http://localhost:8082)
import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { BACKEND_PORT, FRONTEND_DIR, FRONTEND_PORT, requestedProviders } from "./config.mjs";

// `npm run local:frontend -- --with=google` re-enables Google sign-in buttons using VITE_GOOGLE_CLIENT_ID from frontend/.env.local.
let googleId = "";
if (requestedProviders().includes("google")) {
  const f = path.join(FRONTEND_DIR, ".env.local");
  googleId = (fs.existsSync(f) ? dotenv.parse(fs.readFileSync(f)).VITE_GOOGLE_CLIENT_ID : "") || "";
  console.log(googleId ? "Google sign-in button: ENABLED (client id from frontend/.env.local)" : "Google: VITE_GOOGLE_CLIENT_ID not found in frontend/.env.local (stays off)");
}

console.log(`Frontend (LOCAL test mode): http://localhost:${FRONTEND_PORT}  ->  API http://localhost:${BACKEND_PORT}/api`);
const child = spawn("npx", ["vite", "--port", String(FRONTEND_PORT), "--strictPort"], {
  cwd: FRONTEND_DIR,
  shell: true,
  stdio: "inherit",
  // Variables set in the process environment take priority over frontend/.env.local.
  env: { ...process.env, VITE_API_URL: `http://localhost:${BACKEND_PORT}/api`, VITE_GOOGLE_CLIENT_ID: googleId },
});
child.on("exit", (code) => process.exit(code ?? 0));
process.on("SIGINT", () => child.kill("SIGINT"));
