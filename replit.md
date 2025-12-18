# SkillShots - AI-Powered Learning Management System

## Overview

SkillShots is a modern learning management system designed for corporate training and skills development. The application enables creators to build interactive courses with AI-generated quizzes, allows learners to consume content through an engaging swiper interface, and provides AI-powered assistance through an integrated chatbot. The platform supports Standard Operating Procedures (SOPs), group-based content sharing, and gamified learning through leaderboards.

**Core Purpose:** Facilitate corporate learning through structured courses, AI-enhanced content generation, and social learning features that track progress and encourage engagement.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework:** React 18+ with TypeScript using Vite as the build tool

**UI Component System:** Radix UI primitives with shadcn/ui components styled using Tailwind CSS
- Design system follows Linear/Notion-inspired aesthetics prioritizing clarity and data-first hierarchy
- Custom theming system with CSS variables for light/dark mode support
- Typography hierarchy using Inter font from Google Fonts
- Responsive 12-column grid layout with mobile-first approach

**State Management Strategy:**
- Local component state using React hooks (useState, useEffect, useMemo)
- Global state managed through localStorage for persistence (users, topics, groups, categories, leaderboard, current user)
- TanStack Query (React Query) configured but primarily unused in current implementation
- No centralized state management library - data flows through prop drilling

**Key UI Patterns:**
- Card-based layouts for topic display with hover effects and elevation
- Swiper/carousel pattern for full-screen topic navigation
- Modal dialogs for content creation and editing
- Toast notifications for user feedback
- Tabbed interfaces for multi-section dashboards

### Backend Architecture

**Server Framework:** Express.js with TypeScript running on Node.js

**Routing Strategy:** Single routes file (`server/routes.ts`) handling API endpoints
- Currently implements only AI integration endpoints
- Designed for expansion with additional CRUD operations

**Data Persistence:**
- **Development Mode:** In-memory storage using `MemStorage` class
- **Production Ready:** Drizzle ORM configured for PostgreSQL with schema definitions
- Schema includes users table with UUID primary keys
- Migration system configured via drizzle-kit

**Session Management:** Infrastructure present (connect-pg-simple for PostgreSQL sessions) but not actively used in current authentication flow

**API Integration Pattern:**
- Client-side service layer (`client/src/services/`) encapsulates API calls
- Fetch API used for HTTP requests
- Error handling with try-catch and fallback responses

### AI Integration Layer

**Primary AI Service:** Google Gemini AI via `@google/genai` package

**AI Features Implemented:**
1. **Quiz Generation** (`/api/gemini/generate-quiz`)
   - Multimodal analysis of content blocks (text, images, PDFs)
   - Generates 3-10 multiple-choice questions based on content length
   - Supports inline data (base64) for images and documents
   - Fallback to mock quiz data on API failure

2. **Chatbot Responses** (`/api/gemini/chatbot`)
   - Context-aware responses using system instructions
   - "Thinking mode" toggle for deeper reasoning (uses gemini-2.5-pro vs gemini-2.5-flash)
   - Topic-aware assistance based on user's available courses

3. **Course Generation** (`/api/gemini/generate-course`)
   - Prompt-based course creation from natural language descriptions
   - Generates structured content blocks with 5-8 paragraphs
   - Returns title, category, read time, and content blocks

4. **Video Analysis** (`/api/gemini/analyze-video`)
   - Generates educational summaries based on video title
   - Provides learning objectives, key concepts, and practical takeaways
   - Note: Works from title metadata, not actual video content

5. **Q&A on Topics** (`/api/gemini/ask-question`)
   - Multimodal context analysis including text, images, and PDFs
   - Uses topic content as context for accurate responses
   - Graceful fallback on API errors

