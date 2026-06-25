-- Emergency reservation reset.
-- Use only when operations must immediately remove all reservation history.
-- This is intentionally limited to sessions/meetings and preserves operational master data.

begin;

delete from public.sessions;
delete from public.meetings;

select 'meetings' as table_name, count(*)::integer as remaining_rows from public.meetings
union all select 'sessions', count(*)::integer from public.sessions;

commit;
