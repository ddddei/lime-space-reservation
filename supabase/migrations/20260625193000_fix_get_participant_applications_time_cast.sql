drop function if exists public.get_participant_applications(text);

create or replace function public.get_participant_applications(
  input_participant_id text
)
returns table (
  meeting_id text,
  session_id text,
  applicant_participant_id text,
  applicant_name text,
  phone_last4 text,
  level integer,
  meeting_name text,
  purpose text,
  meeting_status text,
  session_index integer,
  space_id text,
  space_name text,
  date date,
  start_time time,
  end_time time,
  block_count integer,
  session_status text,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if input_participant_id is null or btrim(input_participant_id) = '' then
    raise exception '참여자 정보가 없습니다.';
  end if;

  return query
  select
    m.meeting_id::text,
    s.session_id::text,
    m.applicant_participant_id::text,
    m.applicant_name,
    m.phone_last4,
    m.level,
    m.meeting_name,
    m.purpose,
    m.status,
    s.session_index,
    s.space_id::text,
    sp.name,
    s.date,
    s.start_time::time,
    s.end_time::time,
    s.block_count,
    s.status,
    s.created_at,
    s.updated_at
  from public.sessions s
  join public.meetings m on m.meeting_id::text = s.meeting_id::text
  join public.spaces sp on sp.space_id::text = s.space_id::text
  where m.applicant_participant_id::text = input_participant_id
  order by
    case when s.status = 'cancelled' then 1 else 0 end,
    s.date desc,
    s.start_time asc,
    s.session_index asc;
end;
$$;

grant execute on function public.get_participant_applications(text) to anon, authenticated;
