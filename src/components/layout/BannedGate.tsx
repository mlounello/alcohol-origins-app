'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/providers/AuthProvider';
import { toast } from 'sonner';

const ALLOWED_PATHS = new Set(['/map', '/login', '/register']);

export function BannedGate({ children }: { children: React.ReactNode }) {
  const { profile } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (profile?.is_banned && !ALLOWED_PATHS.has(pathname)) {
      toast.error('Your account has been banned. You can only access the map.');
      router.replace('/map');
    }
  }, [profile?.is_banned, pathname, router]);

  if (profile?.is_banned && !ALLOWED_PATHS.has(pathname)) {
    return null;
  }

  return <>{children}</>;
}
