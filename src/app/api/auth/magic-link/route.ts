import { NextResponse } from 'next/server';
import {
  allowAlcoholMagicLinkRequest,
  sendAlcoholMagicLink,
} from '@/lib/auth/branded-magic-link';

function accepted() {
  return NextResponse.json(
    { ok: true },
    { status: 202, headers: { 'Cache-Control': 'no-store' } }
  );
}

export async function POST(request: Request) {
  const requestUrl = new URL(request.url);
  if (request.headers.get('origin') !== requestUrl.origin) return accepted();

  const payload = await request.json().catch(() => null) as { email?: unknown } | null;
  const email = typeof payload?.email === 'string' ? payload.email.trim().toLowerCase() : '';
  const clientAddress = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  if (!email || !allowAlcoholMagicLinkRequest(email, clientAddress)) return accepted();

  try {
    await sendAlcoholMagicLink(email, `${requestUrl.origin}/auth/callback`);
  } catch {
    console.error('[alcohol-magic-link] Request could not be completed.');
  }
  return accepted();
}
