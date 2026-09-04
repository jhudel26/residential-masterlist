# St. Joseph Village 6 Phase 4 — Homeowners Masterlist System

> Official Homeowners Association (HOA) Masterlist & Resident Registry System for the Board of Directors of **St. Joseph Village 6 Phase 4**.

---

## 🌟 Overview & Features

- **Full-Stack Architecture**: Built on Next.js 14+ (App Router), TypeScript, and Tailwind CSS with a refined community-first aesthetic (Deep Navy `#0F1E36`, Forest Green `#0F382A`, Warm Gold `#C89D42`).
- **Granular Role-Based Access Control (RBAC)**:
  - **Super Admin (HOA President)**: Unrestricted master control, ability to create Admin and User accounts, adjust granular permissions, and archive records.
  - **Admin (Vice President & Board Members)**: Permission-governed operations (can act like Super Admin if granted, except creating other Super Admins).
  - **User (Staff & Volunteers)**: Strict task-based access (e.g. view only, add homeowner without delete privileges).
  - **8 Granular Permissions**: `can_create_homeowner`, `can_edit_homeowner`, `can_delete_homeowner`, `can_view_homeowner`, `can_export_excel`, `can_manage_users`, `can_grant_permissions`, `can_view_dashboard_stats`.
- **Database & Row Level Security (RLS)**:
  - Supabase PostgreSQL with RLS policies enforced against `profiles.role` and `profiles.permissions`.
  - Auto-computed age via Postgres trigger & instant reactive frontend calculation from birthdate.
  - Dynamic household members registry (`household_members`) cascading on homeowner deletion.
  - General Assembly (GA) proxy designation tracking and domestic pet census.
- **Executive Dashboard**:
  - 5 summary KPI cards (Total Homeowners, Total Residents, Tenure Ratio, Registered Pets, Active Status).
  - Interactive demographic charts with Recharts (Tenure donut chart, gender distribution).
  - Chronological board audit log trail.
- **ExcelJS Export**:
  - Official multi-sheet formatted workbook export (Sheet 1: Homeowners Masterlist with HOA branding header, Sheet 2: Household Members Registry).
  - Filter-aware export (exports active search or entire registry).
- **Zero-Friction Sandbox & Live Supabase**:
  - Works out of the box in Sandbox Demo mode with instant persona switcher (`President`, `Vice Pres.`, `Secretary`).
  - Seamlessly connects to real Supabase with Row Level Security once credentials are added to `.env.local`.

---

## 🛠️ Tech Stack

- **Frontend**: Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS
- **Icons & UI**: `lucide-react`, customized accessible dialogs, switches, and toasts
- **Database / Auth / Security**: Supabase PostgreSQL, Supabase Auth (`@supabase/ssr`, `@supabase/supabase-js`), RLS
- **Reporting & Charts**: `exceljs` (multi-sheet workbook generator), `recharts` (demographics)

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- Node.js 18.17+ or higher (tested on Node v24)
- npm or pnpm / yarn

### 2. Installation
```bash
# Clone the repository
git clone https://github.com/your-username/alpalist-hoa.git
cd alpalist-hoa

# Install dependencies
npm install
```

### 3. Run in Local Sandbox Mode (Instant Test)
By default, the application runs in a sandbox mode with realistic pre-populated data for St. Joseph Village 6 Phase 4:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.
Use the quick-login buttons on the login page:
- **President (Super Admin)**: Full administrative access
- **Vice President (Admin)**: Operational board member
- **Secretary (Staff / User)**: Standard registrar account

---

## 🗄️ Supabase Production Setup

