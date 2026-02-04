'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/providers/AuthProvider';
import { useGroups } from '@/providers/GroupsProvider';
import { BeverageGroupConfig } from '@/types/database';
import { getContrastTextColor } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  ArrowLeft,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Palette,
  GripVertical,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';

interface GroupFormData {
  name: string;
  description: string;
  color: string;
}

export default function GroupsManagementPage() {
  const { profile } = useAuth();
  const { groups, refreshGroups } = useGroups();

  const [editingGroup, setEditingGroup] = useState<BeverageGroupConfig | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deletingGroup, setDeletingGroup] = useState<BeverageGroupConfig | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [formData, setFormData] = useState<GroupFormData>({
    name: '',
    description: '',
    color: '#808080',
  });

  const isModerator = profile && ['moderator', 'admin'].includes(profile.role);
  const isAdmin = profile?.role === 'admin';

  if (!isModerator) {
    return (
      <div className="container py-8 text-center">
        <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
        <p className="text-muted-foreground">
          Only moderators and admins can manage groups.
        </p>
      </div>
    );
  }

  const openCreate = () => {
    setFormData({ name: '', description: '', color: '#808080' });
    setIsCreateOpen(true);
    setEditingGroup(null);
  };

  const openEdit = (group: BeverageGroupConfig) => {
    setFormData({
      name: group.name,
      description: group.description,
      color: group.color,
    });
    setEditingGroup(group);
    setIsCreateOpen(true);
  };

  const openDelete = (group: BeverageGroupConfig) => {
    setDeletingGroup(group);
    setIsDeleteOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error('Group name is required');
      return;
    }

    setSaving(true);
    try {
      const url = editingGroup
        ? `/api/groups/${editingGroup.id}`
        : '/api/groups';
      const method = editingGroup ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save group');
      }

      toast.success(editingGroup ? 'Group updated!' : 'Group created!');
      setIsCreateOpen(false);
      setEditingGroup(null);
      await refreshGroups();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save group');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingGroup) return;

    setDeleting(true);
    try {
      const response = await fetch(`/api/groups/${deletingGroup.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete group');
      }

      toast.success('Group deleted');
      setIsDeleteOpen(false);
      setDeletingGroup(null);
      await refreshGroups();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete group');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="container py-8 max-w-4xl">
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
            <Palette className="h-8 w-8" />
            Manage Groups
          </h1>
          <p className="text-muted-foreground mt-1">
            Add, edit, and configure beverage groups with names, descriptions, and colors
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Add Group
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Beverage Groups</CardTitle>
          <CardDescription>
            Groups categorize beverages by their base ingredient. The color is used on the map, badges, and family tree lines.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {groups.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No groups configured. Add your first group to get started.
            </p>
          ) : (
            <div className="space-y-3">
              {groups.map((group) => {
                const textColor = getContrastTextColor(group.color);
                return (
                  <div
                    key={group.id}
                    className="flex items-start gap-4 p-4 rounded-lg border hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex-shrink-0 mt-1">
                      <GripVertical className="h-5 w-5 text-muted-foreground/40" />
                    </div>

                    {/* Color preview */}
                    <div
                      className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center text-xs font-bold"
                      style={{
                        backgroundColor: group.color,
                        color: textColor,
                        border: group.color === '#FFFFFF' ? '1px solid #ccc' : 'none',
                      }}
                    >
                      {group.name.charAt(0)}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold">{group.name}</h3>
                        <span
                          className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                          style={{
                            backgroundColor: group.color,
                            color: textColor,
                            border: group.color === '#FFFFFF' ? '1px solid #ccc' : 'none',
                          }}
                        >
                          {group.name}
                        </span>
                      </div>
                      {group.description ? (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {group.description}
                        </p>
                      ) : (
                        <p className="text-sm text-muted-foreground italic">
                          No description
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        Color: {group.color}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEdit(group)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      {isAdmin && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => openDelete(group)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editingGroup ? 'Edit Group' : 'Create New Group'}
            </DialogTitle>
            <DialogDescription>
              {editingGroup
                ? 'Update the group name, description, and color.'
                : 'Add a new beverage group with a name, description, and color.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="groupName">Name *</Label>
              <Input
                id="groupName"
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="e.g., Fruit"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="groupDescription">Description</Label>
              <Textarea
                id="groupDescription"
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, description: e.target.value }))
                }
                placeholder="Describe what types of beverages belong in this group..."
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                This description is shown on the Groups reference page
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="groupColor">Color</Label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  id="groupColor"
                  value={formData.color}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, color: e.target.value }))
                  }
                  className="w-12 h-10 rounded border cursor-pointer"
                />
                <Input
                  value={formData.color}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, color: e.target.value }))
                  }
                  placeholder="#808080"
                  className="flex-1"
                />
                <span
                  className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium"
                  style={{
                    backgroundColor: formData.color,
                    color: getContrastTextColor(formData.color),
                    border: formData.color === '#FFFFFF' ? '1px solid #ccc' : 'none',
                  }}
                >
                  {formData.name || 'Preview'}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Used for map markers, connecting lines, and badge pills
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCreateOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : editingGroup ? (
                'Save Changes'
              ) : (
                'Create Group'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Group</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the &ldquo;{deletingGroup?.name}&rdquo; group?
              This action cannot be undone. Any beverages assigned to this group must be
              reassigned first.
            </DialogDescription>
          </DialogHeader>

          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              If beverages are currently assigned to this group, the deletion will be blocked.
              Reassign them to another group first.
            </AlertDescription>
          </Alert>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteOpen(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete Group'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
