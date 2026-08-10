# GlobeTender Cloud — Team Delivery Guide

**Product:** GlobeTender Cloud  
**Codebase:** GlobeTenderV2  
**Document purpose:** Presentation-ready summary of what is built, verified against the current codebase  
**Last verified:** August 2026  
**Staging:** `gcstenders.netlify.app`  
**Production target:** `gcstenders.globeconcs.com`  
**Default tenant (tenant zero):** `globecon`

---

## 1. Executive summary (for the team)

GlobeTenderV2 has been evolved from a single-company **procurement dashboard** into **GlobeTender Cloud** — a **multi-tenant SaaS platform** where each organization gets an isolated workspace with its own users, data, branding, terminology, and plan limits.

**Globecon Tender Watch** is no longer “the product.” It is the **first tenant** on the platform, running the **Procurement Intelligence** template.

### What this means in plain language

| Before | Now |
|--------|-----|
| One company, one database of tenders | Many organizations, each with isolated data |
| Fixed labels (“Tender”, “Source”) | Per-org terminology driven by templates |
| Manual onboarding only | Self-serve signup + platform admin provisioning |
| No billing concept | Trial plans, seat/source limits, upgrade hooks |
| Single UI skin | Per-org branding (logo, colors, display name) |

### Delivery status at a glance

| Capability area | Status | Notes |
|-----------------|--------|-------|
| Multi-tenant database & org isolation | **Live** | `org_id` on tenant tables; scoped queries |
| Subdomain / host tenant resolution | **Live** | Middleware + `x-org-slug` header |
| Platform admin (create & manage orgs) | **Live** | `/platform/orgs` |
| Template engine (procurement + HR) | **Live** | `templates/*.json` |
| Branding & lexicon customization | **Live** | Settings UI + runtime provider |
| Self-serve signup (14-day trial) | **Live** | Apex host only — `/signup` |
| Plan limits enforcement | **Live** | Seats, sources, sync |
| Trial expiry automation | **Live** | Cron endpoint + banner |
| Stripe checkout | **Stub** | DB columns + API route; not connected |
| Marketing landing page | **Live** | Apex `/` for unauthenticated visitors |
| Onboarding checklist | **Live** | Super admin dashboard guide |
| Production-grade error handling | **Live** | Structured API errors + UI alerts |
| Secure logout flow | **Live** | Server + client sign-out with session polling |

---

## 2. Product architecture (how it works)

### 2.1 Three layers

```
┌─────────────────────────────────────────────────────────┐
│  PLATFORM (Globcons-operated)                           │
│  • Platform admins                                      │
│  • Create/suspend orgs, bump plans                      │
│  • Template library                                     │
└──────────────────────────┬──────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────┐
│  ORGANIZATION (tenant workspace)                        │
│  • Users & roles (super_admin, admin, analyst, viewer)  │
│  • Sources, tenders, filters, settings                  │
│  • Branding, lexicon, plan limits                       │
└──────────────────────────┬──────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────┐
│  TEMPLATE (configuration pack)                          │
│  • procurement — tenders, service lines, World Bank…    │
│  • hr — jobs, departments, careers boards               │
└─────────────────────────────────────────────────────────┘
```

### 2.2 Host & tenant resolution

| URL pattern | Resolves to |
|-------------|-------------|
| `gcstenders.netlify.app` (apex) | Default org `globecon` + marketing/signup |
| `globecon.gcstenders.netlify.app` | Org slug `globecon` |
| `{slug}.gcstenders.globeconcs.com` | Org slug `{slug}` (when DNS live) |
| `localhost` / `127.0.0.1` | Default org `globecon` (dev) |

**Implementation:** `lib/tenant/resolution.ts`, `middleware.ts`

Every authenticated request carries org context via the `x-org-slug` header set in middleware. Server code resolves the active org and scopes all reads/writes.

### 2.3 Data isolation model

