# AGENTS.md

Guidelines for collaborative development on this codebase, whether by multiple developers or AI agents working together.

## Work Division by Domain

### Frontend Agent
**Scope**: `src/components/`, `src/app/**/page.tsx`, `src/app/globals.css`
- React components and UI logic
- Tailwind CSS styling (pink/white/black color scheme)
- Client-side interactivity (`'use client'` components)
- Form handling and user feedback

**Dependencies**: Needs API contracts from Backend Agent

### Backend Agent
**Scope**: `src/app/api/`, `src/lib/`, `src/middleware.ts`
- API route handlers
- Authentication logic (NextAuth.js)
- Payment processing (Stripe)
- Business logic and validation

**Dependencies**: Needs schema from Database Agent

### Database Agent
**Scope**: `src/db/`, `drizzle.config.ts`
- Schema changes and migrations
- Seed data management
- Query optimization
- Database relationships

**Dependencies**: None (foundational layer)

## Coordination Rules

### Before Starting Work
1. Check which files are being modified by other agents
2. Avoid simultaneous edits to the same file
3. Database schema changes must be coordinated first

### Shared Files (Require Coordination)
- `src/db/schema.ts` - Schema changes affect all layers
- `src/lib/auth.ts` - Auth changes affect routes and components
- `src/middleware.ts` - Route protection affects all protected pages
- `package.json` - Dependency changes affect everyone

### Safe Parallel Work
These areas can be worked on independently:
- Individual page components (`src/app/*/page.tsx`)
- Individual API routes (`src/app/api/*/route.ts`)
- UI components in `src/components/ui/`
- Admin components in `src/components/admin/`

## Conventions

### File Naming
- Components: PascalCase (`HeartGrid.tsx` or `heart-grid.tsx`)
- API routes: `route.ts` in appropriate directory
- Utilities: camelCase (`utils.ts`, `stripe.ts`)

### Code Style
- Use TypeScript strict mode
- Prefer Server Components; add `'use client'` only when needed
- Use `@/` path alias for imports from `src/`
- Handle errors with try/catch in API routes

### Database Changes
1. Modify `src/db/schema.ts`
2. Run `npm run db:generate` to create migration
3. Run `npm run db:migrate` to apply
4. Update seed data if needed (`src/db/seed.ts`)

### API Contracts
When creating/modifying API routes, document:
- HTTP method and path
- Request body shape
- Response shape
- Error responses

Example:
```typescript
// POST /api/squares/[id]
// Request: { donorName?: string, isAnonymous?: boolean }
// Response: { success: true, square: Square }
// Errors: 400 (invalid data), 404 (square not found), 500 (server error)
```

## Verification Checklist

Before considering work complete:
- [ ] `npm run build` passes without errors
- [ ] `npm run lint` passes (warnings acceptable per ESLint config)
- [ ] Database migrations generated if schema changed
- [ ] Environment variables documented if new ones added
- [ ] API changes backward compatible or coordinated

## Communication Patterns

### Handoff Format
When handing off work to another agent:
```
## Completed
- [List of completed items]

## Files Modified
- [List of files with brief description of changes]

## Pending/Blocked
- [Any items that couldn't be completed and why]

## Notes for Next Agent
- [Important context or decisions made]
```

### Dependency Requests
When requesting work from another agent:
```
## Request
[Clear description of what's needed]

## Context
[Why this is needed]

## Acceptance Criteria
[How to verify the request is fulfilled]
```

## Common Workflows

### Adding a New Feature
1. **Database Agent**: Add schema if needed, generate migration
2. **Backend Agent**: Create API routes
3. **Frontend Agent**: Build UI components and pages

### Fixing a Bug
1. Identify which layer the bug originates from
2. Assign to appropriate agent
3. Verify fix doesn't break other layers

### Adding a New Page
1. Create page component in `src/app/[route]/page.tsx`
2. Add to navbar if needed (`src/components/ui/navbar.tsx`)
3. Add route protection in middleware if auth required

### Adding a New API Endpoint
1. Create route file in `src/app/api/[endpoint]/route.ts`
2. Define request/response types
3. Add authentication check if needed (use `getServerSession`)
4. Return appropriate status codes

## Environment Setup

Each agent should ensure:
- Node.js 18+ installed
- `.env` file configured with required variables
- `npm install` completed
- Database accessible (`npm run db:studio` to verify)
