import { db } from "./db";
import { eq, and, inArray, desc, sql } from "drizzle-orm";
import {
  users,
  groups,
  topics,
  userProgress,
  userStats,
  leaderboard,
  categories,
  type User,
  type InsertUser,
  type Group,
  type InsertGroup,
  type Topic,
  type InsertTopic,
  type UserProgress,
  type InsertUserProgress,
  type UserStats,
  type InsertUserStats,
  type Leaderboard,
  type InsertLeaderboard,
  type Category,
  type InsertCategory,
} from "@shared/schema";
import bcrypt from "bcrypt";

const SALT_ROUNDS = 10;

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, data: Partial<InsertUser>): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  
  getGroup(id: string): Promise<Group | undefined>;
  getAllGroups(): Promise<Group[]>;
  createGroup(group: InsertGroup): Promise<Group>;
  deleteGroup(id: string): Promise<boolean>;
  deleteUser(id: string): Promise<boolean>;
  
  getTopic(id: string): Promise<Topic | undefined>;
  getTopicsByAuthor(authorId: string): Promise<Topic[]>;
  getTopicsForUser(userId: string, groupIds: string[]): Promise<Topic[]>;
  getAllTopics(): Promise<Topic[]>;
  createTopic(topic: InsertTopic): Promise<Topic>;
  updateTopic(id: string, data: Partial<InsertTopic>): Promise<Topic | undefined>;
  deleteTopic(id: string): Promise<boolean>;
  
  getUserProgress(userId: string, topicId: string): Promise<UserProgress | undefined>;
  getUserProgressAll(userId: string): Promise<UserProgress[]>;
  createOrUpdateProgress(progress: InsertUserProgress): Promise<UserProgress>;
  
  getLeaderboard(): Promise<Leaderboard[]>;
  updateLeaderboardPoints(userId: string, points: number): Promise<Leaderboard>;
  
  getCategories(): Promise<Category[]>;
  createCategory(category: InsertCategory): Promise<Category>;
  deleteCategory(name: string): Promise<boolean>;
  
  getUserStats(userId: string): Promise<UserStats | undefined>;
  updateUserStats(userId: string, data: Partial<InsertUserStats>): Promise<UserStats>;
  recordActivity(userId: string): Promise<UserStats>;
  
  hashPassword(password: string): Promise<string>;
  comparePassword(password: string, hash: string): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
    return result[0];
  }

  async createUser(user: InsertUser): Promise<User> {
    const hashedPassword = await this.hashPassword(user.password);
    const result = await db.insert(users).values({
      ...user,
      password: hashedPassword,
    }).returning();
    return result[0];
  }

  async updateUser(id: string, data: Partial<InsertUser>): Promise<User | undefined> {
    if (data.password) {
      data.password = await this.hashPassword(data.password);
    }
    const result = await db.update(users).set(data).where(eq(users.id, id)).returning();
    return result[0];
  }

  async getAllUsers(): Promise<User[]> {
    return db.select().from(users);
  }

  async getGroup(id: string): Promise<Group | undefined> {
    const result = await db.select().from(groups).where(eq(groups.id, id)).limit(1);
    return result[0];
  }

  async getAllGroups(): Promise<Group[]> {
    return db.select().from(groups);
  }

  async createGroup(group: InsertGroup): Promise<Group> {
    const result = await db.insert(groups).values(group).returning();
    return result[0];
  }

  async deleteGroup(id: string): Promise<boolean> {
    const result = await db.delete(groups).where(eq(groups.id, id)).returning();
    return result.length > 0;
  }

  async deleteUser(id: string): Promise<boolean> {
    const result = await db.delete(users).where(eq(users.id, id)).returning();
    return result.length > 0;
  }

  async getTopic(id: string): Promise<Topic | undefined> {
    const result = await db.select().from(topics).where(eq(topics.id, id)).limit(1);
    return result[0];
  }

  async getTopicsByAuthor(authorId: string): Promise<Topic[]> {
    return db.select().from(topics).where(eq(topics.authorId, authorId));
  }

  async getTopicsForUser(userId: string, groupIds: string[]): Promise<Topic[]> {
    return db.select().from(topics);
  }

  async getAllTopics(): Promise<Topic[]> {
    return db.select().from(topics);
  }

  async createTopic(topic: InsertTopic): Promise<Topic> {
    const result = await db.insert(topics).values(topic).returning();
    return result[0];
  }

  async updateTopic(id: string, data: Partial<InsertTopic>): Promise<Topic | undefined> {
    const result = await db.update(topics).set({
      ...data,
      updatedAt: new Date(),
    }).where(eq(topics.id, id)).returning();
    return result[0];
  }

  async deleteTopic(id: string): Promise<boolean> {
    const result = await db.delete(topics).where(eq(topics.id, id)).returning();
    return result.length > 0;
  }

  async getUserProgress(userId: string, topicId: string): Promise<UserProgress | undefined> {
    const result = await db.select().from(userProgress)
      .where(and(eq(userProgress.userId, userId), eq(userProgress.topicId, topicId)))
      .limit(1);
    return result[0];
  }

  async getUserProgressAll(userId: string): Promise<UserProgress[]> {
    return db.select().from(userProgress).where(eq(userProgress.userId, userId));
  }

  async createOrUpdateProgress(progress: InsertUserProgress): Promise<UserProgress> {
    const existing = await this.getUserProgress(progress.userId, progress.topicId);
    if (existing) {
      const result = await db.update(userProgress).set({
        ...progress,
        completedAt: progress.status === "Completed" ? new Date() : null,
      }).where(eq(userProgress.id, existing.id)).returning();
      return result[0];
    }
    const result = await db.insert(userProgress).values({
      ...progress,
      completedAt: progress.status === "Completed" ? new Date() : null,
    }).returning();
    return result[0];
  }

  async getLeaderboard(): Promise<Leaderboard[]> {
    return db.select().from(leaderboard).orderBy(desc(leaderboard.points));
  }

  async updateLeaderboardPoints(userId: string, points: number): Promise<Leaderboard> {
    const existing = await db.select().from(leaderboard)
      .where(eq(leaderboard.userId, userId)).limit(1);
    
    if (existing[0]) {
      const result = await db.update(leaderboard).set({
        points: existing[0].points + points,
        updatedAt: new Date(),
      }).where(eq(leaderboard.userId, userId)).returning();
      return result[0];
    }
    
    const result = await db.insert(leaderboard).values({
      userId,
      points,
    }).returning();
    return result[0];
  }

  async getCategories(): Promise<Category[]> {
    return db.select().from(categories);
  }

  async createCategory(category: InsertCategory): Promise<Category> {
    const result = await db.insert(categories).values(category).returning();
    return result[0];
  }

  async deleteCategory(name: string): Promise<boolean> {
    const result = await db.delete(categories).where(eq(categories.name, name)).returning();
    return result.length > 0;
  }

  async getUserStats(userId: string): Promise<UserStats | undefined> {
    const result = await db.select().from(userStats)
      .where(eq(userStats.userId, userId)).limit(1);
    return result[0];
  }

  async updateUserStats(userId: string, data: Partial<InsertUserStats>): Promise<UserStats> {
    const existing = await this.getUserStats(userId);
    if (existing) {
      const result = await db.update(userStats).set({
        ...data,
        updatedAt: new Date(),
      }).where(eq(userStats.userId, userId)).returning();
      return result[0];
    }
    const result = await db.insert(userStats).values({
      userId,
      ...data,
    }).returning();
    return result[0];
  }

  async recordActivity(userId: string): Promise<UserStats> {
    const existing = await this.getUserStats(userId);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (!existing) {
      const result = await db.insert(userStats).values({
        userId,
        currentStreak: 1,
        longestStreak: 1,
        lastActiveDate: new Date(),
      }).returning();
      return result[0];
    }
    
    const lastActive = existing.lastActiveDate ? new Date(existing.lastActiveDate) : null;
    if (lastActive) {
      lastActive.setHours(0, 0, 0, 0);
    }
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    let newStreak = existing.currentStreak;
    if (!lastActive || lastActive < yesterday) {
      newStreak = 1;
    } else if (lastActive.getTime() === yesterday.getTime()) {
      newStreak = existing.currentStreak + 1;
    }
    
    const longestStreak = Math.max(newStreak, existing.longestStreak);
    
    const result = await db.update(userStats).set({
      currentStreak: newStreak,
      longestStreak,
      lastActiveDate: new Date(),
      updatedAt: new Date(),
    }).where(eq(userStats.userId, userId)).returning();
    return result[0];
  }

  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, SALT_ROUNDS);
  }

  async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }
}

export const storage = new DatabaseStorage();
