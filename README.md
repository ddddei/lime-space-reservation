# Lime Space Reservation

라임 제휴공간 예약 운영 웹앱입니다. 승인된 피스메이커/호스트가 제휴공간을 예약하고, 관리자는 신청 목록과 참여자 승인 상태를 확인합니다.

## 기술 스택

- React 19
- TypeScript
- Vite
- Tailwind CSS v4
- Supabase Postgres / RPC
- lucide-react
- Playwright 기반 운영 QA

## 실행 방법

```bash
npm install
npm run dev
```

운영 빌드 미리보기:

```bash
npm run build
npm run preview
```

## 검증 명령

배포 전 반드시 실행합니다.

```bash
npm run build
npm run lint
git diff --check
```

## 환경 변수

`.env.local`에 아래 값을 설정합니다. service role key, DB password, secret key는 프론트엔드 코드에 넣지 않습니다.

```bash
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

## Supabase

프론트엔드는 anon key로 RPC를 호출합니다. 운영 SQL은 `supabase/manual-sql`에 분리되어 있습니다.

실행 순서:

1. `01_upsert_participants.sql`
2. `02_upsert_admins.sql`
3. `03_clear_test_reservations.sql`
4. `04_verify_counts.sql`

비상 시 예약 이력만 초기화하려면 `05_emergency_reset.sql`을 사용합니다.

## 폴더 구조

```text
src/components        화면 컴포넌트
src/data              로컬 mock 데이터와 정책 상수
src/lib               Supabase API, 예약 규칙, 표시 변환
src/types             예약 도메인 타입
supabase/migrations   RPC 정의 및 보정 SQL
supabase/manual-sql   운영 수동 SQL
```

## 주요 기능

- 참여자 로그인
- 공간 카드 탐색
- 예약 신청 모달
- 사진 팝업
- 내 신청 확인/수정
- 참가자 신청 취소
- 취소된 신청 보기
- Discord 문의 링크

## 관리자 기능

- 관리자 로그인
- 참여자 체크리스트 조회
- 예약 승인 상태 변경
- 전체 신청 목록 조회/새로고침
- 관리자 신청 취소
- 관리자 차단 일정 저장/수정/해제
- 공간 정보 조회

## 예약 구조

- 참여자별 `level`에 따라 총 신청 가능 시간이 다릅니다.
- Level 1: 16 blocks, 8시간
- Level 2: 48 blocks, 24시간
- 1 block은 30분입니다.
- 운영시간, 기존 예약, 관리자 차단 일정, 일일 최대 예약 시간을 검증합니다.

## 운영 시 주의사항

- 운영 오픈 전 `meetings = 0`, `sessions = 0` 상태를 확인합니다.
- `participants`, `admins`, `spaces`, `space_images`, `operating_hours`, `admin_blocks`는 운영 master 데이터입니다.
- 테스트 신청은 QA 후 반드시 `03_clear_test_reservations.sql`로 정리합니다.
- Supabase CLI의 `db query --linked`는 병렬 실행하지 않습니다. temp role 초기화가 충돌할 수 있으므로 SQL은 순차 실행합니다.
- 배포 직전 실제 URL에서 김나영 참가자 로그인과 한필구 관리자 로그인을 한 번 더 확인합니다.

## 배포

정적 Vite 앱으로 배포합니다.

```bash
npm run build
```

`dist` 산출물을 호스팅 서비스에 배포하고, 운영 환경 변수 `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`를 설정합니다.
