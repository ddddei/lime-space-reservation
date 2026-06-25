-- Supabase SQL Editor에서 실행하세요.
-- 예약 신청 취소 RPC입니다. 실제 delete 대신 sessions.status를 cancelled로 바꿉니다.
-- 관리자는 이름/전화번호 확인 후 어느 신청이든 취소할 수 있고,
-- 참여자는 본인 신청 회차만 취소할 수 있습니다.

create or replace function public.cancel_reservation_session(
  input_session_id text,
  input_participant_id text default null,
  input_admin_name text default null,
  input_admin_phone text default null
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
declare
  v_session record;
  v_admin_allowed boolean := false;
  v_participant_allowed boolean := false;
begin
  if input_session_id is null or btrim(input_session_id) = '' then
    raise exception '취소할 신청 정보가 없습니다.';
  end if;

  select
    s.session_id::text as session_id,
    s.meeting_id::text as meeting_id,
    s.status as session_status,
    m.applicant_participant_id::text as applicant_participant_id
  into v_session
  from public.sessions s
  join public.meetings m on m.meeting_id::text = s.meeting_id::text
  where s.session_id::text = input_session_id;

  if v_session is null then
    raise exception '취소할 신청을 찾을 수 없습니다.';
  end if;

  if v_session.session_status = 'cancelled' then
    raise exception '이미 취소된 신청입니다.';
  end if;

  if input_participant_id is not null and btrim(input_participant_id) <> '' then
    v_participant_allowed := v_session.applicant_participant_id = input_participant_id;
  end if;

  if input_admin_name is not null and input_admin_phone is not null then
    select exists (
      select 1
      from public.admins a
      where a.is_active = true
        and btrim(a.name) = btrim(input_admin_name)
        and regexp_replace(a.phone, '\D', '', 'g') = regexp_replace(input_admin_phone, '\D', '', 'g')
    ) into v_admin_allowed;
  end if;

  if not v_participant_allowed and not v_admin_allowed then
    raise exception '신청을 취소할 권한이 없습니다.';
  end if;

  update public.sessions s
  set status = 'cancelled',
      updated_at = now()
  where s.session_id::text = input_session_id;

  update public.meetings m
  set status = 'rejected',
      updated_at = now()
  where m.meeting_id::text = v_session.meeting_id
    and not exists (
      select 1
      from public.sessions active_session
      where active_session.meeting_id::text = v_session.meeting_id
        and active_session.status <> 'cancelled'
    );

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
    s.start_time,
    s.end_time,
    s.block_count,
    s.status,
    s.created_at,
    s.updated_at
  from public.sessions s
  join public.meetings m on m.meeting_id::text = s.meeting_id::text
  join public.spaces sp on sp.space_id::text = s.space_id::text
  where s.session_id::text = input_session_id;
end;
$$;

grant execute on function public.cancel_reservation_session(text, text, text, text) to anon, authenticated;

-- 운영 전 테스트 데이터 soft cancel 정리용입니다.
-- 실제 삭제가 필요할 때만 별도 백업 후 delete를 검토하세요.
/*
update public.sessions s
set status = 'cancelled',
    updated_at = now()
from public.meetings m
where m.meeting_id::text = s.meeting_id::text
  and m.meeting_name like '테스트_삭제예정%';

update public.meetings m
set status = 'rejected',
    updated_at = now()
where m.meeting_name like '테스트_삭제예정%'
  and not exists (
    select 1
    from public.sessions s
    where s.meeting_id::text = m.meeting_id::text
      and s.status <> 'cancelled'
  );
*/
