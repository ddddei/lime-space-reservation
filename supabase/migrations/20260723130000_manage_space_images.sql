-- 관리자 화면에서 공간별 사진을 여러 장 등록/제거/대표 지정하는 RPC 3종.
-- space_images 테이블은 이미 존재하며(20260722 이전 수동 적용), 이 마이그레이션은 mutation RPC만 추가한다.
-- 물리 delete는 사용하지 않고 is_active = false 논리 삭제만 수행한다.

create extension if not exists pgcrypto;

-- 사진 추가: 해당 공간의 활성 사진이 없으면 자동으로 대표(is_primary=true)가 된다.
create or replace function public.add_space_image(
  input_admin_name text,
  input_admin_phone text,
  input_space_id text,
  input_image_url text,
  input_alt_text text default null
)
returns table (
  image_id text,
  space_id text,
  image_url text,
  alt_text text,
  sort_order integer,
  is_primary boolean,
  is_active boolean,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin_exists boolean;
  v_space_exists boolean;
  v_image_id text;
  v_next_sort_order integer;
  v_has_active_image boolean;
begin
  select public.is_valid_admin(input_admin_name, input_admin_phone) into v_admin_exists;

  if not v_admin_exists then
    raise exception '관리자 권한을 확인할 수 없습니다.';
  end if;

  if input_space_id is null or btrim(input_space_id) = '' then
    raise exception '공간을 선택해 주세요.';
  end if;

  if input_image_url is null or btrim(input_image_url) = '' then
    raise exception '사진 URL을 확인할 수 없습니다.';
  end if;

  select exists(
    select 1 from public.spaces s where s.space_id::text = input_space_id
  ) into v_space_exists;

  if not v_space_exists then
    raise exception '존재하지 않는 공간입니다.';
  end if;

  select coalesce(max(si.sort_order), -1) + 1
    into v_next_sort_order
  from public.space_images si
  where si.space_id::text = input_space_id;

  select exists(
    select 1
    from public.space_images si
    where si.space_id::text = input_space_id
      and si.is_active = true
  ) into v_has_active_image;

  v_image_id := 'img-' || replace(gen_random_uuid()::text, '-', '');

  insert into public.space_images (
    image_id,
    space_id,
    image_url,
    alt_text,
    sort_order,
    is_primary,
    is_active,
    created_at
  ) values (
    v_image_id,
    input_space_id,
    btrim(input_image_url),
    nullif(btrim(coalesce(input_alt_text, '')), ''),
    v_next_sort_order,
    not v_has_active_image,
    true,
    now()
  );

  return query
  select
    si.image_id::text,
    si.space_id::text,
    si.image_url,
    si.alt_text,
    si.sort_order,
    si.is_primary,
    si.is_active,
    si.created_at
  from public.space_images si
  where si.image_id::text = v_image_id;
end;
$$;

grant execute on function public.add_space_image(text, text, text, text, text) to anon, authenticated;

-- 사진 제거(논리 삭제): 대표 사진을 제거하면 남은 활성 사진 중 sort_order가 가장 작은 사진을 대표로 승격한다.
create or replace function public.remove_space_image(
  input_admin_name text,
  input_admin_phone text,
  input_image_id text
)
returns table (
  image_id text,
  space_id text,
  image_url text,
  alt_text text,
  sort_order integer,
  is_primary boolean,
  is_active boolean,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin_exists boolean;
  v_space_id text;
  v_was_primary boolean;
  v_promoted_image_id text;
begin
  select public.is_valid_admin(input_admin_name, input_admin_phone) into v_admin_exists;

  if not v_admin_exists then
    raise exception '관리자 권한을 확인할 수 없습니다.';
  end if;

  if input_image_id is null or btrim(input_image_id) = '' then
    raise exception '사진 정보를 확인할 수 없습니다.';
  end if;

  select si.space_id::text, si.is_primary
    into v_space_id, v_was_primary
  from public.space_images si
  where si.image_id::text = input_image_id
    and si.is_active = true;

  if v_space_id is null then
    raise exception '사진을 찾을 수 없습니다.';
  end if;

  update public.space_images si
  set is_active = false,
      is_primary = false
  where si.image_id::text = input_image_id;

  if v_was_primary then
    select si.image_id::text
      into v_promoted_image_id
    from public.space_images si
    where si.space_id::text = v_space_id
      and si.is_active = true
    order by si.sort_order asc
    limit 1;

    if v_promoted_image_id is not null then
      update public.space_images si
      set is_primary = true
      where si.image_id::text = v_promoted_image_id;
    end if;
  end if;

  return query
  select
    si.image_id::text,
    si.space_id::text,
    si.image_url,
    si.alt_text,
    si.sort_order,
    si.is_primary,
    si.is_active,
    si.created_at
  from public.space_images si
  where si.image_id::text = input_image_id;
end;
$$;

grant execute on function public.remove_space_image(text, text, text) to anon, authenticated;

-- 대표 사진 지정: 대상만 is_primary=true, 같은 공간의 나머지는 false로 정리한다.
create or replace function public.set_primary_space_image(
  input_admin_name text,
  input_admin_phone text,
  input_image_id text
)
returns table (
  image_id text,
  space_id text,
  image_url text,
  alt_text text,
  sort_order integer,
  is_primary boolean,
  is_active boolean,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin_exists boolean;
  v_space_id text;
begin
  select public.is_valid_admin(input_admin_name, input_admin_phone) into v_admin_exists;

  if not v_admin_exists then
    raise exception '관리자 권한을 확인할 수 없습니다.';
  end if;

  if input_image_id is null or btrim(input_image_id) = '' then
    raise exception '사진 정보를 확인할 수 없습니다.';
  end if;

  select si.space_id::text
    into v_space_id
  from public.space_images si
  where si.image_id::text = input_image_id
    and si.is_active = true;

  if v_space_id is null then
    raise exception '사진을 찾을 수 없습니다.';
  end if;

  update public.space_images si
  set is_primary = false
  where si.space_id::text = v_space_id
    and si.is_active = true;

  update public.space_images si
  set is_primary = true
  where si.image_id::text = input_image_id;

  return query
  select
    si.image_id::text,
    si.space_id::text,
    si.image_url,
    si.alt_text,
    si.sort_order,
    si.is_primary,
    si.is_active,
    si.created_at
  from public.space_images si
  where si.image_id::text = input_image_id;
end;
$$;

grant execute on function public.set_primary_space_image(text, text, text) to anon, authenticated;
