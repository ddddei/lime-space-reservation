-- 예약 신청/취소 시 Discord 웹훅으로 운영 채널 알림을 보내는 트리거.
-- 웹훅 URL은 이 파일에 넣지 않는다. 적용 후 아래를 별도로 실행해 등록한다 (저장소에 커밋 금지):
--   insert into public.notification_config (config_key, config_value)
--   values ('discord_webhook_url', '<웹훅 URL>')
--   on conflict (config_key) do update set config_value = excluded.config_value, updated_at = now();
-- URL 미등록 상태에서는 알림 없이 조용히 통과한다 (예약 기능에 영향 없음).
-- pg_net의 http_post는 비동기이며, 트리거 본문 전체를 예외 무시로 감싸
-- 알림 실패가 예약 신청/취소를 절대 막지 않게 한다.

create extension if not exists pg_net;

create table if not exists public.notification_config (
  config_key text primary key,
  config_value text not null,
  updated_at timestamptz not null default now()
);

alter table public.notification_config enable row level security;
revoke all on table public.notification_config from anon, authenticated;

create or replace function public.notify_discord_message(input_content text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_webhook_url text;
begin
  select nc.config_value into v_webhook_url
  from public.notification_config nc
  where nc.config_key = 'discord_webhook_url';

  if v_webhook_url is null or btrim(v_webhook_url) = '' then
    return;
  end if;

  perform net.http_post(
    url := v_webhook_url,
    body := jsonb_build_object('content', input_content),
    headers := '{"Content-Type": "application/json"}'::jsonb
  );
end;
$$;

create or replace function public.notify_reservation_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_space_name text;
  v_meeting_name text;
  v_applicant_name text;
begin
  begin
    if new.status = 'cancelled' then
      return new;
    end if;

    select s.name into v_space_name from public.spaces s where s.space_id::text = new.space_id;
    select m.meeting_name, m.applicant_name into v_meeting_name, v_applicant_name
    from public.meetings m where m.meeting_id = new.meeting_id;

    perform public.notify_discord_message(
      '📅 새 예약 신청' || E'\n'
      || '공간: ' || coalesce(v_space_name, new.space_id) || E'\n'
      || '일시: ' || to_char(new.date, 'YYYY-MM-DD') || ' ' || new.start_time || '~' || new.end_time || E'\n'
      || '모임: ' || coalesce(v_meeting_name, '(이름 없음)') || ' — ' || coalesce(v_applicant_name, '(신청자 미상)')
    );
  exception when others then
    null; -- 알림 실패는 예약 처리에 영향 주지 않음
  end;
  return new;
end;
$$;

create or replace function public.notify_reservation_cancelled()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_space_name text;
  v_meeting_name text;
  v_applicant_name text;
begin
  begin
    select s.name into v_space_name from public.spaces s where s.space_id::text = new.space_id;
    select m.meeting_name, m.applicant_name into v_meeting_name, v_applicant_name
    from public.meetings m where m.meeting_id = new.meeting_id;

    perform public.notify_discord_message(
      '🚫 예약 취소' || E'\n'
      || '공간: ' || coalesce(v_space_name, new.space_id) || E'\n'
      || '일시: ' || to_char(new.date, 'YYYY-MM-DD') || ' ' || new.start_time || '~' || new.end_time || E'\n'
      || '모임: ' || coalesce(v_meeting_name, '(이름 없음)') || ' — ' || coalesce(v_applicant_name, '(신청자 미상)')
    );
  exception when others then
    null;
  end;
  return new;
end;
$$;

drop trigger if exists sessions_notify_created on public.sessions;
create trigger sessions_notify_created
after insert on public.sessions
for each row
execute function public.notify_reservation_created();

drop trigger if exists sessions_notify_cancelled on public.sessions;
create trigger sessions_notify_cancelled
after update on public.sessions
for each row
when (old.status is distinct from new.status and new.status = 'cancelled')
execute function public.notify_reservation_cancelled();
