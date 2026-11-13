// Removes the disposable test container (and its data). It only ever touches the dedicated container name.
//   npm run test:db:down
import { spawnSync } from "node:child_process";
import { CONTAINER_NAME } from "./config.mjs";
const r = spawnSync("docker", ["rm", "-f", CONTAINER_NAME], { encoding: "utf8" });
console.log(r.status === 0 ? `removed ${CONTAINER_NAME}` : (r.stderr || "nothing to remove").trim());
