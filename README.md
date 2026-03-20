<p align="center">
  <br/>
  <a href="https://github.com/kartikeya-nainkhwal/nexus">
    <img src="https://raw.githubusercontent.com/tandpfun/skill-icons/main/icons/NextJS-Dark.svg" width="80" alt="Nexus" />
  </a>
  <br/>
  <br/>
  <b>N E X U S</b>
  <br/>
  <i>Enterprise-Grade Team Operating System</i>
  <br/>
  <br/>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js_14-black?style=for-the-badge&logo=next.js&logoColor=white" alt="Next.js" />
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/PostgreSQL-336791?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/Prisma-2D3748?style=for-the-badge&logo=prisma&logoColor=white" alt="Prisma" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" alt="Tailwind" />
</p>

<p align="center">
  <img src="https://img.shields.io/badge/AI_Powered-Groq_SDK-F97316?style=for-the-badge" alt="AI" />
  <img src="https://img.shields.io/badge/Real--Time-Pusher_WebSockets-6366f1?style=for-the-badge" alt="Real-time" />
  <img src="https://img.shields.io/badge/Payments-Stripe_%26_Razorpay-10B981?style=for-the-badge" alt="Payments" />
  <img src="https://img.shields.io/badge/Auth-NextAuth_v5-EF4444?style=for-the-badge" alt="Auth" />
</p>

<br/>

<p align="center">
  <a href="#-system-architecture"><b>Architecture</b></a> •
  <a href="#-database-design"><b>Database</b></a> •
  <a href="#-features"><b>Features</b></a> •
  <a href="#-tech-stack"><b>Tech Stack</b></a> •
  <a href="#-getting-started"><b>Setup</b></a> •
  <a href="#-app-interface"><b>Screenshots</b></a>
</p>

---

## 📸 App Interface

### 🛡️ Admin & Team Workspace

<p align="center">
  <img src="screenshots/Nexus1.png" alt="Admin Dashboard" width="100%" style="border-radius: 8px; margin-bottom: 20px" />
</p>

<details>
<summary><b>✨ View More Admin Screenshots</b></summary>
<br>

<table align="center">
  <tr>
    <td width="50%"><img src="screenshots/Nexus2.png" alt="Admin Screenshot 2" style="border-radius: 8px;" /></td>
    <td width="50%"><img src="screenshots/Nexus3.png" alt="Admin Screenshot 3" style="border-radius: 8px;" /></td>
  </tr>
  <tr>
    <td width="50%"><img src="screenshots/Nexus4.png" alt="Admin Screenshot 4" style="border-radius: 8px;" /></td>
    <td width="50%"><img src="screenshots/Nexus5.png" alt="Admin Screenshot 5" style="border-radius: 8px;" /></td>
  </tr>
  <tr>
    <td width="50%"><img src="screenshots/Nexus6.png" alt="Admin Screenshot 6" style="border-radius: 8px;" /></td>
    <td width="50%"><img src="screenshots/Nexus7.png" alt="Admin Screenshot 7" style="border-radius: 8px;" /></td>
  </tr>
  <tr>
    <td width="50%"><img src="screenshots/Nexus8.png" alt="Admin Screenshot 8" style="border-radius: 8px;" /></td>
    <td width="50%"><img src="screenshots/Nexus9.png" alt="Admin Screenshot 9" style="border-radius: 8px;" /></td>
  </tr>
  <tr>
    <td width="50%"><img src="screenshots/Nexus10.png" alt="Admin Screenshot 10" style="border-radius: 8px;" /></td>
    <td width="50%"><img src="screenshots/Nexus11.png" alt="Admin Screenshot 11" style="border-radius: 8px;" /></td>
  </tr>
  <tr>
    <td width="50%"><img src="screenshots/Nexus12.png" alt="Admin Screenshot 12" style="border-radius: 8px;" /></td>
    <td width="50%"><img src="screenshots/Nexus13.png" alt="Admin Screenshot 13" style="border-radius: 8px;" /></td>
  </tr>
  <tr>
    <td width="100%" colspan="2" align="center"><img src="screenshots/Nexus14.png" alt="Admin Screenshot 14" style="border-radius: 8px; width: 50%;" /></td>
  </tr>
