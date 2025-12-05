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

export interface Topic {
  id: string;
  title: string;
  category: string;
  authorId: string;
  readTime: number;
  content: ContentBlock[];
  status: TopicStatus;
  imageUrl: string;
  sharedWith: string[];
  sharedWithUsers?: string[];
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
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  groupIds: string[];
  password?: string;
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
