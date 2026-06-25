import type { Space } from "../types/reservation";
import { allDayHours, chitChatHours, teaPartyHours, youthBuildingHours } from "./operatingHours";

const youthAdminMemo = "제휴공간 예약이 어려울 때 관리자 허용으로 노출할 수 있는 청년동 공간";

export const initialSpaces: readonly Space[] = [
  {
    id: "youth-room-1",
    name: "회의실 1",
    category: "youth-building",
    capacity: 8,
    description: "소규모 회의와 기획 회의에 적합한 청년동 기본 회의실입니다.",
    imageUrl: "https://images.unsplash.com/photo-1517502884422-41eaead166d4?auto=format&fit=crop&w=900&q=80",
    features: ["화이트보드", "모니터", "집중 회의"],
    operatingHours: youthBuildingHours,
    isActive: true,
    isPublicVisible: false,
    requiresAdminUnlock: true,
    adminMemo: youthAdminMemo,
    sortOrder: 101,
  },
  {
    id: "youth-room-2",
    name: "회의실 2",
    category: "youth-building",
    capacity: 10,
    description: "팀 워크숍과 인터뷰 진행에 적합한 밝은 회의 공간입니다.",
    imageUrl: "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=900&q=80",
    features: ["회의 테이블", "프로젝터", "온라인 회의"],
    operatingHours: youthBuildingHours,
    isActive: true,
    isPublicVisible: false,
    requiresAdminUnlock: true,
    adminMemo: youthAdminMemo,
    sortOrder: 102,
  },
  {
    id: "youth-room-3",
    name: "회의실 3",
    category: "youth-building",
    capacity: 6,
    description: "조용한 상담, 준비 모임, 소규모 독서 모임에 어울립니다.",
    imageUrl: "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=900&q=80",
    features: ["조용한 환경", "라운지 좌석", "소규모 모임"],
    operatingHours: youthBuildingHours,
    isActive: true,
    isPublicVisible: false,
    requiresAdminUnlock: true,
    adminMemo: youthAdminMemo,
    sortOrder: 103,
  },
  {
    id: "multi-room-1",
    name: "다목적실 1",
    category: "youth-building",
    capacity: 24,
    description: "교육, 발표, 네트워킹을 유연하게 진행할 수 있는 청년동 공간입니다.",
    imageUrl: "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=900&q=80",
    features: ["이동식 의자", "음향", "발표"],
    operatingHours: youthBuildingHours,
    isActive: true,
    isPublicVisible: false,
    requiresAdminUnlock: true,
    adminMemo: youthAdminMemo,
    sortOrder: 104,
  },
  {
    id: "multi-room-2",
    name: "다목적실 2",
    category: "youth-building",
    capacity: 30,
    description: "큰 규모의 활동형 모임과 커뮤니티 행사를 위한 공간입니다.",
    imageUrl: "https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&w=900&q=80",
    features: ["넓은 바닥", "행사형 배치", "워크숍"],
    operatingHours: youthBuildingHours,
    isActive: true,
    isPublicVisible: false,
    requiresAdminUnlock: true,
    adminMemo: youthAdminMemo,
    sortOrder: 105,
  },
  {
    id: "jeje-rooftop",
    name: "제제스튜디오 옥탑방&옥상",
    category: "lifestyle",
    parentSpaceName: "제제스튜디오",
    capacity: 10,
    description: "연중무휴 24시간 이용 가능한 옥탑방&옥상 공간입니다. 조리와 음식 반입이 가능하며, 패브릭 소재 오염 방지를 위해 이용 후 원상복구가 필요합니다. 좌식 이용이 필수이고 테이블 배치가 가능합니다.",
    imageUrl: "https://images.unsplash.com/photo-1518005020951-eccb494ad742?auto=format&fit=crop&w=900&q=80",
    features: ["24시간 운영", "10명 내외", "빔프로젝터", "블루투스 연결", "LP/빔프로젝터 스피커", "와이파이", "콘센트", "냉난방", "냉장고", "조리·음식 반입 가능", "좌식 이용 필수", "테이블 배치 가능"],
    operatingHours: allDayHours,
    isActive: true,
    isPublicVisible: true,
    adminMemo: "Excel 원본: 광명시 시청로 148 지하4층. 패브릭 오염·이염 주의, 이용 후 원상복구 필수.",
    sortOrder: 1,
  },
  {
    id: "jeje-basement",
    name: "제제스튜디오 지하",
    category: "lifestyle",
    parentSpaceName: "제제스튜디오",
    capacity: 10,
    description: "연중무휴 24시간 이용 가능한 지하 공간입니다. LP 블루투스 스피커, 와이파이, 콘센트, 냉난방을 사용할 수 있고 음료와 다과 반입이 가능합니다. 좌식 이용과 테이블 배치가 가능합니다.",
    imageUrl: "https://images.unsplash.com/photo-1518005020951-eccb494ad742?auto=format&fit=crop&w=900&q=80",
    features: ["24시간 운영", "10명 내외", "LP 블루투스 스피커", "와이파이", "콘센트", "냉난방", "음료·다과 가능", "좌식 가능", "테이블 배치 가능"],
    operatingHours: allDayHours,
    isActive: true,
    isPublicVisible: true,
    adminMemo: "Excel 원본: 광명시 시청로 148 지하1층. TV/빔프로젝터와 HDMI 없음, 이용 후 원상복구 필수.",
    sortOrder: 2,
  },
  {
    id: "sum-room-a",
    name: "숨플레이스 Room A",
    category: "lifestyle",
    parentSpaceName: "숨플레이스",
    capacity: 10,
    description: "연중무휴 24시간 이용 가능한 A룸입니다. TV, HDMI, 블루투스 스피커, 와이파이, 콘센트, 냉난방, 냉장고를 사용할 수 있고 음식과 주류 반입이 가능합니다. 테이블과 의자 추가 및 치우기가 가능합니다.",
    imageUrl: "https://images.unsplash.com/photo-1505409859467-3a796fd5798e?auto=format&fit=crop&w=900&q=80",
    features: ["24시간 운영", "10명 내외", "TV", "HDMI", "블루투스 스피커", "와이파이", "콘센트", "냉난방", "냉장고", "음식·주류 가능", "테이블&의자 추가·치우기 가능"],
    operatingHours: allDayHours,
    isActive: true,
    isPublicVisible: true,
    adminMemo: "Excel 원본: 경기 광명시 오리로 639 한솔빌딩 5층. 이용 후 원상복구 필수.",
    sortOrder: 3,
  },
  {
    id: "sum-room-b",
    name: "숨플레이스 Room B",
    category: "lifestyle",
    parentSpaceName: "숨플레이스",
    capacity: 10,
    description: "연중무휴 24시간 이용 가능한 B룸입니다. TV, HDMI, 블루투스 스피커, 와이파이, 콘센트, 냉난방, 냉장고를 사용할 수 있고 음식과 주류 반입이 가능합니다. 테이블과 의자 추가가 가능합니다.",
    imageUrl: "https://images.unsplash.com/photo-1505409859467-3a796fd5798e?auto=format&fit=crop&w=900&q=80",
    features: ["24시간 운영", "10명 내외", "TV", "HDMI", "블루투스 스피커", "와이파이", "콘센트", "냉난방", "냉장고", "음식·주류 가능", "테이블&의자 추가 가능"],
    operatingHours: allDayHours,
    isActive: true,
    isPublicVisible: true,
    adminMemo: "Excel 원본: 경기 광명시 오리로 639 한솔빌딩 5층. 이용 후 원상복구 필수.",
    sortOrder: 4,
  },
  {
    id: "chitchat",
    name: "모임공간 칫챗",
    category: "lifestyle",
    capacity: 8,
    description: "08:00-22:00 이용 가능한 8명 규모 모임공간입니다. 빔프로젝터, HDMI, 빔프로젝터 스피커와 블루투스 스피커, 와이파이, 콘센트, 냉난방을 사용할 수 있습니다. 음료, 다과, 냄새 안 나는 음식 반입이 가능하며 정수기, 커피머신, 다과를 이용할 수 있습니다.",
    imageUrl: "https://images.unsplash.com/photo-1497366412874-3415097a27e7?auto=format&fit=crop&w=900&q=80",
    features: ["08:00-22:00", "8명", "빔프로젝터", "HDMI", "빔프로젝터 스피커", "블루투스 스피커", "와이파이", "콘센트", "냉난방", "음료·다과 가능", "냄새 안 나는 음식 가능", "정수기", "커피머신", "다과 이용 가능", "냉장고 없음"],
    operatingHours: chitChatHours,
    isActive: true,
    isPublicVisible: true,
    adminMemo: "Excel 원본: 광명시 안재로6번길 31-1 101호. 음식물 쓰레기 발생 없이 이용 후 원상복구 필수. 냉장고 없음.",
    sortOrder: 5,
  },
  {
    id: "tea-party",
    name: "홍차가게 티파티",
    category: "lifestyle",
    capacity: 16,
    description: "월요일은 정기휴무, 수요일과 일요일은 10:00-19:00, 화·목·금·토요일은 10:00-21:00 운영합니다. 12-16명 이용 가능하며 TV, HDMI, 블루투스 스피커, 콘센트, 냉난방을 사용할 수 있습니다. 외부 음식 반입은 불가하고 냉장고는 제공되지 않습니다.",
    imageUrl: "https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=900&q=80",
    features: ["월요일 휴무", "수·일 10:00-19:00", "화·목·금·토 10:00-21:00", "12-16명", "TV", "HDMI", "블루투스 스피커", "콘센트", "냉난방", "외부 음식 불가", "냉장고 없음"],
    operatingHours: teaPartyHours,
    isActive: true,
    isPublicVisible: true,
    adminMemo: "Excel 원본: 광명시 구름산로48번길 18 2층. 2층 단체 대관 시 1층에 인원수에 맞게 테이블과 의자 배치 예정. 1층 와이파이 수신이 미흡할 수 있음. 냉장고 없음.",
    sortOrder: 6,
  },
];