</table>

</details>

<br/>

### 👤 User Portal

<p align="center">
  <img src="screenshots/Nexus15.png" alt="User Portal" width="100%" style="border-radius: 8px; margin-bottom: 20px" />
</p>

---

## 📖 What is Nexus?

**Nexus** is a production-ready, multi-tenant B2B SaaS platform that unifies **Project Management**, **Financial Intelligence**, **AI-Powered Documentation**, **Time Tracking**, and **Team Collaboration** into a single, cohesive workspace.

It is designed to demonstrate mastery over **full-stack architecture**, **system design**, **complex database modeling**, **real-time communication**, **payment gateway integration**, and **AI/LLM streaming** — the exact skills that enterprise clients demand.

> **This is not a tutorial project.** Nexus handles multi-tenant data isolation, role-based access control across organizational and project boundaries, optimistic UI updates with server reconciliation, and a complete invoicing pipeline with tax calculations — patterns found only in production-grade SaaS applications.

### Who is this for?

| Audience | Value |
| :--- | :--- |
| **Freelancers & Agencies** | Manage multiple client workspaces, track billable hours, generate invoices |
| **Startup Teams** | Replace 5+ separate tools with one unified platform |
| **Enterprise Teams** | RBAC, audit logs, subscription management, and data isolation |
| **Hiring Managers** | A living proof-of-competence across the entire modern web stack |

---

## 🏛️ System Architecture

Nexus implements a **layered, server-first architecture** built on the Next.js 14 App Router. Every design decision optimizes for **security**, **performance**, and **multi-tenant data isolation**.

```mermaid
graph TB
    subgraph "Client Layer"
        Browser["🖥️ Browser<br/>(React 18 + Framer Motion)"]
        Pusher_Client["📡 Pusher JS<br/>(Real-time Subscriptions)"]
    end

    subgraph "Edge / CDN Layer"
        Middleware["🛡️ Middleware<br/>(Auth Guard + Tenant Resolution)"]
    end

    subgraph "Application Layer — Next.js 14"
        RSC["⚡ React Server Components<br/>(Zero-JS Data Fetching)"]
        ServerActions["🔄 Server Actions<br/>(Mutative Operations)"]
        APIRoutes["🌐 REST API Routes<br/>(27 Resource Endpoints)"]
    end

    subgraph "Service Layer"
        AuthService["🔐 NextAuth v5<br/>(OAuth + Credentials + RBAC)"]
        AIService["🤖 Groq / AI SDK<br/>(Streaming LLM Responses)"]
        PaymentService["💳 Stripe & Razorpay<br/>(Subscriptions + Invoicing)"]
        EmailService["📧 Resend / Nodemailer<br/>(Transactional Emails)"]
        RealtimeService["⚡ Pusher Server<br/>(Event Broadcasting)"]
    end

    subgraph "Data Layer"
        Prisma["🔷 Prisma ORM<br/>(Type-Safe Queries + Migrations)"]
        PostgreSQL[("🐘 PostgreSQL<br/>(20+ Tables, Indexed)")]
    end

    Browser <--> Middleware
    Middleware <--> RSC
    Middleware <--> APIRoutes
    Browser <--> Pusher_Client
    RSC <--> Prisma
    ServerActions <--> Prisma
    APIRoutes <--> Prisma
    APIRoutes <--> AuthService
    APIRoutes <--> AIService
    APIRoutes <--> PaymentService
    APIRoutes <--> EmailService
    APIRoutes <--> RealtimeService
    Prisma <--> PostgreSQL
    RealtimeService -.->|"Push Events"| Pusher_Client
```

