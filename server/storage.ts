import { db } from "./db";
import { eq, and, inArray, desc, sql, isNull } from "drizzle-orm";
import {
  users,
  groups,
  topics,
  userProgress,
  userStats,
  leaderboard,
  categories,
  moduleProgress,
  courseCompletions,
  organizations,
  licensePlans,
  organizationLicenses,
  organizationMemberships,
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
  type ModuleProgress,
  type InsertModuleProgress,
  type CourseCompletion,
  type InsertCourseCompletion,
  type Organization,
  type InsertOrganization,
  type LicensePlan,
  type InsertLicensePlan,
  type OrganizationLicense,
  type InsertOrganizationLicense,
  type OrganizationMembership,
  type InsertOrganizationMembership,
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
  
  getModuleProgress(userId: string, topicId: string, moduleId: string): Promise<ModuleProgress | undefined>;
  getModuleProgressForTopic(userId: string, topicId: string): Promise<ModuleProgress[]>;
  createOrUpdateModuleProgress(progress: InsertModuleProgress): Promise<ModuleProgress>;
  
  getAnalyticsOverview(): Promise<AnalyticsOverview>;
  getCourseAnalytics(): Promise<CourseAnalytics[]>;
  getUserAnalytics(): Promise<UserAnalytics[]>;
  getCourseUserProgress(topicId: string): Promise<CourseUserProgress[]>;
  getUserCourseProgress(userId: string): Promise<UserCourseProgress[]>;
  getAllModuleProgress(): Promise<ModuleProgress[]>;
  
  getCourseCompletion(userId: string, topicId: string): Promise<CourseCompletion | undefined>;
  getUserCourseCompletions(userId: string): Promise<CourseCompletion[]>;
  getAllCourseCompletions(): Promise<CourseCompletion[]>;
  createCourseCompletion(completion: InsertCourseCompletion): Promise<CourseCompletion>;
  checkAndRecordCourseCompletion(userId: string, topicId: string): Promise<{ completed: boolean; completion?: CourseCompletion; isNew?: boolean }>;
  
  hashPassword(password: string): Promise<string>;
  comparePassword(password: string, hash: string): Promise<boolean>;
  
  // Organization management
  getOrganization(id: string): Promise<Organization | undefined>;
  getOrganizationBySlug(slug: string): Promise<Organization | undefined>;
  getAllOrganizations(): Promise<Organization[]>;
  createOrganization(org: InsertOrganization): Promise<Organization>;
  updateOrganization(id: string, data: Partial<InsertOrganization>): Promise<Organization | undefined>;
  deleteOrganization(id: string): Promise<boolean>;
  
  // License plan management
  getLicensePlan(id: string): Promise<LicensePlan | undefined>;
  getAllLicensePlans(): Promise<LicensePlan[]>;
  createLicensePlan(plan: InsertLicensePlan): Promise<LicensePlan>;
  updateLicensePlan(id: string, data: Partial<InsertLicensePlan>): Promise<LicensePlan | undefined>;
  deleteLicensePlan(id: string): Promise<boolean>;
  
  // Organization license management
  getOrganizationLicense(organizationId: string): Promise<OrganizationLicense | undefined>;
  createOrganizationLicense(license: InsertOrganizationLicense): Promise<OrganizationLicense>;
  updateOrganizationLicense(id: string, data: Partial<InsertOrganizationLicense>): Promise<OrganizationLicense | undefined>;
  checkLicenseLimits(organizationId: string): Promise<{ withinLimits: boolean; limits: LicensePlan | null; usage: OrganizationLicense | null }>;
  
  // Organization membership management
  getOrganizationMembership(userId: string, organizationId: string): Promise<OrganizationMembership | undefined>;
  getOrganizationMembers(organizationId: string): Promise<OrganizationMembership[]>;
  getUserOrganizations(userId: string): Promise<OrganizationMembership[]>;
  createOrganizationMembership(membership: InsertOrganizationMembership): Promise<OrganizationMembership>;
  updateOrganizationMembership(id: string, data: Partial<InsertOrganizationMembership>): Promise<OrganizationMembership | undefined>;
  removeOrganizationMembership(userId: string, organizationId: string): Promise<boolean>;
  
  // Organization-scoped queries
  getUsersByOrganization(organizationId: string): Promise<User[]>;
  getTopicsByOrganization(organizationId: string): Promise<Topic[]>;
}

