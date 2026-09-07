# Migration Guide

## How Migrations Work

This project uses manual SQL migration files in `supabase/migrations/`. Migrations are applied to the live Supabase database via the Supabase MCP tools (`apply_migration`).

## Naming Convention

```
YYYYMMDD_description_in_underscore_case.sql
```

Examples:
- `20260907_add_payment_allocations.sql`
- `20260907_payment_allocations_member_pledge_fallback.sql`

## Applying Migrations

### To Live Database (Production)

Use the Supabase MCP `apply_migration` tool:
```
project_id: pvfdgrdvvoytsfmjyvde
name: descriptive_snake_case_name
query: <SQL content>
```

### To Local Development

Use the Supabase CLI:
```bash
supabase db reset  # Reset to fresh state
supabase migration up  # Apply pending migrations
```

## Creating a New Migration

1. Create a new file in `supabase/migrations/` with the naming convention above
2. Write the SQL (DDL for schema changes, DML for data changes)
3. Test on a branch or local Supabase first
4. Apply to live via MCP
5. Update this document's migration history table

## Migration Safety Rules

1. **Never drop columns** that the app code might still reference — add new columns first, deploy code, then drop old columns in a later migration
2. **Always use `IF EXISTS` / `IF NOT EXISTS`** for idempotent migrations where possible
3. **Notify PostgREST** after schema changes: `NOTIFY pgrst, 'reload schema';`
4. **Revoke elevated permissions** after creating functions: `REVOKE ALL ON FUNCTION ... FROM PUBLIC; GRANT EXECUTE TO authenticated;`
5. **Test allocation invariant** after any migration affecting `payment_allocations` or `donations`: `SELECT SUM(amount) FROM payment_allocations` must equal `SELECT SUM(amount) FROM donations`

## Common Patterns

### Adding a new table with RLS
```sql
CREATE TABLE public.new_table (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- columns
);

ALTER TABLE public.new_table ENABLE ROW LEVEL SECURITY;

CREATE POLICY "new_table_select" ON public.new_table
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "new_table_insert" ON public.new_table
  FOR INSERT WITH CHECK (get_my_role() IN ('admin', 'treasurer'));

NOTIFY pgrst, 'reload schema';
```

### Adding a new SQL function
```sql
CREATE OR REPLACE FUNCTION public.my_function(p_param TEXT)
RETURNS TABLE (col TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- logic
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.my_function FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.my_function TO authenticated;

NOTIFY pgrst, 'reload schema';
```

### Adding a new column (safe pattern)
```sql
-- Step 1: Add column with default
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS new_field TEXT DEFAULT 'default_value';

-- Step 2: (After code deployment) Remove default if needed
-- ALTER TABLE public.members ALTER COLUMN new_field DROP DEFAULT;
```
