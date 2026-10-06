import {
  boolean,
  integer,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const marketFields = pgTable("market_fields", {
  id: serial("id").primaryKey(),
  code: integer("code").notNull(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  sortOrder: integer("sort_order").notNull(),
  active: boolean("active").notNull().default(true),
});

export const catalogServiceLines = pgTable("catalog_service_lines", {
  id: serial("id").primaryKey(),
  marketFieldId: integer("market_field_id")
    .references(() => marketFields.id, { onDelete: "cascade" })
    .notNull(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  globeconRelevance: text("globecon_relevance").notNull().default("potential"),
  keywords: text("keywords").array().notNull().default([]),
  /** Org service_lines.slug this catalog line stands in for, when one exists. */
  legacySlug: text("legacy_slug"),
  active: boolean("active").notNull().default(true),
});

export const procurementTypes = pgTable("procurement_types", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  meaning: text("meaning"),
});

export const watchlists = pgTable(
  "watchlists",
  {
    id: serial("id").primaryKey(),
    orgId: integer("org_id").notNull(),
    name: text("name").notNull(),
    isActive: boolean("is_active").notNull().default(false),
    countryNames: text("country_names").array().notNull().default([]),
    procurementTypeIds: integer("procurement_type_ids")
      .array()
      .notNull()
      .default([]),
    createdById: integer("created_by_id"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [uniqueIndex("watchlists_org_name_idx").on(table.orgId, table.name)],
);

export const watchlistLines = pgTable(
  "watchlist_lines",
  {
    watchlistId: integer("watchlist_id")
      .references(() => watchlists.id, { onDelete: "cascade" })
      .notNull(),
    catalogServiceLineId: integer("catalog_service_line_id")
      .references(() => catalogServiceLines.id, { onDelete: "cascade" })
      .notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.watchlistId, table.catalogServiceLineId] }),
  ],
);

export const tenderCatalogMatches = pgTable(
  "tender_catalog_matches",
  {
    tenderId: integer("tender_id").notNull(),
    catalogServiceLineId: integer("catalog_service_line_id")
      .references(() => catalogServiceLines.id, { onDelete: "cascade" })
      .notNull(),
    score: integer("score").notNull().default(0),
  },
  (table) => [
    primaryKey({ columns: [table.tenderId, table.catalogServiceLineId] }),
  ],
);

export const opportunityVersions = pgTable("opportunity_versions", {
  id: serial("id").primaryKey(),
  tenderId: integer("tender_id").notNull(),
  field: text("field").notNull(),
  previousValue: text("previous_value"),
  newValue: text("new_value"),
  sourceId: integer("source_id"),
  detectedAt: timestamp("detected_at").defaultNow().notNull(),
  note: text("note"),
});

export const companyProfiles = pgTable("company_profiles", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").notNull().unique(),
  legalName: text("legal_name"),
  registrationNumber: text("registration_number"),
  country: text("country"),
  locations: text("locations"),
  yearsOperating: integer("years_operating"),
  description: text("description"),
  website: text("website"),
  contacts: text("contacts"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const companyCapabilities = pgTable("company_capabilities", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").notNull(),
  catalogServiceLineId: integer("catalog_service_line_id").references(
    () => catalogServiceLines.id,
    { onDelete: "set null" },
  ),
  name: text("name").notNull(),
  description: text("description"),
  verificationStatus: text("verification_status")
    .notNull()
    .default("self_declared"),
});

export const companyProjects = pgTable("company_projects", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").notNull(),
  name: text("name").notNull(),
  client: text("client"),
  country: text("country"),
  scope: text("scope"),
  role: text("role"),
  value: text("value"),
  currency: text("currency"),
  startDate: text("start_date"),
  endDate: text("end_date"),
  status: text("status").notNull().default("completed"),
  verificationStatus: text("verification_status")
    .notNull()
    .default("self_declared"),
});

export const companyPersonnel = pgTable("company_personnel", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").notNull(),
  name: text("name").notNull(),
  position: text("position"),
  discipline: text("discipline"),
  yearsExperience: integer("years_experience"),
  certifications: text("certifications"),
  availability: text("availability"),
  verificationStatus: text("verification_status")
    .notNull()
    .default("self_declared"),
});

export const companyCertifications = pgTable("company_certifications", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").notNull(),
  name: text("name").notNull(),
  issuer: text("issuer"),
  issuedOn: text("issued_on"),
  expiresOn: text("expires_on"),
  verificationStatus: text("verification_status")
    .notNull()
    .default("unverified"),
});

export const evidenceDocuments = pgTable("evidence_documents", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").notNull(),
  name: text("name").notNull(),
  documentType: text("document_type").notNull(),
  relatedLabel: text("related_label"),
  url: text("url"),
  cloudinaryPublicId: text("cloudinary_public_id"),
  issuedOn: text("issued_on"),
  expiresOn: text("expires_on"),
  verificationStatus: text("verification_status")
    .notNull()
    .default("unverified"),
  confidentiality: text("confidentiality").notNull().default("internal"),
  notes: text("notes"),
  uploadedById: integer("uploaded_by_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const opportunityRequirements = pgTable("opportunity_requirements", {
  id: serial("id").primaryKey(),
  tenderId: integer("tender_id").notNull(),
  orgId: integer("org_id").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull().default("general"),
  mandatory: boolean("mandatory").notNull().default(false),
  sourceKind: text("source_kind").notNull().default("metadata"),
  sourceRef: text("source_ref"),
  status: text("status").notNull().default("UNVERIFIED"),
  evidenceNote: text("evidence_note"),
  /** accepted lines are scored. pending lines are model suggestions a person has not accepted. */
  reviewState: text("review_state").notNull().default("accepted"),
});

