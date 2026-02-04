'use client';

import Link from 'next/link';
import { useAuth } from '@/providers/AuthProvider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Upload, Users, Database, Settings, Palette, CheckCircle2, Trash2 } from 'lucide-react';

export default function AdminPage() {
  const { profile } = useAuth();

  const isAdmin = profile?.role === 'admin';
  const isModerator = profile?.role === 'moderator';
  const hasAccess = isAdmin || isModerator;

  if (!hasAccess) {
    return (
      <div className="container py-8 text-center">
        <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
        <p className="text-muted-foreground">Only administrators and moderators can access this page.</p>
      </div>
    );
  }

  return (
    <div className="container py-8 max-w-4xl">
      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <Badge variant={isAdmin ? 'default' : 'secondary'}>
          {profile?.role}
        </Badge>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Import Data - Admin only */}
        {isAdmin && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Import Data
              </CardTitle>
              <CardDescription>
                Import beverages from CSV or Google Sheets
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild>
                <Link href="/admin/import">Go to Import</Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {/* User Management - Admin and Moderator */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              User Management
            </CardTitle>
            <CardDescription>
              {isAdmin
                ? 'Manage user roles and permissions'
                : 'Manage user roles (viewer, contributor, editor)'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <Link href="/admin/users">Manage Users</Link>
            </Button>
          </CardContent>
        </Card>

        {/* Group Management - Moderator and Admin */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Manage Groups
            </CardTitle>
            <CardDescription>
              Add, edit, and configure beverage group categories with colors
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <Link href="/admin/groups">Manage Groups</Link>
            </Button>
          </CardContent>
        </Card>

        {/* Approval Queue - Moderator and Admin */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5" />
              Approval Queue
            </CardTitle>
            <CardDescription>
              Review and approve contributor submissions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <Link href="/admin/approvals">Review Queue</Link>
            </Button>
          </CardContent>
        </Card>

        {/* Stale Submissions - Moderator and Admin */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5" />
              Stale Submissions
            </CardTitle>
            <CardDescription>
              Review and delete pending/rejected submissions older than 30 days
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <Link href="/admin/stale">View Stale</Link>
            </Button>
          </CardContent>
        </Card>

        {/* Database - Admin only */}
        {isAdmin && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Database
              </CardTitle>
              <CardDescription>
                View database statistics and manage data
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-2">
                Open Supabase Dashboard for full database access
              </p>
              <Button asChild variant="outline">
                <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer">
                  Supabase Dashboard
                </a>
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Settings - Admin only */}
        {isAdmin && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Settings
              </CardTitle>
              <CardDescription>
                Configure application settings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline">
                <Link href="/admin/settings">Configure Settings</Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