### Architectural Design Decisions

| Decision | Rationale |
| :--- | :--- |
| **React Server Components (RSC)** | Pages fetch data on the server with zero client-side JavaScript overhead. Only interactive islands are hydrated, reducing bundle size by ~40%. |
| **Server Actions for Mutations** | Form submissions and data mutations bypass the REST layer entirely, providing type-safe, co-located server logic with automatic revalidation. |
| **Edge Middleware for Auth** | Authentication checks run at the CDN edge before any page renders, blocking unauthorized access at the network perimeter — not the application layer. |
| **Optimistic UI + Server Reconciliation** | Kanban drag-and-drop updates the UI instantly, then reconciles with the server. On failure, the UI automatically rolls back with a toast notification. |
| **Multi-Tenant Isolation via OrgID** | Every database query is scoped to the user's active `organizationId`. There is no shared state between tenants — even at the query level. |
| **WebSocket Event Broadcasting** | Task movements and document edits broadcast via Pusher channels scoped to `org-{orgId}`, enabling real-time collaboration without polling. |

---

## 🗄️ Database Design

The data model consists of **20+ interconnected entities** across 4 business domains, designed for **referential integrity**, **query performance**, and **multi-tenant isolation**.

### Entity-Relationship Diagram

```mermaid
erDiagram
    USER ||--o{ ORGANIZATION_MEMBER : "belongs to"
    USER ||--o{ TASK : "assigned / created"
    USER ||--o{ TIME_ENTRY : "logs hours"
    USER ||--o{ DOCUMENT : "authors"
    USER ||--o{ COMMENT : "writes"
    USER ||--o{ GOAL : "sets targets"
    USER ||--o{ CALENDAR_EVENT : "creates"
    USER ||--o{ AVAILABILITY_SLOT : "defines schedule"
    USER ||--o{ NOTIFICATION : "receives"

    ORGANIZATION ||--o{ ORGANIZATION_MEMBER : "has members"
    ORGANIZATION ||--o{ PROJECT : "contains"
    ORGANIZATION ||--o{ TASK : "scopes"
    ORGANIZATION ||--o{ DOCUMENT : "stores"
    ORGANIZATION ||--o{ INVOICE : "bills"
    ORGANIZATION ||--o{ CLIENT : "manages"
    ORGANIZATION ||--o{ EXPENSE : "tracks costs"
    ORGANIZATION ||--o{ TIME_ENTRY : "records"
    ORGANIZATION ||--o{ SUBSCRIPTION : "subscribes"
    ORGANIZATION ||--o{ ACTIVITY_LOG : "audits"
    ORGANIZATION ||--o{ INVITATION : "invites"

    PROJECT ||--o{ TASK : "houses"
    PROJECT ||--o{ PROJECT_MEMBER : "assigns team"
    PROJECT ||--o{ DOCUMENT : "links docs"
    PROJECT ||--o{ TIME_ENTRY : "tracks effort"
    PROJECT ||--o{ EXPENSE : "incurs costs"

    TASK ||--o{ COMMENT : "has threads"
    TASK ||--o{ ATTACHMENT : "holds files"
    TASK ||--o{ TIME_ENTRY : "measures work"
    TASK ||--o{ TASK : "subtasks"

    CLIENT ||--o{ INVOICE : "receives bills"
    CLIENT ||--o{ EXPENSE : "linked costs"

    INVOICE ||--o{ INVOICE_ITEM : "line items"
```

### Domain Breakdown

<table>
<tr>
<td width="50%">

#### 🏢 Tenant & Identity Domain
| Entity | Purpose |
| :--- | :--- |
| `User` | Global identity with OAuth/credential auth |
| `Organization` | Tenant boundary — all data is org-scoped |
| `OrganizationMember` | Junction: User ↔ Org with roles (`OWNER`, `ADMIN`, `MEMBER`) |
| `Invitation` | Token-based invite system with expiry |
| `Subscription` | SaaS plan tracking (FREE → ENTERPRISE) |

