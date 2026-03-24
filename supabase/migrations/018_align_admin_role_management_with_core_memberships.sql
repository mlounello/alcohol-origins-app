-- Align admin role management with the actual effective-role source of truth.
-- The app resolves roles through core.app_memberships, so admin role updates
-- must keep that source in sync and the admin roster should reflect it.

create or replace view app_alcohol_origins.v_admin_users as
  select
    profiles.id,
    profiles.email,
    profiles.display_name,
    profiles.avatar_url,
    profiles.role,
    profiles.created_at,
    profiles.updated_at,
    profiles.is_banned,
    profiles.banned_at,
    profiles.banned_reason,
    coalesce(membership.role, profiles.role) as effective_role
  from app_alcohol_origins.profiles
  left join lateral (
    select lower(m.role)::app_alcohol_origins.user_role as role
    from core.app_memberships m
    where m.user_id = profiles.id
      and m.app_id = 'alcohol_origins'
      and m.is_active = true
    limit 1
  ) membership on true;

create or replace function app_alcohol_origins.set_managed_user_role(
  p_user_id uuid,
  p_role app_alcohol_origins.user_role
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, app_alcohol_origins, core, public
as $$
begin
  if auth.uid() is null then
    raise exception 'You must be authenticated.';
  end if;

  if app_alcohol_origins.get_user_role() not in ('moderator', 'admin') then
    raise exception 'Admin or moderator access required.';
  end if;

  if p_user_id is null then
    raise exception 'p_user_id is required.';
  end if;

  update app_alcohol_origins.profiles
  set role = p_role
  where id = p_user_id;

  if not found then
    raise exception 'User % not found.', p_user_id;
  end if;

  update core.app_memberships
  set role = p_role::text,
      is_active = true
  where user_id = p_user_id
    and app_id = 'alcohol_origins';

  if not found then
    insert into core.app_memberships (user_id, app_id, role, is_active)
    values (p_user_id, 'alcohol_origins', p_role::text, true);
  end if;
end;
$$;

revoke all on function app_alcohol_origins.set_managed_user_role(uuid, app_alcohol_origins.user_role) from public;
grant execute on function app_alcohol_origins.set_managed_user_role(uuid, app_alcohol_origins.user_role) to authenticated;
