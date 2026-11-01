# Hosmos — Multi-Tenant Hostel Management SaaS & Operating System

[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-16_App_Router-000000?style=flat&logo=next.js&logoColor=white)](https://nextjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20+-339933?style=flat&logo=node.js&logoColor=white)](https://nodejs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-4169E1?style=flat&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Drizzle ORM](https://img.shields.io/badge/Drizzle_ORM-0.36-C5F74F?style=flat&logo=drizzle&logoColor=black)](https://orm.drizzle.team/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?style=flat&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)

> **Enterprise-grade, full-stack multi-tenant SaaS built to digitize residential hostel operations.** Replaces paper registers, informal cash tracking, and manual electricity calculations with an auditable, financially precise, and secure digital operating system.

---

## 🌟 Executive Overview

Residential hostels typically operate on manual spreadsheets and handwritten notebooks: admissions, informal advance payments, room changes, monthly bills, and sub-meter electricity divisions are error-prone and lack an audit trail.

**Hosmos** solves this with an end-to-end platform engineered for financial correctness, strict multi-tenant isolation, and dual-facing self-service portals (Administration & Residents).

---

## 🚀 Key Engineering & Architectural Highlights

### 1. 💰 Financial Precision & Proration Engine
- **Zero Floating-Point Drift**: All financial figures across the database, APIs, and interfaces are modeled strictly in integer **paise** ($1\text{ INR} = 100\text{ paise}$).
- **Dynamic Admission Proration**: When residents arrive mid-month, a dedicated algorithm computes the prorated rent for the remainder of the month based on calendar days ($(\text{Monthly Rate} / \text{Days in Month}) \times \text{Days Remaining}$).
- **Multi-Month Advance Rent Allocation**: The system automatically registers advance payments (e.g., 3 months prepaid) and schedules monthly allocations so future billing cycles deduct prepaid periods automatically without human intervention.
- **ACID Transaction Boundaries**: Admissions, payments, bill adjustments, and exit settlements execute within atomic database transactions with automatic rollback guarantees.

### 2. 🔐 Security & Data Privacy at Rest
- **AES-256-GCM Aadhaar Encryption**: Government identity (Aadhaar) numbers are encrypted at rest using AES-256-GCM with a 256-bit secret and unique IVs. Plaintext Aadhaar numbers are never exposed in API payloads or client-side bundles.
- **JWT + Hashed Refresh Token Rotation**: Dual-token authentication with short-lived access tokens (15 minutes) and HttpOnly refresh cookies (30 days). Refresh tokens are stored in PostgreSQL exclusively as **SHA-256 hashes**. Any attempt to reuse a revoked token triggers immediate session termination across all devices.
- **Brute-Force & Rate Limiting**: Tiered rate limiters (Express Rate Limit) defend auth, OTP generation, and general API routes against credential stuffing.

### 3. 🏢 Multi-Tenancy & 3-Tier Role-Based Access Control (RBAC)
- **Tenant Isolation**: Row-level tenant partitioning enforces that every database query is scoped by `hostel_id`, preventing any cross-tenant data leakage.
- **Slug-Based Clean URLs**: Hostels are organized by clean human-readable slugs (e.g. `/[hostelSlug]/dashboard`, `/[hostelSlug]/rooms`).
- **Three Distinct User Personas**:
  - **Owner**: Full administrative sovereignty over all properties, manager assignments, pricing tiers, and global financials.
  - **Manager**: Day-to-day operations scoped to assigned properties (admitting residents, logging sub-meters, generating invoices, recording payments) with explicit restrictions preventing manager creation/deletion or room destruction.
  - **Hosteller (Resident)**: Read-only personal portal for real-time dues, itemized invoices, sub-meter readings, roommate directory, and payment receipts.

### 4. ⚡ Room Sub-Meter Electricity Division Engine
- Sub-meter electricity readings are recorded cyclically with meter-reset detection.
- The engine calculates total kilowatt-hour ($\text{kWh}$) consumption and automatically splits the bill evenly among active residents in the room for that cycle.
- Generates itemized billing line items directly onto the hosteller's monthly invoice.

### 5. 🚪 End-to-End Departure & Exit Settlement Workflow
- Handles departure lifecycles across 3 formal exit categories: *Normal Exit*, *Early Exit with Notice*, and *Immediate Exit without Notice*.
- Reconciles security deposits against room damages, outstanding bills, and proration to determine the net refund or balance payable.
- Atomically closes room occupancy and transitions resident status upon settlement.

### 6. ✉️ Automated Email Verification & Password Recovery
- Built-in **Nodemailer** integration providing responsive, branded HTML emails.
- **Resident Onboarding**: 6-digit cryptographic OTP verification prevents unauthorized account activation.
- **Self-Service Password Reset**: Secure OTP-based reset flow for owners, managers, and residents with request cooldowns and attempt caps.

---

## 🏛️ Monorepo Architecture

The codebase is organized as an **npm workspace monorepo** ensuring contract-first type safety between client and server:

```
hosmos/
├── packages/
│   └── types/          # Shared TypeScript DTOs, interfaces, and request/response contracts
├── backend/            # Express.js REST API with Drizzle ORM & PostgreSQL
│   ├── src/
│   │   ├── config/     # Zod-validated environment configurations
│   │   ├── db/         # Drizzle schemas, migrations, relations, and seeds
│   │   ├── modules/    # Domain modules (auth, admissions, billing, meters, exits, portal)
│   │   ├── middlewares/# JWT auth, RBAC guards, rate-limiters, error handler
│   │   └── utils/      # Crypto (AES-256-GCM, bcrypt), mailer (Nodemailer), proration
└── frontend/           # Next.js 16 App Router web application
    ├── src/
    │   ├── app/        # (auth), (admin), (portal) route groups
    │   ├── components/ # Reusable UI components built with Tailwind CSS & shadcn/ui
    │   ├── contexts/   # Global Auth & State Context
    │   └── lib/        # Type-safe API client wrapper & query hooks
```

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend Framework** | Next.js 16 (App Router, Server & Client Components), React 19 |
| **Styling & UI** | Tailwind CSS, shadcn/ui, Lucide Icons, Class Variance Authority |
| **State & Data Fetching** | TanStack React Query v5 (automatic caching, refetching, and query invalidation) |
| **Backend Framework** | Node.js (v20+), Express.js (v4.21), TypeScript (ESM) |
| **Database & ORM** | PostgreSQL 15+, Drizzle ORM, Drizzle Kit migrations |
| **Database Hosting** | Supabase / Neon (Serverless connection pooling via PgBouncer / Supavisor) |
| **Security & Crypto** | AES-256-GCM, SHA-256 token hashing, bcryptjs, Helmet, HttpOnly Cookies |
| **Validation** | Zod (End-to-end schema validation on both incoming HTTP requests & client forms) |
| **Email Delivery** | Nodemailer (SMTP with fallback dev stream logger) |

---

## 📱 Core User Portals & Features

```
┌────────────────────────────────────────────────────────────────────────┐
│                              HOSMOS PLATFORM                           │
├───────────────────────────────────┬────────────────────────────────────┤
│         ADMINISTRATION            │          RESIDENT PORTAL           │
│       (Owner & Managers)          │            (Hostellers)            │
├───────────────────────────────────┼────────────────────────────────────┤
│ • Portfolio Dashboard             │ • Resident Dashboard               │
│ • Hosteller Admission Engine      │ • Active Room & Bed Info           │
│ • Room Inventory & Floor Mapping  │ • Roommate Directory               │
│ • Tiered Pricing Configuration    │ • Itemized Bills (Rent/Power/Fine) │
│ • Monthly Bill Batch Generation   │ • Sub-Meter Electricity Logs       │
│ • Sub-Meter Utility Readings      │ • Payment Receipts & UTR History   │
│ • Cash / UPI / Cheque Ledger      │ • Email OTP Account Activation     │
│ • Departure & Deposit Settlement  │ • Self-Service Password Recovery   │
└───────────────────────────────────┴────────────────────────────────────┘
```

---

## 🧪 Testing & Verification

- **Strict Type Checking**: 100% TypeScript compilation clean across all packages (`tsc --noEmit` with 0 errors).
- **Unit & Integration Suite**: Vitest test suites verifying financial proration calculations, date edge cases, and token expiration logic.
- **Contract Enforcement**: Frontend forms (React Hook Form + Zod) mirror the exact DTO contracts defined in `@hosmos/types`.

---

## 📄 License & Intellectual Property

Proprietary Software. Developed by **Kaushlendra Pathe** as a commercial-grade SaaS prototype for modern residential properties. All rights reserved.
