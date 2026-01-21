# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Volleyball Club Fundraising Platform - a full-stack web application built with Next.js 15, React 19, TypeScript, PostgreSQL (Neon.Tech), and Stripe for payments.

## Common Commands

```bash
# Development
npm run dev              # Start dev server (localhost:3000)
npm run build            # Build for production
npm run start            # Start production server
npm run lint             # Run ESLint

# Database
npm run db:generate      # Generate Drizzle migrations
npm run db:migrate       # Apply migrations
npm run db:seed          # Seed with sample data (admin + 5 players)
npm run db:studio        # Open Drizzle Studio GUI

# Utilities
npm run add-player       # Interactive CLI script to add new player
```

## Architecture

### Tech Stack
- **Frontend**: Next.js 15 App Router, React 19, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL via Neon.Tech serverless, Drizzle ORM
- **Auth**: NextAuth.js with credentials provider, role-based access (admin/player)
- **Payments**: Stripe Payment Intents with webhook verification

### Code Organization

```
src/
├── app/                    # Next.js App Router
│   ├── api/                # API routes (auth, payment, squares)
│   ├── admin/              # Admin dashboard (analytics, player management)
│   ├── dashboard/          # Player dashboard (personal stats)
│   └── player/[id]/        # Public player fundraiser pages
├── components/             # React components
│   ├── admin/              # Admin-specific (stats, charts, player list)
│   ├── ui/                 # Reusable UI (heart-grid, progress-bar, navbar)
│   └── donation-modal.tsx  # Stripe payment modal
├── db/                     # Database layer
│   ├── schema.ts           # Drizzle schema with relations
│   ├── index.ts            # Neon connection + db instance
│   └── seed.ts             # Seed script
├── lib/                    # Utilities
│   ├── auth.ts             # NextAuth.js config
│   └── stripe.ts           # Stripe client & functions
└── middleware.ts           # Route protection (/dashboard, /admin)
```

### Database Schema

Four main tables with UUID primary keys:
- **users**: Authentication (email, passwordHash, role)
- **players**: Fundraiser profiles (userId FK, goal, totalRaised)
- **squares**: Grid positions for donations (playerId FK, positionX/Y, value, isPurchased)
- **donations**: Payment records (stripePaymentIntentId, status)

### Key Patterns

1. **Server/Client Components**: Pages use Server Components for data fetching; interactive components marked with `'use client'`
2. **Path alias**: `@/*` maps to `./src/*`
3. **Payment flow**: Create Stripe PaymentIntent → Client confirms → Webhook updates database
4. **Protected routes**: Middleware guards `/dashboard` and `/admin` based on user role
5. **Heart-shaped grid**: `heart-grid.tsx` renders donation squares algorithmically

### Environment Variables Required

- `DATABASE_URL` - Neon PostgreSQL connection string
- `NEXTAUTH_SECRET` - NextAuth.js secret
- `NEXTAUTH_URL` - Application URL
- `STRIPE_SECRET_KEY` - Stripe API key
- `STRIPE_WEBHOOK_SECRET` - Stripe webhook signing secret
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` - Stripe public key

### ESLint Configuration

Extends `next/core-web-vitals` with warnings for:
- `@typescript-eslint/no-explicit-any`
- `react-hooks/exhaustive-deps`
