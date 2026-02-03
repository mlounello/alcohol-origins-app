'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { Profile, UserRole } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import {
  Users,
  Shield,
  Loader2,
  Search,
  CheckCircle,
  AlertCircle,
  ArrowLeft,
} from 'lucide-react';
import Link from 'next/link';

const ROLES: UserRole[] = ['viewer', 'contributor', 'editor', 'admin'];

const ROLE_COLORS: Record<UserRole, string> = {
  viewer: 'bg-gray-100 text-gray-800',
  contributor: 'bg-blue-100 text-blue-800',
  editor: 'bg-green-100 text-green-800',
  admin: 'bg-purple-100 text-purple-800',
};

const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  viewer: 'Can view all data',
  contributor: 'Can create and edit entries',
  editor: 'Can revert changes and lock entries',
  admin: 'Full access including user management',
};

export default function UsersPage() {
  const { profile: currentUserProfile } = useAuth();
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const isAdmin = currentUserProfile?.role === 'admin';

  useEffect(() => {
    async function fetchUsers() {
      try {
        const response = await fetch('/api/admin/users');
        if (!response.ok) {
          throw new Error('Failed to fetch users');
        }
        const data = await response.json();
        setUsers(data);
      } catch (err) {
        console.error('Error fetching users:', err);
        setError(err instanceof Error ? err.message : 'Failed to load users');
      } finally {
        setLoading(false);
      }
    }

    if (isAdmin) {
      fetchUsers();
    } else {
      setLoading(false);
    }
  }, [isAdmin]);

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    if (userId === currentUserProfile?.id) {
      setStatus({ type: 'error', message: "You cannot change your own role" });
      return;
    }

    setUpdatingUserId(userId);
    setStatus(null);

    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update role');
      }

      const updatedUser = await response.json();
      setUsers(prev => prev.map(u => u.id === userId ? updatedUser : u));
      setStatus({ type: 'success', message: `Role updated to ${newRole}` });
    } catch (err) {
      console.error('Error updating role:', err);
      setStatus({ type: 'error', message: err instanceof Error ? err.message : 'Failed to update role' });
    } finally {
      setUpdatingUserId(null);
    }
  };

  const filteredUsers = users.filter(user => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      user.email.toLowerCase().includes(query) ||
      user.display_name?.toLowerCase().includes(query) ||
      user.role.toLowerCase().includes(query)
    );
  });

  if (!isAdmin) {
    return (
      <div className="container py-8 text-center">
        <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
        <p className="text-muted-foreground">Only administrators can manage users.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container py-8 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading users...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container py-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container py-8 max-w-6xl">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Admin
          </Link>
        </Button>
      </div>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Users className="h-8 w-8" />
            User Management
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage user roles and permissions
          </p>
        </div>
        <Badge variant="outline" className="text-sm">
          {users.length} users
        </Badge>
      </div>

      {status && (
        <Alert variant={status.type === 'error' ? 'destructive' : 'default'} className="mb-6">
          {status.type === 'success' ? (
            <CheckCircle className="h-4 w-4" />
          ) : (
            <AlertCircle className="h-4 w-4" />
          )}
          <AlertDescription>{status.message}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>All Users</CardTitle>
              <CardDescription>
                View and manage user roles. Changes take effect immediately.
              </CardDescription>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    {searchQuery ? 'No users match your search' : 'No users found'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-sm font-medium text-primary">
                            {user.display_name?.[0]?.toUpperCase() || user.email[0].toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium">
                            {user.display_name || 'No name'}
                            {user.id === currentUserProfile?.id && (
                              <span className="text-xs text-muted-foreground ml-2">(you)</span>
                            )}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {user.email}
                    </TableCell>
                    <TableCell>
                      <Badge className={ROLE_COLORS[user.role]}>
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(user.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      {user.id === currentUserProfile?.id ? (
                        <span className="text-sm text-muted-foreground">—</span>
                      ) : (
                        <Select
                          value={user.role}
                          onValueChange={(value) => handleRoleChange(user.id, value as UserRole)}
                          disabled={updatingUserId === user.id}
                        >
                          <SelectTrigger className="w-32">
                            {updatingUserId === user.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <SelectValue />
                            )}
                          </SelectTrigger>
                          <SelectContent>
                            {ROLES.map((role) => (
                              <SelectItem key={role} value={role}>
                                <div className="flex items-center gap-2">
                                  <Shield className="h-3 w-3" />
                                  {role}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-lg">Role Permissions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {ROLES.map((role) => (
              <div key={role} className="p-4 rounded-lg border">
                <Badge className={`${ROLE_COLORS[role]} mb-2`}>{role}</Badge>
                <p className="text-sm text-muted-foreground">{ROLE_DESCRIPTIONS[role]}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
