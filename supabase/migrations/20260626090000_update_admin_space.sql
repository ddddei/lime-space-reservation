create or replace function public.update_admin_space(
  input_admin_name text,
  input_admin_phone text,
  input_space_id text,
  input_name text,
  input_capacity integer,
  input_description text,
  input_image_url text,
  input_features text[],
  input_is_active boolean,
  input_is_public_visible boolean,
  input_parent_space_name text,
  input_admin_memo text
)
returns table (
  space_id text,
  name text,
  category text,
  capacity integer,
  description text,
  image_url text,
  features text[],
  is_active boolean,
  is_public_visible boolean,
  requires_admin_unlock boolean,
  parent_space_name text,
  admin_memo text,
  sort_order integer,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin_exists boolean;
begin
  select public.is_valid_admin(input_admin_name, input_admin_phone) into v_admin_exists;

  if not v_admin_exists then
    raise exception '관리자 권한을 확인할 수 없습니다.';
  end if;

  if input_space_id is null or btrim(input_space_id) = '' then
    raise exception '공간 정보를 확인할 수 없습니다.';
  end if;

  if input_name is null or btrim(input_name) = '' then
    raise exception '공간명을 입력해 주세요.';
  end if;

  if input_capacity is null or input_capacity < 1 then
    raise exception '정원은 1명 이상이어야 합니다.';
  end if;

  update public.spaces s
  set name = btrim(input_name),
      capacity = input_capacity,
      description = coalesce(input_description, ''),
      image_url = coalesce(input_image_url, ''),
      features = coalesce(input_features, '{}'::text[]),
      is_active = coalesce(input_is_active, true),
      is_public_visible = coalesce(input_is_public_visible, true),
      parent_space_name = coalesce(input_parent_space_name, ''),
      admin_memo = coalesce(input_admin_memo, ''),
      updated_at = now()
  where s.space_id::text = input_space_id;

  if not found then
    raise exception '공간 정보를 찾을 수 없습니다.';
  end if;

  return query
  select
    s.space_id::text,
    s.name,
    s.category,
    s.capacity,
    s.description,
    s.image_url,
    s.features,
    s.is_active,
    s.is_public_visible,
    s.requires_admin_unlock,
    s.parent_space_name,
    s.admin_memo,
    s.sort_order,
    s.created_at,
    s.updated_at
  from public.spaces s
  where s.space_id::text = input_space_id;
end;
$$;

grant execute on function public.update_admin_space(text, text, text, text, integer, text, text, text[], boolean, boolean, text, text) to anon, authenticated;
