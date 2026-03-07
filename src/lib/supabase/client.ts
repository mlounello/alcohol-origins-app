'use client';

import { createBrowserClient } from '@supabase/ssr';

export function getAppSchema() {
  return (
    process.env.APP_SCHEMA ||
    process.env.NEXT_PUBLIC_APP_SCHEMA ||
    process.env.NEXT_PUBLIC_SUPABASE_DB_SCHEMA ||
    'app_alcohol_origins'
  );
}

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export function createDbClient() {
  const supabase = createClient();
  const schema = getAppSchema();
  const db = supabase.schema(schema);
  return { supabase, db, schema };
}