- **Shared PostgreSQL** (Neon) with **row-level isolation** using `org_id`
- Tenant-scoped tables include: `sources`, `tenders`, `regions`, `countries`, `service_lines`, `sync_logs`, `workspace_settings`, `org_memberships`, etc.
- **Verified in code:** `lib/tenders/queries.ts` scopes all tender/filter/analytics queries by `orgId`

**Schema reference:** `lib/db/schema.ts` — `organizations`, `org_memberships`, `workspace_settings`

---

## 3. Capabilities delivered (verified in codebase)

### 3.1 Multi-tenant core

**What the team gets:**
- Organizations table with slug, status, plan, template, trial dates, limits
- Users can belong to orgs via `org_memberships` (role per org)
- Platform admin flag on users (`is_platform_admin`)
- Org-aware login (email + password + org context from host)

**Key files:**
| File | Purpose |
|------|---------|
| `lib/db/schema.ts` | Org, membership, workspace settings tables |
| `lib/tenant/org-context.ts` | Runtime org context (branding, lexicon, features) |
| `lib/tenant/org.ts` | Org lookup helpers |
| `middleware.ts` | Auth, org slug, suspended org blocking |
| `auth.ts` | Credentials auth with org membership validation |

---

### 3.2 Platform administration

**Route:** `/platform/orgs` (platform admins only)

**Capabilities:**
- List all organizations
- Create new org (name, slug, template, super admin credentials)
- **Manage org:** change status (`active` / `suspended` / `trial_expired`) and plan (`trial` → `enterprise`) without touching the database manually
- Open workspace link per org

**API:**
- `GET/POST /api/platform/orgs`
- `GET/PATCH /api/platform/orgs/[id]`
- `GET /api/platform/templates`

**Key files:**
| File | Purpose |
|------|---------|
| `components/platform/platform-orgs-panel.tsx` | Admin UI |
| `lib/platform/orgs.ts` | Create & list orgs |
| `lib/platform/update-org.ts` | Suspend / plan bump logic |

**Access control:** Middleware blocks `/platform/*` unless `session.user.isPlatformAdmin === true`

---

### 3.3 Template system

Two templates ship today:

| Template ID | Name | UI label examples | Card variant |
|-------------|------|-------------------|--------------|
| `procurement` | Procurement Intelligence | Tender, Source, Service line | `procurement` |
| `hr` | HR & Talent | Job opening, Job board, Department | `hr` |

**Template JSON defines:**
- Lexicon (all UI labels)
- Feature flags (`analytics`, `sync`, `export`, `matchScore`, `publicShare`)
- Layout (sidebar sections, home card variant)
- Custom field definitions
- Default branding colors
- Catalog pack reference

**Key files:**
| File | Purpose |
|------|---------|
| `templates/procurement.json` | Globecon-style procurement pack |
| `templates/hr.json` | HR / careers pack |
| `lib/templates/load.ts` | Load template summaries |
| `lib/templates/apply.ts` | Apply template on org creation |
| `lib/templates/resolve.ts` | Merge template + org overrides |
| `app/settings/template/page.tsx` | Super admin template switcher |

**Runtime:** `components/providers/org-context-provider.tsx` exposes `useLexicon()`, `useOrg()`, `useFeatures()` across the UI.

---

### 3.4 Branding & lexicon customization

**Settings routes (super admin / delegated access):**

| Route | What it configures |
|-------|-------------------|
| `/settings/branding` | Logo, display name, primary/accent colors |
| `/settings/lexicon` | Terminology overrides |
| `/settings/template` | Switch org template |
| `/settings/notifications` | Alert preferences |
| `/settings/delegations` | Permission delegation |
| `/settings/plan` | Plan usage, limits, upgrade CTA |

**Runtime effects:**
- CSS variables injected via `components/branding/org-theme-styles.tsx`
- Emails use org branding via `lib/email/presentation.ts`
- Share pages use org presentation via `lib/tenders/share.ts`

---

### 3.5 Domain generalization (Phase 5)

