import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp, jsonb, decimal } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ==================== MULTI-TENANT TABLES ====================

// Organizations table - each customer organization
export const organizations = pgTable("organizations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  logoUrl: text("logo_url"),
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
  settings: jsonb("settings").default(sql`'{}'::jsonb`),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// License plans - defines what features and limits each tier has
export const licensePlans = pgTable("license_plans", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  maxUsers: integer("max_users").notNull().default(10),
  maxCreators: integer("max_creators").notNull().default(2),
  maxCourses: integer("max_courses").notNull().default(20),
  maxStorageMb: integer("max_storage_mb").notNull().default(1000),
  maxTokensPerMonth: integer("max_tokens_per_month").notNull().default(1000000),
  features: jsonb("features").default(sql`'{"aiQuizGeneration": true, "analytics": true, "certificates": false}'::jsonb`),
  priceMonthly: decimal("price_monthly", { precision: 10, scale: 2 }),
  priceYearly: decimal("price_yearly", { precision: 10, scale: 2 }),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Organization licenses - tracks which plan each org has
export const organizationLicenses = pgTable("organization_licenses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull(),
  planId: varchar("plan_id").notNull(),
  status: text("status").notNull().default("active"), // active, expired, suspended
  currentUsers: integer("current_users").notNull().default(0),
  currentCreators: integer("current_creators").notNull().default(0),
  currentCourses: integer("current_courses").notNull().default(0),
  currentStorageMb: integer("current_storage_mb").notNull().default(0),
  startsAt: timestamp("starts_at").defaultNow(),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Organization memberships - links users to organizations with roles
export const organizationMemberships = pgTable("organization_memberships", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  organizationId: varchar("organization_id").notNull(),
  role: text("role").notNull().default("Learner"), // OrgAdmin, Creator, Learner
  isActive: boolean("is_active").notNull().default(true),
  joinedAt: timestamp("joined_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

// ==================== EXISTING TABLES (updated with organizationId) ====================

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull().default("Learner"), // SuperAdmin, OrgAdmin, Creator, Learner
  organizationId: varchar("organization_id"), // null for SuperAdmin (platform-level)
  department: text("department"), // Department within the organization
  groupIds: text("group_ids").array().default(sql`ARRAY[]::text[]`),
  createdAt: timestamp("created_at").defaultNow(),
});

export const groups = pgTable("groups", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const topics = pgTable("topics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  category: text("category").notNull(),
  authorId: varchar("author_id").notNull(),
  organizationId: varchar("organization_id"), // courses belong to an organization
  readTime: integer("read_time").notNull().default(5),
  content: jsonb("content").notNull().default(sql`'[]'::jsonb`),
  modules: jsonb("modules").default(sql`'[]'::jsonb`),
  imageUrl: text("image_url"),
  sharedWith: text("shared_with").array().default(sql`ARRAY[]::text[]`),
  sharedWithUsers: text("shared_with_users").array().default(sql`ARRAY[]::text[]`),
  isSop: boolean("is_sop").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const userProgress = pgTable("user_progress", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  topicId: varchar("topic_id").notNull(),
  organizationId: varchar("organization_id"),
  status: text("status").notNull().default("Pending"),
  quizScore: integer("quiz_score"),
  quizTotal: integer("quiz_total"),
  timeSpent: integer("time_spent").default(0),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const moduleProgress = pgTable("module_progress", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  topicId: varchar("topic_id").notNull(),
  moduleId: varchar("module_id").notNull(),
  organizationId: varchar("organization_id"),
  status: text("status").notNull().default("locked"),
  quizScore: integer("quiz_score"),
  quizTotal: integer("quiz_total"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const userStats = pgTable("user_stats", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().unique(),
  currentStreak: integer("current_streak").notNull().default(0),
  longestStreak: integer("longest_streak").notNull().default(0),
  lastActiveDate: timestamp("last_active_date"),
  totalTopicsCompleted: integer("total_topics_completed").notNull().default(0),
  totalTimeSpent: integer("total_time_spent").notNull().default(0),
  totalQuizzesPassed: integer("total_quizzes_passed").notNull().default(0),
  averageQuizScore: integer("average_quiz_score").default(0),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const leaderboard = pgTable("leaderboard", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().unique(),
  organizationId: varchar("organization_id"),
  points: integer("points").notNull().default(0),
  rank: integer("rank"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const categories = pgTable("categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const courseCompletions = pgTable("course_completions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  topicId: varchar("topic_id").notNull(),
  organizationId: varchar("organization_id"),
  completedAt: timestamp("completed_at").defaultNow(),
  averageScore: integer("average_score"),
  totalModules: integer("total_modules"),
});

// Platform-wide AI Settings (SuperAdmin configurable)
// Note: API keys are stored as secrets via environment variables, not in DB
// This table only stores the selected provider and model preferences
export const aiSettings = pgTable("ai_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  provider: text("provider").notNull().default("gemini"), // gemini, openai, deepseek
  geminiModel: text("gemini_model").default("gemini-2.5-flash"),
  openaiModel: text("openai_model").default("gpt-4o"),
  deepseekModel: text("deepseek_model").default("deepseek-chat"),
  isActive: boolean("is_active").notNull().default(true),
  // Encrypted API keys stored in database (encrypted with AES-256-GCM)
  geminiApiKey: text("gemini_api_key"),
  openaiApiKey: text("openai_api_key"),
  deepseekApiKey: text("deepseek_api_key"),
  keysUpdatedAt: timestamp("keys_updated_at"),
  updatedAt: timestamp("updated_at").defaultNow(),
  updatedBy: varchar("updated_by"),
});

// AI Usage tracking for billing accountability
export const aiUsage = pgTable("ai_usage", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id"),
  userId: varchar("user_id"),
  endpoint: text("endpoint").notNull(),
  model: text("model").notNull(),
  promptTokens: integer("prompt_tokens").notNull().default(0),
  completionTokens: integer("completion_tokens").notNull().default(0),
  totalTokens: integer("total_tokens").notNull().default(0),
  estimatedCost: decimal("estimated_cost", { precision: 10, scale: 6 }).default("0"),
  requestPayload: jsonb("request_payload"),
  responseStatus: text("response_status").default("success"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ==================== INSERT SCHEMAS FOR MULTI-TENANT TABLES ====================

export const insertOrganizationSchema = createInsertSchema(organizations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertLicensePlanSchema = createInsertSchema(licensePlans).omit({
  id: true,
  createdAt: true,
});

export const insertOrganizationLicenseSchema = createInsertSchema(organizationLicenses).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertOrganizationMembershipSchema = createInsertSchema(organizationMemberships).omit({
  id: true,
  createdAt: true,
});

// ==================== INSERT SCHEMAS FOR EXISTING TABLES ====================

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertGroupSchema = createInsertSchema(groups).omit({
  id: true,
  createdAt: true,
});

export const insertTopicSchema = createInsertSchema(topics).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertUserProgressSchema = createInsertSchema(userProgress).omit({
  id: true,
  createdAt: true,
});

export const insertModuleProgressSchema = createInsertSchema(moduleProgress).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertLeaderboardSchema = createInsertSchema(leaderboard).omit({
  id: true,
  updatedAt: true,
});

export const insertUserStatsSchema = createInsertSchema(userStats).omit({
  id: true,
  updatedAt: true,
});

export const insertCategorySchema = createInsertSchema(categories).omit({
  id: true,
  createdAt: true,
});

export const insertCourseCompletionSchema = createInsertSchema(courseCompletions).omit({
  id: true,
  completedAt: true,
});

export const insertAiUsageSchema = createInsertSchema(aiUsage).omit({
  id: true,
  createdAt: true,
});

export const insertAiSettingsSchema = createInsertSchema(aiSettings).omit({
  id: true,
  updatedAt: true,
});

// ==================== TYPES FOR MULTI-TENANT TABLES ====================

export type InsertOrganization = z.infer<typeof insertOrganizationSchema>;
export type Organization = typeof organizations.$inferSelect;

export type InsertLicensePlan = z.infer<typeof insertLicensePlanSchema>;
export type LicensePlan = typeof licensePlans.$inferSelect;

export type InsertOrganizationLicense = z.infer<typeof insertOrganizationLicenseSchema>;
export type OrganizationLicense = typeof organizationLicenses.$inferSelect;

export type InsertOrganizationMembership = z.infer<typeof insertOrganizationMembershipSchema>;
export type OrganizationMembership = typeof organizationMemberships.$inferSelect;

// ==================== TYPES FOR EXISTING TABLES ====================

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertGroup = z.infer<typeof insertGroupSchema>;
export type Group = typeof groups.$inferSelect;

export type InsertTopic = z.infer<typeof insertTopicSchema>;
export type Topic = typeof topics.$inferSelect;

export type InsertUserProgress = z.infer<typeof insertUserProgressSchema>;
export type UserProgress = typeof userProgress.$inferSelect;

export type InsertModuleProgress = z.infer<typeof insertModuleProgressSchema>;
export type ModuleProgress = typeof moduleProgress.$inferSelect;

export type InsertLeaderboard = z.infer<typeof insertLeaderboardSchema>;
export type Leaderboard = typeof leaderboard.$inferSelect;

export type InsertUserStats = z.infer<typeof insertUserStatsSchema>;
export type UserStats = typeof userStats.$inferSelect;

export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type Category = typeof categories.$inferSelect;

export type InsertCourseCompletion = z.infer<typeof insertCourseCompletionSchema>;
export type CourseCompletion = typeof courseCompletions.$inferSelect;

export type InsertAiUsage = z.infer<typeof insertAiUsageSchema>;
export type AiUsage = typeof aiUsage.$inferSelect;

export type InsertAiSettings = z.infer<typeof insertAiSettingsSchema>;
export type AiSettings = typeof aiSettings.$inferSelect;

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(["SuperAdmin", "OrgAdmin", "Creator", "Learner"]).optional().default("Learner"),
  organizationId: z.string().optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
