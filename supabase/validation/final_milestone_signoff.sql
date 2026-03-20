-- Final milestone signoff checks for Alcohol Origins.
-- Run after applying migrations 014 through 017.

-- 1. Revision visibility policy should be the hardened policy, not public-everyone.
select schemaname, tablename, policyname, cmd
from pg_policies
where schemaname = 'app_alcohol_origins'
  and tablename = 'beverage_revisions';

-- 2. Activity log select posture should be owner/staff-only, not public-everyone.
select schemaname, tablename, policyname, cmd
from pg_policies
where schemaname = 'app_alcohol_origins'
  and tablename = 'activity_log';

-- 3. v_admin_users and its guarded RPC helpers should exist.
select table_schema, table_name
from information_schema.views
where table_schema = 'app_alcohol_origins'
  and table_name = 'v_admin_users';

select routine_schema, routine_name, data_type
from information_schema.routines
where routine_schema = 'app_alcohol_origins'
  and routine_name in ('get_admin_users', 'get_admin_user')
order by routine_name;

-- 4. current_revision_id backfill should leave no rows with revisions but null pointer.
select count(*) as beverages_with_revisions_but_null_current_revision_id
from app_alcohol_origins.beverages beverages
where beverages.current_revision_id is null
  and exists (
    select 1
    from app_alcohol_origins.beverage_revisions revisions
    where revisions.beverage_id = beverages.id
  );

-- 5. Parent links should only point at existing node_id values.
select count(*) as broken_parent_links
from app_alcohol_origins.beverages children
left join app_alcohol_origins.beverages parents
  on parents.node_id = children.parent_id
where children.parent_id is not null
  and parents.id is null;

-- App-side checklist:
-- [ ] moderator/admin can load /api/admin/users
-- [ ] editor is denied from /api/admin/users
-- [ ] approved revisions are visible publicly; pending revisions follow owner/staff visibility
-- [ ] edit-page parent picker shows approved+own for non-staff and full candidate set for staff
-- [ ] profile bootstrap still succeeds even if control-room sync is slow or failing
