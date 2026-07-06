/**
 * Regenerate all brand assets from the master logo.
 *
 * Usage:
 *   1. Replace assets/brand/logo-source.png with your new image (square or transparent PNG recommended).
 *   2. Run: pnpm brand:generate
 *
 * Outputs to public/brand/ and copies app icons into app/ for Next.js metadata.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";
import toIco from "to-ico";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BRAND_DIR = path.join(ROOT, "assets/brand");
const SOURCE = path.join(BRAND_DIR, "logo-source.png");
const ORIGINAL = path.join(BRAND_DIR, "logo-source.original.png");
const BACKUP = path.join(BRAND_DIR, "logo-source.backup.png");
const OUT_DIR = path.join(ROOT, "public/brand");
const APP_DIR = path.join(ROOT, "app");

type AssetSpec = {
  name: string;
  width: number;
  height: number;
  fit?: "contain" | "cover" | "fill" | "inside" | "outside";
  background?: string;
  copyToApp?: string;
};

const BRAND_BG = "#0b1530";

const assets: AssetSpec[] = [
  { name: "icon-16.png", width: 16, height: 16 },
  { name: "icon-32.png", width: 32, height: 32 },
  { name: "logo-mark.png", width: 128, height: 128 },
  { name: "logo-sidebar.png", width: 48, height: 48 },
  { name: "logo-login.png", width: 64, height: 64 },
  { name: "apple-touch-icon.png", width: 180, height: 180 },
  { name: "icon-192.png", width: 192, height: 192 },
  { name: "icon-512.png", width: 512, height: 512 },
  { name: "icon.png", width: 32, height: 32, copyToApp: "icon.png" },
  {
    name: "apple-icon.png",
    width: 180,
    height: 180,
    copyToApp: "apple-icon.png",
  },
];

async function ensureBackups() {
  try {
    await fs.access(ORIGINAL);
  } catch {
    await fs.copyFile(SOURCE, ORIGINAL);
    console.log(`  ✓ Saved pristine original → ${path.relative(ROOT, ORIGINAL)}`);
  }

  await fs.copyFile(SOURCE, BACKUP);
  console.log(`  ✓ Backed up current source → ${path.relative(ROOT, BACKUP)}`);
}

async function ensureSource() {
  try {
    await fs.access(SOURCE);
  } catch {
    throw new Error(
      `Missing source logo at ${SOURCE}. Place your master PNG there first.`,
    );
  }
}

async function renderLogo(
  spec: AssetSpec,
  source: ReturnType<typeof sharp>,
): Promise<Buffer> {
  const padding = Math.round(Math.min(spec.width, spec.height) * 0.08);
  const inner = Math.min(spec.width, spec.height) - padding * 2;

  return source
    .clone()
    .resize(inner, inner, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .extend({
      top: padding,
      bottom: padding,
      left: padding,
      right: padding,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toBuffer();
}

async function renderOgImage(source: ReturnType<typeof sharp>): Promise<Buffer> {
  const width = 1200;
  const height = 630;
  const logoSize = 220;

  const logo = await source
    .clone()
    .resize(logoSize, logoSize, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();

  const background = sharp({
    create: {
      width,
      height,
      channels: 4,
      background: BRAND_BG,
    },
  })
    .png()
    .composite([
      {
        input: logo,
        top: Math.round((height - logoSize) / 2 - 40),
        left: Math.round((width - logoSize) / 2),
      },
    ]);

  const svgTitle = Buffer.from(`
    <svg width="${width}" height="${height}">
      <style>
        .title { fill: #ffffff; font: 600 52px Inter, Arial, sans-serif; }
        .sub { fill: #93c5fd; font: 600 22px Inter, Arial, sans-serif; letter-spacing: 0.28em; }
      </style>
      <text x="50%" y="${Math.round((height + logoSize) / 2 + 20)}" text-anchor="middle" class="title">Globecon Tender Watch</text>
      <text x="50%" y="${Math.round((height + logoSize) / 2 + 62)}" text-anchor="middle" class="sub">PROCUREMENT INTELLIGENCE</text>
    </svg>
  `);

  return background
    .composite([{ input: svgTitle, top: 0, left: 0 }])
    .png({ compressionLevel: 9 })
    .toBuffer();
}

async function main() {
  await ensureSource();
  await ensureBackups();
  await fs.mkdir(OUT_DIR, { recursive: true });

  const source = sharp(SOURCE).ensureAlpha();
  const meta = await source.metadata();
  console.log(
    `Source: ${path.relative(ROOT, SOURCE)} (${meta.width}x${meta.height})`,
  );

  for (const spec of assets) {
    const buffer = await renderLogo(spec, source);
    const outPath = path.join(OUT_DIR, spec.name);
    await fs.writeFile(outPath, buffer);
    console.log(`  ✓ ${path.relative(ROOT, outPath)}`);

    if (spec.copyToApp) {
      const appPath = path.join(APP_DIR, spec.copyToApp);
      await fs.writeFile(appPath, buffer);
      console.log(`  ✓ ${path.relative(ROOT, appPath)} (app metadata)`);
    }
  }

  const icon16 = await renderLogo({ name: "icon-16.png", width: 16, height: 16 }, source);
  const icon32 = await renderLogo({ name: "icon-32.png", width: 32, height: 32 }, source);
  const favicon = await toIco([icon16, icon32]);
  await fs.writeFile(path.join(OUT_DIR, "favicon.ico"), favicon);
  await fs.writeFile(path.join(APP_DIR, "favicon.ico"), favicon);
  console.log(`  ✓ public/brand/favicon.ico`);
  console.log(`  ✓ app/favicon.ico (app metadata)`);

  const og = await renderOgImage(source);
  await fs.writeFile(path.join(OUT_DIR, "og-image.png"), og);
  console.log(`  ✓ public/brand/og-image.png`);

  const manifest = {
    name: "Globecon Tender Watch",
    short_name: "Globecon",
    description: "Track and match procurement tenders for Globecon service lines",
    start_url: "/",
    display: "standalone",
    background_color: BRAND_BG,
    theme_color: "#2563eb",
    icons: [
      { src: "/brand/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/brand/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
  await fs.writeFile(
    path.join(ROOT, "public/manifest.webmanifest"),
    `${JSON.stringify(manifest, null, 2)}\n`,
  );
  console.log(`  ✓ public/manifest.webmanifest`);

  console.log("\nBrand assets generated. Commit public/brand and app icons if desired.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