export interface AnalyticsOverview {
  totalUsers: number;
  totalCourses: number;
  totalEnrollments: number;
  averageCompletionRate: number;
  averageQuizScore: number;
  activeUsersLast7Days: number;
}

export interface CourseAnalytics {
  topicId: string;
  topicTitle: string;
  enrolledUsers: number;
  completedUsers: number;
  inProgressUsers: number;
  completionRate: number;
  averageQuizScore: number;
  moduleCount: number;
}

export interface UserAnalytics {
  userId: string;
  userName: string;
  userEmail: string;
  coursesEnrolled: number;
  coursesCompleted: number;
  averageQuizScore: number;
  lastActiveDate: Date | null;
}

export interface CourseUserProgress {
  userId: string;
  userName: string;
  userEmail: string;
  modulesCompleted: number;
  totalModules: number;
  lastQuizScore: number | null;
  status: string;
  lastActivityDate: Date | null;
}

export interface UserCourseProgress {
  topicId: string;
  topicTitle: string;
  modulesCompleted: number;
  totalModules: number;
  averageQuizScore: number;
  status: string;
  lastActivityDate: Date | null;
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

  async getModuleProgress(userId: string, topicId: string, moduleId: string): Promise<ModuleProgress | undefined> {
    const result = await db.select().from(moduleProgress)
      .where(and(
        eq(moduleProgress.userId, userId),
        eq(moduleProgress.topicId, topicId),
        eq(moduleProgress.moduleId, moduleId)
      ))
      .limit(1);
    return result[0];
  }

  async getModuleProgressForTopic(userId: string, topicId: string): Promise<ModuleProgress[]> {
    return db.select().from(moduleProgress)
      .where(and(
        eq(moduleProgress.userId, userId),
        eq(moduleProgress.topicId, topicId)
      ));
  }

  async createOrUpdateModuleProgress(progress: InsertModuleProgress): Promise<ModuleProgress> {
    const existing = await this.getModuleProgress(progress.userId, progress.topicId, progress.moduleId);
    if (existing) {
      const result = await db.update(moduleProgress).set({
        ...progress,
        updatedAt: new Date(),
      }).where(eq(moduleProgress.id, existing.id)).returning();
      return result[0];
    }
    const result = await db.insert(moduleProgress).values(progress).returning();
    return result[0];
  }

  async getAllModuleProgress(): Promise<ModuleProgress[]> {
    return db.select().from(moduleProgress);
  }

  async getAnalyticsOverview(): Promise<AnalyticsOverview> {
    const allUsers = await db.select().from(users);
    const allTopics = await db.select().from(topics);
    const allProgress = await db.select().from(moduleProgress);
    const allUserStats = await db.select().from(userStats);
    
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const activeUsers = allUserStats.filter(s => 
      s.lastActiveDate && new Date(s.lastActiveDate) >= sevenDaysAgo
    ).length;
    
    const uniqueEnrollments = new Set(allProgress.map(p => `${p.userId}-${p.topicId}`)).size;
    
    const completedProgress = allProgress.filter(p => p.status === 'completed');
    const avgQuizScore = completedProgress.length > 0
      ? completedProgress.reduce((sum, p) => sum + (p.quizScore || 0), 0) / completedProgress.length
      : 0;
    
    const userTopicProgress: { [key: string]: { completed: number; total: number } } = {};
    allProgress.forEach(p => {
      const key = `${p.userId}-${p.topicId}`;
      if (!userTopicProgress[key]) {
        userTopicProgress[key] = { completed: 0, total: 0 };
      }
      userTopicProgress[key].total++;
      if (p.status === 'completed') {
        userTopicProgress[key].completed++;
      }
    });
    
    const completionRates = Object.values(userTopicProgress).map(v => 
      v.total > 0 ? (v.completed / v.total) * 100 : 0
    );
    const avgCompletionRate = completionRates.length > 0
      ? completionRates.reduce((a, b) => a + b, 0) / completionRates.length
      : 0;

    return {
      totalUsers: allUsers.filter(u => u.role === 'Learner').length,
      totalCourses: allTopics.length,
      totalEnrollments: uniqueEnrollments,
      averageCompletionRate: Math.round(avgCompletionRate),
      averageQuizScore: Math.round(avgQuizScore),
      activeUsersLast7Days: activeUsers,
    };
  }

