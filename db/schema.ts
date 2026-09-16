import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const leads = sqliteTable(
  "leads",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    phone: text("phone").notNull(),
    crm: text("crm"),
    specialty: text("specialty"),
    city: text("city"),
    clinic: text("clinic"),
    revenueRange: text("revenue_range"),
    teamSize: text("team_size"),
    mainDifficulty: text("main_difficulty"),
    objective: text("objective"),
    bottleneck: text("bottleneck"),
    consent: integer("consent", { mode: "boolean" }).notNull().default(false),
    status: text("status", { enum: ["started", "completed"] }).notNull().default("started"),
    currentStep: integer("current_step").notNull().default(1),
    utmSource: text("utm_source"),
    utmMedium: text("utm_medium"),
    utmCampaign: text("utm_campaign"),
    referrer: text("referrer"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
    completedAt: text("completed_at"),
  },
  (table) => [index("leads_status_created_idx").on(table.status, table.createdAt)]
);
