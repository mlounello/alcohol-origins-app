-- Alcohol Origins GeoMap Database Schema
-- Initial migration: profiles, beverages, revisions, activity_log

-- ============================================
-- ENUMS
-- ============================================

CREATE TYPE user_role AS ENUM ('viewer', 'contributor', 'editor', 'admin');
CREATE TYPE beverage_group AS ENUM ('Grain', 'Grape', 'Sugar', 'Cactus', 'Other');

-- ============================================
-- PROFILES (extends Supabase auth.users)
-- ============================================

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  role user_role NOT NULL DEFAULT 'contributor',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update profile timestamp on changes
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================
-- BEVERAGES (main data table)
-- ============================================

CREATE TABLE public.beverages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Core identity
  node_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,

  -- Classification
  type TEXT NOT NULL,
  "group" beverage_group NOT NULL,

  -- Geographic data
  latitude DECIMAL(9,6) NOT NULL,
  longitude DECIMAL(9,6) NOT NULL,
  origin_region TEXT,
  origin_country TEXT,

  -- Temporal data
  date_text TEXT NOT NULL,
  date_year INTEGER,

  -- Relationships
  parent_id TEXT REFERENCES public.beverages(node_id) ON DELETE SET NULL,

  -- Content
  description TEXT,
  ingredients TEXT[],
  production_method TEXT,
  citation TEXT,
  image_url TEXT,

  -- Wiki metadata
  current_revision_id UUID,

  -- Audit fields
  created_by UUID REFERENCES public.profiles(id),
  updated_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX idx_beverages_group ON public.beverages("group");
CREATE INDEX idx_beverages_type ON public.beverages(type);
CREATE INDEX idx_beverages_date_year ON public.beverages(date_year);
CREATE INDEX idx_beverages_parent_id ON public.beverages(parent_id);
CREATE INDEX idx_beverages_coords ON public.beverages(latitude, longitude);
CREATE INDEX idx_beverages_node_id ON public.beverages(node_id);

-- Full-text search
ALTER TABLE public.beverages ADD COLUMN search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(node_id, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(description, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(origin_region, '')), 'C')
  ) STORED;

CREATE INDEX idx_beverages_search ON public.beverages USING GIN(search_vector);

-- Update timestamp trigger
CREATE TRIGGER beverages_updated_at
  BEFORE UPDATE ON public.beverages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================
-- BEVERAGE REVISIONS (wiki history)
-- ============================================

CREATE TABLE public.beverage_revisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  beverage_id UUID NOT NULL REFERENCES public.beverages(id) ON DELETE CASCADE,
  revision_number INTEGER NOT NULL,

  -- Snapshot of all data at this revision
  data JSONB NOT NULL,

  -- Change metadata
  edited_by UUID NOT NULL REFERENCES public.profiles(id),
  edit_summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- For tracking what changed
  changed_fields TEXT[],

  UNIQUE(beverage_id, revision_number)
);

CREATE INDEX idx_revisions_beverage ON public.beverage_revisions(beverage_id, revision_number DESC);
CREATE INDEX idx_revisions_date ON public.beverage_revisions(created_at DESC);
CREATE INDEX idx_revisions_editor ON public.beverage_revisions(edited_by);

-- ============================================
-- ACTIVITY LOG (recent changes feed)
-- ============================================

CREATE TABLE public.activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  user_id UUID REFERENCES public.profiles(id),
  action TEXT NOT NULL,
  beverage_id UUID REFERENCES public.beverages(id) ON DELETE SET NULL,
  beverage_name TEXT,
  revision_id UUID REFERENCES public.beverage_revisions(id) ON DELETE SET NULL,

  details JSONB,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_activity_date ON public.activity_log(created_at DESC);
CREATE INDEX idx_activity_user ON public.activity_log(user_id);
CREATE INDEX idx_activity_beverage ON public.activity_log(beverage_id);

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Get current user's role
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS user_role AS $$
  SELECT COALESCE(
    (SELECT role FROM public.profiles WHERE id = auth.uid()),
    'viewer'::user_role
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Get next revision number for a beverage
CREATE OR REPLACE FUNCTION public.get_next_revision_number(p_beverage_id UUID)
RETURNS INTEGER AS $$
  SELECT COALESCE(MAX(revision_number), 0) + 1
  FROM public.beverage_revisions
  WHERE beverage_id = p_beverage_id;
$$ LANGUAGE sql STABLE;

-- ============================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.beverages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.beverage_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

-- PROFILES policies
CREATE POLICY "Public profiles are viewable by everyone"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile (non-role fields)"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- BEVERAGES policies
CREATE POLICY "Beverages are viewable by everyone"
  ON public.beverages FOR SELECT
  USING (true);

CREATE POLICY "Contributors can insert beverages"
  ON public.beverages FOR INSERT
  WITH CHECK (public.get_user_role() IN ('contributor', 'editor', 'admin'));

CREATE POLICY "Contributors can update beverages"
  ON public.beverages FOR UPDATE
  USING (public.get_user_role() IN ('contributor', 'editor', 'admin'));

CREATE POLICY "Only admins can delete beverages"
  ON public.beverages FOR DELETE
  USING (public.get_user_role() = 'admin');

-- REVISIONS policies
CREATE POLICY "Revisions are viewable by everyone"
  ON public.beverage_revisions FOR SELECT
  USING (true);

CREATE POLICY "Contributors can create revisions"
  ON public.beverage_revisions FOR INSERT
  WITH CHECK (public.get_user_role() IN ('contributor', 'editor', 'admin'));

-- ACTIVITY_LOG policies
CREATE POLICY "Activity log viewable by everyone"
  ON public.activity_log FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert activity logs"
  ON public.activity_log FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================
-- ADMIN POLICIES (separate for clarity)
-- ============================================

-- Admins can update any profile (including role changes)
CREATE POLICY "Admins can update any profile"
  ON public.profiles FOR UPDATE
  USING (public.get_user_role() = 'admin');