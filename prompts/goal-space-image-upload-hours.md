# 지시서 ④: 공간 사진 직접 업로드 + 운영시간 직접 설정

## 1. 배경과 전제

- 공간 추가/수정 폼의 사진이 URL 텍스트 입력뿐이라 운영자가 쓰기 어렵다. **Supabase Storage 버킷(`space-images`)에 파일을 직접 업로드**하고 발급된 공개 URL을 기존 `image_url` 필드에 넣는 방식으로 개선한다. 버킷은 검수자가 별도로 생성한다(공개 읽기, 5MB 제한, 이미지 MIME만 허용) — **에이전트는 버킷이 존재한다고 전제하고 코드만 작성한다.**
- 운영시간이 프리셋 4종(24시간/청년동/칫챗/티파티) 고정이라 새 공간의 실제 계약 시간을 반영할 수 없다. 프리셋 선택지에 **"직접 설정"**을 추가해 공통 시작/종료 시각과 휴무 요일을 지정할 수 있게 한다.
- DB 스키마·RPC 변경 없음. `create_admin_space` RPC는 이미 임의의 운영시간 jsonb 7행을 받는다 (지시서 ②에서 적용 완료).
- 이 작업이 아닌 것: `space_images` 갤러리 테이블에 다중 사진 등록(후속 작업), 기존 공간 수정 화면(`SpaceAdminEditor`)의 운영시간 편집(후속), 요일별로 다른 시간 설정(공통 시간 + 휴무 요일까지만).

## 2. 작업 전 필독 파일 (읽지 않고 쓰지 마라)

- `src/components/SpaceCreateForm.tsx` — 현재 폼 구조, 프리셋 4종, async 저장/오류 처리 패턴
- `src/lib/supabaseClient.ts` — supabase 클라이언트 생성부 (storage 접근에 그대로 사용)
- `src/lib/supabaseReservationApi.ts` — `createAdminSpace` 입력 형태, 에러 메시지 패턴
- `src/data/operatingHours.ts` — `createWeeklyHours` 헬퍼 (직접 설정 변환에 재사용)
- `src/lib/date.ts` — `getTimeRangeBetween`, `toMinutes` (시각 선택지 생성에 재사용)
- `src/types/reservation.ts` — `OperatingHour` 타입

## 3. 산출물

### 3-1. 사진 업로드 (`src/lib/` 신규 함수 + `SpaceCreateForm.tsx`)

- `src/lib/spaceImageUpload.ts` 신규: `uploadSpaceImage(file: File): Promise<{ status: "ok"; publicUrl: string } | { status: "error"; message: string }>`.
  - 버킷 `space-images`, 경로는 `spaces/<타임스탬프>-<정리된 파일명>` (한글·공백은 제거 또는 치환해 URL-safe하게).
  - 업로드 전 검증: 이미지 MIME(`image/jpeg|png|webp|gif`)이 아니면, 5MB 초과면 한국어 메시지로 거부.
  - 업로드 후 `getPublicUrl`로 공개 URL 반환. supabase 미설정(`isSupabaseConfigured` false) 시 에러 메시지 반환.
- 폼 UI: 기존 "사진 URL" 입력칸 **유지** + 그 옆/아래에 파일 선택 입력(`<input type="file" accept="image/*">`) 추가.
  - 파일 선택 시 즉시 업로드하지 말고, 선택 파일명·로컬 미리보기(`URL.createObjectURL`)를 보여주고 **저장(공간 추가) 시점에 업로드**한다. 업로드 성공 후 그 URL로 `createAdminSpace`를 호출한다.
  - 파일이 선택돼 있으면 파일이 우선, 없으면 URL 입력값 사용. "선택 취소" 버튼 제공.
  - 업로드 중 상태는 기존 저장 중 상태에 합류(버튼 비활성 + 문구). 업로드 실패 시 공간 생성은 진행하지 않고 오류 메시지 표시.
  - 미리보기 objectURL은 성공/취소 시 `URL.revokeObjectURL`로 해제.

### 3-2. 운영시간 직접 설정 (`SpaceCreateForm.tsx`)

- 운영시간 프리셋 select에 `"직접 설정"` 옵션 추가. 선택 시 아래 UI 노출:
  - 시작 시각·종료 시각 select 2개. 선택지는 00:00~24:00 사이 30분 단위 (`getTimeRangeBetween` 재사용 + 종료엔 "24:00" 포함). 기본값 09:00~21:00.
  - 휴무 요일 체크박스 7개(일~토, 기본 모두 영업). 휴무 요일은 `isClosed: true`, `openTime/closeTime`은 `"00:00"`으로 저장 (기존 티파티 월요일 휴무 데이터와 동일한 형태).
  - 종료 시각이 시작 시각보다 늦지 않으면 저장 버튼 비활성 + 안내 문구.
- 저장 시 `createWeeklyHours` 패턴으로 7행 생성하되 휴무 요일만 `isClosed` 반영. 기존 프리셋 4종 동작은 그대로 유지.
- 참고: 00:00~24:00로 직접 설정하면 참가자 화면에서는 09~22시로 클램프되어 보인다(지시서 ③의 정책). 폼에 이 사실을 한 줄 안내로 표시한다.

### 3-3. 문서

- `ADMIN_GUIDE.md`의 "새 공간 추가" 절에 사진 업로드 방법과 운영시간 직접 설정 방법을 추가 (운영자 눈높이, 기존 문체).

## 4. 금지 사항

- git 커밋/스테이징/브랜치 변경 금지. 새 npm 의존성 금지 (supabase-js의 storage API는 기존 의존성에 포함).
- `supabase/` 아래 파일 수정 금지. RPC·DB 스키마 변경 금지.
- 실제 Supabase에 버킷 생성·업로드 시도 금지 (코드 작성까지만; 버킷은 검수자가 생성).
- `dist/`, `node_modules/`, `.env.local` 접근 금지.
- 기존 URL 입력 방식 제거 금지 (병행 유지).

## 5. 완료 기준

1. `npx tsc --noEmit` 통과.
2. `npm run build` 통과.
3. `npx eslint src` 통과 (워닝 증가 없음).
4. `grep -n "space-images" src/lib/spaceImageUpload.ts` 존재, `grep -rn "space-images" supabase/` 0건.
5. `grep -n "직접 설정" src/components/SpaceCreateForm.tsx` 존재.
6. 코드 트레이스로 확인 (실 업로드는 버킷 미생성으로 불가 — "미검증: 버킷 생성 후 확인 필요"로 보고에 명시): ① 파일 선택 없이 URL만으로 기존 흐름 동작 ② 6MB 파일/PDF 선택 시 거부 메시지 경로 ③ 직접 설정에서 종료≤시작이면 저장 불가 ④ 휴무 요일 체크 시 jsonb에 is_closed true로 들어가는 경로.

**보고에 포함할 것**: 변경/추가 파일 목록, 검증 명령별 결과, 코드 트레이스 4건 결과, 판단 지점과 근거, 보류 항목, `git status --short` 출력.
