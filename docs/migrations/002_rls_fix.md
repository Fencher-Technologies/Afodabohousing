# Migration 002 — RLS Infinite Recursion Fix & Schema Cleanup

## Applied: 2026-05-13

## Changes

### 1. RLS Infinite Recursion Fix

**Problem**: Admin override policies queried `profiles` directly using inline subqueries:

```sql
-- BEFORE (triggers RLS on profiles → infinite recursion)
CREATE POLICY "Admins can view all properties" ON properties
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
  );
```

When `auth.uid()` is NULL (unauthenticated requests — e.g., public listings), Postgres evaluates the subquery through `profiles` RLS, which itself checks `auth.uid() IS NOT NULL`, causing the policy evaluator to enter an infinite loop. The specific error is:

```
infinite recursion detected in policy for relation "profiles" (code 42P17)
```

**Fix**: Replaced all inline subqueries with the existing SECURITY DEFINER function `get_user_role()`, which bypasses RLS:

```sql
-- AFTER (bypasses RLS via SECURITY DEFINER function)
CREATE POLICY "Admins can view all properties" ON properties
  FOR SELECT USING (
    public.get_user_role(auth.uid()) = 'admin'
  );
```

**All admin policies updated**:
- `properties` (SELECT, UPDATE)
- `tenants` (SELECT)
- `leases` (SELECT)
- `payments` (SELECT, UPDATE)
- `maintenance_requests` (SELECT)
- `messages` (SELECT)
- `rental_units` (SELECT, UPDATE)

### 2. Tables Removed from Schema

The following tables have been confirmed as non-existent (dropped by prior migrations or never created):

| Table | Was used by | Status |
|---|---|---|
| `messages` | Tenant-Manager chat | ❌ Removed |
| `rental_units` | Sub-unit property management | ❌ Removed |
| `user_roles` | Role assignment (moved to `profiles.role`) | ❌ Removed (migration 001) |

**Backend impact**: No backend routers, models, or CRUD classes existed for these tables. No changes needed.

**Frontend impact**:
- All `supabase.from('messages')` calls removed (messaging feature)
- All `supabase.from('rental_units')` calls removed
- All `supabase.from('user_roles')` calls replaced with `profiles.role`

### 3. Role Type is TEXT, Not Enum

**Change**: `profiles.role` is now type `TEXT`, not `app_role` enum. The `get_user_role()` function returns `TEXT`.

**Backend**: All role comparisons use plain strings:
```python
# Python — no AppRole enum
role == "admin"       # ✓
role == "owner"       # ✓
role == "tenant"      # ✓
```

**Frontend**: TypeScript role types updated to plain string unions:
```typescript
type UserRole = 'admin' | 'owner' | 'tenant' | null;
```

### Verification

- Backend tests: 43/43 pass
- Ruff linter: clean
- Backend health: `GET /health` returns 200
- Auth signin: returns proper 401 with `Invalid login credentials`
- Public properties: `GET /properties/public` lists available properties