  async getCourseAnalytics(): Promise<CourseAnalytics[]> {
    const allTopics = await db.select().from(topics);
    const allProgress = await db.select().from(moduleProgress);
    
    return allTopics.map(topic => {
      const topicProgress = allProgress.filter(p => p.topicId === topic.id);
      const userIds = Array.from(new Set(topicProgress.map(p => p.userId)));
      
      const modules = (topic.modules as any[]) || [];
      const moduleCount = modules.length;
      
      let completedUsers = 0;
      let inProgressUsers = 0;
      
      userIds.forEach(userId => {
        const userModuleProgress = topicProgress.filter(p => p.userId === userId);
        const completedModules = userModuleProgress.filter(p => p.status === 'completed').length;
        
        if (completedModules === moduleCount && moduleCount > 0) {
          completedUsers++;
        } else if (completedModules > 0) {
          inProgressUsers++;
        }
      });
      
      const completionRate = userIds.length > 0 
        ? Math.round((completedUsers / userIds.length) * 100) 
        : 0;
      
      const scoresWithValues = topicProgress.filter(p => p.quizScore !== null && p.quizTotal !== null);
      const avgScore = scoresWithValues.length > 0
        ? Math.round(scoresWithValues.reduce((sum, p) => sum + ((p.quizScore! / p.quizTotal!) * 100), 0) / scoresWithValues.length)
        : 0;
      
      return {
        topicId: topic.id,
        topicTitle: topic.title,
        enrolledUsers: userIds.length,
        completedUsers,
        inProgressUsers,
        completionRate,
        averageQuizScore: avgScore,
        moduleCount,
      };
    });
  }

  async getUserAnalytics(): Promise<UserAnalytics[]> {
    const allUsers = await db.select().from(users);
    const allProgress = await db.select().from(moduleProgress);
    const allUserStats = await db.select().from(userStats);
    const allTopics = await db.select().from(topics);
    
    return allUsers
      .filter(u => u.role === 'Learner')
      .map(user => {
        const userProgress = allProgress.filter(p => p.userId === user.id);
        const userStat = allUserStats.find(s => s.userId === user.id);
        
        const topicIds = Array.from(new Set(userProgress.map(p => p.topicId)));
        
        let coursesCompleted = 0;
        topicIds.forEach(topicId => {
          const topic = allTopics.find(t => t.id === topicId);
          const modules = (topic?.modules as any[]) || [];
          const moduleCount = modules.length;
          const completedModules = userProgress.filter(
            p => p.topicId === topicId && p.status === 'completed'
          ).length;
          
          if (completedModules === moduleCount && moduleCount > 0) {
            coursesCompleted++;
          }
        });
        
        const scoresWithValues = userProgress.filter(p => p.quizScore !== null && p.quizTotal !== null);
        const avgScore = scoresWithValues.length > 0
          ? Math.round(scoresWithValues.reduce((sum, p) => sum + ((p.quizScore! / p.quizTotal!) * 100), 0) / scoresWithValues.length)
          : 0;
        
        return {
          userId: user.id,
          userName: user.name,
          userEmail: user.email,
          coursesEnrolled: topicIds.length,
          coursesCompleted,
          averageQuizScore: avgScore,
          lastActiveDate: userStat?.lastActiveDate || null,
        };
      });
  }

