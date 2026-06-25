-- Clear reservation history before production open.
-- Deletes only sessions and meetings.
-- Does not touch participants, admins, spaces, space_images, operating_hours, or admin_blocks.

begin;

with deleted_sessions as (
  delete from public.sessions returning session_id
), deleted_meetings as (
  delete from public.meetings returning meeting_id
)
select 'sessions_deleted' as metric, count(*)::integer as value from deleted_sessions
union all select 'meetings_deleted', count(*)::integer from deleted_meetings;

commit;
