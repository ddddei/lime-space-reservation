-- Verify production-ready DB counts and critical login RPCs.

select 'active_participants' as metric, count(*)::integer as value from public.participants where is_active
union all select 'level_2_active_participants', count(*)::integer from public.participants where is_active and level = 2
union all select 'level_1_active_participants', count(*)::integer from public.participants where is_active and level = 1
union all select 'active_admins', count(*)::integer from public.admins where is_active
union all select 'meetings', count(*)::integer from public.meetings
union all select 'sessions', count(*)::integer from public.sessions
union all select 'spaces', count(*)::integer from public.spaces
union all select 'operating_hours', count(*)::integer from public.operating_hours
union all select 'space_images', count(*)::integer from public.space_images
union all select 'admin_blocks', count(*)::integer from public.admin_blocks;

select 'participant_login_kim_nayoung' as check_name, count(*)::integer as matched_rows
from public.verify_participant('김나영', '01093111170');

select 'admin_login_han_pilgoo' as check_name, count(*)::integer as matched_rows
from public.verify_admin('한필구', '01033808374');
