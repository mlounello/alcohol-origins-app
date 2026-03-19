-- Grant schema/table/function privileges for the app_alcohol_origins schema.
-- RLS policies still enforce who can read/write which rows; these grants only
-- allow PostgREST to reach the schema objects in the first place.

grant usage on schema app_alcohol_origins to anon, authenticated;

grant execute on function app_alcohol_origins.get_user_role() to anon, authenticated;
grant execute on function app_alcohol_origins.get_next_revision_number(uuid) to anon, authenticated;

grant select on app_alcohol_origins.beverages to anon, authenticated;
grant select on app_alcohol_origins.beverage_revisions to anon, authenticated;
grant select on app_alcohol_origins.activity_log to anon, authenticated;
grant select on app_alcohol_origins.beverage_groups to anon, authenticated;
grant select on app_alcohol_origins.profiles to authenticated;

grant insert, update, delete on app_alcohol_origins.beverages to authenticated;
grant insert on app_alcohol_origins.beverage_revisions to authenticated;
grant insert on app_alcohol_origins.activity_log to authenticated;
grant insert, update, delete on app_alcohol_origins.beverage_groups to authenticated;
grant insert, update on app_alcohol_origins.profiles to authenticated;