  async getCourseUserProgress(topicId: string): Promise<CourseUserProgress[]> {
    const topic = await this.getTopic(topicId);
    if (!topic) return [];
    
    const allUsers = await db.select().from(users);
    const topicProgress = await db.select().from(moduleProgress).where(eq(moduleProgress.topicId, topicId));
    
    const modules = (topic.modules as any[]) || [];
    const totalModules = modules.length;
    
    const userIds = Array.from(new Set(topicProgress.map(p => p.userId)));
    
    return userIds.map(userId => {
      const user = allUsers.find(u => u.id === userId);
      const userModuleProgress = topicProgress.filter(p => p.userId === userId);
      const completedModules = userModuleProgress.filter(p => p.status === 'completed').length;
      
      const latestProgress = userModuleProgress.sort((a, b) => 
        new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime()
      )[0];
      
      let status = 'Not Started';
      if (completedModules === totalModules && totalModules > 0) {
        status = 'Completed';
      } else if (completedModules > 0) {
        status = 'In Progress';
      }
      
      return {
        userId,
        userName: user?.name || 'Unknown',
        userEmail: user?.email || '',
        modulesCompleted: completedModules,
        totalModules,
        lastQuizScore: latestProgress?.quizScore || null,
        status,
        lastActivityDate: latestProgress?.updatedAt || null,
      };
    });
  }

  async getUserCourseProgress(userId: string): Promise<UserCourseProgress[]> {
    const allTopics = await db.select().from(topics);
    const userProgress = await db.select().from(moduleProgress).where(eq(moduleProgress.userId, userId));
    
    const topicIds = Array.from(new Set(userProgress.map(p => p.topicId)));
    
    return topicIds.map(topicId => {
      const topic = allTopics.find(t => t.id === topicId);
      const modules = (topic?.modules as any[]) || [];
      const totalModules = modules.length;
      
      const topicModuleProgress = userProgress.filter(p => p.topicId === topicId);
      const completedModules = topicModuleProgress.filter(p => p.status === 'completed').length;
      
      const scoresWithValues = topicModuleProgress.filter(p => p.quizScore !== null && p.quizTotal !== null);
      const avgScore = scoresWithValues.length > 0
        ? Math.round(scoresWithValues.reduce((sum, p) => sum + ((p.quizScore! / p.quizTotal!) * 100), 0) / scoresWithValues.length)
        : 0;
      
      const latestProgress = topicModuleProgress.sort((a, b) => 
        new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime()
      )[0];
      
      let status = 'Not Started';
      if (completedModules === totalModules && totalModules > 0) {
        status = 'Completed';
      } else if (completedModules > 0) {
        status = 'In Progress';
      }
      
      return {
        topicId,
        topicTitle: topic?.title || 'Unknown Course',
        modulesCompleted: completedModules,
        totalModules,
        averageQuizScore: avgScore,
        status,
        lastActivityDate: latestProgress?.updatedAt || null,
      };
    });
  }

  async getCourseCompletion(userId: string, topicId: string): Promise<CourseCompletion | undefined> {
    const result = await db.select().from(courseCompletions)
      .where(and(
        eq(courseCompletions.userId, userId),
        eq(courseCompletions.topicId, topicId)
      ))
      .limit(1);
    return result[0];
  }

  async getUserCourseCompletions(userId: string): Promise<CourseCompletion[]> {
    return db.select().from(courseCompletions)
      .where(eq(courseCompletions.userId, userId))
      .orderBy(desc(courseCompletions.completedAt));
  }

  async getAllCourseCompletions(): Promise<CourseCompletion[]> {
    return db.select().from(courseCompletions)
      .orderBy(desc(courseCompletions.completedAt));
  }

  async createCourseCompletion(completion: InsertCourseCompletion): Promise<CourseCompletion> {
    const result = await db.insert(courseCompletions).values(completion).returning();
    return result[0];
  }

