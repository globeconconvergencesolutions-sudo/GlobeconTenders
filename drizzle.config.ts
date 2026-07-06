import { defineConfig } from "drizzle-kit";

import { getDatabaseUrl } from "./lib/env";

export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: getDatabaseUrl(),
  },
});
