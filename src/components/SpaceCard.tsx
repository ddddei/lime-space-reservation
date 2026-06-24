import type { Space } from "../types/reservation";

type SpaceCardProps = {
  readonly space: Space;
  readonly isSelected: boolean;
  readonly onSelect: (spaceId: string) => void;
};

const categoryLabel = (category: Space["category"]): string =>
  category === "youth-building" ? "청년동 공간" : "생활지향형 공간";

export function SpaceCard({ space, isSelected, onSelect }: SpaceCardProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(space.id)}
      className={`group overflow-hidden rounded-lg border bg-white text-left shadow-[0_1px_2px_rgba(23,32,20,0.04)] transition ${
        isSelected ? "border-[#77B82A] ring-2 ring-[#77B82A]/20" : "border-[#DDE8D6] hover:border-[#77B82A]"
      }`}
    >
      <img src={space.imageUrl} alt={`${space.name} 사진`} className="h-36 w-full object-cover" width="360" height="144" />
      <div className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold text-[#5F9820]">{categoryLabel(space.category)}</p>
            <h3 className="mt-1 text-lg font-bold text-[#172014]">{space.name}</h3>
            {space.parentSpaceName !== undefined && (
              <p className="mt-1 text-xs font-semibold text-[#819078]">{space.parentSpaceName}</p>
            )}
          </div>
          <span className="rounded-full bg-[#F1F8EC] px-2 py-1 text-xs font-bold text-[#5B6856]">{space.capacity}명</span>
        </div>
        <p className="line-clamp-2 text-sm leading-6 text-[#5B6856]">{space.description}</p>
        <div className="flex flex-wrap gap-2">
          {space.features.map((feature) => (
            <span key={feature} className="rounded-full border border-[#DDE8D6] px-2 py-1 text-xs text-[#5B6856]">
              {feature}
            </span>
          ))}
        </div>
      </div>
    </button>
  );
}
