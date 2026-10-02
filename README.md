# Hosmos

> Multi-tenant Hostel Management SaaS — Production-quality web application for managing hostel admissions, billing, electricity, payments, and resident communication.

## Monorepo Structure

```
hosmos/
  backend/      Node.js + TypeScript + Express + Drizzle ORM + PostgreSQL
  frontend/     Next.js 16 App Router + Tailwind CSS + shadcn/ui
  packages/
    types/      Shared TypeScript API types (frontend ↔ backend contract)
```

## Prerequisites

- Node.js ≥ 20
- npm ≥ 10
- PostgreSQL ≥ 15

## Quick Start

### 1. Clone and install

```bash
git clone <repo>
cd hosmos
```

Install all workspaces from the root:

```bash
npm install
```

### 2. Configure environment

```bash
# Backend
cp backend/.env.example backend/.env
# Edit backend/.env with your DATABASE_URL, JWT_SECRET, AADHAAR_ENCRYPTION_KEY, etc.

# Frontend
cp frontend/.env.example frontend/.env.local
# Edit frontend/.env.local with your NEXT_PUBLIC_API_URL
```

### 3. Create the database

```bash
# Using psql or your PostgreSQL client:
createdb hosmos_dev
```

### 4. Run migrations

```bash
npm run db:generate   # Generate Drizzle migration files from schema
npm run db:migrate    # Apply migrations to the database
```

### 5. Seed the first owner account

```bash
OWNER_EMAIL=owner@example.com OWNER_PASSWORD=SecurePass123! npm run seed:owner
```

### 6. Start development servers

```bash
# Terminal 1 — Backend API (port 3001)
npm run dev:backend

# Terminal 2 — Frontend (port 3000)
npm run dev:frontend
```

## Development Commands

| Command | Description |
|---|---|
| `npm run dev:backend` | Start backend with hot-reload (`tsx watch`) |
| `npm run dev:frontend` | Start Next.js dev server |
| `npm run test` | Run all workspace tests |
| `npm run lint` | Lint all workspaces |
| `npm run db:generate` | Generate Drizzle migration from schema changes |
| `npm run db:migrate` | Apply pending migrations |
| `npm run db:studio` | Open Drizzle Studio (visual DB browser) |
| `npm run seed:owner` | Create the first owner account |

## Architecture

- **Authentication**: JWT HS256 access tokens (15 min) + HttpOnly cookie refresh tokens (30 days)
- **Multi-tenancy**: Row-level isolation via `hostel_id` on all tenant-scoped tables
- **Financial data**: All monetary values stored as integer **paise** (1 paise = ₹0.01)
- **ORM**: Drizzle ORM with type-safe query builder
- **Validation**: Zod on both backend (all request inputs) and frontend (form inputs)

## Development Phases

| Phase | Scope | Status |
|---|---|---|
| 0 | Project setup, schema, utilities, layout shells | ✅ Complete |
| 1 | Authentication & authorization | ⬜ Next |
| 2 | Hostel / Owner / Manager foundation | ⬜ |
| 3 | Rooms and pricing models | ⬜ |
| 4 | Hosteller admission | ⬜ |
| 5 | Billing and advance rent | ⬜ |
| 6 | Payments | ⬜ |
| 7 | Meter readings and electricity billing | ⬜ |
| 8 | Hosteller portal | ⬜ |
| 9 | Exit and security deposit settlement | ⬜ |
| 10 | Hardening, security audit, production deploy | ⬜ |

## Security Notes

- Aadhaar numbers are encrypted at rest using AES-256-GCM
- Refresh tokens are stored as SHA-256 hashes — raw tokens are never persisted
- All monetary calculations use integer paise to avoid float precision errors
- CORS is restricted to configured origins only; never uses `*` in production
- All admin routes require Bearer token + role check + tenant isolation check

## PRD

The full Product Requirements Document is at `hosmos_prd.md` in the conversation artifacts directory.
