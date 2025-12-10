import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull().default("Learner"),
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
  completedAt: timestamp("completed_at").defaultNow(),
  averageScore: integer("average_score"),
  totalModules: integer("total_modules"),
});

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

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(["Learner", "Creator", "Admin"]).optional().default("Learner"),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
