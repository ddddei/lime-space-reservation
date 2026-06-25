-- Production roster upsert from /Users/hanpilgoo/Downloads/피스메이커 레벨.xlsx
-- Source counts: participants 26 (Level 2: 14, Level 1: 12), admins 10.
-- This script does not touch spaces, operating_hours, space_images, or admin_blocks.
-- Secrets are not embedded. Execute with Supabase SQL Editor or `supabase db query --linked --file ...`.

begin;

with source_participants(participant_id, name, phone, phone_digits, phone_last4, level, has_plan, has_budget, has_promotion, has_admin_approval, max_blocks, memo) as (
  values
    ('pm-01093111170', '김나영', '010-9311-1170', '01093111170', '1170', 2, true, true, true, true, 48, '피스메이커 레벨.xlsx 운영 명단 기준 반영'),
    ('pm-01051089810', '김윤전', '010-5108-9810', '01051089810', '9810', 2, true, true, true, true, 48, '피스메이커 레벨.xlsx 운영 명단 기준 반영'),
    ('pm-01030714351', '김은수', '010-3071-4351', '01030714351', '4351', 2, true, true, true, true, 48, '피스메이커 레벨.xlsx 운영 명단 기준 반영'),
    ('pm-01033248867', '김현진', '010-3324-8867', '01033248867', '8867', 2, true, true, true, true, 48, '피스메이커 레벨.xlsx 운영 명단 기준 반영'),
    ('pm-01025885382', '박지은', '010-2588-5382', '01025885382', '5382', 2, true, true, true, true, 48, '피스메이커 레벨.xlsx 운영 명단 기준 반영'),
    ('pm-01077275593', '신윤정', '010-7727-5593', '01077275593', '5593', 2, true, true, true, true, 48, '피스메이커 레벨.xlsx 운영 명단 기준 반영'),
    ('pm-01032951302', '윤수영', '010-3295-1302', '01032951302', '1302', 2, true, true, true, true, 48, '피스메이커 레벨.xlsx 운영 명단 기준 반영'),
    ('pm-01053619798', '이석희', '010-5361-9798', '01053619798', '9798', 2, true, true, true, true, 48, '피스메이커 레벨.xlsx 운영 명단 기준 반영'),
    ('pm-01099618919', '장예은', '010-9961-8919', '01099618919', '8919', 2, true, true, true, true, 48, '피스메이커 레벨.xlsx 운영 명단 기준 반영'),
    ('pm-01097891261', '장인혁', '010-9789-1261', '01097891261', '1261', 2, true, true, true, true, 48, '피스메이커 레벨.xlsx 운영 명단 기준 반영'),
    ('pm-01085755758', '조예지', '010-8575-5758', '01085755758', '5758', 2, true, true, true, true, 48, '피스메이커 레벨.xlsx 운영 명단 기준 반영'),
    ('pm-01062861542', '조한규', '010-6286-1542', '01062861542', '1542', 2, true, true, true, true, 48, '피스메이커 레벨.xlsx 운영 명단 기준 반영'),
    ('pm-01085903418', '현주경', '010-8590-3418', '01085903418', '3418', 2, true, true, true, true, 48, '피스메이커 레벨.xlsx 운영 명단 기준 반영'),
    ('pm-01033675023', '한시아', '010-3367-5023', '01033675023', '5023', 2, true, true, true, true, 48, '피스메이커 레벨.xlsx 운영 명단 기준 반영'),
    ('pm-01029485945', '김요한', '010-2948-5945', '01029485945', '5945', 1, true, true, true, true, 16, '피스메이커 레벨.xlsx 운영 명단 기준 반영'),
    ('pm-01047526164', '김학종', '010-4752-6164', '01047526164', '6164', 1, true, true, true, true, 16, '피스메이커 레벨.xlsx 운영 명단 기준 반영'),
    ('pm-01077595173', '박다예', '010-7759-5173', '01077595173', '5173', 1, true, true, true, true, 16, '피스메이커 레벨.xlsx 운영 명단 기준 반영'),
    ('pm-01034737237', '박준희', '010-3473-7237', '01034737237', '7237', 1, true, true, true, true, 16, '피스메이커 레벨.xlsx 운영 명단 기준 반영'),
    ('pm-01053735107', '오남진', '010-5373-5107', '01053735107', '5107', 1, true, true, true, true, 16, '피스메이커 레벨.xlsx 운영 명단 기준 반영'),
    ('pm-01072209859', '이혜인', '010-7220-9859', '01072209859', '9859', 1, true, true, true, true, 16, '피스메이커 레벨.xlsx 운영 명단 기준 반영'),
    ('pm-01022213347', '최지은', '010-2221-3347', '01022213347', '3347', 1, true, true, true, true, 16, '피스메이커 레벨.xlsx 운영 명단 기준 반영'),
    ('pm-01056500407', '계정은', '010-5650-0407', '01056500407', '0407', 1, true, true, true, true, 16, '피스메이커 레벨.xlsx 운영 명단 기준 반영'),
    ('pm-01089247928', '고성수', '010-8924-7928', '01089247928', '7928', 1, true, true, true, true, 16, '피스메이커 레벨.xlsx 운영 명단 기준 반영'),
    ('pm-01024493341', '윤여진', '010-2449-3341', '01024493341', '3341', 1, true, true, true, true, 16, '피스메이커 레벨.xlsx 운영 명단 기준 반영'),
    ('pm-01041407840', '이소영', '010-4140-7840', '01041407840', '7840', 1, true, true, true, true, 16, '피스메이커 레벨.xlsx 운영 명단 기준 반영'),
    ('pm-01025072832', '이지원', '010-2507-2832', '01025072832', '2832', 1, true, true, true, true, 16, '피스메이커 레벨.xlsx 운영 명단 기준 반영')
), updated as (
  update public.participants p
  set phone = s.phone,
      phone_last4 = s.phone_last4,
      level = s.level,
      has_plan = s.has_plan,
      has_budget = s.has_budget,
      has_promotion = s.has_promotion,
      has_admin_approval = s.has_admin_approval,
      max_blocks = s.max_blocks,
      memo = s.memo,
      is_active = true,
      updated_at = now()
  from source_participants s
  where btrim(p.name) = btrim(s.name)
    and regexp_replace(p.phone, '\D', '', 'g') = s.phone_digits
  returning p.participant_id
), inserted as (
  insert into public.participants (
    participant_id, name, phone, phone_last4, level,
    has_plan, has_budget, has_promotion, has_admin_approval,
    max_blocks, memo, is_active, created_at, updated_at
  )
  select
    s.participant_id, s.name, s.phone, s.phone_last4, s.level,
    s.has_plan, s.has_budget, s.has_promotion, s.has_admin_approval,
    s.max_blocks, s.memo, true, now(), now()
  from source_participants s
  where not exists (
    select 1
    from public.participants p
    where btrim(p.name) = btrim(s.name)
      and regexp_replace(p.phone, '\D', '', 'g') = s.phone_digits
  )
  returning participant_id
), deactivated as (
  update public.participants p
  set is_active = false,
      updated_at = now(),
      memo = case
        when p.memo = '' then '피스메이커 레벨.xlsx 최신 명단 제외로 비활성화'
        else p.memo || ' / 피스메이커 레벨.xlsx 최신 명단 제외로 비활성화'
      end
  where not exists (
    select 1
    from source_participants s
    where btrim(p.name) = btrim(s.name)
      and regexp_replace(p.phone, '\D', '', 'g') = s.phone_digits
  )
  returning participant_id
), source_admins(admin_id, name, phone, phone_digits, phone_last4, role, is_active) as (
  values
    ('admin-01023118789', '정재원', '010-2311-8789', '01023118789', '8789', 'manager', true),
    ('admin-01032759682', '허정민', '010-3275-9682', '01032759682', '9682', 'manager', true),
    ('admin-01049084901', '박재은', '010-4908-4901', '01049084901', '4901', 'manager', true),
    ('admin-01045484592', '황제훈', '010-4548-4592', '01045484592', '4592', 'manager', true),
    ('admin-01044309870', '강동리', '010-4430-9870', '01044309870', '9870', 'manager', true),
    ('admin-01033808374', '한필구', '010-3380-8374', '01033808374', '8374', 'system-admin', true),
    ('admin-01077146229', '최윤조', '010-7714-6229', '01077146229', '6229', 'manager', true),
    ('admin-01095667703', '정재원', '010-9566-7703', '01095667703', '7703', 'manager', true),
    ('admin-0220668134-youthcenter', '청년동', '02-2066-8134', '0220668134', '8134', 'manager', true),
    ('admin-0220668134-admin', 'admin', '02-2066-8134', '0220668134', '8134', 'system-admin', true)
), updated_admins as (
  update public.admins a
  set phone = s.phone,
      phone_last4 = s.phone_last4,
      role = s.role,
      is_active = s.is_active,
      updated_at = now()
  from source_admins s
  where btrim(a.name) = btrim(s.name)
    and regexp_replace(a.phone, '\D', '', 'g') = s.phone_digits
  returning a.admin_id
), inserted_admins as (
  insert into public.admins (admin_id, name, phone, phone_last4, role, is_active, created_at, updated_at)
  select s.admin_id, s.name, s.phone, s.phone_last4, s.role, s.is_active, now(), now()
  from source_admins s
  where not exists (
    select 1
    from public.admins a
    where btrim(a.name) = btrim(s.name)
      and regexp_replace(a.phone, '\D', '', 'g') = s.phone_digits
  )
  returning admin_id
), deactivated_admins as (
  update public.admins a
  set is_active = false,
      updated_at = now()
  where not exists (
    select 1
    from source_admins s
    where btrim(a.name) = btrim(s.name)
      and regexp_replace(a.phone, '\D', '', 'g') = s.phone_digits
  )
  returning admin_id
)
select 'participants_updated' as metric, count(*)::integer as value from updated
union all select 'participants_inserted', count(*)::integer from inserted
union all select 'participants_deactivated', count(*)::integer from deactivated
union all select 'admins_updated', count(*)::integer from updated_admins
union all select 'admins_inserted', count(*)::integer from inserted_admins
union all select 'admins_deactivated', count(*)::integer from deactivated_admins;

commit;
