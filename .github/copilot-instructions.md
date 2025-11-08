# AI Travel Planner - Copilot Instructions

## Project Overview
LoTus'AI assistant is a React + Supabase travel planning web app integrating DeepSeek LLM, iFlytek speech recognition, and AMap services. The frontend (`apps/web`) uses React + TypeScript + Vite; the backend relies on Supabase for Auth, Database, Storage, and Edge Functions (Deno runtime).

**Key Tech Stack**: React 19, TypeScript, Vite, Ant Design, @tanstack/react-query, Zustand, Supabase, Edge Functions (Deno)

## Architecture Principles

### Frontend-Backend Separation
- **Frontend**: Uses `VITE_SUPABASE_ANON_KEY` (safe to expose) for client operations via `apps/web/src/lib/supabaseClient.ts`
- **Backend**: Edge Functions use `SUPABASE_SERVICE_ROLE_KEY` (secret) via `supabase/functions/_shared/supabaseClient.ts`
- **Never** expose service role keys, DeepSeek API keys, or iFlytek secrets in frontend code

### Data Flow Pattern
1. Frontend calls Supabase client for CRUD (authenticated with anon key + RLS)
2. For AI/external API calls, frontend invokes Edge Functions via `lib/edgeFunctions.ts`
3. Edge Functions authenticate with service role and call external APIs
4. Edge Functions parse AI responses and write to database using `supabaseAdmin`

### Key Files
- `apps/web/src/lib/supabaseClient.ts` - Frontend Supabase client (anon key)
- `supabase/functions/_shared/supabaseClient.ts` - Backend admin client (service role)
- `apps/web/src/lib/edgeFunctions.ts` - Edge Function invocation wrappers
- `apps/web/src/lib/tripApi.ts` - Trip CRUD API layer
- `apps/web/src/contexts/AuthContext.tsx` - Auth state management

## Database Conventions

### Schema Structure
Key tables: `profiles`, `trips`, `trip_members`, `trip_days`, `trip_activities`, `expenses`, `voice_transcripts`

**Critical RLS Pattern**: All data access controlled by `user_can_access_trip(uuid)` function checking ownership or membership. See `supabase/migrations/20251106120000_initial_schema.sql` for reference.

### Migration Naming
Pattern: `YYYYMMDDHHMMSS_description.sql` (e.g., `20251107130000_rename_day_id_to_trip_day_id.sql`)

### Column Naming
- Use `snake_case` for database columns
- Use `camelCase` for TypeScript types
- Map between them in API layer (`apps/web/src/lib/tripApi.ts`)

Example mapping:
```typescript
// Database: start_date, end_date, party_size, budget_total
// TypeScript: startDate, endDate, partySize, budgetTotal
```

## State Management Patterns

### React Query for Server State
All server data fetched via React Query hooks in `apps/web/src/hooks/`:
- `useTripsQuery()` - Queries with 5min stale time
- `useCreateTripMutation()` - Mutations that invalidate queries
- Always invalidate related queries after mutations: `queryClient.invalidateQueries({ queryKey: ['trips'] })`

### Zustand for Client State
Persistent local state via Zustand with `persist` middleware:
- `useTripStore` - Current trip selection & cached trip summaries
- `useBudgetStore` - Budget UI state
- `useVoiceStore` - Voice recording state
- Store names follow pattern: `lotus-{feature}-store`

**When to use which**:
- React Query: API data, needs cache invalidation
- Zustand: UI state, form state, selections that need persistence

## Component Organization

### Module Structure
Modules live in `apps/web/src/modules/{feature}/` with:
- `pages/` - Route-level components (lazy loaded)
- `hooks/` - Feature-specific hooks
- No shared components in modules; use `apps/web/src/components/` for shared

### Routing Pattern
Routes defined in `apps/web/src/routes/index.tsx`:
- All routes use lazy loading: `lazy(() => import('./modules/...'))`
- Protected routes wrapped in `<ProtectedRoute>` checking auth state
- Use `withSuspense()` wrapper for loading fallback

