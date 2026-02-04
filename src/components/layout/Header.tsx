'use client';

import Link from 'next/link';
import Image from 'next/image';
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
  { name: 'Groups', href: '/groups' },
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
    <header className="sticky top-0 z-50 w-full border-b border-brand-gray/30 bg-brand-gradient text-white shadow-md">
      <div className="container flex h-16 items-center">
        {/* Mobile menu */}
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="md:hidden text-white hover:bg-white/10">
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
          <SheetContent side="left" className="w-[280px] bg-brand-gradient border-r-0">
            <div className="flex items-center gap-3 mb-6 pt-2">
              <Image
                src="/logo-square.png"
                alt="Alcohol Origins"
                width={40}
                height={40}
                className="rounded"
              />
              <span className="font-headline text-lg text-white uppercase tracking-wide">
                Alcohol Origins
              </span>
            </div>
            <nav className="flex flex-col gap-2">
              {allNavigation.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'text-sm font-medium transition-colors px-3 py-2 rounded-md',
                    pathname === item.href
                      ? 'bg-white/20 text-white'
                      : 'text-white/80 hover:bg-white/10 hover:text-white'
                  )}
                >
                  {item.name}
                </Link>
              ))}
            </nav>
          </SheetContent>
        </Sheet>

        {/* Logo */}
        <Link href="/" className="mr-8 flex items-center gap-3 group">
          <Image
            src="/logo-square.png"
            alt="Alcohol Origins"
            width={40}
            height={40}
            className="rounded transition-transform group-hover:scale-105"
          />
          <div className="hidden sm:flex flex-col">
            <span className="font-headline text-lg uppercase tracking-wide leading-tight text-white">
              Alcohol Origins
            </span>
            <span className="text-[10px] text-white/70 uppercase tracking-widest">
              Interactive Map
            </span>
          </div>
        </Link>

        {/* Desktop navigation */}
        <nav className="hidden md:flex items-center gap-1">
          {allNavigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'px-4 py-2 rounded-md text-sm font-medium transition-all',
                pathname === item.href
                  ? 'bg-white/20 text-white'
                  : 'text-white/80 hover:bg-white/10 hover:text-white'
              )}
            >
              {item.name}
            </Link>
          ))}
        </nav>

        {/* Right side */}
        <div className="flex flex-1 items-center justify-end space-x-3">
          {isLoading ? (
            <div className="h-9 w-9 animate-pulse rounded-full bg-white/20" />
          ) : user ? (
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger className="relative h-10 w-10 rounded-full overflow-hidden border-2 border-white/30 hover:border-brand-gold focus:outline-none focus:ring-2 focus:ring-brand-gold focus:ring-offset-2 focus:ring-offset-brand-green transition-all cursor-pointer">
                <Avatar className="h-full w-full">
                  <AvatarImage
                    src={profile?.avatar_url ?? undefined}
                    alt={profile?.display_name ?? 'User'}
                  />
                  <AvatarFallback className="bg-brand-gold text-brand-green-dark text-sm font-bold">
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
                      <p className="text-xs text-brand-green capitalize font-medium">
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
                  className="cursor-pointer text-brand-red focus:text-brand-red"
                  onClick={() => signOut()}
                >
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                asChild
                className="text-white/90 hover:text-white hover:bg-white/10"
              >
                <Link href="/login">Sign in</Link>
              </Button>
              <Button
                asChild
                className="bg-brand-gold text-brand-green-dark hover:bg-brand-gold/90 font-semibold"
              >
                <Link href="/register">Sign up</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
