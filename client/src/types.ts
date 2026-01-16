export enum TopicStatus {
  Pending = 'Pending',
  Completed = 'Completed',
}

export enum ContentType {
  Paragraph = 'paragraph',
  Video = 'video',
  Document = 'document',
  Image = 'image',
}

export interface ContentBlock {
  type: ContentType;
  content: string;
  title?: string;
  order?: number;
}

export interface ModuleVideo {
  id: string;
  title: string;
  url: string;
  description?: string;
}

export interface CourseModule {
  id: string;
  title: string;
  summary: string;
  learningObjectives: string[];
  contentBlocks: ContentBlock[];
  videos: ModuleVideo[];
  order: number;
}

export interface ModuleProgress {
  moduleId: string;
  status: 'locked' | 'unlocked' | 'in_progress' | 'completed';
  quizScore?: number;
  quizTotal?: number;
  completedAt?: string;
}

export interface Topic {
  id: string;
  title: string;
  category: string;
  authorId: string;
  readTime: number;
  content: ContentBlock[];
  modules?: CourseModule[];
  status: TopicStatus;
  imageUrl: string;
  sharedWith: string[];
  sharedWithUsers?: string[];
  sharedWithDepartments?: string[];
  isSop?: boolean;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswerIndex: number;
}

export type QuizData = QuizQuestion[];

export interface ChatMessage {
  id: string;
  text: string;
  sender: 'user' | 'bot';
}

export enum UserRole {
  Learner = 'Learner',
  Creator = 'Creator',
  Admin = 'Admin',
  OrgAdmin = 'OrgAdmin',
  SuperAdmin = 'SuperAdmin',
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  groupIds: string[];
  password?: string;
  department?: string;
  organizationId?: string;
}

export interface Group {
  id: string;
  name: string;
}

export interface LeaderboardEntry {
  userId: string;
  name: string;
  points: number;
  rank: number;
}
