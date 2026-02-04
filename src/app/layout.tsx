import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/providers/AuthProvider';
import { QueryProvider } from '@/providers/QueryProvider';
import { SettingsProvider } from '@/providers/SettingsProvider';
import { GroupsProvider } from '@/providers/GroupsProvider';
import { Header } from '@/components/layout/Header';
import { BannedGate } from '@/components/layout/BannedGate';
import { Toaster } from '@/components/ui/sonner';

export const metadata: Metadata = {
  title: 'Alcohol Origins - Interactive Map of Beverage History',
  description:
    'Explore the geographic origins and evolution of alcoholic beverages throughout history. A collaborative wiki-style map tracing the family tree of beer, wine, spirits, and more.',
  keywords: [
    'alcohol',
    'beer',
    'wine',
    'spirits',
    'history',
    'map',
    'origins',
    'fermentation',
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Google Fonts - Brand Typography */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;600;700&family=Gudea:wght@400;700&family=Merriweather:wght@300;400;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased min-h-screen flex flex-col">
        <QueryProvider>
          <AuthProvider>
            <SettingsProvider>
              <GroupsProvider>
                <Header />
                <main className="flex-1">
                  <BannedGate>{children}</BannedGate>
                </main>
                <Toaster />
              </GroupsProvider>
            </SettingsProvider>
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
