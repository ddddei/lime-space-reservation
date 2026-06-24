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
    <section className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <p className="max-w-xl text-sm leading-6 text-[#5B6856]">
          이미지와 태그를 보고 오늘의 모임에 어울리는 장면을 골라 주세요.
        </p>
        <span className="rounded-full border border-[#DDE8D6] px-3 py-1 text-xs font-bold text-[#819078]">
          {activeSpaces.length} spaces
        </span>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {activeSpaces.map((space) => (
          <SpaceCard key={space.id} space={space} isSelected={space.id === selectedSpaceId} onSelect={onSelectSpace} />
        ))}
      </div>
    </section>
  );
}
