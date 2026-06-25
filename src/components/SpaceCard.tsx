import { useState } from "react";
import { Camera, MapPin, Users } from "lucide-react";
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
      className={`group flex min-h-[31rem] flex-col overflow-hidden rounded-2xl text-left transition duration-200 hover:-translate-y-1 hover:shadow-[var(--shadow-card-hover)] ${
        isSelected ? "ui-card ring-2 ring-[#77B82A]/20" : "ui-card"
      }`}
    >
      <div className="relative">
        {hasImage ? (
          <button
            type="button"
            onClick={() => onSelect(space.id)}
            className="relative block h-48 w-full overflow-hidden text-left"
            aria-label={`${space.name} 예약 신청 열기`}
          >
            <div className="absolute inset-0 grid place-items-center bg-[linear-gradient(135deg,#070A07,#1A2419_52%,#2C3A2B)] px-5 text-center">
              <div>
                <p className="text-xs font-black text-[#A6F15B]">LIME SPACE</p>
                <p className="mt-2 text-lg font-black text-[#F5FAF2]">{space.name}</p>
              </div>
            </div>
            <img
              src={cardImage.imageUrl}
              alt={cardImage.altText ?? `${space.name} 사진`}
              className="relative h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
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
          <span className="ui-badge bg-[#77B82A] text-white">
            <Users size={14} strokeWidth={2.3} />
            {isSelected ? "선택됨" : `${space.capacity}명`}
          </span>
        </div>
        {hasImage && onOpenImages !== undefined && (
          <button
            type="button"
            onClick={() => onOpenImages(space, 0)}
            className="ui-button ui-button-ghost absolute right-3 top-3 min-h-9 px-3 py-2 text-xs text-[#F5FAF2] backdrop-blur"
            aria-label={`${space.name} 사진 보기`}
          >
            <Camera size={15} strokeWidth={2.3} />
            사진 보기
          </button>
        )}
      </div>
      <button type="button" onClick={() => onSelect(space.id)} className="flex flex-1 flex-col space-y-3 p-4 text-left">
        <div>
          <p className="text-xs font-bold text-[#5F9820]">{getSpaceCategoryLabel(space.category)}</p>
          {space.parentSpaceName !== undefined && (
            <p className="mt-1 inline-flex items-center gap-1 text-xs font-bold text-[#819078]">
              <MapPin size={13} strokeWidth={2.3} />
              {space.parentSpaceName}
            </p>
          )}
          <h3 className="mt-1 text-xl font-black text-[#172014]">{space.name}</h3>
        </div>
        <p className="line-clamp-3 text-sm leading-6 text-[#5B6856]">{space.description}</p>
        <div className="mt-auto flex flex-wrap gap-2 pt-1">
          {space.features.slice(0, 3).map((feature) => (
            <span key={feature} className="rounded-full bg-[#F7FBF4] px-2 py-1 text-xs font-semibold text-[#5B6856]">
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
