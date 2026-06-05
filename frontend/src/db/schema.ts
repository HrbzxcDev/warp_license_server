import {
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const licenses = pgTable("licenses", {
  id: serial("id").primaryKey(),
  licenseKey: text("license_key").notNull().unique(),
  product: text("product").notNull().default("default"),
  status: text("status").notNull().default("inactive"),
  machineId: text("machine_id"),
  activatedAt: timestamp("activated_at", { withTimezone: true, mode: "string" }),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
    .notNull()
    .defaultNow(),
  notes: text("notes"),
});

export type LicenseRow = typeof licenses.$inferSelect;
