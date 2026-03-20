-- Align revision visibility with beverage visibility.
-- Public can only read revisions for approved beverages.
-- Owners can read revisions for their own beverages.
-- Editors, moderators, and admins can read all revisions.

drop policy if exists "Revisions are viewable by everyone" on app_alcohol_origins.beverage_revisions;

create policy "Revisions follow beverage visibility"
  on app_alcohol_origins.beverage_revisions for select
  using (
    exists (
      select 1
      from app_alcohol_origins.beverages
      where app_alcohol_origins.beverages.id = beverage_revisions.beverage_id
        and (
          app_alcohol_origins.beverages.approval_status = 'approved'
          or app_alcohol_origins.beverages.created_by = auth.uid()
          or app_alcohol_origins.get_user_role() in ('editor', 'moderator', 'admin')
        )
    )
  );
