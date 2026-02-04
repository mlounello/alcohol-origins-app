-- Create a beverage_groups table to manage groups dynamically
-- This replaces the static ENUM type with a flexible table-based approach

CREATE TABLE IF NOT EXISTS public.beverage_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL DEFAULT '',
  color TEXT NOT NULL DEFAULT '#808080',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert the existing default groups
INSERT INTO public.beverage_groups (name, description, color, sort_order) VALUES
  ('Grain', 'Beverages made from grain-based ingredients including barley, wheat, rice, corn, and other cereals. This group encompasses beers, whiskeys, vodkas, and other grain-derived spirits.', '#f9d81b', 1),
  ('Grape', 'Beverages derived from grapes and other vine fruits. Includes all varieties of wine, brandies, grappa, and grape-based spirits from around the world.', '#75147c', 2),
  ('Sugar', 'Beverages produced from sugar-rich sources including sugarcane, molasses, honey, and fruit juices. Encompasses rum, cachaca, mead, ciders, and fruit-based ferments.', '#FFFFFF', 3),
  ('Cactus', 'Beverages made from agave, cactus, and other succulent plants native to the Americas. Includes tequila, mezcal, pulque, and other agave-based spirits.', '#367c21', 4),
  ('Other', 'Beverages that do not fit neatly into the primary categories, including those made from unique or mixed base ingredients.', '#808080', 5)
ON CONFLICT (name) DO NOTHING;

-- Create index for sorting
CREATE INDEX IF NOT EXISTS idx_beverage_groups_sort ON public.beverage_groups(sort_order);

-- Enable RLS
ALTER TABLE public.beverage_groups ENABLE ROW LEVEL SECURITY;

-- Anyone can read groups
CREATE POLICY "Anyone can view groups"
  ON public.beverage_groups FOR SELECT
  USING (true);

-- Only moderators and admins can insert groups
CREATE POLICY "Moderators and admins can insert groups"
  ON public.beverage_groups FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role IN ('moderator', 'admin')
    )
  );

-- Only moderators and admins can update groups
CREATE POLICY "Moderators and admins can update groups"
  ON public.beverage_groups FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role IN ('moderator', 'admin')
    )
  );

-- Only admins can delete groups
CREATE POLICY "Only admins can delete groups"
  ON public.beverage_groups FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- Change the beverages table group column from ENUM to TEXT
-- This allows dynamic group values from the beverage_groups table
ALTER TABLE public.beverages
  ALTER COLUMN "group" TYPE TEXT USING "group"::TEXT;

-- Drop the old enum type (no longer needed)
DROP TYPE IF EXISTS beverage_group;
