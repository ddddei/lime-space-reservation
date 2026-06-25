-- Upsert production admins from 피스메이커 레벨.xlsx / 관리자 정보 sheet.
-- Expected active admins: 10. Includes 한필구 / 01033808374.
-- Keeps existing admin_id when name + normalized phone already match.

begin;

with source_admins(admin_id, name, phone, phone_digits, phone_last4, role, is_active) as (
  values
    ('admin-01023118789', '정재원', '010-2311-8789', '01023118789', '8789', 'manager', true),
    ('admin-01032759682', '허정민', '010-3275-9682', '01032759682', '9682', 'manager', true),
    ('admin-01049084901', '박재은', '010-4908-4901', '01049084901', '4901', 'manager', true),
    ('admin-01045484592', '황제훈', '010-4548-4592', '01045484592', '4592', 'manager', true),
    ('admin-01044309870', '강동리', '010-4430-9870', '01044309870', '9870', 'manager', true),
    ('admin-01033808374', '한필구', '010-3380-8374', '01033808374', '8374', 'system-admin', true),
    ('admin-01077146229', '최윤조', '010-7714-6229', '01077146229', '6229', 'manager', true),
    ('admin-01095667703', '정재원', '010-9566-7703', '01095667703', '7703', 'manager', true),
    ('admin-0220668134-청년동', '청년동', '02-2066-8134', '0220668134', '8134', 'manager', true),
    ('admin-0220668134-admin', 'admin', '02-2066-8134', '0220668134', '8134', 'system-admin', true)
), updated as (
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
), inserted as (
  insert into public.admins (admin_id, name, phone, phone_last4, role, is_active, created_at, updated_at)
  select s.admin_id, s.name, s.phone, s.phone_last4, s.role, s.is_active, now(), now()
  from source_admins s
  where not exists (
    select 1 from public.admins a
    where btrim(a.name) = btrim(s.name)
      and regexp_replace(a.phone, '\D', '', 'g') = s.phone_digits
  )
  returning admin_id
), deactivated as (
  update public.admins a
  set is_active = false,
      updated_at = now()
  where not exists (
    select 1 from source_admins s
    where btrim(a.name) = btrim(s.name)
      and regexp_replace(a.phone, '\D', '', 'g') = s.phone_digits
  )
  returning admin_id
)
select 'admins_updated' as metric, count(*)::integer as value from updated
union all select 'admins_inserted', count(*)::integer from inserted
union all select 'admins_deactivated', count(*)::integer from deactivated;

commit;
