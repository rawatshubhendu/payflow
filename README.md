# PayFlow

Invoice and payment collection SaaS for Indian freelancers and small agencies.

**Get paid. Without chasing clients.**

This repository is a production-oriented monorepo. Slice 1 is architecture, health, and UI shell only. Auth, invoices, and payments are not implemented yet.

## Apps

- `apps/web` — Next.js (App Router) marketing site and product UI
- `apps/api` — Express API
- `packages/types` — shared TypeScript types
- `packages/validation` — shared Zod schemas

## Local setup

1. Copy environment variables:

```bash
cp .env.example .env
```

2. Use a MongoDB URI in `.env` (`MONGODB_URI`). Local MongoDB or MongoDB Atlas both work. The API starts even if the database is down; `/health` will report `degraded`.

3. Install and run:

```bash
npm install
npm run dev:api
npm run dev:web
```

- Web: http://localhost:3000
- API health: http://localhost:4000/health

## Current slice

Done:

- Monorepo, TypeScript, lint, env validation
- API health endpoint and MongoDB connection
- Marketing landing page
- App shell matching the product screens (empty states, not fake live data)

Next:

- Authentication (HTTP-only sessions, register/login/verify/reset)
- Business profile and tenant authorization
- Customer and invoice CRUD
