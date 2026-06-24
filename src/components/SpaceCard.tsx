import type { Space } from "../types/reservation";

type SpaceCardProps = {
  readonly space: Space;
  readonly isSelected: boolean;
  readonly onSelect: (spaceId: string) => void;
};

export function SpaceCard({ space, isSelected, onSelect }: SpaceCardProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(space.id)}
      className={`group overflow-hidden rounded-[26px] border bg-white text-left transition duration-200 hover:-translate-y-0.5 ${
        isSelected ? "border-[#77B82A] ring-2 ring-[#77B82A]/20" : "border-[#DDE8D6] hover:border-[#77B82A]"
      }`}
    >
      <div className="relative">
        <img src={space.imageUrl} alt={`${space.name} 사진`} className="h-48 w-full object-cover transition duration-300 group-hover:scale-[1.03]" width="360" height="192" />
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#070A07]/90 to-transparent p-4">
          <span className="rounded-full bg-[#77B82A] px-2 py-1 text-[11px] font-black text-white">
            {isSelected ? "선택됨" : `${space.capacity}명`}
          </span>
        </div>
      </div>
      <div className="space-y-3 p-4">
        <div>
          {space.parentSpaceName !== undefined && (
            <p className="text-xs font-bold text-[#819078]">{space.parentSpaceName}</p>
          )}
          <h3 className="mt-1 text-xl font-black text-[#172014]">{space.name}</h3>
        </div>
        <p className="line-clamp-2 text-sm leading-6 text-[#5B6856]">{space.description}</p>
        <div className="flex flex-wrap gap-2">
          {space.features.slice(0, 3).map((feature) => (
            <span key={feature} className="rounded-full border border-[#DDE8D6] px-2 py-1 text-xs text-[#5B6856]">
              {feature}
            </span>
          ))}
        </div>
      </div>
    </button>
  );
}
