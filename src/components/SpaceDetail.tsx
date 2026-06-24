import type { Space } from "../types/reservation";

type SpaceDetailProps = {
  readonly space: Space;
};

export function SpaceDetail({ space }: SpaceDetailProps) {
  return (
    <section className="rounded-[32px] border border-[#DDE8D6] bg-white p-6 md:p-8">
      <div className="grid gap-5 md:grid-cols-[1fr_auto] md:items-end">
        <div>
          <p className="text-xs font-black text-[#5F9820]">Selected space</p>
          <h2 className="mt-2 text-3xl font-black leading-tight text-[#172014] md:text-4xl">{space.name}</h2>
          {space.parentSpaceName !== undefined && (
            <p className="mt-2 text-sm font-semibold text-[#819078]">{space.parentSpaceName}</p>
          )}
          <p className="mt-5 max-w-2xl text-sm leading-7 text-[#5B6856]">{space.description}</p>
        </div>
        <span className="rounded-full bg-[#E8F5DE] px-4 py-2 text-sm font-black text-[#5F9820]">최대 {space.capacity}명</span>
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        {space.features.map((feature) => (
          <span key={feature} className="rounded-full border border-[#EBF2E7] bg-[#F7FBF4] px-3 py-1 text-sm font-semibold text-[#172014]">
            {feature}
          </span>
        ))}
        </div>
    </section>
  );
}
