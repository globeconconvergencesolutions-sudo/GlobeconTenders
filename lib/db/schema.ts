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

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  role: userRoleEnum("role").notNull().default("viewer"),
  isActive: boolean("is_active").notNull().default(true),
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

export const sources = pgTable("sources", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
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
});

export const regions = pgTable("regions", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  keywords: text("keywords").array().notNull().default([]),
  isBuiltIn: boolean("is_built_in").notNull().default(true),
  createdById: integer("created_by_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const countries = pgTable("countries", {
  id: serial("id").primaryKey(),
  regionId: integer("region_id")
    .references(() => regions.id)
    .notNull(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  keywords: text("keywords").array().notNull().default([]),
  isBuiltIn: boolean("is_built_in").notNull().default(true),
  createdById: integer("created_by_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const serviceLines = pgTable("service_lines", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  keywords: text("keywords").array().notNull().default([]),
  isBuiltIn: boolean("is_built_in").notNull().default(true),
  archivedAt: timestamp("archived_at"),
  createdById: integer("created_by_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const tenders = pgTable(
  "tenders",
  {
    id: serial("id").primaryKey(),
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
    isClosed: boolean("is_closed").notNull().default(false),
    saved: boolean("saved").notNull().default(false),
    matchScore: integer("match_score").notNull().default(0),
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
