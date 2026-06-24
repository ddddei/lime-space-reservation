import { SpaceCard } from "./SpaceCard";
import type { Space } from "../types/reservation";

type SpaceLandingProps = {
  readonly spaces: readonly Space[];
  readonly selectedSpaceId: string;
  readonly onSelectSpace: (spaceId: string) => void;
};

export function SpaceLanding({ spaces, selectedSpaceId, onSelectSpace }: SpaceLandingProps) {
  const activeSpaces = spaces
    .filter((space) => space.isActive && space.isPublicVisible)
    .sort((first, second) => {
      if (first.category !== second.category) {
        return first.category === "lifestyle" ? -1 : 1;
      }
      return first.sortOrder - second.sortOrder;
    });
  return (
    <section className="space-y-4">
      <div>
        <p className="text-sm font-bold text-[#5F9820]">공간 선택</p>
        <h2 className="text-2xl font-extrabold text-[#172014]">생활지향형 제휴공간</h2>
        <p className="mt-2 text-sm leading-6 text-[#5B6856]">
          제휴공간은 실제 예약 가능한 세부 공간 단위로 운영됩니다. 청년동 공간은 이 화면에서 신청하지 않고 담당자와 별도 조율합니다.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {activeSpaces.map((space) => (
          <SpaceCard key={space.id} space={space} isSelected={space.id === selectedSpaceId} onSelect={onSelectSpace} />
        ))}
      </div>
    </section>
  );
}