### Component Conventions
- Use Ant Design components (`antd`), not custom CSS when possible
- Icons from `@ant-design/icons`
- Date handling with `dayjs` (Ant Design's peer dependency)
- Form validation via Ant Design `Form` component

## Edge Function Development

### File Structure
```
supabase/functions/{function-name}/
  index.ts           # Main handler
supabase/functions/_shared/
  supabaseClient.ts  # Shared admin client
```

### Critical Patterns
1. **Deno Runtime**: Use Deno-compatible imports (esm.sh CDN)
   ```typescript
   import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
   ```

2. **Environment Access**:
   ```typescript
   declare const Deno: { env: { get: (key: string) => string | undefined } }
   const apiKey = Deno.env.get('DEEPSEEK_API_KEY')
   ```

3. **Error Handling**: Log errors but don't expose internals to client
   ```typescript
   console.error('[function-name] Error:', error)
   return new Response('Internal server error', { status: 500 })
   ```

4. **AI Response Parsing**: See `supabase/functions/plan-itinerary/index.ts` for pattern:
   - Extract JSON from markdown code blocks
   - Validate required fields
   - Use transactions for multi-record inserts
   - Save raw AI response to `voice_transcripts` for debugging

## Environment Variables

### Frontend (`.env.local`)
```bash
VITE_SUPABASE_URL=https://*.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...  # Safe to expose
VITE_AMAP_WEB_KEY=*            # Low-privilege web key
VITE_IFLYTEK_APP_ID=*          # For frontend signature generation
```

### Edge Functions (Supabase Secrets)
```bash
supabase secrets set \
  SUPABASE_SERVICE_ROLE_KEY=eyJ... \
  DEEPSEEK_API_KEY=sk-... \
  IFLYTEK_API_KEY=... \
  IFLYTEK_API_SECRET=... \
  AMAP_REST_API_KEY=...  # High-privilege server key
```

**Never commit secrets**. `.env`, `.env.local`, `supabase/.env` are gitignored.

## Development Workflow

### Running Locally
```bash
cd apps/web
npm install
npm run dev      # Starts Vite dev server on :5173
npm run build    # TypeScript compile + production build
npm run lint     # ESLint check
```

### Deploying Edge Functions
```bash
supabase functions deploy plan-itinerary
supabase functions deploy speech-signature
supabase functions deploy budget-sync
```

### Database Migrations
```bash
# Create new migration
supabase migration new description_of_change

# Apply migrations locally (requires Docker)
supabase db reset

# Deploy to production
supabase db push
```

## Type Safety Best Practices

### API Layer Types
Define separate input/output types in `apps/web/src/types/`:
```typescript
// trip.ts
export type Trip = { /* DB columns with camelCase */ }
export type TripInput = Omit<Trip, 'id' | 'created_at' | 'updated_at'>
export type TripWithDetails = Trip & { trip_days: TripDay[] }
```

### Edge Function Types
Define request/response types in `lib/edgeFunctions.ts`:
```typescript
export type PlanItineraryRequest = { prompt: string; tripId?: string }
export type PlanItineraryResponse = { trip_id: string | null; parse_error: string | null }
```

## Common Pitfalls to Avoid

1. **Don't use service role key in frontend** - Always proxy through Edge Functions
2. **Don't bypass RLS** - Use `supabaseAdmin` only in Edge Functions, not in frontend
3. **Don't ignore React Query cache** - Always invalidate after mutations
4. **Don't hardcode Supabase URL** - Use `import.meta.env.VITE_SUPABASE_URL`
5. **Schema changes need migrations** - Don't manually edit production tables
6. **Trip foreign keys**: Activities reference `trip_day_id` (not `day_id`), see migration `20251107130000_rename_day_id_to_trip_day_id.sql`

## AI Integration Patterns

### DeepSeek System Prompt (plan-itinerary)
Must specify exact JSON structure in system message, including:
- Required fields: `title`, `destination`, `days[]`
- Each day has: `dayIndex`, `date`, `summary`, `activities[]`
- Each activity has: `title`, `location`, `startTime`, `endTime`, `category`, `estimatedCost`

### Response Parsing
```typescript
// Try direct parse first, then extract from markdown ```json blocks
try {
  itinerary = JSON.parse(content)
} catch {
  const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/)
  itinerary = JSON.parse(jsonMatch[1])
}
```

### Error Handling
Return both `trip_id` (success) and `parse_error` (failure) so frontend can handle gracefully.

## Testing & Quality

### Pre-commit Checklist
- `npm run lint` passes with 0 errors
- `npm run build` compiles successfully
- TypeScript errors resolved (`tsc -b`)
- Test auth flow: signup → login → logout
- Test data persistence: create → refresh → verify exists

### Key Test Scenarios
1. Create trip → verify in Supabase dashboard
2. Edit trip → refresh → changes persist
3. Delete trip → verify cascade deletes trip_days and trip_activities
4. Voice generate trip → auto-navigate to detail page
5. Logout → login → trips still visible

## Quick Reference

### Adding a New Feature Module
1. Create `apps/web/src/modules/{feature}/pages/{Feature}Page.tsx`
2. Add route in `apps/web/src/routes/index.tsx` with lazy import
3. Create API functions in `apps/web/src/lib/{feature}Api.ts`
4. Define types in `apps/web/src/types/{feature}.ts`
5. Add React Query hooks in `apps/web/src/hooks/use{Feature}Query.ts`
6. Update nav menu in `apps/web/src/components/AppLayout.tsx`

### Adding a New Edge Function
1. Create `supabase/functions/{name}/index.ts`
2. Import shared client: `import { supabaseAdmin } from '../_shared/supabaseClient.ts'`
3. Add types to `apps/web/src/lib/edgeFunctions.ts`
4. Add invocation wrapper: `export const callFunction = async (req) => { ... }`
5. Deploy: `supabase functions deploy {name}`

### Common Commands
```bash
# Frontend
cd apps/web && npm run dev
npm run build
npm run lint

# Edge Functions
supabase functions serve {name}        # Local testing
supabase functions deploy {name}       # Deploy to production
supabase secrets list                  # View secrets

# Database
supabase migration new {name}          # Create migration
supabase db reset                      # Reset local DB
supabase db push                       # Push to production
```

## Current Project Status (Nov 7, 2025)
- ✅ Auth, RLS, Trip CRUD, AI itinerary generation, budget tracking
- 🚧 Voice recognition integration, map route planning, calendar view
- 📋 Next priorities: Trip activity editor, drag-drop reordering, trip sharing

For detailed implementation notes, see `docs/IMPLEMENTATION_SUMMARY.md`.
