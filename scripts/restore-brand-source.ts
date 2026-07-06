/**
 * Restore the master logo from backup, then regenerate all brand assets.
 *
 * Usage:
 *   pnpm brand:restore              # restore from logo-source.original.png
 *   pnpm brand:restore -- --backup  # restore from logo-source.backup.png (last generate)
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BRAND_DIR = path.join(ROOT, "assets/brand");
const SOURCE = path.join(BRAND_DIR, "logo-source.png");
const ORIGINAL = path.join(BRAND_DIR, "logo-source.original.png");
const BACKUP = path.join(BRAND_DIR, "logo-source.backup.png");

async function main() {
  const useBackup = process.argv.includes("--backup");
  const from = useBackup ? BACKUP : ORIGINAL;
  const label = useBackup ? "backup" : "original";

  try {
    await fs.access(from);
  } catch {
    throw new Error(
      `Missing ${label} at ${from}. Run pnpm brand:generate once to create backups.`,
    );
  }

  await fs.copyFile(from, SOURCE);
  console.log(`Restored ${label} → ${path.relative(ROOT, SOURCE)}`);

  const result = spawnSync("pnpm", ["brand:generate"], {
    cwd: ROOT,
    stdio: "inherit",
    shell: true,
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