### Step 1: Create a Supabase Project
1. Log in to [Supabase](https://supabase.com) and click **New Project**.
2. Name your project (e.g., `St-Joseph-Village-6-Phase-4-HOA`).
3. Set your database password and choose your region (e.g. `Singapore` or `Tokyo` for the Philippines).

### Step 2: Execute SQL Migrations
1. In your Supabase Dashboard, navigate to the **SQL Editor**.
2. Open the file [`supabase/migrations/01_schema_and_rls.sql`](./supabase/migrations/01_schema_and_rls.sql) in this repository.
3. Paste the entire SQL script into the SQL Editor and click **Run**.
   - This creates all ENUM types (`user_role`, `ownership_type`, `gender_type`, `record_status`).
   - Creates the tables: `profiles`, `homeowners`, `household_members`, and `activity_logs`.
   - Creates triggers for auto-computing age from birthdate and auto-creating user profiles.
   - Enables Row Level Security (RLS) with strict policies.
4. (Optional) Run [`supabase/seed.sql`](./supabase/seed.sql) in the SQL Editor to populate initial sample properties and members.

### Step 3: Setup Initial Super Admin (President) Account
1. In the Supabase Dashboard, navigate to **Authentication > Users** and click **Add User > Create User**.
2. Enter the HOA President's email (e.g. `president@stjosephvillage6.ph`) and a secure password.
3. Because the migration script includes the `handle_new_user()` trigger, the first registered user automatically becomes the **Super Admin** with all permissions enabled!

### Step 4: Configure Environment Variables
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```
Fill in your Supabase credentials found in **Project Settings > API**:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...

NEXT_PUBLIC_APP_NAME="St. Joseph Village 6 Phase 4 — Homeowners Masterlist"
NEXT_PUBLIC_COMMUNITY_NAME="St. Joseph Village 6 Phase 4 HOA"
```

---

## 🚢 Vercel Deployment Instructions

1. Push your repository to GitHub:
   ```bash
   git add .
   git commit -m "Initial commit of St. Joseph Village 6 Phase 4 HOA system"
   git push origin main
   ```
2. Go to [Vercel](https://vercel.com) and click **Add New Project**.
3. Import your GitHub repository `alpalist-hoa`.
4. In the **Environment Variables** section, add:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
5. Click **Deploy**. Vercel will build and deploy your full-stack Next.js app with automated CI/CD on every push.

---

## 📁 Project Structure

```
AlpalistHOA/
├── supabase/
│   ├── migrations/
│   │   └── 01_schema_and_rls.sql   # Postgres DDL, Triggers & RLS Policies
│   └── seed.sql                     # St. Joseph Village 6 Phase 4 seed data
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   └── login/               # Portal sign in & reset flow
│   │   ├── (dashboard)/
│   │   │   ├── page.tsx             # Executive Overview & Charts
│   │   │   ├── homeowners/
│   │   │   │   ├── page.tsx         # Masterlist data table
│   │   │   │   ├── new/             # Multi-section Add Homeowner form
│   │   │   │   └── [id]/edit/       # Edit Homeowner & Household members
│   │   │   ├── users/               # Super Admin User & Permissions console
│   │   │   └── activity/            # Board Audit trail
│   │   ├── globals.css
│   │   └── layout.tsx
│   ├── components/
│   │   ├── dashboard/               # Metric cards, Recharts demographics, activity
│   │   ├── homeowners/              # Table, dynamic form, details modal, archive dialog
│   │   ├── users/                   # Accounts table, permissions modal, create user
│   │   ├── layout/                  # Sidebar, Navbar, PageHeader
│   │   └── ui/                      # Button, Input, Select, Badge, Switch, Modal, Toast
│   ├── context/
│   │   └── app-context.tsx          # Real-time state store & Supabase synchronization
│   ├── lib/
│   │   ├── excel-export.ts          # Multi-sheet ExcelJS workbook exporter
│   │   ├── permissions.ts           # RBAC rules & 8 permission definitions
│   │   ├── utils.ts                 # Real-time age calc, phone formatting, validation
│   │   └── supabase/                # SSR client, server client, and middleware
│   └── middleware.ts                # Route authentication guard
```

---

## 📄 License & HOA Notice
Internal private software developed for the **Board of Directors and Homeowners of St. Joseph Village 6 Phase 4**. All rights reserved.
