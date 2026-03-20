# DB Canonical Posture

`/Users/mikelounello/alcohol-origins-app/ao_schema_app.sql` is the checked-in canonical schema snapshot for the app's intended current database posture.

For milestone hardening, treat these migrations as the source of the final security posture:
- `014_lock_down_beverage_revision_visibility.sql`
- `015_lock_down_activity_log_and_define_admin_users_view.sql`
- `016_reinforce_hardened_admin_and_revision_posture.sql`
- `017_backfill_current_revision_id.sql`

Older migrations still document the app's evolution, but they should not be read in isolation as the final security model.