</td>
<td width="50%">

#### 📋 Project & Work Domain
| Entity | Purpose |
| :--- | :--- |
| `Project` | Color-coded, emoji-enabled work containers |
| `ProjectMember` | Project-level RBAC (separate from org roles) |
| `Task` | Kanban items with status, priority, tags, subtasks |
| `Comment` | Threaded discussions per task |
| `Attachment` | File uploads linked to tasks |
| `Document` | Notion-like rich text (Tiptap JSON) |

</td>
</tr>
<tr>
<td width="50%">

#### 💰 Financial Domain
| Entity | Purpose |
| :--- | :--- |
| `Client` | CRM-lite: name, email, company, currency |
| `Invoice` | Full lifecycle: DRAFT → SENT → PAID → OVERDUE |
| `InvoiceItem` | Line items with qty × rate calculations |
| `Expense` | Categorized costs (SOFTWARE, HOSTING, TRAVEL...) |

</td>
<td width="50%">

#### ⏱️ Productivity Domain
| Entity | Purpose |
| :--- | :--- |
| `TimeEntry` | Second-precision tracking, billable flag, hourly rate |
| `AvailabilitySlot` | Weekly schedule definition per user |
| `Goal` | Financial/time targets with progress tracking |
| `CalendarEvent` | Full-day and timed events with project linking |
| `ActivityLog` | Immutable audit trail of all actions |

</td>
</tr>
</table>

### Indexing Strategy

Every foreign key and frequently-queried column is indexed for sub-millisecond lookups:

```sql
-- Example: Task table has 6 composite indexes
@@index([organizationId])     -- Tenant isolation queries
@@index([projectId])          -- Project-scoped task lists
@@index([assignedToId])       -- "My Tasks" views
@@index([status])             -- Kanban column filtering
@@index([dueDate])            -- Calendar and overdue queries
@@index([parentTaskId])       -- Subtask tree traversal
```

---

## 🚀 Features

### Core Platform

| Module | Capabilities |
| :--- | :--- |
| **🔐 Authentication** | OAuth 2.0 (Google), Email/Password with bcrypt hashing, Session management via NextAuth v5, Edge middleware protection |
| **🏢 Multi-Tenancy** | Create unlimited workspaces, instant org switching, isolated data boundaries, branded workspace settings |
| **👥 Team Management** | Token-based email invitations, 3-tier RBAC (Owner/Admin/Member), member profiles with hourly rates |
| **🔔 Notifications** | In-app notification center, granular preference controls, real-time delivery via Pusher |

### Project Management

| Module | Capabilities |
| :--- | :--- |
| **📊 Kanban Board** | Drag-and-drop via `@hello-pangea/dnd`, real-time sync across users, keyboard shortcuts (arrow keys, D for Done), optimistic updates with rollback |
| **✅ Global Tasks** | Cross-project task aggregation, filter by status/priority/assignee, bulk operations |
| **📁 Projects Hub** | Color-coded cards with progress bars, team avatars, activity tracking, emoji identifiers |
| **📅 Calendar** | FullCalendar integration (month/week/day/list views), drag-to-create events, project-linked scheduling |

### Intelligence & Productivity

| Module | Capabilities |
| :--- | :--- |
| **📝 Docs (Notion-like)** | Tiptap block editor with slash commands, tables, code blocks (syntax-highlighted), mentions, task lists, image embeds, character count |
| **🤖 AI Assistant** | Groq LLM streaming integration, auto-extract action items from docs, push tasks directly to Kanban boards |
| **⏱️ Time Tracker** | Live timer with second-precision, billable vs. non-billable tagging, project/task linking, team overview for admins |
| **📈 Analytics** | Weekly hour charts (Recharts), utilization rate calculation, earnings vs. potential metrics, project-level breakdowns |

