import { relations } from "drizzle-orm";
import {
  boolean,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", [
  "super_admin",
  "admin",
  "analyst",
  "viewer",
]);

export const sourceTypeEnum = pgEnum("source_type", ["link", "document"]);

export const sourceAdapterEnum = pgEnum("source_adapter", [
  "world-bank",
  "tender-yetu",
  "kenya-ppip",
  "afdb-procurement",
  "generic-rss",
  "generic-link",
  "document",
]);

export type NotificationPrefs = {
  enabled: boolean;
  closingSoon: boolean;
  closingSoonDays: number;
  highMatch: boolean;
  highMatchThreshold: number;
  afterSync: boolean;
};

export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  enabled: true,
  closingSoon: true,
  closingSoonDays: 3,
  highMatch: true,
  highMatchThreshold: 30,
  afterSync: true,
};

export const organizations = pgTable("organizations", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  status: text("status").notNull().default("active"),
  templateId: text("template_id").notNull().default("procurement"),
  templateVersion: text("template_version").notNull().default("1.0.0"),
  plan: text("plan").notNull().default("trial"),
  trialEndsAt: timestamp("trial_ends_at"),
  maxSeats: integer("max_seats").notNull().default(25),
  maxSources: integer("max_sources").notNull().default(50),
  syncIntervalHours: integer("sync_interval_hours").notNull().default(24),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  role: userRoleEnum("role").notNull().default("viewer"),
  isPlatformAdmin: boolean("is_platform_admin").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  /**
   * Bumped on logout. JWT carries the version from login; mismatch = session dead
   * even if `__Secure-authjs.session-token` refuses to clear (Netlify/CDN).
   */
  sessionVersion: integer("session_version").notNull().default(0),
  filterState: jsonb("filter_state")
    .$type<FilterState>()
    .default({
      sourceIds: [],
      serviceLineIds: [],
      regionIds: [],
      countryIds: [],
    }),
  notificationPrefs: jsonb("notification_prefs")
    .$type<NotificationPrefs>()
    .default(DEFAULT_NOTIFICATION_PREFS),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const orgMemberships = pgTable(
  "org_memberships",
  {
    id: serial("id").primaryKey(),
    orgId: integer("org_id")
      .references(() => organizations.id, { onDelete: "cascade" })
      .notNull(),
    userId: integer("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    role: userRoleEnum("role").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    /** Per-workspace filters — never share across orgs on the global users row. */
    filterState: jsonb("filter_state")
      .$type<FilterState>()
      .default({
        sourceIds: [],
        serviceLineIds: [],
        regionIds: [],
        countryIds: [],
      }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("org_memberships_org_user_idx").on(table.orgId, table.userId),
  ],
);

export const sources = pgTable(
  "sources",
  {
    id: serial("id").primaryKey(),
    orgId: integer("org_id")
      .references(() => organizations.id, { onDelete: "cascade" })
      .notNull(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
  type: sourceTypeEnum("type").notNull().default("link"),
  adapter: sourceAdapterEnum("adapter").notNull().default("generic-link"),
  url: text("url"),
  cloudinaryPublicId: text("cloudinary_public_id"),
  cloudinaryUrl: text("cloudinary_url"),
  cloudinaryFolder: text("cloudinary_folder"),
  color: text("color").notNull().default("#2563eb"),
  enabled: boolean("enabled").notNull().default(true),
  isBuiltIn: boolean("is_built_in").notNull().default(false),
  archivedAt: timestamp("archived_at"),
  createdById: integer("created_by_id").references(() => users.id),
  lastSyncedAt: timestamp("last_synced_at"),
  lastSyncStatus: text("last_sync_status"),
  lastSyncError: text("last_sync_error"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [uniqueIndex("sources_org_slug_idx").on(table.orgId, table.slug)],
);

export const regions = pgTable(
  "regions",
  {
    id: serial("id").primaryKey(),
    orgId: integer("org_id")
      .references(() => organizations.id, { onDelete: "cascade" })
      .notNull(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
  keywords: text("keywords").array().notNull().default([]),
  isBuiltIn: boolean("is_built_in").notNull().default(true),
  createdById: integer("created_by_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [uniqueIndex("regions_org_slug_idx").on(table.orgId, table.slug)],
);

export const countries = pgTable(
  "countries",
  {
    id: serial("id").primaryKey(),
    orgId: integer("org_id")
      .references(() => organizations.id, { onDelete: "cascade" })
      .notNull(),
    regionId: integer("region_id")
      .references(() => regions.id)
      .notNull(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
  keywords: text("keywords").array().notNull().default([]),
  isBuiltIn: boolean("is_built_in").notNull().default(true),
  createdById: integer("created_by_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [uniqueIndex("countries_org_slug_idx").on(table.orgId, table.slug)],
);

export const serviceLines = pgTable(
  "service_lines",
  {
    id: serial("id").primaryKey(),
    orgId: integer("org_id")
      .references(() => organizations.id, { onDelete: "cascade" })
      .notNull(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
  keywords: text("keywords").array().notNull().default([]),
  isBuiltIn: boolean("is_built_in").notNull().default(true),
  archivedAt: timestamp("archived_at"),
  createdById: integer("created_by_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("service_lines_org_slug_idx").on(table.orgId, table.slug),
  ],
);

export const tenders = pgTable(
  "tenders",
  {
    id: serial("id").primaryKey(),
    orgId: integer("org_id")
      .references(() => organizations.id, { onDelete: "cascade" })
      .notNull(),
    sourceId: integer("source_id")
      .references(() => sources.id)
      .notNull(),
    referenceId: text("reference_id").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    projectLabel: text("project_label").notNull().default("World Bank Project"),
    category: text("category").notNull(),
    deadline: timestamp("deadline").notNull(),
    url: text("url"),
    regionId: integer("region_id").references(() => regions.id),
    countryId: integer("country_id").references(() => countries.id),
    regionLabel: text("region_label"),
    countryLabel: text("country_label"),
    /** Raw portal / feed status (OPEN, CLOSED, NO DEADLINE, …). */
    sourceStatus: text("source_status"),
    /**
     * Derived lifecycle: live | rolling | stale | expired | closed.
     * Recomputed on ingest/sync and by reconcileTenderListings.
     */
    listingState: text("listing_state").notNull().default("live"),
    /** False when the feed had no real closing date (rolling / N/A). */
    hasHardDeadline: boolean("has_hard_deadline").notNull().default(true),
    isClosed: boolean("is_closed").notNull().default(false),
    saved: boolean("saved").notNull().default(false),
    matchScore: integer("match_score").notNull().default(0),
    customFields: jsonb("custom_fields")
      .$type<Record<string, string | number | boolean | null>>()
      .notNull()
      .default({}),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("tenders_source_reference_idx").on(
      table.sourceId,
      table.referenceId,
    ),
  ],
);

export const tenderServiceLineMatches = pgTable(
  "tender_service_line_matches",
  {
    tenderId: integer("tender_id")
      .references(() => tenders.id, { onDelete: "cascade" })
      .notNull(),
    serviceLineId: integer("service_line_id")
      .references(() => serviceLines.id, { onDelete: "cascade" })
      .notNull(),
    score: integer("score").notNull().default(0),
  },
  (table) => [
    primaryKey({ columns: [table.tenderId, table.serviceLineId] }),
  ],
);

export const syncLogs = pgTable("sync_logs", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").references(() => organizations.id, {
    onDelete: "cascade",
  }),
  sourceId: integer("source_id").references(() => sources.id),
  triggeredBy: text("triggered_by").notNull().default("manual"),
  status: text("status").notNull().default("success"),
  tenderCount: integer("tender_count").notNull().default(0),
  errorMessage: text("error_message"),
  syncedAt: timestamp("synced_at").defaultNow().notNull(),
});

export const emailAlertLog = pgTable(
  "email_alert_log",
  {
    id: serial("id").primaryKey(),
    orgId: integer("org_id")
      .references(() => organizations.id, { onDelete: "cascade" })
      .notNull(),
    userId: integer("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    tenderId: integer("tender_id")
      .references(() => tenders.id, { onDelete: "cascade" })
      .notNull(),
    alertType: text("alert_type").notNull(),
    sentAt: timestamp("sent_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("email_alert_log_user_tender_type_idx").on(
      table.userId,
      table.tenderId,
      table.alertType,
    ),
  ],
);

export const emailDigestLog = pgTable("email_digest_log", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id")
    .references(() => organizations.id, { onDelete: "cascade" })
    .notNull(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("success"),
  closingCount: integer("closing_count").notNull().default(0),
  highMatchCount: integer("high_match_count").notNull().default(0),
  errorMessage: text("error_message"),
  sentAt: timestamp("sent_at").defaultNow().notNull(),
});

export const passwordResetTokens = pgTable(
  "password_reset_tokens",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    usedAt: timestamp("used_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [uniqueIndex("password_reset_tokens_hash_idx").on(table.tokenHash)],
);

export const tenderShares = pgTable(
  "tender_shares",
  {
    id: serial("id").primaryKey(),
    orgId: integer("org_id")
      .references(() => organizations.id, { onDelete: "cascade" })
      .notNull(),
    tenderId: integer("tender_id")
      .references(() => tenders.id, { onDelete: "cascade" })
      .notNull(),
    tokenHash: text("token_hash").notNull(),
    createdById: integer("created_by_id").references(() => users.id, {
      onDelete: "set null",
    }),
    expiresAt: timestamp("expires_at").notNull(),
    viewCount: integer("view_count").notNull().default(0),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("tender_shares_token_hash_idx").on(table.tokenHash),
    uniqueIndex("tender_shares_tender_id_idx").on(table.tenderId),
  ],
);

export type WorkspaceBrandingSettings = {
  displayName?: string;
  primaryColor?: string;
  accentColor?: string;
  logoUrl?: string;
  logoPublicId?: string;
  coverUrl?: string;
  coverPublicId?: string;
};

export type WorkspaceLexiconSettings = {
  opportunity: string;
  opportunityPlural: string;
  source: string;
  sourcePlural: string;
  category: string;
  categoryPlural: string;
  deadline: string;
  matchScore: string;
  region: string;
  country: string;
  save: string;
  export: string;
  share: string;
  sync: string;
  navHome: string;
  navAnalytics: string;
  navProfile: string;
  navSettings: string;
  navTeam: string;
  emptyOpportunities: string;
  emptyOpportunitiesHint: string;
  productTagline: string;
};

export type WorkspaceCatalogSettings = {
  allowDeleteBuiltIn: boolean;
};

export type WorkspaceFeaturesSettings = {
  analytics: boolean;
  publicShare: boolean;
  sync: boolean;
  matchScore: boolean;
  export: boolean;
};

export type WorkspaceLayoutSettings = {
  homeCardVariant: "procurement" | "hr" | "community" | "academic";
  sidebarSections: Array<
    "sources" | "serviceLines" | "regions" | "countries" | "departments"
  >;
};

export type CustomFieldDefinition = {
  key: string;
  label: string;
  type: "text" | "number" | "date" | "url";
  showOnCard?: boolean;
};

export type CustomFieldValues = Record<string, string | number | boolean | null>;

export type WorkspaceNotificationSettings = {
  enabled: boolean;
  mode: "explicit_list";
  includedUserIds: number[];
  respectUserOptOut: boolean;
  defaultPrefs: NotificationPrefs;
};

export type WorkspaceSettingsPayload = {
  organizationName: string;
  notifications: WorkspaceNotificationSettings;
  branding: WorkspaceBrandingSettings;
  lexicon: WorkspaceLexiconSettings;
  features: WorkspaceFeaturesSettings;
  layout: WorkspaceLayoutSettings;
  catalog: WorkspaceCatalogSettings;
};

export const DEFAULT_WORKSPACE_NOTIFICATIONS: WorkspaceNotificationSettings = {
  enabled: true,
  mode: "explicit_list",
  includedUserIds: [],
  respectUserOptOut: true,
  defaultPrefs: DEFAULT_NOTIFICATION_PREFS,
};

export const DEFAULT_WORKSPACE_SETTINGS: WorkspaceSettingsPayload = {
  organizationName: "Globecon",
  notifications: DEFAULT_WORKSPACE_NOTIFICATIONS,
  branding: {},
  lexicon: {} as WorkspaceLexiconSettings,
  features: {
    analytics: true,
    publicShare: true,
    sync: true,
    matchScore: true,
    export: true,
  },
  layout: {
    homeCardVariant: "procurement",
    sidebarSections: ["sources", "serviceLines", "regions", "countries"],
  },
  catalog: { allowDeleteBuiltIn: true },
};

export type WorkspaceOnboardingState = {
  dismissed?: boolean;
  manuallyCompleted?: Array<
    "source_added" | "sync_run" | "team_invited" | "branding_set"
  >;
};

export const workspaceSettings = pgTable("workspace_settings", {
  orgId: integer("org_id")
    .primaryKey()
    .references(() => organizations.id, { onDelete: "cascade" }),
  organizationName: text("organization_name").notNull().default("Globecon"),
  notifications: jsonb("notifications")
    .$type<WorkspaceNotificationSettings>()
    .notNull()
    .default(DEFAULT_WORKSPACE_NOTIFICATIONS),
  branding: jsonb("branding")
    .$type<WorkspaceBrandingSettings>()
    .notNull()
    .default({}),
  lexicon: jsonb("lexicon")
    .$type<Partial<WorkspaceLexiconSettings>>()
    .notNull()
    .default({}),
  features: jsonb("features")
    .$type<Partial<WorkspaceFeaturesSettings>>()
    .notNull()
    .default({}),
  layout: jsonb("layout")
    .$type<Partial<WorkspaceLayoutSettings>>()
    .notNull()
    .default({}),
  catalog: jsonb("catalog")
    .$type<WorkspaceCatalogSettings>()
    .notNull()
    .default({ allowDeleteBuiltIn: true }),
  onboarding: jsonb("onboarding")
    .$type<WorkspaceOnboardingState>()
    .notNull()
    .default({}),
  updatedById: integer("updated_by_id").references(() => users.id, {
    onDelete: "set null",
  }),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const DELEGATABLE_SETTINGS_PERMISSIONS = [
  "settings:notifications",
] as const;

export type DelegatableSettingsPermission =
  (typeof DELEGATABLE_SETTINGS_PERMISSIONS)[number];

export const userPermissionGrants = pgTable(
  "user_permission_grants",
  {
    id: serial("id").primaryKey(),
    orgId: integer("org_id")
      .references(() => organizations.id, { onDelete: "cascade" })
      .notNull(),
    userId: integer("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    permission: text("permission").notNull(),
    grantedById: integer("granted_by_id").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("user_permission_grants_org_user_permission_idx").on(
      table.orgId,
      table.userId,
      table.permission,
    ),
  ],
);

export type Organization = typeof organizations.$inferSelect;
export type OrgMembership = typeof orgMemberships.$inferSelect;
export type User = typeof users.$inferSelect;
export type Source = typeof sources.$inferSelect;
export type Region = typeof regions.$inferSelect;
export type Country = typeof countries.$inferSelect;
export type ServiceLine = typeof serviceLines.$inferSelect;
export type Tender = typeof tenders.$inferSelect;
export type SyncLog = typeof syncLogs.$inferSelect;
export type EmailAlertLog = typeof emailAlertLog.$inferSelect;
export type EmailDigestLog = typeof emailDigestLog.$inferSelect;
export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
export type TenderShare = typeof tenderShares.$inferSelect;
export type WorkspaceSettings = typeof workspaceSettings.$inferSelect;
export type UserPermissionGrant = typeof userPermissionGrants.$inferSelect;
export type UserRole = (typeof userRoleEnum.enumValues)[number];

export type TenderWithSource = Tender & {
  sourceName: string;
  sourceColor: string;
  sourceSlug: string;
  regionName?: string | null;
  countryName?: string | null;
  matchedServiceLines?: string[];
};

export type FilterState = {
  sourceIds: number[];
  serviceLineIds: number[];
  regionIds: number[];
  countryIds: number[];
  search?: string;
  sort?: "closing_soonest" | "recently_issued";
  savedOnly?: boolean;
  hideClosed?: boolean;
};

export const EMPTY_FILTER_STATE: FilterState = {
  sourceIds: [],
  serviceLineIds: [],
  regionIds: [],
  countryIds: [],
};

// --- Better Auth tables (DB sessions — logout deletes the row) -------------
// Column names are camelCase to match Better Auth / drizzle adapter defaults.

export const baUser = pgTable("ba_user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("emailVerified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

export const baSession = pgTable("ba_session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expiresAt").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
  ipAddress: text("ipAddress"),
  userAgent: text("userAgent"),
  userId: text("userId")
    .notNull()
    .references(() => baUser.id, { onDelete: "cascade" }),
  /** Active workspace — set at login, not inferred from host. */
  orgId: integer("orgId"),
  orgSlug: text("orgSlug"),
  role: text("role"),
  isPlatformAdmin: boolean("isPlatformAdmin").notNull().default(false),
});

export const baAccount = pgTable("ba_account", {
  id: text("id").primaryKey(),
  /** Better Auth 1.7+: local credential issuer is `local:credential`. */
  issuer: text("issuer").notNull().default("local:credential"),
  /** For credential provider this must equal userId (not email). */
  accountId: text("accountId").notNull(),
  providerId: text("providerId").notNull(),
  userId: text("userId")
    .notNull()
    .references(() => baUser.id, { onDelete: "cascade" }),
  accessToken: text("accessToken"),
  refreshToken: text("refreshToken"),
  idToken: text("idToken"),
  accessTokenExpiresAt: timestamp("accessTokenExpiresAt"),
  refreshTokenExpiresAt: timestamp("refreshTokenExpiresAt"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

export const baVerification = pgTable("ba_verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow(),
});

/** Relations required for Better Auth drizzle adapter `includeAccounts` joins. */
export const baUserRelations = relations(baUser, ({ many }) => ({
  sessions: many(baSession),
  accounts: many(baAccount),
}));

export const baSessionRelations = relations(baSession, ({ one }) => ({
  user: one(baUser, {
    fields: [baSession.userId],
    references: [baUser.id],
  }),
}));

export const baAccountRelations = relations(baAccount, ({ one }) => ({
  user: one(baUser, {
    fields: [baAccount.userId],
    references: [baUser.id],
  }),
}));
