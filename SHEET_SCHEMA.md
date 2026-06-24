# Google Sheet Schema

이 문서는 Google Sheet/API 연동 전 필요한 시트 구조 초안입니다. 각 시트의 첫 행은 컬럼명으로 고정하고, 시간 값은 `HH:mm`, 날짜 값은 `YYYY-MM-DD`, 일시 값은 ISO 문자열 사용을 권장합니다.

## Settings

| Column | Type | Description |
|---|---|---|
| key | string | 설정 키 |
| value | string | 설정 값 |
| description | string | 설정 설명 |
| updatedAt | ISO datetime | 마지막 수정 시각 |

## Spaces

| Column | Type | Description |
|---|---|---|
| spaceId | string | 공간 ID |
| name | string | 공간명 |
| category | youth-building \| lifestyle | 공간 분류 |
| capacity | number | 정원 |
| description | string | 공간 설명 |
| imageUrl | string | 공간 사진 URL |
| features | string | 쉼표로 구분한 특징 목록 |
| isActive | boolean | 시스템에서 사용 가능한 공간 여부 |
| isPublicVisible | boolean | 사용자 화면 기본 노출 여부 |
| requiresAdminUnlock | boolean | 관리자 허용 후 노출/예약이 필요한 공간 여부 |
| parentSpaceName | string | 제제스튜디오, 숨플레이스 등 상위 공간명 |
| adminMemo | string | 촬영 문의, 조율 가능, 내부 메모 등 관리자용 메모 |
| sortOrder | number | 정렬 순서 |
| updatedAt | ISO datetime | 마지막 수정 시각 |

제휴공간은 실제 예약 가능한 세부 공간 단위로 관리한다. 예를 들어 숨플레이스는 `Room A`, `Room B`, 제제스튜디오는 `루프탑`, `지하`처럼 각각 별도 `spaceId`를 가진다.

청년동 회의실/다목적실은 현재 사용자 화면에서 기본 숨김 처리한다. `isPublicVisible=false`, `requiresAdminUnlock=true`로 두고, 제휴공간 예약이 어려운 경우 관리자 허용 흐름으로 노출/예약 가능하게 확장한다.

관리자는 Spaces 시트에 공간을 추가할 수 있다. 삭제는 실제 행 삭제보다 `isActive=false` 비활성 처리를 기본 정책으로 권장한다.

## OperatingHours

공간별 요일 운영시간을 관리한다. `dayOfWeek`는 0=일요일, 1=월요일, 2=화요일, 3=수요일, 4=목요일, 5=금요일, 6=토요일이다. 24시간 운영은 `openTime=00:00`, `closeTime=24:00`으로 기록한다.

| Column | Type | Description |
|---|---|---|
| operatingHourId | string | 운영시간 ID |
| spaceId | string | 공간 ID |
| dayOfWeek | 0-6 | 요일 |
| openTime | HH:mm | 운영 시작 시간 |
| closeTime | HH:mm | 운영 종료 시간 |
| isClosed | boolean | 정기 휴무 여부 |
| memo | string | 운영시간 메모 |
| updatedAt | ISO datetime | 마지막 수정 시각 |

## Users

사용자 로그인/본인 확인은 Users 시트의 `name` + `phone` 전체 전화번호로 확인한다. `phoneLast4`는 화면 표시와 공개 현황 마스킹용으로만 사용한다. Users 시트에 없는 사람은 공간 예약 및 모임 신청을 할 수 없다.

| Column | Type | Description |
|---|---|---|
| userId | string | 참여자 ID |
| name | string | 이름 |
| phone | string | 전화번호 |
| phoneLast4 | string | 전화번호 끝 4자리 |
| level | 1 \| 2 | 신청 레벨 |
| hasPlan | boolean | 기획안 제출 여부 |
| hasBudget | boolean | 예산안 제출 여부 |
| hasPromotion | boolean | 홍보물 제출 여부 |
| hasAdminApproval | boolean | 관리자 최종 승인 여부 |
| maxBlocks | number | 총 신청 가능 블록 수 |
| memo | string | 관리자 메모 |
| isActive | boolean | 활성 사용자 여부 |
| createdAt | ISO datetime | 생성 시각 |
| updatedAt | ISO datetime | 마지막 수정 시각 |

