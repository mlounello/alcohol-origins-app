-- Backfill current_revision_id for older beverages that have revisions but no pointer.

update app_alcohol_origins.beverages as beverages
set current_revision_id = latest_revision.id
from (
  select distinct on (beverage_id)
    beverage_id,
    id
  from app_alcohol_origins.beverage_revisions
  order by beverage_id, revision_number desc, created_at desc, id desc
) as latest_revision
where beverages.id = latest_revision.beverage_id
  and beverages.current_revision_id is null;
