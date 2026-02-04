export type UserRole = 'viewer' | 'contributor' | 'editor' | 'moderator' | 'admin';

// BeverageGroup is now a dynamic string type since groups are managed in the database
export type BeverageGroup = string;

export interface BeverageGroupConfig {
  id: string;
  name: string;
  description: string;
  color: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  role: UserRole;
  is_banned: boolean;
  banned_at: string | null;
  banned_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface Beverage {
  id: string;
  node_id: string;
  name: string;
  type: string;
  group: BeverageGroup;
  latitude: number;
  longitude: number;
  origin_region: string | null;
  origin_country: string | null;
  date_text: string;
  date_year: number | null;
  parent_id: string | null;
  description: string | null;
  ingredients: string[] | null;
  production_method: string | null;
  citation: string | null;
  image_url: string | null;
  is_locked: boolean;
  current_revision_id: string | null;
  approval_status: 'approved' | 'pending' | 'rejected';
  approved_by: string | null;
  approved_at: string | null;
  rejected_by: string | null;
  rejected_at: string | null;
  rejection_reason: string | null;
  moderator_notes: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface BeverageRevision {
  id: string;
  beverage_id: string;
  edited_by: string;
  revision_number: number;
  data: Partial<Beverage>;
  edit_summary: string | null;
  changed_fields: string[] | null;
  created_at: string;
}

export interface ActivityLog {
  id: string;
  user_id: string | null;
  action: 'create' | 'edit' | 'revert' | 'delete' | 'approve' | 'reject';
  beverage_id: string | null;
  beverage_name: string | null;
  revision_id: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
}

// Extended types with relations
export interface BeverageWithRelations extends Beverage {
  parent?: Beverage | null;
  children?: Beverage[];
  creator?: Profile | null;
  updater?: Profile | null;
}

export interface BeverageRevisionWithUser extends BeverageRevision {
  editor?: Profile | null;
}

export interface ActivityLogWithUser extends ActivityLog {
  user?: Profile | null;
}
