import { User, Topic, Group, TopicStatus, ContentType, UserRole, LeaderboardEntry } from '../types';

export const INITIAL_GROUPS: Group[] = [
  { id: 'group-1', name: 'Product Team' },
  { id: 'group-2', name: 'Sales Team' },
  { id: 'group-3', name: 'All Employees' },
  { id: 'group-4', name: 'Engineering' },
  { id: 'group-5', name: 'Compliance' },
];

export const INITIAL_CATEGORIES: string[] = [
  'General',
  'Health & Safety',
  'Product Training',
  'Soft Skills',
  'Compliance',
  'Engineering'
];

export const INITIAL_USERS: User[] = [
  {
    id: 'user-1',
    name: 'Alex Ray',
    email: 'alex@example.com',
    role: UserRole.Creator,
    groupIds: ['group-1', 'group-3'],
    password: 'password123'
  },
  {
    id: 'user-2',
    name: 'Sam Doe',
    email: 'sam@example.com',
    role: UserRole.Learner,
    groupIds: ['group-2', 'group-3'],
    password: 'password123'
  }
];

export const INITIAL_TOPICS: Topic[] = [
  {
    id: '1',
    title: 'Workplace Safety Standards 2024',
    category: 'Health & Safety',
    authorId: 'user-1',
    readTime: 5,
    imageUrl: 'https://images.unsplash.com/photo-1598528994503-68d1976a266e?q=80&w=1200',
    content: [
      { type: ContentType.Paragraph, content: 'Safety is our number one priority. This module outlines the updated protocols for 2024, focusing on emergency exits, fire hazards, and proper ergonomic setups.' },
      { type: ContentType.Image, content: 'https://images.unsplash.com/photo-1596524430615-b46475ddff6e?q=80&w=800', title: 'Always keep emergency exits clear of obstructions.' },
      { type: ContentType.Paragraph, content: 'Please review the diagram above. Obstructing these paths is a severe violation of safety code. Additionally, all employees must participate in the bi-annual fire drill.' },
      { type: ContentType.Video, content: 'https://www.youtube.com/embed/dQw4w9WgXcQ', title: 'Fire Safety Demonstration' },
      { type: ContentType.Paragraph, content: 'If you witness a safety violation, please report it immediately to your supervisor or the HR department using the anonymous tip line.' },
    ],
    status: TopicStatus.Pending,
    sharedWith: ['group-3'],
    isSop: true
  },
  {
    id: '2',
    title: 'CRM Software: Advanced Features',
    category: 'Product Training',
    authorId: 'user-2',
    readTime: 12,
    imageUrl: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=1200',
    content: [
      { type: ContentType.Paragraph, content: 'This session dives into the advanced analytics features of "ConnectSphere". We will cover custom report generation and automated lead scoring.' },
      { type: ContentType.Image, content: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=800', title: 'The new Analytics Dashboard view.' },
      { type: ContentType.Paragraph, content: 'As seen in the image, the dashboard now aggregates data in real-time. This allows for faster decision-making during sales calls.' },
    ],
    status: TopicStatus.Pending,
    sharedWith: ['group-2'],
  },
  {
    id: '3',
    title: 'Fusion X Product Launch Details',
    category: 'Product Training',
    authorId: 'user-1',
    readTime: 8,
    imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=1200',
    content: [
      { type: ContentType.Paragraph, content: 'The Fusion X is not just a product; it is a lifestyle revolution. Key selling points include its 48-hour battery life and AI-integrated personal assistant.' },
      { type: ContentType.Paragraph, content: 'Below is the official spec sheet that you can share with potential high-value clients.' },
      { type: ContentType.Image, content: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=800', title: 'Fusion X: Minimalist Design' }
    ],
    status: TopicStatus.Completed,
    sharedWith: ['group-1', 'group-2'],
  },
  {
    id: '4',
    title: 'Effective Remote Communication',
    category: 'Soft Skills',
    authorId: 'user-1',
    readTime: 6,
    imageUrl: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=1200',
    content: [
      { type: ContentType.Paragraph, content: 'Remote work requires a different set of communication skills. Over-communication is better than under-communication when you are not physically present.'},
      { type: ContentType.Paragraph, content: 'Use the right tool for the job: Chat for quick questions, Video for discussions, and Email for formal records.'},
      { type: ContentType.Video, content: 'https://www.youtube.com/embed/dQw4w9WgXcQ', title: 'Remote Work Etiquette' }
    ],
    status: TopicStatus.Pending,
    sharedWith: ['group-3'],
  },
  {
    id: '5',
    title: 'Emergency Incident Reporting SOP',
    category: 'Health & Safety',
    authorId: 'user-1',
    readTime: 3,
    imageUrl: 'https://images.unsplash.com/photo-1598528994503-68d1976a266e?q=80&w=1200',
    content: [
      { type: ContentType.Paragraph, content: 'STEP 1: Immediate Action. Secure the area to prevent further injury.' },
      { type: ContentType.Paragraph, content: 'STEP 2: Notification. Call Emergency Services (911) if necessary. Notify the Safety Officer immediately.' },
      { type: ContentType.Paragraph, content: 'STEP 3: Documentation. Fill out form IR-2024 within 2 hours of the incident.' }
    ],
    status: TopicStatus.Pending,
    sharedWith: ['group-3'],
    isSop: true
  }
];

export const MOCK_LEADERBOARD: LeaderboardEntry[] = [
  { userId: 'user-3', name: 'Sarah Jenkins', points: 1250, rank: 1 },
  { userId: 'user-1', name: 'Alex Ray', points: 950, rank: 2 },
  { userId: 'user-4', name: 'Mike Chen', points: 800, rank: 3 },
  { userId: 'user-2', name: 'Sam Doe', points: 600, rank: 4 },
  { userId: 'user-5', name: 'Emily White', points: 450, rank: 5 },
  { userId: 'user-6', name: 'David Kim', points: 300, rank: 6 },
];