**What changed:**
- `tenders.custom_fields` JSONB column for template-specific data
- Generic `OpportunityCard` routes to procurement or HR card by template
- Template-aware empty states on dashboard
- Feature-flagged match score (hidden when template disables it)
- Sidebar sections driven by template layout config

**Key files:**
| File | Purpose |
|------|---------|
| `components/tenders/opportunity-card.tsx` | Template-aware card router |
| `components/tenders/procurement-opportunity-card.tsx` | Procurement card |
| `components/tenders/hr-opportunity-card.tsx` | HR card |
| `components/tenders/opportunity-empty-state.tsx` | Template-aware empty state |
| `lib/templates/custom-fields.ts` | Custom field helpers |

---

### 3.6 Self-serve signup & commercial layer (Phase 6)

#### Signup flow
- **URL:** `/signup` (apex host only)
- **Wizard:** org name, slug, template pick, admin account
- **API:** `POST /api/signup` creates org + super admin + workspace settings
- **Trial:** 14 days, plan `trial`, limits applied automatically
- **Redirect:** Returns `loginUrl` for the new workspace subdomain

#### Plan definitions

| Plan | Seats | Sources | Sync interval |
|------|-------|---------|---------------|
| Trial | 5 | 5 | 24 hours |
| Starter | 10 | 15 | 24 hours |
| Pro | 25 | 50 | 1 hour |
| Enterprise | 9999 | 9999 | 1 hour |

**Source:** `lib/platform/plans.ts`

#### Limit enforcement (live)

Limits are enforced at the API layer:

| Action | Guard | File |
|--------|-------|------|
| Invite user | `assertCanAddSeat()` | `app/api/users/route.ts` |
| Add source | `assertCanAddSource()` | `app/api/sources/route.ts`, `app/api/sources/install/route.ts` |
| Manual sync | `assertCanSync()` | `app/api/sync/route.ts` |

When a limit is hit, the API returns structured errors with `code` and optional `upgradeUrl` — surfaced in UI via `components/ui/api-error-alert.tsx`.

#### Org status lifecycle

| Status | Login | Sync | Add users/sources |
|--------|-------|------|-------------------|
| `active` | Yes | Yes | Yes (within limits) |
| `trial_expired` | Yes | No | No |
| `suspended` | No | No | No |

Suspended orgs are redirected to `/suspended`.

**Source:** `lib/platform/org-status.ts`, `middleware.ts`

#### Trial automation
- **Cron:** `POST /api/platform/trials/cron` (Bearer `SYNC_CRON_SECRET`)
- **Logic:** `lib/platform/trials.ts` — marks expired trials as `trial_expired`
- **UI:** `components/layout/trial-banner.tsx` shows days remaining or expiry message

#### Billing (prepared, not live)
- DB columns: `stripe_customer_id`, `stripe_subscription_id` on `organizations`
- **API stub:** `POST /api/billing/checkout` returns 503 until `STRIPE_SECRET_KEY` is configured
- **Plan settings UI:** Shows usage + “Upgrade” button wired to checkout stub

---

### 3.7 Marketing & onboarding (UX layer)

#### Marketing landing
- Unauthenticated visitors on **apex host** `/` see the marketing page
- Authenticated users see the normal dashboard
- **No sidebar** on marketing/login/signup (server-side shell decision)

**Files:** `components/marketing/marketing-landing.tsx`, `app/page.tsx`, `lib/layout/shell-routes.ts`

#### Onboarding checklist
- Shown to **super admins** on the dashboard until dismissed or complete
- Steps: add source → run sync → invite teammate → customize branding
- Progress stored in `workspace_settings.onboarding` JSONB
- **API:** `GET/PATCH /api/settings/onboarding`

**Files:** `components/onboarding/onboarding-checklist.tsx`, `lib/onboarding/steps.ts`

