import { execSync } from "node:child_process";

import dotenv from "dotenv";

dotenv.config({ path: ".env.test", override: true });

export default function globalSetup() {
  execSync("npx prisma migrate reset --force", { stdio: "inherit" });
}