### Financial Suite

| Module | Capabilities |
| :--- | :--- |
| **🧾 Invoicing** | Full pipeline: Draft → Sent → Paid → Overdue, auto-generated invoice numbers, tax and discount calculations, client-linked |
| **👤 Client CRM** | Client profiles with company, email, phone, address, multi-currency support (INR, USD, EUR) |
| **💸 Expense Tracking** | 8 categories (Software, Hosting, Design, Marketing, Travel, Equipment, Office, Other), receipt URLs, project linking |
| **💳 Subscriptions** | Stripe + Razorpay dual-gateway integration, plan management (Free → Enterprise), webhook-driven status sync |
| **🎯 Goals** | Revenue targets with progress tracking, monthly/quarterly/yearly periods, visual progress indicators |

### Design & UX

| Feature | Implementation |
| :--- | :--- |
| **🌗 Theme System** | `next-themes` with CSS custom properties, 15+ semantic design tokens, glassmorphism effects |
| **✨ Animations** | Framer Motion page transitions, micro-interactions, spring-physics drag feedback, staggered list reveals |
| **📱 Responsive** | Mobile navigation, collapsible sidebar, adaptive grid layouts |
| **♿ Accessibility** | Keyboard navigation support, ARIA labels, focus management, semantic HTML |

---

## 🛠️ Tech Stack

<table>
<tr>
<td align="center" width="96">
  <img src="https://raw.githubusercontent.com/tandpfun/skill-icons/main/icons/NextJS-Dark.svg" width="48" height="48" alt="Next.js" />
  <br><sub><b>Next.js 14</b></sub>
</td>
<td align="center" width="96">
  <img src="https://raw.githubusercontent.com/tandpfun/skill-icons/main/icons/TypeScript.svg" width="48" height="48" alt="TypeScript" />
  <br><sub><b>TypeScript</b></sub>
</td>
<td align="center" width="96">
  <img src="https://raw.githubusercontent.com/tandpfun/skill-icons/main/icons/React-Dark.svg" width="48" height="48" alt="React" />
  <br><sub><b>React 18</b></sub>
</td>
<td align="center" width="96">
  <img src="https://raw.githubusercontent.com/tandpfun/skill-icons/main/icons/TailwindCSS-Dark.svg" width="48" height="48" alt="Tailwind" />
  <br><sub><b>Tailwind CSS</b></sub>
</td>
<td align="center" width="96">
  <img src="https://raw.githubusercontent.com/tandpfun/skill-icons/main/icons/PostgreSQL-Dark.svg" width="48" height="48" alt="PostgreSQL" />
  <br><sub><b>PostgreSQL</b></sub>
</td>
<td align="center" width="96">
  <img src="https://raw.githubusercontent.com/tandpfun/skill-icons/main/icons/Prisma.svg" width="48" height="48" alt="Prisma" />
  <br><sub><b>Prisma ORM</b></sub>
</td>
</tr>
</table>

### Full Dependency Map

| Layer | Technologies |
| :--- | :--- |
| **Framework** | Next.js 14 (App Router, RSC, Server Actions), React 18, TypeScript 5 |
| **Styling** | Tailwind CSS 3, CSS Custom Properties, Glassmorphism Design System |
| **UI Primitives** | Radix UI (Dialog, Dropdown, Tabs, Tooltip, Select, Avatar, Checkbox), Shadcn patterns |
| **Animation** | Framer Motion 12 (layout animations, spring physics, AnimatePresence) |
| **State** | Zustand (global store), React Hook Form + Zod (form validation) |
| **Rich Text** | Tiptap (20+ extensions: tables, code blocks, mentions, task lists, slash commands) |
| **Data Viz** | Recharts (bar charts, area charts, responsive containers) |
| **Drag & Drop** | `@hello-pangea/dnd` (Kanban board, task reordering) |
| **Calendar** | FullCalendar 6 (dayGrid, timeGrid, list, interaction plugins) |
| **Database** | PostgreSQL, Prisma Client + Prisma Accelerate, `@prisma/adapter-pg` |
| **Auth** | NextAuth v5 (Auth.js), `@auth/prisma-adapter`, bcryptjs |
| **Payments** | Stripe SDK, Razorpay Node SDK, webhook verification |
| **AI/LLM** | `@ai-sdk/groq`, Vercel AI SDK (streaming responses) |
| **Real-time** | Pusher (server), Pusher-JS (client WebSocket subscriptions) |
| **Email** | Resend SDK, Nodemailer (SMTP fallback) |
| **Command Palette** | cmdk (⌘K search interface) |

