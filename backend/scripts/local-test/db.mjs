// Starts the persistent LOCAL test database (embedded Postgres via PGlite) on 127.0.0.1.
//   npm run local:db        (leave this terminal open)
import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import { BACKEND_DIR, DB_DIR, DB_PORT } from "./config.mjs";

const server = path.join(BACKEND_DIR, "node_modules", "@electric-sql", "pglite-socket", "dist", "scripts", "server.js");
if (!fs.existsSync(server)) {
  console.error("PGlite server not found. Run `npm install` in backend/ first.");
  process.exit(1);
}
fs.mkdirSync(DB_DIR, { recursive: true });
console.log(`Local test database: 127.0.0.1:${DB_PORT}`);
console.log(`Data folder (outside the repo): ${DB_DIR}`);
const child = spawn(process.execPath, [server, `--db=${DB_DIR}`, `--port=${DB_PORT}`, "--host=127.0.0.1", "--max-connections=30"], { stdio: "inherit" });
child.on("exit", (code) => process.exit(code ?? 0));
process.on("SIGINT", () => child.kill("SIGINT"));
