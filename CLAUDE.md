# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

LunchLab is a Next.js 15 application for managing corporate meal plans, ingredients, and kitchen operations. It uses TypeScript, React, Supabase for data persistence, and Clerk for authentication.

## Development Commands

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm run start

# Run linting
npm run lint
```

## Architecture Overview

### Tech Stack
- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript with strict mode
- **Authentication**: Clerk
- **Database**: Supabase (PostgreSQL)
- **UI Components**: shadcn/ui with Radix UI
- **Styling**: Tailwind CSS
- **Email**: Resend with React Email
- **Forms**: React Hook Form with Zod validation

### Key Architectural Patterns

1. **Route Organization**: 
   - API routes in `app/api/` following RESTful patterns
   - Page routes in `app/` with nested layouts
   - Dynamic routes use `[id]` pattern

2. **Authentication Flow**:
   - Clerk middleware in `middleware.ts` protects routes
   - Public routes explicitly defined
   - Root path redirects to `/companies` if authenticated, `/sign-in` if not

3. **Data Layer**:
   - Supabase client created in `lib/supabase.ts`
   - Server-side operations use service role key
   - Type definitions in `types/supabase.ts`

4. **Component Structure**:
   - Shared UI components in `components/ui/`
   - Feature-specific components colocated with pages
   - Server components by default, client components marked with "use client"

## Next.js 15 Type Requirements

**CRITICAL**: This project uses Next.js 15 which has breaking changes in parameter handling:

1. **Route Handlers** (`app/api/*/route.ts`):
   ```typescript
   interface RouteContext {
     params: Promise<{ id: string }>  // Must be Promise
   }
   
   export async function GET(request: NextRequest, context: RouteContext) {
     const { id } = await context.params;  // Must await
   }
   ```

2. **Page Components** (`app/*/page.tsx`):
   ```typescript
   interface PageProps {
     params: Promise<{ id: string }>  // Must be Promise
   }
   
   export default async function Page({ params }: PageProps) {
     const { id } = await params;  // Must await
   }
   ```

See `manual/rules.md` for complete Next.js 15 type guidelines.

## Key Features & Modules

1. **Company Management** (`app/companies/`):
   - Multi-tenant architecture
   - Member roles: owner, admin, member
   - Invitation and join request systems

2. **Meal Planning** (`app/companies/[id]/meal-plans/`):
   - Calendar-based meal planning
   - Template system for recurring meals
   - Excel export functionality

3. **Ingredient Management** (`app/companies/[id]/ingredients/`):
   - Supplier tracking
   - Price history
   - Bulk import via CSV

4. **Menu System** (`app/companies/[id]/menus/`):
   - Container-based organization
   - Ingredient composition tracking
   - Price calculation

5. **Stock Management** (`app/companies/[id]/stock/`):
   - Warehouse tracking
   - Stock audits
   - Transaction history

6. **Cooking Plans** (`app/companies/[id]/cooking-plans/`):
   - Daily production planning
   - Order quantity calculations
   - Stock requirement analysis

## Database Schema Patterns

- Tables follow snake_case naming
- Foreign keys use `_id` suffix
- Timestamps: `created_at`, `updated_at`
- Soft deletes use `deleted_at`
- Row-level security (RLS) policies enforced

## Code Conventions

1. **TypeScript**: Use explicit types, avoid `any`
2. **Async/Await**: Prefer over promises
3. **Error Handling**: Use try-catch blocks in API routes
4. **Response Format**: Return consistent JSON structures
5. **Imports**: Use `@/` alias for project imports

## Testing Approach

Currently uses manual testing. When implementing tests:
- Unit tests for utilities
- Integration tests for API routes
- E2E tests for critical user flows

## Environment Variables

Required in `.env.local`:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `RESEND_API_KEY`

## Common Development Tasks

When adding new features:
1. Check existing patterns in similar modules
2. Follow the established file structure
3. Update types in appropriate `.ts` files
4. Ensure proper authentication checks
5. Test with `npm run build` before committing