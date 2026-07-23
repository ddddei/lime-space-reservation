# 지시서 ⑨: 달력 6개월 롤링 · 참가자 기수(1기/2기) · 개인별 사용시간 초기화

## 1. 배경과 전제

2기 운영 준비를 위한 3종 작업이다:

- **(A) 달력 6개월 롤링**: `CalendarView`가 2026년 7·8월 탭으로 하드코딩되어 있다(`getMonthGridDates(2026, ...)`, `seasonMonths=[6,7]`). 오늘(KST) 기준 **이번 달부터 6개월** 월 탭을 자동 생성하고 연도를 표기한다. `getCalendarDates`의 62일 창도 약 6개월(183일)로 확장해 다른 사용처(MyMeetings 날짜 드롭다운)와 정합시킨다.
- **(B) 기수 라벨**: 참가자에 `cohort text not null default '1기'` 추가. 체크리스트에 기수 표시·변경(선택지: 1기/2기, 확장 가능), 기수 필터. 신규 추가 폼에도 기수 선택.
- **(C) 개인별 사용시간 초기화**: 참가자에 `usage_reset_on date null` 추가. 사용시간 계산을 "**usage_reset_on 이후 날짜(>=)의 비취소 세션만 합산**"으로 변경(null이면 전체 합산 = 기존과 동일). 체크리스트 행별 "사용시간 초기화" 버튼 → 기산일을 오늘로 설정. **기록은 아무것도 삭제하지 않는다.** 지금은 기능만 구현하고 실제 초기화는 운영자가 나중에 누른다.
- **핵심 제약**: 한도 검증은 서버 RPC `submit_reservation_application`에도 있다. 이 함수의 **현행 정의 전문이 `supabase/manual-sql/baseline/submit_reservation_application.sql`에 덤프되어 있다** — 이 파일을 기준으로 최소 수정(참가자 조회에 usage_reset_on 포함 + v_total_used_blocks 집계에 날짜 조건 추가)만 가한 create or replace를 새 마이그레이션에 넣는다. 다른 로직(중복·차단·일일한도 검사)은 한 글자도 바꾸지 않는다. `get_admin_participants` 현행 정의도 `supabase/manual-sql/baseline/get_admin_participants.sql`에 있다.

이 작업이 아닌 것: 시즌/기수 엔티티 테이블 신설, 일괄(전원) 초기화 버튼(개인별만), 일일 한도·레벨 한도 값 변경, 달력 컴포넌트 리디자인(탭 생성 로직만 동적화).

## 2. 작업 전 필독 파일 (읽지 않고 쓰지 마라)

- `supabase/manual-sql/baseline/submit_reservation_application.sql` — 현행 서버 검증 전문 (수정 기준)
- `supabase/manual-sql/baseline/get_admin_participants.sql` — 현행 목록 조회 전문 (수정 기준)
- `src/components/CalendarView.tsx` — 월 탭·그리드 로직 전체
- `src/lib/date.ts` — `getCalendarDates`, `getTodayDateValue`
- `src/lib/mockReservationActions.ts` — `buildEligibility`의 usedBlocks 계산
- `src/components/AdminUserChecklist.tsx` — usedBlocks 계산(행), 추가 폼, 버튼 패턴
- `src/components/MyMeetings.tsx` — `getCalendarDates` 사용처
- `src/lib/supabaseMappers.ts`, `src/lib/supabaseReservationApi.ts`, `src/lib/supabaseClient.ts`, `src/types/reservation.ts` — ParticipantUser 매핑·API 패턴
- `supabase/migrations/20260722100000_create_admin_participant.sql` — 기존 추가 RPC(시그니처 변경 대상)

## 3. 산출물

### 3-1. 마이그레이션 SQL (신규 1개, `supabase/migrations/`)

하나의 파일에 순서대로:

1. `alter table public.participants add column if not exists cohort text not null default '1기';`
   `alter table public.participants add column if not exists usage_reset_on date;`
