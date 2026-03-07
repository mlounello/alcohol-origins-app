import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export function getAppSchema() {
  return (
    process.env.APP_SCHEMA ||
    process.env.NEXT_PUBLIC_APP_SCHEMA ||
    process.env.NEXT_PUBLIC_SUPABASE_DB_SCHEMA ||
    'app_alcohol_origins'
  );
}

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  );
}

export async function createDbClient() {
  const supabase = await createClient();
  const schema = getAppSchema();
  if (process.env.DEBUG_DATA === 'true') {
    console.log('[DEBUG_DATA] resolved schema', schema);
  }
  const db = supabase.schema(schema);
  return { supabase, db, schema };
}
