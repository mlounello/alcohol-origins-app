import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/providers/AuthProvider';
import { QueryProvider } from '@/providers/QueryProvider';
import { SettingsProvider } from '@/providers/SettingsProvider';
import { Header } from '@/components/layout/Header';
import { Toaster } from '@/components/ui/sonner';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

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
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen flex flex-col`}
      >
        <QueryProvider>
          <AuthProvider>
            <SettingsProvider>
              <Header />
              <main className="flex-1">{children}</main>
              <Toaster />
            </SettingsProvider>
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
