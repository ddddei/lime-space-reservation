import type { Space } from "../types/reservation";

type SpaceDetailProps = {
  readonly space: Space;
};

const categoryText = (category: Space["category"]): string =>
  category === "youth-building" ? "청년동 공간" : "생활지향형 공간";

export function SpaceDetail({ space }: SpaceDetailProps) {
  return (
    <section className="overflow-hidden rounded-lg border border-[#DDE8D6] bg-white shadow-[0_8px_24px_rgba(23,32,20,0.08)]">
      <img src={space.imageUrl} alt={`${space.name} 상세 사진`} className="h-56 w-full object-cover" width="900" height="224" />
      <div className="space-y-4 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold text-[#5F9820]">{categoryText(space.category)}</p>
            <h2 className="mt-1 text-2xl font-extrabold text-[#172014]">{space.name}</h2>
          </div>
          <span className="rounded-full bg-[#E8F5DE] px-3 py-1 text-sm font-bold text-[#5F9820]">최대 {space.capacity}명</span>
        </div>
        <p className="text-sm leading-6 text-[#5B6856]">{space.description}</p>
        <div className="grid gap-2 sm:grid-cols-3">
          {space.features.map((feature) => (
            <div key={feature} className="rounded-lg border border-[#EBF2E7] bg-[#F7FBF4] p-3 text-sm font-semibold text-[#172014]">
              {feature}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
