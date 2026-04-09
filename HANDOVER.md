# SkillShots — Handover Guide

A plain-English walkthrough of what the product does, how everything is set up, and what you need to know to keep it running or hand it to a developer.

---

## What Is SkillShots?

SkillShots is a multi-tenant Learning Management System (LMS) built for companies. Each company is an **Organisation**. Inside each organisation, content creators build courses and SOPs, learners consume them, and admins manage everything.

### Roles

| Role | What they can do |
|---|---|
| **SuperAdmin** | Sees and manages all organisations. Creates orgs, sets licence limits, manages billing plans. |
| **OrgAdmin** | Manages one organisation. Adds/removes users, creates departments, sets AI keys, views reports. |
| **Creator** | Builds courses, uploads documents/videos, creates quizzes, shares content. |
| **Learner** | Views courses assigned to them, takes quizzes, earns points on the leaderboard. |

---

## Test Login Credentials

| Who | Email | Password |
|---|---|---|
| SuperAdmin | superadmin@skillshots.com | superadmin123 |
| OrgAdmin (Just Signs) | hp@justsigns.co.in | (set by Hitesh) |
| OrgAdmin (JustSigns dev) | admin@justsigns.com | (set by admin) |
| Learner | deepak@plus91inc.in | (set by Deepak) |

---

## How to Create an Organisation (SuperAdmin only)

1. Log in as SuperAdmin.
2. Go to the **Organisations** tab in the SuperAdmin dashboard.
3. Click **Add Organisation** and fill in name, slug (URL-friendly name), and optional description.
4. Assign a **Licence Plan** — this controls how many courses are allowed and whether AI is included.
5. The org is now live. Add an OrgAdmin by clicking the org → Members → Invite.

---

## How to Create a User

**As OrgAdmin:**
1. Log in → go to **Users** tab in your dashboard.
2. Click **Add User** → fill in name, email, role (Learner or Creator), and optional department.
3. A temporary password is generated and emailed to the user (requires SES to be configured — see Integrations below).
4. The user logs in and should change their password.

**As SuperAdmin:**
- You can also create OrgAdmins from the Organisation detail panel.

---

## How to Create a Course (Creator or OrgAdmin)

1. Log in as a Creator or OrgAdmin.
2. Click **Create Course** (or the + button).
3. Fill in:
   - **Title** and **Category**
   - **Cover image** (Unsplash URL or upload)
   - **Modules** — each module can have:
     - Content blocks (paragraphs, images, videos, PDF documents)
     - Learning objectives
     - A summary
4. Optionally let AI generate a course from a text prompt (Gemini key required).
5. Set **sharing**: All employees, specific departments, specific groups, or specific users.
6. Mark as **SOP** if this is a Standard Operating Procedure (shows in a separate tab for learners).
7. Save. Learners who match the sharing rules will see it immediately.

---

## How Quizzes Work

- Each module can have an AI-generated quiz.
- Click **Generate Quiz** inside a module — it reads the module's content blocks and produces multiple-choice questions using Gemini AI.
- Learners must complete the quiz to mark a module as done.
- Scores feed into the **Leaderboard** (points per correct answer).

---

## Integrations & Environment Variables

All secrets are stored as **Replit Secrets** (not in any file). A developer picking this up should set the same secrets in whatever hosting environment they use.

### Required Secrets

| Secret Name | What it's for |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string (e.g. `postgresql://user:pass@host/db`) |
| `SESSION_SECRET` | Random string used to sign login sessions. Set to something long and random. |

### Email (AWS SES — ap-south-1)

Sends welcome emails with temporary passwords, and password reset emails.

| Secret Name | What it's for |
|---|---|
| `SES_SMTP_USERNAME` | The SMTP username from AWS SES (looks like `AKIA...`) |
| `SES_SMTP_PASSWORD` | The SMTP password from AWS SES |

- SMTP host is hardcoded to `email-smtp.ap-south-1.amazonaws.com` (Mumbai region).
- From address is hardcoded to `noreply@skillshots.in` — this domain must be verified in SES.
- File: `server/services/emailService.ts`

