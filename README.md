<p align="center">
  <img src="https://raw.githubusercontent.com/tandpfun/skill-icons/main/icons/NextJS-Dark.svg" width="60" alt="Next.js" />
  <h1 align="center">Nexus ⚡ SaaS Platform</h1>
  <p align="center">
    <strong>The Absolute Best B2B SaaS Foundation for High-Performance Teams</strong>
    <br/>
    Project Management • Financial Intelligence • AI-Powered Documentation • Time Tracking
  </p>
</p>

<p align="center">
  <a href="#features"><img src="https://img.shields.io/badge/Features-Comprehensive-38B2AC?style=for-the-badge" alt="Features"></a>
  <a href="#system-architecture"><img src="https://img.shields.io/badge/Architecture-Scalable-6366f1?style=for-the-badge" alt="Architecture"></a>
  <a href="#database-design"><img src="https://img.shields.io/badge/Database-PostgreSQL-336791?style=for-the-badge&logo=postgresql" alt="DB"></a>
  <a href="#tech-stack"><img src="https://img.shields.io/badge/Stack-Next.js_14-black?style=for-the-badge&logo=next.js" alt="Next.js"></a>
</p>

---

## 🌟 Overview

**Nexus** is a top-of-the-line, multi-tenant B2B SaaS application designed from the ground up for modern teams and freelancers. Utilizing a stunning "glassmorphism" aesthetic, it bridges the gap between collaborative workboards, strict financial intelligence, comprehensive time-tracking, and intelligent AI assistance.

Built on an elite, cutting-edge technology stack (Next.js 14 App Router, Prisma, PostgreSQL, Tailwind), Nexus provides a production-ready, highly-scalable environment capable of handling complex organizational hierarchies, real-time collaboration, and secure payment processing.

---

## 🏗️ System Architecture & Design

Nexus implements an enterprise-grade architecture, emphasizing robust security, isolated environments (multi-tenancy), and extreme responsiveness.

```mermaid
graph TD
    %% Define Nodes
    Client[Client Browser / Mobile]
    NextJS[Next.js 14 App Router SSR/SSG]
    API[API Routes / Server Actions]
    Auth[NextAuth.js v5 RBAC Module]
    DB[(PostgreSQL Database)]
    Prisma[Prisma ORM Client]
    Stripe[Stripe / Razorpay Payment Gateways]
    AI[Groq / OpenAI LLM Providers]
    RealTime[Pusher Real-time WebSockets]
    Email[Resend / Nodemailer]

    %% Connections
    Client <-->|HTTPS / Server Actions| NextJS
    Client <-->|WebSocket Events| RealTime
    NextJS <--> Auth
    NextJS <-->|Server Actions / TRPC / Routes| API
    API <-->|Schema Typed Queries| Prisma
    Prisma <--> DB
    API <-->|Webhook / Billing| Stripe
    API <-->|Streaming Text Responses| AI
    API -->|Transactional Emails| Email
```

### Key Architectural Highlights:
1.  **Server Actions & SSR:** Reduces client payload drastically by using React Server Components for data fetching.
2.  **Edge & Streaming AI:** Integrates `@ai-sdk/groq` for lightning-fast, streaming AI completions right into the document editor.
3.  **Real-Time Subscriptions:** Employs long-polling/WebSockets via `Pusher` and `Pusher-JS` to sync global state changes (Tasks, Board movements).
4.  **Strict Multi-Tenancy:** Each workspace defines an `organizationId` boundary. DB queries strictly scope data via Organization IDs.

---

## 🗄️ Database Design

The data model uses **Prisma** to define strongly typed schemas and relations. Here is a conceptual Entity-Relationship Diagram (ERD) of the core domain:

```mermaid
erDiagram
    ORGANIZATION ||--o{ USER : "invites & manages"
    ORGANIZATION ||--o{ PROJECT : "contains"
    ORGANIZATION ||--o{ INVOICE : "bills to clients"
    ORGANIZATION ||--o{ TIME_ENTRY : "tracks"
    ORGANIZATION ||--o{ DOCUMENT : "stores"
    
    USER ||--o{ ORGANIZATION_MEMBER : "acts as"
    USER ||--o{ TASK : "assigned to"
    USER ||--o{ TIME_ENTRY : "logs hours"
    
    PROJECT ||--o{ TASK : "houses"
    PROJECT ||--o{ DOCUMENT : "links context"
    
    TASK ||--o{ COMMENT : "has discussions"
    TASK ||--o{ TASK : "subtasks"
```

### Core Entities Breakdown:
*   **Organization:** The root tenant. Everything (Projects, Tasks, Invoices, Members) belongs to an Organization.
*   **User & OrganizationMember:** Cross-organization users logic vs Organization-specific configurations (Roles, Hourly Rates).
*   **Project & Task:** Handles hierarchical work breakdown (Project -> Task -> Subtask).
*   **TimeEntry:** High-precision logging linking a `User`, an `Organization`, and optionally a `Task` or `Project`.
*   **Invoice & Expense:** Comprehensive dual-entry ledger keeping track of inbound client money and outbound costs.
*   **Document:** Rich JSON structures persisting Tiptap collaborative block-editor states.

---

## 🚀 Features (Basic to Advanced)

