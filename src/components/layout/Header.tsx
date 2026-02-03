'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth, usePermissions } from '@/providers/AuthProvider';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

const navigation = [
  { name: 'Map', href: '/map' },
  { name: 'Beverages', href: '/beverages' },
  { name: 'Recent Changes', href: '/recent-changes' },
];

const adminNavigation = [
  { name: 'Admin', href: '/admin' },
];

export function Header() {
  const pathname = usePathname();
  const { user, profile, isLoading, signOut } = useAuth();
  const { canManageUsers } = usePermissions();

  const allNavigation = canManageUsers
    ? [...navigation, ...adminNavigation]
    : navigation;

  const getInitials = (name: string | null | undefined) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Get display name with fallbacks
  const displayName = profile?.display_name || user?.user_metadata?.full_name || user?.email || 'User';

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        {/* Mobile menu */}
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="md:hidden">
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
              <span className="sr-only">Toggle menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[240px]">
            <nav className="flex flex-col gap-4 mt-4">
              {allNavigation.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'text-sm font-medium transition-colors hover:text-primary',
                    pathname === item.href
                      ? 'text-foreground'
                      : 'text-muted-foreground'
                  )}
                >
                  {item.name}
                </Link>
              ))}
            </nav>
          </SheetContent>
        </Sheet>

        {/* Logo */}
        <Link href="/" className="mr-6 flex items-center space-x-2">
          <span className="text-xl">🍺</span>
          <span className="hidden font-bold sm:inline-block">
            Alcohol Origins
          </span>
        </Link>

        {/* Desktop navigation */}
        <nav className="hidden md:flex items-center gap-6 text-sm">
          {allNavigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'transition-colors hover:text-foreground/80',
                pathname === item.href
                  ? 'text-foreground font-medium'
                  : 'text-foreground/60'
              )}
            >
              {item.name}
            </Link>
          ))}
        </nav>

        {/* Right side */}
        <div className="flex flex-1 items-center justify-end space-x-2">
          {isLoading ? (
            <div className="h-8 w-8 animate-pulse rounded-full bg-muted" />
          ) : user ? (
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger className="relative h-10 w-10 rounded-full overflow-hidden border-2 border-transparent hover:border-primary focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-all cursor-pointer">
                <Avatar className="h-full w-full">
                  <AvatarImage
                    src={profile?.avatar_url ?? undefined}
                    alt={profile?.display_name ?? 'User'}
                  />
                  <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                    {getInitials(displayName)}
                  </AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56" sideOffset={8}>
                <div className="flex items-center justify-start gap-2 p-2">
                  <div className="flex flex-col space-y-1 leading-none">
                    {profile?.display_name && (
                      <p className="font-medium">{profile.display_name}</p>
                    )}
                    <p className="w-[200px] truncate text-sm text-muted-foreground">
                      {profile?.email || user.email}
                    </p>
                    {profile?.role && (
                      <p className="text-xs text-muted-foreground capitalize">
                        {profile.role}
                      </p>
                    )}
                  </div>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => window.location.href = '/beverages/new'}
                  className="cursor-pointer"
                >
                  Add Beverage
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="cursor-pointer text-destructive focus:text-destructive"
                  onClick={() => signOut()}
                >
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="flex items-center gap-2">
              <Button variant="ghost" asChild>
                <Link href="/login">Sign in</Link>
              </Button>
              <Button asChild>
                <Link href="/register">Sign up</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
