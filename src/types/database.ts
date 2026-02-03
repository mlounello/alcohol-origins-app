export type UserRole = 'viewer' | 'contributor' | 'editor' | 'admin';

export type BeverageGroup = 'Grain' | 'Grape' | 'Sugar' | 'Cactus' | 'Other';

export interface Profile {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  role: UserRole;
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
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface BeverageRevision {
  id: string;
  beverage_id: string;
  user_id: string;
  revision_number: number;
  data: Partial<Beverage>;
  change_summary: string | null;
  created_at: string;
}

export interface ActivityLog {
  id: string;
  user_id: string | null;
  action: 'create' | 'edit' | 'revert' | 'delete';
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
