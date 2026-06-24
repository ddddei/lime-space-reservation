import { SpaceCard } from "./SpaceCard";
import type { Space } from "../types/reservation";

type SpaceLandingProps = {
  readonly spaces: readonly Space[];
  readonly selectedSpaceId: string;
  readonly onSelectSpace: (spaceId: string) => void;
};

export function SpaceLanding({ spaces, selectedSpaceId, onSelectSpace }: SpaceLandingProps) {
  const activeSpaces = spaces.filter((space) => space.isActive).sort((first, second) => first.sortOrder - second.sortOrder);
  return (
    <section className="space-y-4">
      <div>
        <p className="text-sm font-bold text-[#5F9820]">공간 선택</p>
        <h2 className="text-2xl font-extrabold text-[#172014]">청년동 공간과 생활지향형 공간</h2>
        <p className="mt-2 text-sm leading-6 text-[#5B6856]">
          생활지향형 공간은 4개의 개별 공간으로 운영됩니다. 공간을 선택하면 날짜와 시간 예약 가능 여부를 확인할 수 있습니다.
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