---

## 📂 Project Structure

```
nexus/
├── app/
│   ├── (auth)/                    # Auth pages (login, register, invite)
│   ├── (dashboard)/dashboard/     # All authenticated pages
│   │   ├── billing/               # Subscription management
│   │   ├── calendar/              # FullCalendar integration
│   │   ├── docs/                  # Tiptap document editor
│   │   ├── finance/               # Revenue, invoices, clients, expenses
│   │   ├── goals/                 # Financial & time targets
│   │   ├── members/               # Team & invitation management
│   │   ├── projects/[id]/         # Kanban board, project tabs
│   │   ├── settings/              # Profile, security, notifications
│   │   ├── tasks/                 # Global task aggregation
│   │   └── time/                  # Time tracker with analytics
│   ├── api/                       # 27 RESTful API route groups
│   │   ├── ai/                    # LLM streaming endpoints
│   │   ├── auth/                  # NextAuth handlers
│   │   ├── billing/               # Stripe/Razorpay webhooks
│   │   ├── invoices/              # CRUD + status transitions
│   │   ├── tasks/[id]/move/       # Kanban move + reorder
│   │   ├── time-entries/          # Start/stop/running timers
│   │   └── ...                    # 20+ more resource groups
│   ├── onboarding/                # New workspace creation flow
│   └── globals.css                # Design system tokens
├── components/
│   ├── dashboard/                 # Sidebar, Navbar, OrgSwitcher, ProjectCards
│   ├── kanban/                    # KanbanColumn, KanbanCard (DnD)
│   ├── shared/                    # Button, Card, Input, Modal, Badge, Avatar
│   └── ui/                        # Radix-based primitives
├── lib/
│   ├── auth.ts                    # NextAuth config + RBAC helpers
│   ├── db.ts                      # Prisma client singleton
│   ├── pusher.ts                  # Real-time event broadcasting
│   └── currency.ts                # Multi-currency formatting
├── prisma/
│   ├── schema.prisma              # 20+ models, 535 lines
│   └── seed.ts                    # Demo data seeding
├── middleware.ts                   # Edge auth guard + route protection
└── store/                         # Zustand global state
```

---

