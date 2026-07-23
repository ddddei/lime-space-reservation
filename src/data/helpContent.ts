// 앱 내 도움말 모달(참가자용/관리자용)에 쓰이는 하드코딩 콘텐츠.
// USER_GUIDE.md · ADMIN_GUIDE.md 개정 시 이 파일도 같이 고친다.
// 한도 수치는 settings.ts 상수에서 계산해 문서·화면·코드가 어긋나지 않게 한다.
import {
  ALL_DAY_BOOKING_CLOSE_TIME,
  ALL_DAY_BOOKING_OPEN_TIME,
  BLOCK_MINUTES,
  CALENDAR_MONTHS_AHEAD,
  LEVEL_MAX_BLOCKS,
  MAX_DAILY_BLOCKS,
  MAX_MEETING_SESSIONS,
} from "./settings";

export type HelpSection = {
  readonly title: string;
  readonly body: readonly string[];
};

const blocksToHours = (blocks: number): number => (blocks * BLOCK_MINUTES) / 60;

const level1Hours = blocksToHours(LEVEL_MAX_BLOCKS[1]);
const level2Hours = blocksToHours(LEVEL_MAX_BLOCKS[2]);
const dailyMaxHours = blocksToHours(MAX_DAILY_BLOCKS);

export const USER_HELP_SECTIONS: readonly HelpSection[] = [
  {
    title: "로그인",
    body: [
      "이름과 전체 전화번호를 입력하고 `참여자 확인`을 누르면 로그인됩니다.",
      "등록된 참가자만 로그인할 수 있고, 관리자 승인이 완료된 뒤에만 예약 신청이 가능합니다.",
    ],
  },
  {
    title: "남은 시간 확인",
    body: [
      `화면 상단에 "이번 시즌 남은 시간" 배지가 항상 보입니다. Level 1은 ${level1Hours}시간, Level 2는 ${level2Hours}시간까지 예약할 수 있습니다.`,
      "남은 시간이 0시간이 되면 배지 색이 경고색으로 바뀝니다.",
    ],
  },
  {
    title: "예약 규칙",
    body: [
      `시간은 ${BLOCK_MINUTES}분 단위로 선택하며, 하루 최대 ${dailyMaxHours}시간까지 연속으로 선택할 수 있습니다.`,
      `달력은 오늘부터 ${CALENDAR_MONTHS_AHEAD}개월 뒤까지 볼 수 있고, 하루에는 한 공간만 예약할 수 있습니다.`,
      `모임당 최대 ${MAX_MEETING_SESSIONS}회차까지 신청할 수 있습니다.`,
      `24시간 운영 공간도 예약 신청은 ${ALL_DAY_BOOKING_OPEN_TIME}~${ALL_DAY_BOOKING_CLOSE_TIME} 사이에만 가능합니다.`,
    ],
  },
  {
    title: "취소 방법",
    body: [
      "`내 신청 확인/수정`에서 신청 내역을 찾아 `신청 취소`를 누르면 취소됩니다.",
      "취소된 신청은 기본 목록에서 숨겨지고, `취소된 신청 보기`를 켜면 다시 확인할 수 있습니다.",
    ],
  },
];

export const ADMIN_HELP_SECTIONS: readonly HelpSection[] = [
  {
    title: "관리자 로그인 / 계정 관리",
    body: [
      "우측 상단 `관리자 모드`에서 이름과 전체 전화번호로 로그인합니다.",
      "관리자 계정은 `관리자 계정` 섹션에서 추가·비활성·재활성할 수 있습니다. 본인 계정과, 활성 관리자가 1명뿐일 때 그 관리자는 비활성화할 수 없습니다(잠금 방지).",
    ],
  },
  {
    title: "참가자 관리",
    body: [
      "`참여자 체크리스트`에서 참가자 추가·비활성·재활성, 예약 승인 토글, Level, 기수(1기/2기)를 관리합니다.",
      "`사용시간 초기화`는 기존 예약·취소 기록을 지우지 않습니다. 사용 시간을 계산할 때 기준으로 삼는 날짜(기산일)만 오늘로 바뀌고, 그 이전 기록은 그대로 남습니다. 2기 시작 시점에 사용하는 것을 권장합니다.",
    ],
  },
  {
    title: "신청 관리",
    body: [
      "`전체 신청 목록`에서 모든 신청을 확인하고 취소할 수 있습니다.",
      "상태 필터에서 `취소됨`을 선택하면 취소된 신청도 확인할 수 있습니다.",
    ],
  },
  {
    title: "공간 관리",
    body: [
      "새 공간 추가 시 사진 업로드와 운영시간 프리셋(24시간 / 청년동 기본 / 칫챗 / 티파티 요일별 / 직접 설정) 중 하나를 고릅니다.",
      "기존 공간은 사진 교체, 사진 갤러리(여러 장) 관리, 대표 사진 지정, 운영시간 수정을 할 수 있습니다.",
      "`사용자 숨김`은 참가자 화면에서만 숨기는 기능이고, `비활성`은 운영에서 제외하는 기능입니다. 서로 다릅니다.",
    ],
  },
  {
    title: "차단 일정",
    body: [
      "특정 공간의 특정 날짜·시간을 참가자가 예약하지 못하도록 막습니다. 외부 대관, 내부 행사, 점검, 촬영 일정에 사용합니다.",
    ],
  },
  {
    title: "디스코드 알림",
    body: [
      "참가자가 신청하거나 취소하면 Discord 웹훅으로 운영 채널에 자동 알림이 발송됩니다.",
      "알림을 받을 채널을 바꾸려면 Discord 웹훅 설정에서 변경합니다.",
    ],
  },
  {
    title: "문제가 생겼을 때",
    body: [
      "신청이 안 보이거나 차단이 적용되지 않는 것 같으면 먼저 새로고침과 상태 필터부터 확인하세요.",
      "해결되지 않으면 TROUBLESHOOTING.md의 확인 순서를 따르세요.",
    ],
  },
];