### AI — Google Gemini (system-level)

Used for: quiz generation, course generation from prompts, chatbot, Q&A on topics.

| Secret/Env Var | What it's for |
|---|---|
| `AI_INTEGRATIONS_GEMINI_API_KEY` | The Google Gemini API key used by default for all orgs |
| `AI_INTEGRATIONS_GEMINI_BASE_URL` | Optional — override the Gemini endpoint (leave blank for default Google endpoint) |

- Installed via Replit's Gemini integration (already configured in this project).
- File: `server/geminiService.ts`

### AI — Org-level override

OrgAdmins can supply their own AI keys instead of using the system key. These are stored encrypted in the database per-organisation. Supported providers: Gemini, OpenAI, DeepSeek.

- Configured under OrgAdmin dashboard → **AI Settings** tab.
- File: `server/services/cryptoService.ts` handles encryption.
- Requires `ENCRYPTION_KEY` secret — a 32-character random string used to encrypt stored API keys.

### AWS (file storage — optional)

| Secret Name | What it's for |
|---|---|
| `AWS_ACCESS_KEY_ID` | AWS credentials for S3 file uploads |
| `AWS_SECRET_ACCESS_KEY` | AWS credentials for S3 file uploads |
| `AWS_REGION` | AWS region for S3 |

- Currently the app supports direct base64 uploads stored in the database.
- S3 is available as an upgrade path when files get large.

---

## Key Files — Where Things Live

```
server/
  index.ts          — Express app entry point, session config, DB connection
  routes.ts         — ALL API endpoints (auth, topics, users, orgs, AI, etc.)
  storage.ts        — All database queries (the data layer)
  geminiService.ts  — AI calls (quiz gen, chatbot, course gen, Q&A)
  services/
    emailService.ts   — Welcome/reset/confirmation emails via SES
    cryptoService.ts  — Encrypt/decrypt org AI keys

client/src/
  App.tsx                         — Root: auth check, routing, global state
  pages/
    LandingPage.tsx               — Public homepage
    LoginPage.tsx / ResetPassword — Auth pages
  components/
    Dashboard.tsx                 — Learner home (course cards, search, filter)
    TopicSwiperView.tsx           — Full-screen course reader
    TopicView.tsx                 — Course content renderer (modules, quiz)
    CreatorDashboard.tsx          — Creator/OrgAdmin course builder
    SuperAdminDashboard.tsx       — Org management, licence plans
    OrgAdminDashboard.tsx         — User management, departments, AI settings

shared/
  schema.ts         — Drizzle ORM database schema (source of truth for types)
```

---

## Database

- PostgreSQL, managed by **Drizzle ORM**.
- Schema is in `shared/schema.ts`.
- To push schema changes to the database: `npm run db:push`
- To open the Drizzle Studio (visual DB browser): `npm run db:studio`
- `DATABASE_URL` must be set for any of these to work.

---

## Running the App Locally / on Replit

```
npm run dev
```

This starts:
- Express API server on port 5000
- Vite frontend dev server with hot reload

In production (after `npm run build`), Express serves the built frontend from `dist/public`.

---

## Deploying

The app is hosted on Replit. To publish:
1. Make sure all secrets above are set in Replit Secrets.
2. Click **Deploy** in the Replit UI (or use the Deploy button the agent provided).
3. The app will be available at `skillshots.replit.app` or a custom domain if configured.

---

## Common Tasks Quick-Reference

| Task | Where |
|---|---|
| Add a new organisation | SuperAdmin dashboard → Organisations → Add |
| Add a user to an org | OrgAdmin dashboard → Users → Add User |
| Create a course | Creator dashboard → Create Course |
| Generate a quiz | Course editor → Module → Generate Quiz (needs Gemini key) |
| Change AI provider for an org | OrgAdmin dashboard → AI Settings |
| Reset a user's password | User can use Forgot Password on login page (needs SES) |
| Check who completed what | OrgAdmin dashboard → Reports tab |
| View/edit database | `npm run db:studio` in terminal |
| Check server logs | Replit workflow logs (Start application workflow) |