#### UI polish
| Feature | Implementation |
|---------|----------------|
| Toast notifications | Sonner — `components/ui/sonner.tsx`, `lib/toast.ts` |
| Loading skeletons | `app/loading.tsx`, `components/tenders/dashboard-skeleton.tsx` |
| Error boundaries | `app/error.tsx`, `app/global-error.tsx`, `app/not-found.tsx` |
| Structured API errors | `lib/api/errors.ts`, `lib/api/client-error.ts` |

---

### 3.8 Authentication & logout

#### Login
- Org-scoped credentials auth (NextAuth v5, JWT strategy)
- Login page respects org context from host
- Password reset flow: `/login/forgot-password`, `/login/reset-password`

#### Logout (hardened)
1. Full-screen “Signing you out…” overlay
2. Server session clear — `POST /api/auth/logout`
3. Client session clear — NextAuth `signOut`
4. Poll `/api/auth/session` until empty
5. Hard redirect to `/login?signedOut=1`
6. Login page force-clears any stale session; shows success toast

**Files:** `lib/auth/sign-out-client.ts`, `components/auth/sign-out-overlay.tsx`, `app/login/page.tsx`

---

## 4. User roles & permissions

| Role | Typical use |
|------|-------------|
| `super_admin` | Full workspace control, settings, onboarding |
| `admin` | Team management, sources, sync |
| `analyst` | Filter, save, export, sync (if permitted) |
| `viewer` | Read-only dashboard access |

**Platform admin** (`is_platform_admin`) is separate — grants access to `/platform/orgs` across all tenants.

**Permission helpers:** `lib/auth/permissions.ts`, `lib/auth/user-management.ts`

---

## 5. API surface (SaaS-relevant routes)

### Platform
```
GET/POST   /api/platform/orgs
GET/PATCH  /api/platform/orgs/[id]
GET        /api/platform/templates
POST       /api/platform/trials/cron
```

### Signup & billing
```
GET/POST   /api/signup          (apex only)
POST       /api/billing/checkout (stub)
GET        /api/settings/plan
```

### Workspace settings
```
GET/PATCH  /api/settings/branding
GET/PATCH  /api/settings/lexicon
GET/PATCH  /api/settings/template
GET/PATCH  /api/settings/onboarding
GET/PATCH  /api/settings/notifications
GET/PATCH  /api/settings/access
GET/PATCH  /api/settings/delegations
```

### Core (org-scoped)
```
GET/PATCH  /api/filters
POST       /api/sync
GET/POST   /api/sources
POST       /api/sources/install
GET/POST   /api/users
GET        /api/tenders/export
POST       /api/tenders/[id]/share
```

---

## 6. Demo script (for team presentation)

Use this order to show the full SaaS story in ~15 minutes.

### A. Platform story (5 min) — platform admin account
1. Open `/platform/orgs` — show org list
2. Create a test org (e.g. slug `demo-co`, template `hr`)
3. Use **Manage** to show suspend / plan bump without DB access
4. Open the new org’s workspace URL

### B. Self-serve story (3 min) — apex host, logged out
1. Visit apex `/` — marketing landing page
2. Click through to `/signup`
3. Complete signup wizard — note 14-day trial
4. Land on new workspace login URL

### C. Workspace story (5 min) — new org super admin
1. Log in — onboarding checklist appears
2. Add a source from catalog → run sync
3. Visit `/settings/branding` — change display name / colors
4. Visit `/settings/plan` — show seat/source usage meters
5. Visit `/settings/lexicon` — show terminology override

### D. Limits story (2 min)
1. Try adding users/sources beyond trial limit — show upgrade alert
2. Point to trial banner at top of dashboard

### E. Globecon reference tenant
1. Show `globecon` org still works as before (procurement template)
2. Emphasize: same platform, different template = different product feel

---

## 7. Environment & operations

### Required environment variables (SaaS-relevant)

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Neon PostgreSQL |
| `AUTH_SECRET` | NextAuth JWT signing |
| `APP_URL` | Canonical app URL for links |
| `SYNC_CRON_SECRET` | Protects sync + trial cron endpoints |
| `STRIPE_SECRET_KEY` | *(optional)* Enables checkout when wired |