export const qualificationAssessments = pgTable("qualification_assessments", {
  id: serial("id").primaryKey(),
  tenderId: integer("tender_id").notNull(),
  orgId: integer("org_id").notNull(),
  method: text("method").notNull().default("rules"),
  deepScanStatus: text("deep_scan_status").notNull().default("incomplete"),
  overallStatus: text("overall_status").notNull(),
  recommendedAction: text("recommended_action").notNull(),
  relevanceScore: integer("relevance_score"),
  qualificationScore: integer("qualification_score"),
  evidenceConfidence: integer("evidence_confidence"),
  deadlineUrgency: text("deadline_urgency"),
  sourceConfidence: text("source_confidence"),
  explanation: text("explanation").notNull(),
  mismatchExplanation: text("mismatch_explanation"),
  assessedAt: timestamp("assessed_at").defaultNow().notNull(),
});

export const capabilityGaps = pgTable("capability_gaps", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").notNull(),
  tenderId: integer("tender_id"),
  gapType: text("gap_type").notNull(),
  description: text("description").notNull(),
  status: text("status").notNull().default("potential"),
  correctiveAction: text("corrective_action"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const bidPipeline = pgTable(
  "bid_pipeline",
  {
    id: serial("id").primaryKey(),
    orgId: integer("org_id").notNull(),
    tenderId: integer("tender_id").notNull(),
    stage: text("stage").notNull().default("DISCOVERED"),
    assigneeId: integer("assignee_id"),
    internalDeadline: timestamp("internal_deadline"),
    notes: text("notes"),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("bid_pipeline_org_tender_idx").on(table.orgId, table.tenderId),
  ],
);

export const pipelineTasks = pgTable("pipeline_tasks", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").notNull(),
  tenderId: integer("tender_id").notNull(),
  title: text("title").notNull(),
  done: boolean("done").notNull().default(false),
  dueOn: text("due_on"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const pipelineActivity = pgTable("pipeline_activity", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").notNull(),
  tenderId: integer("tender_id").notNull(),
  actorId: integer("actor_id"),
  action: text("action").notNull(),
  detail: text("detail"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const orgHiddenCatalogLines = pgTable(
  "org_hidden_catalog_lines",
  {
    id: serial("id").primaryKey(),
    orgId: integer("org_id").notNull(),
    catalogServiceLineId: integer("catalog_service_line_id").notNull(),
  },
  (table) => [
    uniqueIndex("org_hidden_catalog_lines_idx").on(
      table.orgId,
      table.catalogServiceLineId,
    ),
  ],
);

export const alertReads = pgTable(
  "alert_reads",
  {
    id: serial("id").primaryKey(),
    orgId: integer("org_id").notNull(),
    userId: integer("user_id").notNull(),
    alertKey: text("alert_key").notNull(),
    readAt: timestamp("read_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("alert_reads_user_key_idx").on(table.userId, table.alertKey),
  ],
);

export const opportunityNotes = pgTable("opportunity_notes", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").notNull(),
  tenderId: integer("tender_id").notNull(),
  authorId: integer("author_id"),
  body: text("body").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/** left/right ids are stored in ascending order so a pair has one row. */
export const opportunityRelations = pgTable(
  "opportunity_relations",
  {
    id: serial("id").primaryKey(),
    orgId: integer("org_id").notNull(),
    leftTenderId: integer("left_tender_id").notNull(),
    rightTenderId: integer("right_tender_id").notNull(),
    status: text("status").notNull().default("proposed"),
    reason: text("reason"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("opportunity_relations_pair_idx").on(
      table.orgId,
      table.leftTenderId,
      table.rightTenderId,
    ),
  ],
);

export type WatchlistCountryFilter = {
  countryNames: string[];
  procurementTypeIds: number[];
};

export const BID_STAGES = [
  "DISCOVERED",
  "REVIEWING",
  "QUALIFICATION_CHECK",
  "SHORTLISTED",
  "BID_NO_BID",
  "PREPARING",
  "SUBMITTED",
  "AWARDED",
  "UNSUCCESSFUL",
  "CANCELLED",
  "ARCHIVED",
] as const;

export type BidStage = (typeof BID_STAGES)[number];

export type TaxonomySeed = {
  fields: Array<{
    code: number;
    name: string;
    slug: string;
    sortOrder: number;
  }>;
  serviceLines: Array<{
    fieldSlug: string;
    name: string;
    slug: string;
    globeconRelevance: string;
    keywords: string[];
    legacySlug: string | null;
  }>;
  procurementTypes: Array<{ name: string; slug: string; meaning: string }>;
};
