# Skillshots Design Guidelines

## Design Approach

**Selected Approach:** Design System-Based with Linear/Notion inspiration
**Rationale:** Skills tracking application with data visualization requires clarity, information hierarchy, and professional aesthetics that support data comprehension.

**Core Design Principles:**
- Clarity over decoration: Information should be immediately scannable
- Data-first hierarchy: Visualizations and metrics are primary focus
- Efficient navigation: Quick access to different skill categories and user data
- Professional polish: Clean, modern interface that instills confidence

## Typography System

**Font Selection:** Inter (Google Fonts) for its excellent readability at all sizes

**Hierarchy:**
- Display/Hero: 600 weight, 2.5rem (40px) 
- Page Headings (h1): 600 weight, 2rem (32px)
- Section Headings (h2): 600 weight, 1.5rem (24px)
- Card/Component Titles (h3): 500 weight, 1.125rem (18px)
- Body Text: 400 weight, 1rem (16px)
- Small/Meta Text: 400 weight, 0.875rem (14px)
- Micro Labels: 500 weight, 0.75rem (12px), uppercase with tracking

## Layout System

**Spacing Units:** Tailwind primitives - consistent use of 2, 4, 6, 8, 12, 16, 20, 24
- Tight spacing within components: p-2, p-4, gap-2
- Standard component padding: p-6, p-8
- Section spacing: py-12, py-16, py-20
- Large section breaks: py-24

**Grid Structure:**
- Dashboard layouts: 12-column grid with gap-6
- Stat cards: 3-column on desktop (grid-cols-3), stack on mobile
- Data tables: Full-width with horizontal scroll on mobile
- Sidebar + Main: 280px fixed sidebar, flex-1 main content area

**Container Constraints:**
- Dashboard content: max-w-7xl
- Form containers: max-w-2xl
- Reading content: max-w-4xl

## Component Library

### Navigation
**Top Navigation Bar:**
- Fixed position, height 64px
- Logo left, user profile/menu right
- Search bar center (if applicable)
- Subtle border-bottom separator

**Sidebar Navigation (Dashboard):**
- Fixed left sidebar, 280px width
- Collapsible on mobile
- Icon + label format for nav items
- Active state with subtle background highlight
- Group sections with dividers

### Data Display Components

**Stat Cards:**
- Grid layout, equal height cards
- Large numeric value (font-size: 2rem, weight: 600)
- Label above (text-sm, medium opacity)
- Small trend indicator/change percentage
- Minimal padding (p-6)
- Subtle border, no heavy shadows

**Charts (Recharts Integration):**
- Full-width containers with aspect ratio preservation
- Consistent axis styling
- Muted grid lines
- Clear legends
- Tooltips on hover
- Height: 300px for standard charts, 400px for primary displays

**Data Tables:**
- Alternating row backgrounds (very subtle)
- Sticky header
- Sortable columns with indicators
- Row hover states
- Compact padding (px-4, py-3)
- Actions column aligned right

### Form Components

**Input Fields:**
- Height: h-10
- Padding: px-4
- Rounded: rounded-md
- Border: 1px solid with focus ring enhancement
- Labels: text-sm, font-medium, mb-2

**Buttons:**
- Primary: Solid background, rounded-md, px-6, py-2.5, font-medium
- Secondary: Outlined variant
- Icon buttons: Circular, p-2
- Hover states: Slight opacity change (no animations)

**Cards:**
- Rounded: rounded-lg
- Border: 1px solid
- Padding: p-6
- Shadow: Minimal, only on hover if needed

### Authentication Screens

**Layout:**
- Centered card design, max-w-md
- Logo centered above
- Form fields stacked vertically with gap-4
- "Or continue with" social options if applicable
- Footer links (Sign up/Login toggle) below

### Skill Visualization Components

**Skill Progress Bars:**
- Full-width containers
- Skill name left, percentage/level right
- Filled progress indicator
- Height: h-2, rounded-full

**Skill Category Cards:**
- Grid of cards showing different skill categories
- Icon or emoji representation
- Category name
- Quick stats (e.g., "12 skills tracked")
- Click to expand/navigate

### Dashboard Layout Structure

**Main Dashboard View:**
1. Stats overview row (3-4 cards)
2. Primary chart/visualization section
3. Recent activity/skills list
4. Secondary charts in 2-column layout

## Images

**Profile/Avatar Images:**
- Circular avatars for user profiles
- Size variants: 32px (nav), 48px (cards), 96px (profile page)
- Fallback to initials with solid background

**Skill Category Icons:**
- Use Heroicons library for consistent iconography
- Size: 24px standard, 32px for larger cards
- Mono style for uniformity

**Hero Section (Landing/Marketing pages if applicable):**
- Abstract geometric pattern or dashboard screenshot mockup
- Overlaid with centered headline + CTA
- Height: min-h-[500px]
- Background: Subtle gradient overlay

## Animation Guidelines

**Minimal Motion:**
- Page transitions: Simple fade
- Hover states: Opacity changes only (no transforms)
- Loading states: Simple spinner or skeleton screens
- No scroll-triggered animations
- Chart animations: Use Recharts' built-in simple entry animations

## Accessibility Implementation

- All interactive elements: min-height 44px
- Form labels: Always visible, properly associated
- Focus states: Clear 2px outline with offset
- Color contrast: Minimum WCAG AA compliance
- Skip navigation link for keyboard users
- ARIA labels for icon-only buttons