### Database migrations
Run after deploy or schema changes:
```bash
pnpm db:upgrade
```

The upgrade script includes org tables, `org_id` backfill, `custom_fields`, `onboarding`, Stripe columns, and all tenant indexes.

### Cron jobs to schedule
| Endpoint | Schedule | Purpose |
|----------|----------|---------|
| `POST /api/sync/cron` | Per org plan interval | Automated source sync |
| `POST /api/platform/trials/cron` | Daily | Expire trials |
| `POST /api/alerts/cron` | Daily | Email alerts |

All require `Authorization: Bearer $SYNC_CRON_SECRET`.

---

## 8. What is NOT live yet (be transparent with the team)

| Item | Current state |
|------|---------------|
| Stripe payments | DB ready, API returns “not configured” |
| Wildcard DNS / subdomain routing in production | Staging on Netlify; DNS cutover pending |
| Custom domains per org | Not implemented |
| Row-level security (PostgreSQL RLS) | App-layer scoping only |
| Additional templates beyond procurement + HR | Extensible — add JSON files |
| Full `opportunities` table rename | Internal table still named `tenders` |
| Automated emails on signup | Org created; welcome email not automated |

---

## 9. Suggested talking points for leadership

1. **We shipped the SaaS foundation** — not a prototype. Multi-tenancy, templates, plans, and admin tooling are in production code with enforced limits.

2. **Globecon is tenant zero** — zero disruption to the existing workflow; it validates the platform using the procurement template.

3. **HR template proves vertical flexibility** — same engine, different language, cards, and empty states.

4. **Commercial hooks are in place** — trials, limits, upgrade paths. Stripe is the remaining integration step.

5. **The UX is customer-ready** — marketing page, signup, onboarding, error handling, and logout are polished for external users.

---

## 10. File index (quick reference)

```
app/
  page.tsx                    # Dashboard OR marketing landing (apex)
  signup/                     # Self-serve signup wizard
  platform/orgs/              # Platform admin
  settings/branding|lexicon|template|plan/
  api/signup/                 # Self-serve org creation
  api/platform/orgs/          # Platform CRUD + manage
  api/settings/onboarding/    # Onboarding progress
  api/billing/checkout/       # Stripe stub

lib/
  tenant/                     # Host resolution, org context
  platform/                   # Plans, limits, orgs, trials
  templates/                  # Template load/apply/resolve
  onboarding/                 # Checklist steps + workspace state
  api/errors.ts               # Structured error handling
  auth/sign-out-client.ts     # Hardened logout

components/
  marketing/marketing-landing.tsx
  onboarding/onboarding-checklist.tsx
  platform/platform-orgs-panel.tsx
  tenders/opportunity-card.tsx
  layout/trial-banner.tsx

templates/
  procurement.json
  hr.json

docs/
  SAAS_IMPLEMENTATION_PLAN.md   # Full technical roadmap
  TEAM_SAAS_DELIVERY_GUIDE.md     # This document
```

---

## 11. Verification checklist (for QA / demo prep)

Before presenting to the team, confirm:

- [ ] `pnpm db:upgrade` has been run on the demo database
- [ ] Platform admin account exists (`is_platform_admin = true`)
- [ ] Apex host shows marketing page when logged out
- [ ] `/signup` creates a new org and returns login URL
- [ ] `/platform/orgs` → Manage → suspend/plan change works
- [ ] Trial banner visible on trial orgs
- [ ] Plan limits block excess users/sources with upgrade message
- [ ] Logout lands on `/login?signedOut=1` without bouncing back to dashboard
- [ ] Onboarding checklist appears for super admin on fresh org
- [ ] HR template org shows “Jobs” terminology and HR empty state

---

*For the full technical roadmap and future phases, see `docs/SAAS_IMPLEMENTATION_PLAN.md`.*
