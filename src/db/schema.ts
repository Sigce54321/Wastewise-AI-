import {
  pgTable,
  uuid,
  text,
  varchar,
  timestamp,
  boolean,
  integer,
  doublePrecision,
  real,
  jsonb,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

// ---------------------------------------------------------------------------
// Organizations & Users
// ---------------------------------------------------------------------------

export const organizations = pgTable("organizations", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: varchar("slug", { length: 120 }).notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const userRoleValues = ["admin", "manager", "viewer"] as const;
export type UserRole = (typeof userRoleValues)[number];

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    email: varchar("email", { length: 255 }).notNull(),
    passwordHash: text("password_hash").notNull(),
    name: text("name").notNull(),
    role: varchar("role", { length: 20 }).notNull().default("viewer"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("users_email_unique").on(t.email)],
);

// ---------------------------------------------------------------------------
// Locations
// ---------------------------------------------------------------------------

export const locations = pgTable(
  "locations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    type: varchar("type", { length: 60 }).notNull().default("general"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("locations_org_idx").on(t.organizationId)],
);

// ---------------------------------------------------------------------------
// Waste records
// ---------------------------------------------------------------------------

export const wasteCategoryValues = [
  "Food",
  "Paper",
  "Plastic",
  "Glass",
  "Metal",
  "E-Waste",
  "Other",
] as const;

export const wasteRecords = pgTable(
  "waste_records",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    locationId: uuid("location_id")
      .notNull()
      .references(() => locations.id, { onDelete: "cascade" }),
    date: varchar("date", { length: 10 }).notNull(), // YYYY-MM-DD
    wasteCategory: varchar("waste_category", { length: 40 }).notNull(),
    quantityKg: doublePrecision("quantity_kg").notNull(),
    peopleCount: integer("people_count"),
    mealsServed: integer("meals_served"),
    eventFlag: boolean("event_flag").notNull().default(false),
    previousWasteKg: doublePrecision("previous_waste_kg"),
    disposalMethod: varchar("disposal_method", { length: 60 }),
    isDemo: boolean("is_demo").notNull().default(false),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("waste_org_idx").on(t.organizationId),
    index("waste_org_date_idx").on(t.organizationId, t.date),
    index("waste_org_location_idx").on(t.organizationId, t.locationId),
    index("waste_org_category_idx").on(t.organizationId, t.wasteCategory),
  ],
);

// ---------------------------------------------------------------------------
// Predictions (forecast cache)
// ---------------------------------------------------------------------------

export const predictions = pgTable(
  "predictions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    locationId: uuid("location_id").references(() => locations.id, { onDelete: "cascade" }),
    category: varchar("category", { length: 40 }),
    date: varchar("date", { length: 10 }).notNull(),
    predictedKg: doublePrecision("predicted_kg").notNull(),
    model: varchar("model", { length: 60 }).notNull(),
    mae: doublePrecision("mae"),
    rmse: doublePrecision("rmse"),
    mape: doublePrecision("mape"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("predictions_org_idx").on(t.organizationId)],
);

// ---------------------------------------------------------------------------
// Anomalies
// ---------------------------------------------------------------------------

export const anomalies = pgTable(
  "anomalies",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    locationId: uuid("location_id").references(() => locations.id, { onDelete: "cascade" }),
    category: varchar("category", { length: 40 }),
    date: varchar("date", { length: 10 }).notNull(),
    observedKg: doublePrecision("observed_kg").notNull(),
    expectedLow: doublePrecision("expected_low"),
    expectedHigh: doublePrecision("expected_high"),
    deviation: doublePrecision("deviation"),
    method: varchar("method", { length: 40 }).notNull(),
    severity: varchar("severity", { length: 20 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("anomalies_org_idx").on(t.organizationId)],
);

// ---------------------------------------------------------------------------
// Recommendations & feedback
// ---------------------------------------------------------------------------

export const recommendationStatusValues = [
  "New",
  "Under Review",
  "Accepted",
  "Rejected",
  "Implemented",
] as const;

export const recommendations = pgTable(
  "recommendations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    priority: varchar("priority", { length: 20 }).notNull(),
    category: varchar("category", { length: 40 }),
    finding: text("finding").notNull(),
    evidence: text("evidence").notNull(),
    recommendationText: text("recommendation_text").notNull(),
    expectedImpactDirection: varchar("expected_impact_direction", { length: 20 }).notNull(),
    confidence: varchar("confidence", { length: 20 }).notNull(),
    source: varchar("source", { length: 60 }).notNull(),
    limitations: text("limitations"),
    status: varchar("status", { length: 20 }).notNull().default("New"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("recommendations_org_idx").on(t.organizationId)],
);

export const feedback = pgTable("feedback", {
  id: uuid("id").primaryKey().defaultRandom(),
  recommendationId: uuid("recommendation_id")
    .notNull()
    .references(() => recommendations.id, { onDelete: "cascade" }),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  action: varchar("action", { length: 30 }).notNull(),
  comment: text("comment"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// RAG: documents & chunks
// ---------------------------------------------------------------------------

export const documents = pgTable("documents", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").references(() => organizations.id, {
    onDelete: "cascade",
  }), // NULL = shared/global reference corpus
  title: text("title").notNull(),
  source: varchar("source", { length: 120 }).notNull(),
  category: varchar("category", { length: 60 }).notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const documentChunks = pgTable(
  "document_chunks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    documentId: uuid("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    chunkIndex: integer("chunk_index").notNull(),
    content: text("content").notNull(),
    embedding: real("embedding").array().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("document_chunks_doc_idx").on(t.documentId)],
);

// ---------------------------------------------------------------------------
// Impact factors
// ---------------------------------------------------------------------------

export const impactFactors = pgTable("impact_factors", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").references(() => organizations.id, {
    onDelete: "cascade",
  }), // NULL = global/default factor
  category: varchar("category", { length: 40 }).notNull(),
  metric: varchar("metric", { length: 20 }).notNull(), // co2e | cost
  factorValue: doublePrecision("factor_value").notNull(),
  unit: varchar("unit", { length: 40 }).notNull(),
  source: varchar("source", { length: 120 }).notNull(),
  version: varchar("version", { length: 20 }).notNull().default("1.0"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// Assistant conversation log (for evidence-grounded history, optional use)
// ---------------------------------------------------------------------------

export const assistantMessages = pgTable(
  "assistant_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    role: varchar("role", { length: 20 }).notNull(), // user | assistant
    content: text("content").notNull(),
    sources: jsonb("sources"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("assistant_messages_org_idx").on(t.organizationId)],
);