type SpaceContentOverride = {
  readonly match: (space: Space) => boolean;
  readonly values: Pick<Space, "capacity" | "description" | "features" | "operatingHours" | "adminMemo"> & {
    readonly name?: string;
    readonly parentSpaceName?: string;
  };
};

const normalizeSpaceName = (value: string): string =>
  value.replaceAll(/\s|\/|\(|\)|&/g, "").toLowerCase();

const matchesSpace = (space: Space, ids: readonly string[], names: readonly string[]): boolean => {
  if (ids.includes(space.id)) {
    return true;
  }
  const normalized = normalizeSpaceName(`${space.parentSpaceName ?? ""}${space.name}`);
  return names.some((name) => normalized.includes(normalizeSpaceName(name)));
};

const lifestyleOverrides: readonly SpaceContentOverride[] = [
  {
    match: (space) => matchesSpace(space, ["sum-room-a"], ["숨플레이스A룸", "숨플레이스RoomA"]),
    values: {
      name: "숨플레이스 Room A",
      parentSpaceName: "숨플레이스",
      capacity: 10,
      description: "연중무휴 24시간 이용 가능한 A룸입니다. TV, HDMI, 블루투스 스피커, 와이파이, 콘센트, 냉난방, 냉장고를 사용할 수 있고 음식과 주류 반입이 가능합니다. 테이블과 의자 추가 및 치우기가 가능합니다.",
      features: ["24시간 운영", "10명 내외", "TV", "HDMI", "블루투스 스피커", "와이파이", "콘센트", "냉난방", "냉장고", "음식·주류 가능", "테이블&의자 추가·치우기 가능"],
      operatingHours: allDayHours,
      adminMemo: "Excel 원본: 경기 광명시 오리로 639 한솔빌딩 5층. 이용 후 원상복구 필수.",
    },
  },
  {
    match: (space) => matchesSpace(space, ["sum-room-b"], ["숨플레이스B룸", "숨플레이스RoomB"]),
    values: {
      name: "숨플레이스 Room B",
      parentSpaceName: "숨플레이스",
      capacity: 10,
      description: "연중무휴 24시간 이용 가능한 B룸입니다. TV, HDMI, 블루투스 스피커, 와이파이, 콘센트, 냉난방, 냉장고를 사용할 수 있고 음식과 주류 반입이 가능합니다. 테이블과 의자 추가가 가능합니다.",
      features: ["24시간 운영", "10명 내외", "TV", "HDMI", "블루투스 스피커", "와이파이", "콘센트", "냉난방", "냉장고", "음식·주류 가능", "테이블&의자 추가 가능"],
      operatingHours: allDayHours,
      adminMemo: "Excel 원본: 경기 광명시 오리로 639 한솔빌딩 5층. 이용 후 원상복구 필수.",
    },
  },
  {
    match: (space) => matchesSpace(space, ["jeje-basement"], ["제제스튜디오지하"]),
    values: {
      name: "제제스튜디오 지하",
      parentSpaceName: "제제스튜디오",
      capacity: 10,
      description: "연중무휴 24시간 이용 가능한 지하 공간입니다. LP 블루투스 스피커, 와이파이, 콘센트, 냉난방을 사용할 수 있고 음료와 다과 반입이 가능합니다. 좌식 이용과 테이블 배치가 가능합니다.",
      features: ["24시간 운영", "10명 내외", "LP 블루투스 스피커", "와이파이", "콘센트", "냉난방", "음료·다과 가능", "좌식 가능", "테이블 배치 가능"],
      operatingHours: allDayHours,
      adminMemo: "Excel 원본: 광명시 시청로 148 지하1층. TV/빔프로젝터와 HDMI 없음, 이용 후 원상복구 필수.",
    },
  },
  {
    match: (space) => matchesSpace(space, ["jeje-rooftop"], ["제제스튜디오옥탑방옥상", "제제스튜디오루프탑"]),
    values: {
      name: "제제스튜디오 옥탑방&옥상",
      parentSpaceName: "제제스튜디오",
      capacity: 10,
      description: "연중무휴 24시간 이용 가능한 옥탑방&옥상 공간입니다. 조리와 음식 반입이 가능하며, 패브릭 소재 오염 방지를 위해 이용 후 원상복구가 필요합니다. 좌식 이용이 필수이고 테이블 배치가 가능합니다.",
      features: ["24시간 운영", "10명 내외", "빔프로젝터", "블루투스 연결", "LP/빔프로젝터 스피커", "와이파이", "콘센트", "냉난방", "냉장고", "조리·음식 반입 가능", "좌식 이용 필수", "테이블 배치 가능"],
      operatingHours: allDayHours,
      adminMemo: "Excel 원본: 광명시 시청로 148 지하4층. 패브릭 오염·이염 주의, 이용 후 원상복구 필수.",
    },
  },
  {
    match: (space) => matchesSpace(space, ["tea-party"], ["홍차가게티파티"]),
    values: {
      name: "홍차가게 티파티",
      capacity: 16,
      description: "월요일은 정기휴무, 수요일과 일요일은 10:00-19:00, 화·목·금·토요일은 10:00-21:00 운영합니다. 12-16명 이용 가능하며 TV, HDMI, 블루투스 스피커, 콘센트, 냉난방을 사용할 수 있습니다. 외부 음식 반입은 불가하고 냉장고는 제공되지 않습니다.",
      features: ["월요일 휴무", "수·일 10:00-19:00", "화·목·금·토 10:00-21:00", "12-16명", "TV", "HDMI", "블루투스 스피커", "콘센트", "냉난방", "외부 음식 불가", "냉장고 없음"],
      operatingHours: teaPartyHours,
      adminMemo: "Excel 원본: 광명시 구름산로48번길 18 2층. 2층 단체 대관 시 1층에 인원수에 맞게 테이블과 의자 배치 예정. 1층 와이파이 수신이 미흡할 수 있음. 냉장고 없음.",
    },
  },
  {
    match: (space) => matchesSpace(space, ["chitchat"], ["모임공간칫챗"]),
    values: {
      name: "모임공간 칫챗",
      capacity: 8,
      description: "08:00-22:00 이용 가능한 8명 규모 모임공간입니다. 빔프로젝터, HDMI, 빔프로젝터 스피커와 블루투스 스피커, 와이파이, 콘센트, 냉난방을 사용할 수 있습니다. 음료, 다과, 냄새 안 나는 음식 반입이 가능하며 정수기, 커피머신, 다과를 이용할 수 있습니다.",
      features: ["08:00-22:00", "8명", "빔프로젝터", "HDMI", "빔프로젝터 스피커", "블루투스 스피커", "와이파이", "콘센트", "냉난방", "음료·다과 가능", "냄새 안 나는 음식 가능", "정수기", "커피머신", "다과 이용 가능", "냉장고 없음"],
      operatingHours: chitChatHours,
      adminMemo: "Excel 원본: 광명시 안재로6번길 31-1 101호. 음식물 쓰레기 발생 없이 이용 후 원상복구 필수. 냉장고 없음.",
    },
  },
];

export const applySpaceContentOverrides = (spaces: readonly Space[]): readonly Space[] =>
  spaces.map((space) => {
    const override = lifestyleOverrides.find((item) => item.match(space));
    if (override === undefined) {
      return space;
    }
    return {
      ...space,
      ...override.values,
    };
  });
