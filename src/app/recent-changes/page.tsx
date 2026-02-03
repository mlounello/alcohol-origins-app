import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export default function RecentChangesPage() {
  return (
    <div className="container py-8">
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Recent Changes</h1>
          <p className="text-muted-foreground">
            See the latest edits and contributions to the database
          </p>
        </div>

        {/* Placeholder content */}
        <Card>
          <CardHeader>
            <CardTitle>Activity Feed</CardTitle>
            <CardDescription>
              Connect Supabase to view recent changes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Once connected, you&apos;ll see a feed of all recent edits including:
            </p>
            <ul className="list-disc list-inside space-y-1 mt-4 text-sm text-muted-foreground">
              <li>New beverages added</li>
              <li>Edits to existing entries</li>
              <li>Reverted changes</li>
              <li>User contributions</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
