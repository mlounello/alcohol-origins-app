-- Rollback for 012_contain_v_admin_users_anon_only.sql

grant select on app_alcohol_origins.v_admin_users to anon;