## 🔒 Security Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                      SECURITY LAYERS                              │
├──────────────────────────────────────────────────────────────────┤
│                                                                    │
│  Layer 1: Edge Middleware                                         │
│  ├── Route protection (public vs. authenticated)                  │
│  ├── Session validation at CDN edge                               │
│  └── Redirect logic for unauthenticated users                    │
│                                                                    │
│  Layer 2: Authentication (NextAuth v5)                            │
│  ├── OAuth 2.0 (Google) + Credentials provider                   │
│  ├── bcryptjs password hashing (salt rounds: 10)                 │
│  ├── JWT session tokens with org context                          │
│  └── Prisma adapter for session persistence                      │
│                                                                    │
│  Layer 3: Authorization (RBAC)                                    │
│  ├── Organization level: OWNER > ADMIN > MEMBER                  │
│  ├── Project level: OWNER > ADMIN > MEMBER                       │
│  ├── API routes verify role before mutations                      │
│  └── UI conditionally renders based on permissions                │
│                                                                    │
│  Layer 4: Data Isolation                                          │
│  ├── Every query scoped by organizationId                         │
│  ├── Cascading deletes prevent orphaned records                  │
│  ├── Foreign key constraints enforce referential integrity        │
│  └── Unique constraints prevent duplicate memberships             │
│                                                                    │
│  Layer 5: Payment Security                                        │
│  ├── Stripe webhook signature verification                        │
│  ├── Razorpay HMAC validation                                    │
│  └── Server-side-only API key handling                            │
│                                                                    │
└──────────────────────────────────────────────────────────────────┘
```

---

## 📈 Getting Started

### Prerequisites

- **Node.js** 18+ 
- **PostgreSQL** 14+ (local or hosted: Supabase, Neon, Railway)
- **npm** or **yarn**

### 1. Clone & Install

```bash
git clone https://github.com/kartikeya-nainkhwal/nexus.git
cd nexus
npm install
```

### 2. Environment Configuration

Create a `.env` file in the root directory:

```env
# ═══════════════════════════════════════════════════════
#  DATABASE
# ═══════════════════════════════════════════════════════
DATABASE_URL="postgresql://user:password@localhost:5432/nexus"

# ═══════════════════════════════════════════════════════
#  AUTHENTICATION
# ═══════════════════════════════════════════════════════
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="generate-with-openssl-rand-base64-32"

# Google OAuth (optional)
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# ═══════════════════════════════════════════════════════
#  APPLICATION
# ═══════════════════════════════════════════════════════
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# ═══════════════════════════════════════════════════════
#  AI (Groq)
# ═══════════════════════════════════════════════════════
GROQ_API_KEY="your-groq-api-key"

# ═══════════════════════════════════════════════════════
#  PAYMENTS
# ═══════════════════════════════════════════════════════
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
RAZORPAY_KEY_ID="rzp_test_..."
RAZORPAY_KEY_SECRET="your-razorpay-secret"

# ═══════════════════════════════════════════════════════
#  REAL-TIME (Pusher)
# ═══════════════════════════════════════════════════════
PUSHER_APP_ID="your-app-id"
PUSHER_KEY="your-key"
PUSHER_SECRET="your-secret"
PUSHER_CLUSTER="ap2"

# ═══════════════════════════════════════════════════════
#  EMAIL
# ═══════════════════════════════════════════════════════
RESEND_API_KEY="re_..."
```

### 3. Database Setup

```bash
# Generate Prisma client types
npm run db:generate

# Push schema to PostgreSQL
npm run db:push

# Seed with demo data
npm run db:seed
```

### 4. Launch

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — use the seed credentials printed in the terminal to log in.

---

## 🧪 Available Scripts

| Command | Description |
| :--- | :--- |
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Production build (generates Prisma client + Next.js build) |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint checks |
| `npm run db:generate` | Generate Prisma client types |
| `npm run db:push` | Push schema changes to database |
| `npm run db:migrate` | Create and run migrations |
| `npm run db:seed` | Seed database with demo data |
| `npm run db:studio` | Open Prisma Studio (visual DB browser) |

---

## 📊 Metrics

| Metric | Value |
| :--- | :--- |
| **Prisma Models** | 20+ entities |
| **API Endpoints** | 27 resource groups, 50+ routes |
| **React Components** | 80+ custom components |
| **Database Indexes** | 30+ composite indexes |
| **Tiptap Extensions** | 20+ editor plugins |
| **Lines of Code** | 15,000+ (TypeScript/TSX) |

---

## 🤝 Contributing

Contributions are welcome. If you'd like to add a feature or fix a bug:

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

<p align="center">
  <sub>Designed & Engineered by <b>Kartikeya Nainkhwal</b></sub>
  <br/>
  <sub>Built with ❤️ using Next.js, TypeScript, and PostgreSQL</sub>
</p>
