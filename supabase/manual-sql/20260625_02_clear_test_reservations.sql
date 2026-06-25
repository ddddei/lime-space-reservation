-- Clear pre-production test reservation history.
-- This script deletes only sessions and meetings. It does not touch spaces, operating_hours, space_images, admin_blocks, participants, or admins.

begin;

with deleted_sessions as (
  delete from public.sessions
  returning session_id
), deleted_meetings as (
  delete from public.meetings
  returning meeting_id
)
select 'sessions_deleted' as metric, count(*)::integer as value from deleted_sessions
union all
select 'meetings_deleted', count(*)::integer from deleted_meetings;

commit;
