# Globecon Tender Watch

Procurement tender tracking dashboard for Globecon service lines.

## Stack

- **Next.js 15** (App Router)
- **Auth.js / NextAuth** with RBAC
- **Neon PostgreSQL** + **Drizzle ORM**
- **Cloudinary** for document sources
- **World Bank API** live sync (+ cron endpoint for n8n)
- **Tender Yetu** Kenya tenders via WordPress REST API

## Setup

### 1. Install

```bash
pnpm install
```

### 2. Environment

Copy `.env.example` to `.env.local` and fill in:

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Neon connection string |
| `AUTH_SECRET` | Session signing (`openssl rand -base64 32`) |
| `SYNC_CRON_SECRET` | Bearer token for `/api/sync/cron` |
| `CLOUDINARY_*` | Document upload storage (when ready) |
| `GMAIL_USER` | Gmail address for sending alert digests |
| `GMAIL_APP_PASSWORD` | Google App Password (16 chars, not your login password) |
| `GMAIL_FROM_NAME` | Display name in alert emails (optional) |
| `EMAIL_ALERTS_ENABLED` | Set `false` to disable outbound mail |
| `APP_URL` | Public app URL for links in emails |
| `SEED_SUPER_ADMIN_*` | Optional override for first admin user |

### 3. Database

Run the non-interactive upgrade (recommended for existing databases):

```bash
pnpm db:upgrade
pnpm db:seed
```

For brand-new empty databases you can still use `pnpm db:push`, but if Drizzle asks about column changes choose **create column** (first option), not rename. Example: for `source_id` in `sync_logs`, pick **`+ source_id create column`** — do not rename `source_count`.

### Cloudinary folder layout

Uploads land under your preset root `Globeconcs/`:

```
Globeconcs/
  sources/documents/{source-slug}/   ← tender PDFs/CSVs
  exports/                           ← future CSV exports
  tenders/attachments/               ← future per-tender files
```

Set in `.env.local`:

```env
CLOUDINARY_UPLOAD_PRESET=GlobeconTender
CLOUDINARY_ROOT_FOLDER=Globeconcs
```

Default super admin after seed:

- Email: `admin@globecon.com`
- Password: `Globecon@2026` (change immediately)

### 4. Dev server

```bash
pnpm dev
```

Sign in at `/login`.

## RBAC roles

| Role | Capabilities |
|------|-------------|
| **super_admin** | Everything including user management |
| **admin** | Manage sources, catalog, sync, delete custom entries |
| **analyst** | Add sources, upload documents, sync, save/export |
| **viewer** | Read-only dashboard access |

## Sidebar filters

- **Sources** — toggle filters; `+` opens the **source catalog** (one-click install) or custom RSS/document
- **Service lines** — 17 Globecon lines seeded with keywords; add custom lines
- **Regions** — broad regions with expandable countries; filter by region and/or country
- **Empty checkbox selection** = show all (paginated 10 per page)
- **Checked items** = restrict results to those IDs

## Sync

Live adapters: **World Bank**, **Tender Yetu**, and **document uploads** (CSV, TXT, PDF parsed into tenders).

Document uploads via **Sources → Add → Document** are stored in Cloudinary and parsed automatically.

### Team management

Super admins and admins can open **Team** in the sidebar (`/admin/users`). Super admins can invite users and assign roles.

- **Manual**: Sync button on dashboard (analyst+) — shows per-source results
- **Automated**: POST `/api/sync/cron` with header `Authorization: Bearer <SYNC_CRON_SECRET>`

### Source catalog (popular portals)

Open **Sources → + → Catalog** to install portals in one click. Each install runs an immediate sync and stores **live URLs** on tender cards.

| Portal | Region | Sync |
|--------|--------|------|
| World Bank | Global | Live API |
| Tender Yetu | Kenya | Live WordPress API |
| Kenya PPIP (IFMIS) | Kenya | Live `tenders.go.ke` API |
| AfDB SPN / IFB | Africa | Live listing scrape |
| UNDP Africa / Global | Africa / Global | Live RSS feeds |
| UNGM | Global | Browse only (API registration required) |

Use **Add all featured** to install the main set automatically. `pnpm db:seed` also ensures featured sources are present.

### n8n (optional)

#### A) Trigger existing source sync
Use a Schedule Trigger → HTTP Request node:

- Method: `POST`
- URL: `https://your-domain.com/api/sync/cron`
- Header: `Authorization: Bearer YOUR_SYNC_CRON_SECRET`

#### B) Push crawled / email opportunities (recommended for HR job digests)
n8n parses jobs then posts them into GlobeTender:

- Method: `POST`
- URL: `{APP_URL}/api/ingest/opportunities`  
  Example staging: `https://gcstendersvic.netlify.app/api/ingest/opportunities`  
  Example prod: `https://gcstenders.netlify.app/api/ingest/opportunities`  
  The path is fixed; the host always comes from **`APP_URL`** for that Netlify site.
- Header: `Authorization: Bearer YOUR_SYNC_CRON_SECRET`  
  (or `INGEST_SECRET` if you set one)
- Body (JSON):

```json
{
  "orgSlug": "globecon",
  "source": { "slug": "n8n-hr-jobs", "name": "N8N HR Job Feed" },
  "items": [
    {
      "title": "HUMAN RESOURCE OFFICER",
      "company": "Example Ltd",
      "deadline": "2026-08-30",
      "url": "https://www.brightermonday.co.ke/listings/example",
      "portal": "BrighterMonday",
      "status": "OPEN",
      "countryLabel": "Kenya"
    }
  ]
}
```

Discovery: `GET {APP_URL}/api/ingest/opportunities` with the same Bearer returns the live URL + schema.

No n8n required for adapter sync — the cron endpoint works with any scheduler. Ingest is for when n8n already has the records.

## Email alerts (Gmail)

Alerts use **Gmail SMTP** with a Google **App Password** (requires 2-Step Verification on the Google account).

1. Google Account → **Security** → **2-Step Verification** → **App passwords**
2. Create an app password for “Mail”
3. Add to `.env.local`:

```env
GMAIL_USER=your-account@gmail.com
GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx
GMAIL_FROM_NAME=Globecon Tender Watch
EMAIL_ALERTS_ENABLED=true
APP_URL=https://your-domain.com
```

### What gets emailed

Each user can configure preferences on **Profile**:

- **Closing soon** — filtered open tenders nearing deadline (1–14 days)
- **High match** — tenders scoring above a threshold on Globecon service lines
- **After sync** — immediate digest when sync finds new high-match tenders

Digests respect each user’s **sidebar filters**. Duplicate alerts are suppressed per tender.

### Endpoints

| Endpoint | Purpose |
|----------|---------|
| `POST /api/alerts/test` | Send a test email to the signed-in user |
| `POST /api/alerts/cron` | Daily digest cron (Bearer `SYNC_CRON_SECRET`) |
| `GET /api/alerts/cron` | Recent digest log (Bearer `SYNC_CRON_SECRET`) |

Recommended n8n / scheduler flow:

1. `POST /api/sync/cron` — refresh tenders
2. `POST /api/alerts/cron` — send digests (also runs automatically after manual/cron sync when Gmail is configured)

Run `pnpm db:upgrade` after pulling to add notification preference columns and alert log tables.

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Development server |
| `pnpm build` | Production build |
| `pnpm db:push` | Push schema to Neon |
| `pnpm db:seed` | Seed catalog + admin user |