### 🟢 Basic Features
*   **Secure Authentication:** OAuth and Magic Link logins via NextAuth v5.
*   **Organization (Workspace) Setup:** Create, manage, and brand multiple unique workspaces.
*   **User Profiles:** Intuitive UI to handle avatars, names, notification preferences, and passwords.
*   **Team Invitations:** Generate distinct secure tokens to bring on collaborators via Email.
*   **Dark / Light Mode:** Fully cohesive UI transitioning properly built via `next-themes`.

### 🟡 Intermediate Features
*   **Kanban Task Boards:** A fully interactive, drag-and-drop Kanban view utilizing `@hello-pangea/dnd`. Move tasks between `TODO`, `IN_PROGRESS`, `IN_REVIEW`, and `DONE` states instantly.
*   **Global Task View:** See all assigned tasks regardless of project to orchestrate a personal to-do list.
*   **Project Hub:** Color-coded, emoji-enabled project dashboards mapping team progress and recent activity.
*   **Full Calendar Integration:** Built with `@fullcalendar/core`, map due dates and project milestones visually.
*   **Notion-Like Documents:** Integrated `Tiptap` editor providing slash-commands, block quotes, mentions, tables, and task-lists safely serialized into JSON.

### 🔴 Advanced / Top-of-the-Line Features
*   **Granular Role-Based Access Control (RBAC):** `OWNER`, `ADMIN`, `MEMBER`. Only authorized personnel can see rates, invoices, or manage Organization roles.
*   **AI Smart Workflows:** Infused with `Groq` LLM streams. Automatically extract action-items from Documents and deploy them directly to your Kanban board.
*   **Financial Intelligence Suite:** 
    *   **Invoicing:** Complete pipeline from `DRAFT`, `SENT`, `PAID`, `OVERDUE`. Generate unique invoice numbers, calculate taxes and partial discounts.
    *   **Expense Management:** Log overhead categorized by `SOFTWARE`, `HOSTING`, `TRAVEL`, etc.
    *   **Multi-Gateway Billing:** Accept organization payments and manage SaaS subscription plans via Stripe & Razorpay.
*   **Advanced Time Tracking & Utilization:** Pinpoint tracking of seconds spent. Distinguish between *Billable* vs *Non-Billable* hours, multiplying against dynamically set user-hourly-rates. Calculate "Earnings vs Potential" metrics.
*   **Real-time Availability & Goals:** Resource planning via `AvailabilitySlots` and financial targets mapped out using the `Goal` module.
*   **Webhooks & Sync:** Cross-device UI parity utilizing Push notifications and optimistic UI updates.

---

## 🛠️ Tech Stack

Nexus leverages a brutally efficient and modern JS/TS ecosystem:

| Category | Technology |
| :--- | :--- |
| **Framework** | Next.js 14, React 18, TypeScript |
| **Styling & UI** | Tailwind CSS 3, Shadcn UI, Class Variance Authority, Radix Primitives |
| **Animations** | Framer Motion |
| **Database & ORM** | PostgreSQL, Prisma Accelerate/Client |
| **Analytics & Viz** | Recharts (Financial / Task Charts) |
| **Rich Text Editor**| Tiptap (Customized block-based interface) |
| **Drag & Drop** | `@hello-pangea/dnd` |
| **Finance** | Stripe SDK, Razorpay Node, Recharts |
| **Auth & Security** | NextAuth (Auth.js) v5, Bcrypt |

---

## 📈 Getting Started

### 1. Clone the repository
```bash
git clone https://github.com/your-username/nexus.git
cd nexus
```

### 2. Install dependencies
```bash
npm install
```

### 3. Setup Environment Variables
Create a `.env` file in the root directory:
```env
# Database configuration
DATABASE_URL="postgresql://user:pass@localhost:5432/nexus"

# Next Auth Config
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your_secure_random_string_here"

# Application URL
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# AI Provider (Groq / OpenAI)
GROQ_API_KEY="your_groq_api_key_here"

# Payment Gateways (Stripe/Razorpay)
STRIPE_SECRET_KEY="sk_test_..."
RAZORPAY_KEY_ID="rzp_test_..."

# Email Provider
RESEND_API_KEY="your_resend_api_key"
```

### 4. Database Initialization
Generate the Prisma typing client, push the schema to your PostgreSQL instance, and seed the initial configuration:
```bash
npm run db:generate
npm run db:push
npm run db:seed
```

### 5. Start the Application
```bash
npm run dev
```
Visit `http://localhost:3000` to interact with Nexus. Use the seed credentials generated in terminal log (or from `db:seed`) to enter the platform instantly.

---

## 📸 Screenshots & Visuals

*(We recommend embedding stunning, high-resolution `.webp` or `.png` screenshots of the Kanban Board, Dashboard Analytics, and Dark-mode Document Editor here to truly showcase the Glassmorphic aesthetics.)*

---

## 🤝 Contributing

We welcome professional insights! If you encounter layout issues or think of a powerful new SaaS feature:
1. Fork the Project.
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`).
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`).
4. Push to the Branch (`git push origin feature/AmazingFeature`).
5. Open a Pull Request.

---

## 📄 License

This project is licensed under the MIT License - see the `LICENSE.md` file for details. Built to scale, designed to impress.
