-- Phase 1 containment: remove unauthenticated access to the admin users view
-- without breaking the existing authenticated server route.

revoke select on app_alcohol_origins.v_admin_users from anon;

