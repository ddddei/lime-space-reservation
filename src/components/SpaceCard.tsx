import { useState } from "react";
import { getSpaceCategoryLabel } from "../lib/displayLabels";
import type { Space } from "../types/reservation";

type SpaceCardProps = {
  readonly space: Space;
  readonly isSelected: boolean;
  readonly onSelect: (spaceId: string) => void;
  readonly onOpenImages?: (space: Space, initialIndex: number) => void;
};

export function SpaceCard({ space, isSelected, onSelect, onOpenImages }: SpaceCardProps) {
  const [failedImageUrl, setFailedImageUrl] = useState<string | undefined>();
  const cardImage = getCardImage(space);
  const hasImage = cardImage.imageUrl.trim().length > 0 && failedImageUrl !== cardImage.imageUrl;

  return (
    <article
      className={`group overflow-hidden rounded-[26px] border bg-white text-left transition duration-200 hover:-translate-y-0.5 ${
        isSelected ? "border-[#77B82A] ring-2 ring-[#77B82A]/20" : "border-[#DDE8D6] hover:border-[#77B82A]"
      }`}
    >
      <div className="relative">
        {hasImage ? (
          <button
            type="button"
            onClick={() => onOpenImages?.(space, 0)}
            className="block h-48 w-full overflow-hidden text-left"
            aria-label={`${space.name} 사진 크게 보기`}
          >
            <img
              src={cardImage.imageUrl}
              alt={cardImage.altText ?? `${space.name} 사진`}
              className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
              width="360"
              height="192"
              onError={() => setFailedImageUrl(cardImage.imageUrl)}
            />
          </button>
        ) : (
          <div className="grid h-48 w-full place-items-center bg-[linear-gradient(135deg,#070A07,#1A2419_52%,#2C3A2B)] px-5 text-center">
            <div>
              <p className="text-xs font-black text-[#A6F15B]">LIME SPACE</p>
              <p className="mt-2 text-lg font-black text-[#F5FAF2]">{space.name}</p>
              <p className="mt-1 text-sm font-semibold text-[#B7C6B0]">이미지 준비 중</p>
            </div>
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#070A07]/90 to-transparent p-4">
          <span className="rounded-full bg-[#77B82A] px-2 py-1 text-[11px] font-black text-white">
            {isSelected ? "선택됨" : `${space.capacity}명`}
          </span>
        </div>
      </div>
      <button type="button" onClick={() => onSelect(space.id)} className="block w-full space-y-3 p-4 text-left">
        <div>
          <p className="text-xs font-bold text-[#5F9820]">{getSpaceCategoryLabel(space.category)}</p>
          {space.parentSpaceName !== undefined && (
            <p className="mt-1 text-xs font-bold text-[#819078]">{space.parentSpaceName}</p>
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
      </button>
    </article>
  );
}

const getCardImage = (space: Space): { readonly imageUrl: string; readonly altText?: string } => {
  const image = space.images?.find((item) => item.imageUrl.trim().length > 0);
  return {
    imageUrl: image?.imageUrl ?? space.imageUrl,
    altText: image?.altText,
  };
};
