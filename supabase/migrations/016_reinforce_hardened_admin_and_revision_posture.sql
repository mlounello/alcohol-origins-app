-- Reinforce the final hardened milestone posture for revision visibility,
-- activity logs, and admin-user access helpers.
-- This migration intentionally reasserts the canonical end state after the
-- earlier milestone hardening steps, so older migration history should not be
-- read in isolation as the final security posture.

grant select on app_alcohol_origins.beverage_revisions to anon, authenticated;

revoke select on app_alcohol_origins.activity_log from anon, authenticated;
grant select on app_alcohol_origins.activity_log to authenticated;

drop policy if exists "Revisions are viewable by everyone" on app_alcohol_origins.beverage_revisions;
drop policy if exists "Revisions follow beverage visibility" on app_alcohol_origins.beverage_revisions;

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

drop policy if exists "Activity log viewable by everyone" on app_alcohol_origins.activity_log;
drop policy if exists "Activity log visible to owners and staff" on app_alcohol_origins.activity_log;

create policy "Activity log visible to owners and staff"
  on app_alcohol_origins.activity_log for select
  using (
    auth.uid() is not null
    and (
      app_alcohol_origins.get_user_role() in ('editor', 'moderator', 'admin')
      or user_id = auth.uid()
      or exists (
        select 1
        from app_alcohol_origins.beverages
        where app_alcohol_origins.beverages.id = activity_log.beverage_id
          and app_alcohol_origins.beverages.created_by = auth.uid()
      )
    )
  );

create or replace view app_alcohol_origins.v_admin_users as
  select
    profiles.*,
    profiles.role as effective_role
  from app_alcohol_origins.profiles;

revoke all on app_alcohol_origins.v_admin_users from anon, authenticated;

create or replace function app_alcohol_origins.get_admin_users()
returns setof app_alcohol_origins.v_admin_users
language sql
stable
security definer
set search_path = app_alcohol_origins, public
as $$
  select *
  from app_alcohol_origins.v_admin_users
  where auth.uid() is not null
    and app_alcohol_origins.get_user_role() in ('moderator', 'admin')
  order by created_at desc;
$$;

create or replace function app_alcohol_origins.get_admin_user(p_user_id uuid)
returns setof app_alcohol_origins.v_admin_users
language sql
stable
security definer
set search_path = app_alcohol_origins, public
as $$
  select *
  from app_alcohol_origins.v_admin_users
  where id = p_user_id
    and auth.uid() is not null
    and (
      auth.uid() = p_user_id
      or app_alcohol_origins.get_user_role() in ('moderator', 'admin')
    );
$$;

revoke all on function app_alcohol_origins.get_admin_users() from public;
revoke all on function app_alcohol_origins.get_admin_user(uuid) from public;
grant execute on function app_alcohol_origins.get_admin_users() to authenticated;
grant execute on function app_alcohol_origins.get_admin_user(uuid) to authenticated;