  async checkAndRecordCourseCompletion(userId: string, topicId: string): Promise<{ completed: boolean; completion?: CourseCompletion; isNew?: boolean }> {
    const existing = await this.getCourseCompletion(userId, topicId);
    if (existing) {
      return { completed: true, completion: existing, isNew: false };
    }

    const topic = await this.getTopic(topicId);
    if (!topic) {
      return { completed: false };
    }

    const modules = (topic.modules as any[]) || [];
    const totalModules = modules.length;
    
    if (totalModules === 0) {
      return { completed: false };
    }

    const moduleProgressList = await this.getModuleProgressForTopic(userId, topicId);
    const completedModules = moduleProgressList.filter(mp => {
      if (mp.status !== 'completed') return false;
      if (mp.quizScore === null || mp.quizTotal === null) return false;
      const percentage = (mp.quizScore / mp.quizTotal) * 100;
      return percentage >= 90;
    });

    if (completedModules.length >= totalModules) {
      const avgScore = completedModules.length > 0
        ? Math.round(completedModules.reduce((sum, mp) => sum + ((mp.quizScore! / mp.quizTotal!) * 100), 0) / completedModules.length)
        : 0;

      const completion = await this.createCourseCompletion({
        userId,
        topicId,
        averageScore: avgScore,
        totalModules,
      });

      await this.updateLeaderboardPoints(userId, 100);

      return { completed: true, completion, isNew: true };
    }

    return { completed: false };
  }

  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, SALT_ROUNDS);
  }

  async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  // ==================== ORGANIZATION MANAGEMENT ====================

  async getOrganization(id: string): Promise<Organization | undefined> {
    const result = await db.select().from(organizations).where(eq(organizations.id, id)).limit(1);
    return result[0];
  }

  async getOrganizationBySlug(slug: string): Promise<Organization | undefined> {
    const result = await db.select().from(organizations).where(eq(organizations.slug, slug)).limit(1);
    return result[0];
  }

  async getAllOrganizations(): Promise<Organization[]> {
    return db.select().from(organizations).orderBy(desc(organizations.createdAt));
  }

  async createOrganization(org: InsertOrganization): Promise<Organization> {
    const result = await db.insert(organizations).values(org).returning();
    return result[0];
  }

  async updateOrganization(id: string, data: Partial<InsertOrganization>): Promise<Organization | undefined> {
    const result = await db.update(organizations)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(organizations.id, id))
      .returning();
    return result[0];
  }

  async deleteOrganization(id: string): Promise<boolean> {
    const result = await db.delete(organizations).where(eq(organizations.id, id)).returning();
    return result.length > 0;
  }

  // ==================== LICENSE PLAN MANAGEMENT ====================

  async getLicensePlan(id: string): Promise<LicensePlan | undefined> {
    const result = await db.select().from(licensePlans).where(eq(licensePlans.id, id)).limit(1);
    return result[0];
  }

  async getAllLicensePlans(): Promise<LicensePlan[]> {
    return db.select().from(licensePlans).where(eq(licensePlans.isActive, true));
  }

  async createLicensePlan(plan: InsertLicensePlan): Promise<LicensePlan> {
    const result = await db.insert(licensePlans).values(plan).returning();
    return result[0];
  }

  async updateLicensePlan(id: string, data: Partial<InsertLicensePlan>): Promise<LicensePlan | undefined> {
    const result = await db.update(licensePlans)
      .set(data)
      .where(eq(licensePlans.id, id))
      .returning();
    return result[0];
  }

  async deleteLicensePlan(id: string): Promise<boolean> {
    const result = await db.delete(licensePlans)
      .where(eq(licensePlans.id, id))
      .returning();
    return result.length > 0;
  }

  // ==================== ORGANIZATION LICENSE MANAGEMENT ====================

  async getOrganizationLicense(organizationId: string): Promise<OrganizationLicense | undefined> {
    const result = await db.select().from(organizationLicenses)
      .where(eq(organizationLicenses.organizationId, organizationId))
      .limit(1);
    return result[0];
  }

  async createOrganizationLicense(license: InsertOrganizationLicense): Promise<OrganizationLicense> {
    const result = await db.insert(organizationLicenses).values(license).returning();
    return result[0];
  }

  async updateOrganizationLicense(id: string, data: Partial<InsertOrganizationLicense>): Promise<OrganizationLicense | undefined> {
    const result = await db.update(organizationLicenses)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(organizationLicenses.id, id))
      .returning();
    return result[0];
  }

  async checkLicenseLimits(organizationId: string): Promise<{ withinLimits: boolean; limits: LicensePlan | null; usage: OrganizationLicense | null }> {
    const license = await this.getOrganizationLicense(organizationId);
    if (!license) {
      return { withinLimits: false, limits: null, usage: null };
    }

    const plan = await this.getLicensePlan(license.planId);
    if (!plan) {
      return { withinLimits: false, limits: null, usage: license };
    }

    const withinLimits = 
      license.currentUsers < plan.maxUsers &&
      license.currentCreators < plan.maxCreators &&
      license.currentCourses < plan.maxCourses;

    return { withinLimits, limits: plan, usage: license };
  }

  // ==================== ORGANIZATION MEMBERSHIP MANAGEMENT ====================

  async getOrganizationMembership(userId: string, organizationId: string): Promise<OrganizationMembership | undefined> {
    const result = await db.select().from(organizationMemberships)
      .where(and(
        eq(organizationMemberships.userId, userId),
        eq(organizationMemberships.organizationId, organizationId)
      ))
      .limit(1);
    return result[0];
  }

  async getOrganizationMembers(organizationId: string): Promise<OrganizationMembership[]> {
    return db.select().from(organizationMemberships)
      .where(and(
        eq(organizationMemberships.organizationId, organizationId),
        eq(organizationMemberships.isActive, true)
      ));
  }

  async getUserOrganizations(userId: string): Promise<OrganizationMembership[]> {
    return db.select().from(organizationMemberships)
      .where(and(
        eq(organizationMemberships.userId, userId),
        eq(organizationMemberships.isActive, true)
      ));
  }

  async createOrganizationMembership(membership: InsertOrganizationMembership): Promise<OrganizationMembership> {
    const result = await db.insert(organizationMemberships).values(membership).returning();
    
    // Update license usage counts
    const license = await this.getOrganizationLicense(membership.organizationId);
    if (license) {
      const updateData: Partial<InsertOrganizationLicense> = {
        currentUsers: license.currentUsers + 1,
      };
      if (membership.role === 'Creator') {
        updateData.currentCreators = license.currentCreators + 1;
      }
      await this.updateOrganizationLicense(license.id, updateData);
    }
    
    return result[0];
  }

  async updateOrganizationMembership(id: string, data: Partial<InsertOrganizationMembership>): Promise<OrganizationMembership | undefined> {
    const result = await db.update(organizationMemberships)
      .set(data)
      .where(eq(organizationMemberships.id, id))
      .returning();
    return result[0];
  }

  async removeOrganizationMembership(userId: string, organizationId: string): Promise<boolean> {
    const membership = await this.getOrganizationMembership(userId, organizationId);
    if (!membership) return false;

    const result = await db.update(organizationMemberships)
      .set({ isActive: false })
      .where(eq(organizationMemberships.id, membership.id))
      .returning();

    // Update license usage counts
    if (result.length > 0) {
      const license = await this.getOrganizationLicense(organizationId);
      if (license) {
        const updateData: Partial<InsertOrganizationLicense> = {
          currentUsers: Math.max(0, license.currentUsers - 1),
        };
        if (membership.role === 'Creator') {
          updateData.currentCreators = Math.max(0, license.currentCreators - 1);
        }
        await this.updateOrganizationLicense(license.id, updateData);
      }
    }

    return result.length > 0;
  }

  // ==================== ORGANIZATION-SCOPED QUERIES ====================

  async getUsersByOrganization(organizationId: string): Promise<User[]> {
    return db.select().from(users).where(eq(users.organizationId, organizationId));
  }

  async getTopicsByOrganization(organizationId: string): Promise<Topic[]> {
    return db.select().from(topics).where(eq(topics.organizationId, organizationId));
  }
}

export const storage = new DatabaseStorage();
