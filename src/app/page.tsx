import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function HomePage() {
  return (
    <div className="flex flex-col">
      {/* Hero section - will be replaced with map */}
      <div className="relative flex-1 min-h-[calc(100vh-3.5rem)] bg-muted/30">
        {/* Placeholder for map */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center space-y-6 p-8">
            <div className="text-6xl">🗺️</div>
            <h1 className="text-4xl font-bold tracking-tight">
              Alcohol Origins Map
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl">
              Explore the geographic origins and evolution of alcoholic beverages
              throughout history. Trace the family tree of beer, wine, spirits,
              and more.
            </p>
            <div className="flex gap-4 justify-center">
              <Button asChild size="lg">
                <Link href="/beverages">Browse Beverages</Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/register">Join & Contribute</Link>
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Interactive map coming soon. Connect Supabase to enable full functionality.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