**AI Configuration:**
- API key and base URL configured via environment variables
- Centralized service functions in `geminiService.ts`
- Error boundaries with graceful degradation
- **Organization-Level AI Settings:**
  - Organizations can configure their own AI API keys instead of using system keys
  - License plans have an `includesAi` flag to distinguish AI-included vs bring-your-own-AI plans
  - Organizations using their own AI keys bypass token cap limits
  - Encrypted API key storage using crypto service
  - OrgAdmins can configure AI settings via the "AI Settings" tab in their dashboard
  - Supports multiple AI providers: Google Gemini, OpenAI, DeepSeek

### Data Model

**User Entity:**
- ID (UUID), name, email, password (plain text in current implementation)
- Role: Learner or Creator
- Group memberships (array of group IDs)

**Topic/Course Entity:**
- ID, title, category, author ID, read time estimate
- Content blocks array supporting multiple types (paragraph, video, document, image)
- Status: Pending or Completed
- Sharing configuration (group IDs, individual user IDs)
- SOP flag for Standard Operating Procedures
- Image URL for visual representation

**Content Block Types:**
- Paragraph (text content)
- Video (URL with optional title)
- Document (URL reference)
- Image (URL with optional caption)

**Group Entity:**
- ID and name for organizational segmentation

**Leaderboard Entity:**
- User ID, rank, points for gamification

### Authentication & Authorization

**Current Implementation:**
- Simple email/password matching without encryption
- No session management or JWT tokens
- User context passed through props from App component
- Role-based UI rendering (Creator vs Learner views)

**Security Considerations:**
- Passwords stored in plain text (not production-ready)
- No CSRF protection
- No rate limiting on authentication endpoints
- Client-side only authorization checks

### Build & Deployment

**Development Workflow:**
- Vite dev server with HMR on port 5173
- Express server on configurable port
- TypeScript compilation with `tsx` for server
- Path aliases configured (@/, @shared/, @assets/)

**Production Build Process:**
1. Client build via Vite → `dist/public`
2. Server build via esbuild → `dist/index.cjs`
3. Bundling strategy: Allowlist of dependencies bundled, others externalized
4. Static file serving from Express in production

**Environment Configuration:**
- `DATABASE_URL` for PostgreSQL connection
- `AI_INTEGRATIONS_GEMINI_API_KEY` for Gemini AI
- `AI_INTEGRATIONS_GEMINI_BASE_URL` for custom AI endpoints
- `NODE_ENV` for development/production switching

## External Dependencies

### Third-Party UI Libraries
- **Radix UI:** Accessible component primitives (dialogs, dropdowns, tooltips, etc.)
- **shadcn/ui:** Pre-styled component collection built on Radix
- **Tailwind CSS:** Utility-first CSS framework
- **Recharts:** Data visualization for progress charts
- **Embla Carousel:** Touch-friendly carousel/swiper
- **Lucide React:** Icon library

### AI & API Services
- **Google Gemini AI:** Natural language processing, content generation, conversational AI
  - Endpoint: Configurable via `AI_INTEGRATIONS_GEMINI_BASE_URL`
  - Authentication: API key via environment variable
  - Models: Uses latest Gemini models for text generation and analysis

### Database & ORM
- **PostgreSQL:** Relational database (configured but optional with in-memory fallback)
- **Drizzle ORM:** TypeScript-first ORM for database operations
- **drizzle-zod:** Schema validation using Zod

### Utility Libraries
- **date-fns:** Date formatting and manipulation
- **zod:** Runtime type validation and schema definition
- **nanoid:** Unique ID generation
- **clsx + tailwind-merge:** Conditional CSS class composition

### Development Tools
- **Vite:** Frontend build tool and dev server
- **esbuild:** Fast JavaScript bundler for server code
- **TypeScript:** Type safety across frontend and backend
- **@replit/vite-plugin-*:** Replit-specific development plugins

### Session & Security (Configured but unused)
- **express-session:** Session middleware
- **connect-pg-simple:** PostgreSQL session store
- **passport:** Authentication middleware (installed but not implemented)