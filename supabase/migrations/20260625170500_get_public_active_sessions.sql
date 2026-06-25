drop function if exists public.get_public_active_sessions();

create or replace function public.get_public_active_sessions()
returns table (
  session_id text,
  meeting_id text,
  session_index integer,
  space_id text,
  date date,
  start_time time,
  end_time time,
  block_count integer,
  status text,
  created_at timestamptz,
  updated_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    s.session_id::text,
    s.meeting_id::text,
    s.session_index,
    s.space_id::text,
    s.date,
    s.start_time::time as start_time,
    s.end_time::time as end_time,
    s.block_count,
    s.status,
    s.created_at,
    s.updated_at
  from public.sessions s
  join public.spaces sp on sp.space_id::text = s.space_id::text
  where sp.category = 'lifestyle'
    and sp.is_active = true
    and sp.is_public_visible = true
    and s.status <> 'cancelled'
  order by s.date asc, s.start_time asc, s.session_index asc;
$$;

grant execute on function public.get_public_active_sessions() to anon, authenticated;