2. **`submit_reservation_application` create or replace** — baseline 전문 기준 최소 수정: 참가자 select에 `p.usage_reset_on` 추가, `v_total_used_blocks` 집계 where에 `and (v_participant.usage_reset_on is null or s.date >= v_participant.usage_reset_on)` 추가. 반환 시그니처 불변.
3. **`get_admin_participants` create or replace** — baseline 기준 returns/select에 `cohort text`, `usage_reset_on date` 추가. (returns table 변경은 기존 함수 drop이 필요할 수 있음 — `drop function if exists public.get_admin_participants(text, text);` 후 create.)
4. **`create_admin_participant` 시그니처 확장** — `input_cohort text default '1기'` 추가. 시그니처가 바뀌므로 **기존 시그니처를 drop function if exists 한 뒤** 새로 create (PostgREST 오버로드 모호성 방지). 본문은 기존 파일 기준 + cohort 저장, 재활성화 경로에서도 cohort 갱신. returns에 cohort, usage_reset_on 포함.
5. **`update_participant_cohort` RPC 신규** — 관리자 검증 + cohort 값은 비어있지 않은 텍스트만 허용, 갱신 후 행 반환.
6. **`reset_participant_usage` RPC 신규** — 관리자 검증 + 대상 존재 확인 + `usage_reset_on = current_date(KST 기준: (now() at time zone 'Asia/Seoul')::date)` 설정, 갱신 후 행 반환.
- 모든 함수 grant execute to anon, authenticated. 예외 메시지 한국어. participants/meetings/sessions delete 문 금지.

### 3-2. 프론트

- `ParticipantUser`에 `cohort: string`, `usageResetOn?: string` 추가, 매퍼·RPC 타입·`createAdminParticipant` 입력에 cohort 반영.
- **사용시간 계산 일원화**: usedBlocks를 구하는 로직(`buildEligibility`, `AdminUserChecklist`의 행 계산, 그 외 grep으로 찾은 모든 곳)에 "usageResetOn이 있으면 그 날짜(포함) 이후 세션만 합산" 필터를 적용한다. 헬퍼 함수 하나로 뽑아 공유한다.
- **체크리스트**: 기수 열 추가(select: 1기/2기 — 선택지 상수는 `src/data/settings.ts`에 `PARTICIPANT_COHORTS = ["1기", "2기"]`로), 기수 필터(전체/1기/2기), 행별 "사용시간 초기화" 버튼(confirm 1단계: "○○님의 사용시간을 초기화할까요? 오늘 이후 예약만 차감됩니다.") → `resetParticipantUsage` 호출 → 재조회. 기산일이 설정된 참가자는 "초기화: YYYY-MM-DD" 배지 표시.
- **추가 폼**: 기수 선택(기본 1기).
- **달력**: 오늘 기준 6개월 월 탭(예: "7월", "8월", ... 해가 바뀌면 "2027년 1월"), 상수 `CALENDAR_MONTHS_AHEAD = 6`을 `settings.ts`에. 오늘 이전 날짜는 기존 비활성 처리 관례 유지. `getCalendarDates` 기본 days도 183으로.
- 목업 폴백 모드: 기수 표시만 하고 변경/초기화 버튼 숨김 (기존 `canManageParticipants` 관례).

### 3-3. 문서

- `ADMIN_GUIDE.md`: 기수 관리·사용시간 초기화 절 추가 (초기화는 기록을 지우지 않고 계산 기준일만 바꾼다는 설명 필수).
- `SHEET_SCHEMA.md` 또는 관련 스키마 문서에 participants 신규 컬럼 2개 기록 (문서가 스키마를 다루는 경우에만).

## 4. 금지 사항

- git 커밋/스테이징/브랜치 변경 금지. 새 npm 의존성 금지.
- 기존 마이그레이션 파일 수정 금지 (신규 파일만 — create_admin_participant 변경도 새 마이그레이션에서 drop+create).
- baseline 파일의 검증 로직(중복·차단·일일한도·회차한도) 변경 금지 — 지시된 최소 수정만.
- participants/meetings/sessions에 대한 delete 문 금지 (drop function은 허용).
- 실제 Supabase DB 적용 시도 금지. `dist/`, `node_modules/`, `.env.local` 접근 금지.

## 5. 완료 기준

1. `npx tsc --noEmit` 통과. 2. `npm run build` 통과. 3. `npx eslint src` 통과 (워닝 증가 없음).
4. `grep -n "2026" src/components/CalendarView.tsx` 결과 0건 (연도 하드코딩 제거 확인).
5. 신규 마이그레이션과 baseline의 diff가 지시된 수정 범위에 한정되는지 직접 비교·확인 (`diff` 명령 결과를 보고에 요약).
6. `npm run dev` 수동 확인(종료 필수): ① 달력 탭이 이번 달부터 6개월 ② 체크리스트에 기수 열·필터·초기화 버튼 렌더링 ③ 목업 모드에서 남은 시간 배지가 기존과 동일하게 동작(usageResetOn 없는 경우 회귀 없음). DB 실동작은 "미검증: DB 적용 후 확인 필요" 명시.

**보고에 포함할 것**: 변경/추가 파일 목록, 검증 명령별 결과, baseline 대비 diff 요약, 수동 확인 결과, 판단 지점과 근거, 보류 항목, `git status --short` 출력.