## Admins

관리자 로그인은 Admins 시트의 `name` + `phone` 전체 전화번호로 확인한다. Admins 시트에 없거나 `isActive=false`인 사람은 관리자 모드에 접근할 수 없다.

| Column | Type | Description |
|---|---|---|
| adminId | string | 관리자 ID |
| name | string | 관리자 이름 |
| phone | string | 전체 전화번호 |
| phoneLast4 | string | 전화번호 끝 4자리 |
| role | string | 관리자 권한 |
| isActive | boolean | 활성 관리자 여부 |
| createdAt | ISO datetime | 생성 시각 |
| updatedAt | ISO datetime | 마지막 수정 시각 |

## Meetings

| Column | Type | Description |
|---|---|---|
| meetingId | string | 모임 ID |
| applicantUserId | string | 신청자 userId |
| applicantName | string | 신청자 이름 스냅샷 |
| phoneLast4 | string | 신청자 전화번호 끝 4자리 스냅샷 |
| level | 1 \| 2 | 신청 당시 레벨 |
| meetingName | string | 모임명 |
| purpose | string | 모임 목적 |
| status | draft \| submitted \| approved \| rejected | 모임 상태 |
| createdAt | ISO datetime | 생성 시각 |
| updatedAt | ISO datetime | 마지막 수정 시각 |

## Sessions

| Column | Type | Description |
|---|---|---|
| sessionId | string | 회차/예약 ID |
| meetingId | string | 연결된 모임 ID |
| sessionIndex | number | 모임 내 회차 순서 |
| spaceId | string | 예약 공간 ID |
| date | YYYY-MM-DD | 예약 날짜 |
| startTime | HH:mm | 시작 시간 |
| endTime | HH:mm | 종료 시간 |
| blockCount | number | 사용자가 직접 선택한 30분 단위 블록 수. 1시간 고정값이 아니라 실제 선택 구간 기준으로 저장 |
| status | requested \| confirmed \| cancelled | 예약 상태 |
| createdAt | ISO datetime | 생성 시각 |
| updatedAt | ISO datetime | 마지막 수정 시각 |

## AdminBlocks

관리자 차단 일정은 실제 예약 불가 시간, 제휴공간 기존 예약, 휴무, 내부 점검, 촬영 등으로 사용한다. 확정되지 않은 문의나 촬영 가능성은 차단 일정으로 등록하지 않고 관리자 메모 또는 AuditLogs에 남긴 뒤 확정 시 등록한다.

시즌1 운영 메모: 제제스튜디오는 확정 예약불가 일정이 없고 촬영 문의는 조율 가능 상태다. 숨플레이스 금요일 20:00~21:00 촬영 예약 가능성은 아직 확정이 아니므로 AdminBlocks에 등록하지 않는다.

| Column | Type | Description |
|---|---|---|
| blockId | string | 차단 일정 ID |
| spaceId | string | 차단 공간 ID |
| date | YYYY-MM-DD | 차단 날짜 |
| startTime | HH:mm | 시작 시간 |
| endTime | HH:mm | 종료 시간 |
| reason | string | 차단 사유 |
| createdBy | string | 등록자 |
| isActive | boolean | 활성 차단 여부 |
| createdAt | ISO datetime | 생성 시각 |

## AuditLogs

| Column | Type | Description |
|---|---|---|
| logId | string | 로그 ID |
| actorType | user \| admin \| system | 실행 주체 |
| actorId | string | 실행 주체 ID |
| action | string | 수행 작업 |
| entityType | Settings \| Spaces \| OperatingHours \| Users \| Admins \| Meetings \| Sessions \| AdminBlocks | 대상 시트/도메인 |
| entityId | string | 대상 ID |
| beforeJson | JSON string | 변경 전 값 |
| afterJson | JSON string | 변경 후 값 |
| createdAt | ISO datetime | 로그 생성 시각 |
