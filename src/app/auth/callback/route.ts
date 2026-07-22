import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

function getSafeRedirectPath(next: string | null): string {
  if (!next) {
    return '/';
  }

  if (!next.startsWith('/') || next.startsWith('//')) {
    return '/';
  }

  try {
    const parsed = new URL(next, 'http://localhost');
    if (parsed.origin !== 'http://localhost') {
      return '/';
    }

    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return '/';
  }
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type');
  const next = getSafeRedirectPath(searchParams.get('next'));

  if (code || (tokenHash && type)) {
    const cookieStore = await cookies();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          },
        },
      }
    );

    const { error } = code
      ? await supabase.auth.exchangeCodeForSession(code)
      : await supabase.auth.verifyOtp({
          token_hash: tokenHash!,
          type: type as 'magiclink' | 'recovery' | 'invite' | 'signup' | 'email_change' | 'email',
        });

    if (!error) {
      // Redirect with a cache-busting parameter to force client refresh
      const redirectUrl = new URL(next, origin);
      redirectUrl.searchParams.set('auth', 'success');

      const response = NextResponse.redirect(redirectUrl);

      // Set cache control headers to prevent caching
      response.headers.set('Cache-Control', 'no-store, max-age=0');

      return response;
    }

    console.error('Auth callback error:', error.message);
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/login?error=Could not authenticate`);
}
