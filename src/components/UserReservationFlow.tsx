import { useEffect, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import { EligibilityPanel } from "./EligibilityPanel";
import { MeetingForm } from "./MeetingForm";
import { MyMeetings } from "./MyMeetings";
import { SpaceLanding } from "./SpaceLanding";
import { TimeBlockSelector } from "./TimeBlockSelector";
import { CalendarView } from "./CalendarView";
import { addBlocks } from "../lib/date";
import {
  prepareReservationCreate,
  prepareSessionUpdate,
} from "../lib/mockReservationActions";
import { RESERVATION_APPROVAL_GUIDE_MESSAGE } from "../lib/permissions";
import { canUseMockFallback, submitReservationApplication } from "../lib/supabaseReservationApi";
import { getSessionStatusLabel } from "../lib/displayLabels";
import type {
  AdminBlock,
  EligibilityResult,
  Meeting,
  ParticipantUser,
  ReservationSession,
  SaveValidationResult,
  Space,
  SpaceImage,
} from "../types/reservation";
import type { SelectedTimeRange } from "../lib/timeSelection";

type UserReservationFlowProps = {
  readonly authenticatedUser: ParticipantUser;
  readonly eligibility: EligibilityResult;
  readonly saveValidation: SaveValidationResult;
  readonly selectedSpace: Space;
  readonly selectedDate: string;
  readonly selectedBlockTimes: readonly string[];
  readonly selectedRange?: SelectedTimeRange;
  readonly meetingName: string;
  readonly meetings: readonly Meeting[];
  readonly sessions: readonly ReservationSession[];
  readonly spaces: readonly Space[];
  readonly adminBlocks: readonly AdminBlock[];
  readonly setMeetings: Dispatch<SetStateAction<readonly Meeting[]>>;
  readonly setSessions: Dispatch<SetStateAction<readonly ReservationSession[]>>;
  readonly onSelectSpace: (spaceId: string) => void;
  readonly onSelectDate: (date: string) => void;
  readonly onChangeSelectedBlockTimes: (times: readonly string[]) => void;
  readonly onMeetingNameChange: (value: string) => void;
  readonly onCancelSession: (sessionId: string) => Promise<SessionActionResult>;
  readonly onRefreshReservations?: () => Promise<boolean>;
  readonly onLogout: () => void;
};

export type SessionActionResult =
  | { readonly status: "ok" }
  | { readonly status: "error"; readonly message: string };

type SubmittedReservationSummary = {
  readonly meetingName: string;
  readonly applicantName: string;
  readonly spaceName: string;
  readonly date: string;
  readonly timeRange: string;
  readonly status: ReservationSession["status"];
};

export function UserReservationFlow(props: UserReservationFlowProps) {
  const [isReservationOpen, setIsReservationOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | undefined>();
  const [submittedSummary, setSubmittedSummary] = useState<SubmittedReservationSummary | undefined>();
  const [lightbox, setLightbox] = useState<LightboxState | undefined>();

  const openReservation = (spaceId: string): void => {
    props.onSelectSpace(spaceId);
    props.onChangeSelectedBlockTimes([]);
    setSubmitError(undefined);
    setIsReservationOpen(true);
  };

  const handleSubmitReservation = async (): Promise<void> => {
    if (isSubmitting) {
      return;
    }
    if (!props.authenticatedUser.hasAdminApproval) {
      setSubmitError(RESERVATION_APPROVAL_GUIDE_MESSAGE);
      return;
    }
    setSubmitError(undefined);
    setIsSubmitting(true);
    const outcome = await submitReservation(props);
    setIsSubmitting(false);
    if (outcome.status === "error") {
      setSubmitError(outcome.message);
      return;
    }
    if (outcome.meeting !== undefined) {
      const meeting = outcome.meeting;
      props.setMeetings((current) => [meeting, ...current]);
    }
    props.setSessions((current) => [...outcome.sessions, ...current]);
    if (props.onRefreshReservations !== undefined) {
      await props.onRefreshReservations();
    }
    setSubmittedSummary(buildSubmittedSummary(props, outcome));
    setIsReservationOpen(false);
  };

  return (
    <div className="grid gap-8">
      <UserHero {...props} />
      <div className="grid gap-8 xl:grid-cols-[minmax(0,1.35fr)_minmax(340px,0.65fr)]">
        <div className="grid gap-8">
          <StepFrame title="공간 선택" description="카드를 누르면 예약 창이 열립니다.">
            <SpaceLanding
              spaces={props.spaces}
              selectedSpaceId={props.selectedSpace.id}
              onSelectSpace={openReservation}
              onOpenImages={(space, initialIndex) => setLightbox({ space, initialIndex })}
            />
          </StepFrame>
        </div>
        <aside className="grid content-start gap-5 lg:sticky lg:top-6 lg:self-start">
          <EligibilityPanel eligibility={props.eligibility} user={props.authenticatedUser} />
          <MyMeetings
            userId={props.authenticatedUser.id}
            meetings={props.meetings}
            sessions={props.sessions}
            spaces={props.spaces}
            adminBlocks={props.adminBlocks}
            user={props.authenticatedUser}
            onUpdateSession={(sessionId, values) => {
              const result = prepareSessionUpdate({
                sessionId,
                values,
                selectedUser: props.authenticatedUser,
                spaces: props.spaces,
                meetings: props.meetings,
                sessions: props.sessions,
                adminBlocks: props.adminBlocks,
              });
              if (result.validation.canSave) {
                props.setSessions(result.sessions);
              }
              return result.validation;
            }}
            onCancelSession={props.onCancelSession}
          />
        </aside>
      </div>
      {isReservationOpen && (
        <ReservationDialog
          {...props}
          isSubmitting={isSubmitting}
          submitError={submitError}
          onClose={() => setIsReservationOpen(false)}
          onSubmit={() => {
            void handleSubmitReservation();
          }}
          onOpenImages={(space, initialIndex) => setLightbox({ space, initialIndex })}
        />
      )}
      {submittedSummary !== undefined && (
        <ReservationCompleteDialog
          summary={submittedSummary}
          onClose={() => setSubmittedSummary(undefined)}
        />
      )}
      {lightbox !== undefined && (
        <ImageLightbox
          space={lightbox.space}
          initialIndex={lightbox.initialIndex}
          onClose={() => setLightbox(undefined)}
        />
      )}
    </div>
  );
}

function UserHero(props: UserReservationFlowProps) {
  return (
    <section className="overflow-hidden rounded-[32px] border border-[#DDE8D6] bg-white p-6 md:p-8">
      <div className="grid gap-6 lg:grid-cols-[1fr_360px] lg:items-end">
        <div>
          <p className="text-sm font-extrabold text-[#5F9820]">의미 있는 만남을 위한 공간</p>
          <h2 className="mt-3 max-w-3xl text-4xl font-black leading-[1.05] text-[#172014] md:text-6xl">
            생활밀착형 제휴공간 예약
          </h2>
          <p className="mt-5 max-w-2xl text-base leading-7 text-[#5B6856] md:text-lg">
            승인된 호스트만 제휴공간을 예약할 수 있습니다. 공간을 고르고, 날짜와 시간을 잇고, 모임을 시작하세요.
          </p>
        </div>
        <div className="rounded-[24px] border border-[#DDE8D6] bg-[#F7FBF4] p-5">
          <p className="text-xs font-black text-[#5F9820]">현재 호스트</p>
          <h3 className="mt-2 text-2xl font-black text-[#172014]">{props.authenticatedUser.name}</h3>
          <p className="mt-2 text-sm text-[#5B6856]">
            끝자리 {props.authenticatedUser.phoneLast4}
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-3 py-1 text-xs font-black ${props.authenticatedUser.hasAdminApproval ? "bg-[#E8F5DE] text-[#178A46]" : "bg-[#FFF6E3] text-[#B76E00]"}`}>
              {props.authenticatedUser.hasAdminApproval ? "예약 승인 완료" : "예약 승인 대기"}
            </span>
            <span className={`rounded-full px-3 py-1 text-xs font-black ${props.eligibility.canReserve ? "bg-[#E8F5DE] text-[#178A46]" : "bg-[#FCEBEA] text-[#C9443E]"}`}>
              {props.eligibility.canReserve ? "예약 가능" : "예약 불가"}
            </span>
            <button type="button" onClick={props.onLogout} className="rounded-full border border-[#DDE8D6] px-3 py-1 text-xs font-bold text-[#5B6856] hover:border-[#77B82A]">
              다른 호스트
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

type ReservationDialogProps = UserReservationFlowProps & {
  readonly onClose: () => void;
  readonly isSubmitting: boolean;
  readonly submitError?: string;
  readonly onSubmit: () => void;
  readonly onOpenImages: (space: Space, initialIndex: number) => void;
};

function ReservationDialog(props: ReservationDialogProps) {
  return (
    <div className="fixed inset-0 z-50 grid bg-[#070A07]/70 p-3 backdrop-blur-sm md:p-6" role="dialog" aria-modal="true" aria-labelledby="reservation-dialog-title">
      <div className="mx-auto grid max-h-[calc(100dvh-24px)] w-full max-w-6xl overflow-hidden rounded-lg border border-[#2C3A2B] bg-[#F7FBF4] shadow-[0_24px_80px_rgba(7,10,7,0.36)] md:max-h-[calc(100dvh-48px)]">
        <div className="flex items-start justify-between gap-4 border-b border-[#DDE8D6] bg-white p-4 md:p-5">
          <div>
            <p className="text-xs font-black text-[#5F9820]">예약 신청</p>
            <h2 id="reservation-dialog-title" className="mt-1 text-2xl font-black text-[#172014]">
              {props.selectedSpace.name}
            </h2>
            <p className="mt-1 text-sm text-[#5B6856]">날짜, 시간, 모임명만 확인하면 신청할 수 있습니다.</p>
          </div>
          <button
            type="button"
            onClick={props.onClose}
            className="whitespace-nowrap rounded-lg border border-[#DDE8D6] px-3 py-2 text-sm font-extrabold text-[#5B6856] transition hover:border-[#77B82A] focus:outline-none focus:ring-2 focus:ring-[#77B82A]/30"
            aria-label="예약 창 닫기"
          >
            닫기
          </button>
        </div>
        <div className="grid gap-5 overflow-y-auto p-4 md:p-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="grid gap-5">
            <SpaceImageSlider
              key={props.selectedSpace.id}
              space={props.selectedSpace}
              onOpenImages={props.onOpenImages}
            />
            <SelectedSpaceSummary space={props.selectedSpace} />
            <CalendarView
              selectedDate={props.selectedDate}
              selectedSpace={props.selectedSpace}
              meetings={props.meetings}
              sessions={props.sessions}
              adminBlocks={props.adminBlocks}
              onSelectDate={props.onSelectDate}
            />
            <TimeBlockSelector
              spaceId={props.selectedSpace.id}
              date={props.selectedDate}
              selectedBlockTimes={props.selectedBlockTimes}
              sessions={props.sessions}
              adminBlocks={props.adminBlocks}
              operatingHours={props.selectedSpace.operatingHours}
              onChangeSelectedBlockTimes={props.onChangeSelectedBlockTimes}
            />
          </div>
          <aside className="grid content-start gap-4 self-end max-xl:sticky max-xl:bottom-0 max-xl:z-10 xl:sticky xl:top-4 xl:self-start">
            <MeetingForm
              selectedUser={props.authenticatedUser}
              eligibility={props.eligibility}
              saveValidation={props.saveValidation}
              meetingName={props.meetingName}
              selectedRange={props.selectedRange}
              isSubmitting={props.isSubmitting}
              submitError={props.submitError}
              onMeetingNameChange={props.onMeetingNameChange}
              onSubmit={props.onSubmit}
            />
          </aside>
        </div>
      </div>
    </div>
  );
}

function ReservationCompleteDialog({
  summary,
  onClose,
}: {
  readonly summary: SubmittedReservationSummary;
  readonly onClose: () => void;
}) {
  const rows: readonly { readonly label: string; readonly value: string }[] = [
    { label: "모임명", value: summary.meetingName },
    { label: "신청자", value: summary.applicantName },
    { label: "공간명", value: summary.spaceName },
    { label: "날짜", value: summary.date },
    { label: "시간", value: summary.timeRange },
    { label: "상태", value: getSessionStatusLabel(summary.status) },
  ];

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-[#070A07]/70 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="reservation-complete-title">
      <div className="w-full max-w-md rounded-lg border border-[#DDE8D6] bg-white p-5 shadow-[0_16px_48px_rgba(7,10,7,0.24)]">
        <p className="text-xs font-black text-[#5F9820]">신청 완료</p>
        <h2 id="reservation-complete-title" className="mt-2 text-2xl font-black text-[#172014]">
          모임공간 신청이 접수되었습니다.
        </h2>
        <div className="mt-4 rounded-lg border border-[#CDE8BA] bg-[#F1F8EC] p-3 text-sm text-[#178A46]" role="status">
          <p className="font-black">내 신청 확인/수정에 바로 반영했습니다.</p>
          <p className="mt-1 font-semibold">담당자 확인 후 최종 확정 안내를 드립니다.</p>
        </div>
        <dl className="mt-5 grid gap-2 rounded-lg border border-[#EBF2E7] bg-[#F7FBF4] p-3 text-sm">
          {rows.map((row) => (
            <div key={row.label} className="grid grid-cols-[72px_1fr] gap-3">
              <dt className="font-bold text-[#819078]">{row.label}</dt>
              <dd className="font-semibold text-[#172014]">{row.value}</dd>
            </div>
          ))}
        </dl>
        <button
          type="button"
          onClick={onClose}
          className="mt-5 w-full rounded-lg bg-[#77B82A] px-4 py-3 text-sm font-extrabold text-white transition hover:bg-[#5F9820] focus:outline-none focus:ring-2 focus:ring-[#77B82A]/30"
        >
          확인
        </button>
      </div>
    </div>
  );
}

function SpaceImageSlider({
  space,
  onOpenImages,
}: {
  readonly space: Space;
  readonly onOpenImages: (space: Space, initialIndex: number) => void;
}) {
  const images = getDisplayImages(space);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [failedImageIds, setFailedImageIds] = useState<readonly string[]>([]);
  const currentImage = images[currentIndex];
  const showImage = currentImage !== undefined
    && currentImage.imageUrl.trim().length > 0
    && !failedImageIds.includes(currentImage.id);

  const moveSlide = (direction: -1 | 1): void => {
    setCurrentIndex((current) => (current + direction + images.length) % images.length);
  };

  return (
    <section className="overflow-hidden rounded-lg border border-[#DDE8D6] bg-white">
      <div className="relative h-64 bg-[#070A07] md:h-80">
        {showImage ? (
          <button
            type="button"
            onClick={() => onOpenImages(space, currentIndex)}
            className="block h-full w-full text-left"
            aria-label={`${space.name} 사진 크게 보기`}
          >
            <img
              src={currentImage.imageUrl}
              alt={currentImage.altText ?? `${space.name} 사진 ${currentIndex + 1}`}
              className="h-full w-full object-cover"
              width="760"
              height="320"
              onError={() => setFailedImageIds((current) => [...current, currentImage.id])}
            />
          </button>
        ) : (
          <SpaceImagePlaceholder name={space.name} />
        )}
        <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-3 bg-gradient-to-t from-[#070A07]/90 to-transparent p-4">
          <div>
            <p className="text-xs font-black text-[#A6F15B]">공간 사진</p>
            <p className="mt-1 text-sm font-bold text-[#F5FAF2]">
              {images.length > 0 ? `${currentIndex + 1} / ${images.length}` : "이미지 준비 중"}
            </p>
          </div>
          {images.length > 1 && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => moveSlide(-1)}
                className="grid h-9 w-9 place-items-center rounded-full border border-[#F5FAF2]/35 bg-[#070A07]/55 text-lg font-black text-[#F5FAF2] transition hover:border-[#A6F15B] focus:outline-none focus:ring-2 focus:ring-[#A6F15B]/50"
                aria-label="이전 사진"
              >
                ‹
              </button>
              <button
                type="button"
                onClick={() => moveSlide(1)}
                className="grid h-9 w-9 place-items-center rounded-full border border-[#F5FAF2]/35 bg-[#070A07]/55 text-lg font-black text-[#F5FAF2] transition hover:border-[#A6F15B] focus:outline-none focus:ring-2 focus:ring-[#A6F15B]/50"
                aria-label="다음 사진"
              >
                ›
              </button>
            </div>
          )}
        </div>
      </div>
      {images.length > 1 && (
        <div className="flex justify-center gap-2 p-3">
          {images.map((image, index) => (
            <button
              key={image.id}
              type="button"
              onClick={() => setCurrentIndex(index)}
              className={`h-2.5 w-2.5 rounded-full transition ${
                index === currentIndex ? "bg-[#5F9820]" : "bg-[#DDE8D6] hover:bg-[#77B82A]"
              }`}
              aria-label={`${index + 1}번 사진 보기`}
              aria-current={index === currentIndex ? "true" : undefined}
            />
          ))}
        </div>
      )}
    </section>
  );
}

type LightboxState = {
  readonly space: Space;
  readonly initialIndex: number;
};

function ImageLightbox({
  space,
  initialIndex,
  onClose,
}: {
  readonly space: Space;
  readonly initialIndex: number;
  readonly onClose: () => void;
}) {
  const images = getDisplayImages(space);
  const safeInitialIndex = images[initialIndex] === undefined ? 0 : initialIndex;
  const [currentIndex, setCurrentIndex] = useState(safeInitialIndex);
  const [failedImageIds, setFailedImageIds] = useState<readonly string[]>([]);
  const currentImage = images[currentIndex];
  const showImage = currentImage !== undefined
    && currentImage.imageUrl.trim().length > 0
    && !failedImageIds.includes(currentImage.id);

  const moveSlide = (direction: -1 | 1): void => {
    setCurrentIndex((current) => (current + direction + images.length) % images.length);
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        onClose();
      }
      if (event.key === "ArrowLeft" && images.length > 1) {
        setCurrentIndex((current) => (current - 1 + images.length) % images.length);
      }
      if (event.key === "ArrowRight" && images.length > 1) {
        setCurrentIndex((current) => (current + 1 + images.length) % images.length);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [images.length, onClose]);

  return (
    <div className="fixed inset-0 z-[70] grid bg-[#070A07]/90 p-3 backdrop-blur-sm md:p-6" role="dialog" aria-modal="true" aria-labelledby="image-lightbox-title">
      <div className="mx-auto grid h-full w-full max-w-6xl grid-rows-[auto_1fr_auto] overflow-hidden rounded-lg border border-[#2C3A2B] bg-[#070A07]">
        <div className="flex items-center justify-between gap-3 border-b border-[#2C3A2B] p-4">
          <div>
            <p className="text-xs font-black text-[#A6F15B]">공간 사진</p>
            <h2 id="image-lightbox-title" className="mt-1 text-xl font-black text-[#F5FAF2]">{space.name}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-[#F5FAF2]/25 px-3 py-2 text-sm font-extrabold text-[#F5FAF2] transition hover:border-[#A6F15B] focus:outline-none focus:ring-2 focus:ring-[#A6F15B]/50"
          >
            닫기
          </button>
        </div>
        <div className="relative min-h-0">
          {showImage ? (
            <img
              src={currentImage.imageUrl}
              alt={currentImage.altText ?? `${space.name} 사진 ${currentIndex + 1}`}
              className="h-full w-full object-contain"
              width="1200"
              height="800"
              onError={() => setFailedImageIds((current) => [...current, currentImage.id])}
            />
          ) : (
            <SpaceImagePlaceholder name={space.name} />
          )}
          {images.length > 1 && (
            <div className="pointer-events-none absolute inset-y-0 left-0 right-0 flex items-center justify-between p-3">
              <button
                type="button"
                onClick={() => moveSlide(-1)}
                className="pointer-events-auto grid h-11 w-11 place-items-center rounded-full border border-[#F5FAF2]/30 bg-[#070A07]/65 text-2xl font-black text-[#F5FAF2] transition hover:border-[#A6F15B] focus:outline-none focus:ring-2 focus:ring-[#A6F15B]/50"
                aria-label="이전 사진"
              >
                ‹
              </button>
              <button
                type="button"
                onClick={() => moveSlide(1)}
                className="pointer-events-auto grid h-11 w-11 place-items-center rounded-full border border-[#F5FAF2]/30 bg-[#070A07]/65 text-2xl font-black text-[#F5FAF2] transition hover:border-[#A6F15B] focus:outline-none focus:ring-2 focus:ring-[#A6F15B]/50"
                aria-label="다음 사진"
              >
                ›
              </button>
            </div>
          )}
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-[#2C3A2B] p-4 text-sm font-bold text-[#B7C6B0]">
          <span>{images.length > 0 ? `${currentIndex + 1} / ${images.length}` : "이미지 준비 중"}</span>
          <span>ESC로 닫기</span>
        </div>
      </div>
    </div>
  );
}

function SpaceImagePlaceholder({ name }: { readonly name: string }) {
  return (
    <div className="grid h-full w-full place-items-center bg-[linear-gradient(135deg,#070A07,#1A2419_52%,#2C3A2B)] px-5 text-center">
      <div>
        <p className="text-xs font-black text-[#A6F15B]">LIME SPACE</p>
        <p className="mt-2 text-lg font-black text-[#F5FAF2]">{name}</p>
        <p className="mt-1 text-sm font-semibold text-[#B7C6B0]">이미지 준비 중</p>
      </div>
    </div>
  );
}

function getDisplayImages(space: Space): readonly SpaceImage[] {
  if (space.images !== undefined && space.images.length > 0) {
    return space.images;
  }
  if (space.imageUrl.trim().length === 0) {
    return [];
  }
  return [{
    id: `${space.id}-primary-image`,
    spaceId: space.id,
    imageUrl: space.imageUrl,
    altText: `${space.name} 사진`,
    sortOrder: 0,
    isPrimary: true,
    isActive: true,
  }];
}

function SelectedSpaceSummary({ space }: { readonly space: Space }) {
  return (
    <section className="rounded-lg border border-[#DDE8D6] bg-white p-4">
      <p className="text-xs font-black text-[#5F9820]">선택한 공간</p>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="text-xl font-black text-[#172014]">{space.name}</h3>
          <p className="mt-1 text-sm text-[#5B6856]">최대 {space.capacity}명 · {space.features.slice(0, 3).join(" · ")}</p>
        </div>
        <span className="rounded-full bg-[#E8F5DE] px-3 py-1 text-xs font-black text-[#178A46]">예약 가능</span>
      </div>
    </section>
  );
}

function StepFrame(props: { readonly title: string; readonly description: string; readonly children: ReactNode }) {
  return (
    <section className="grid gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="mt-1 text-2xl font-black text-[#172014] md:text-3xl">{props.title}</h2>
        </div>
        <p className="max-w-sm text-sm leading-6 text-[#5B6856]">{props.description}</p>
      </div>
      {props.children}
    </section>
  );
}

type SubmitOutcome =
  | { readonly status: "ok"; readonly meeting?: Meeting; readonly sessions: readonly ReservationSession[] }
  | { readonly status: "error"; readonly message: string };

async function submitReservation(input: UserReservationFlowProps): Promise<SubmitOutcome> {
  if (input.selectedRange === undefined) {
    return { status: "error", message: "시간을 선택해 주세요." };
  }

  if (canUseMockFallback()) {
    const change = prepareReservationCreate({
      selectedUser: input.authenticatedUser,
      selectedSpace: input.selectedSpace,
      selectedDate: input.selectedDate,
      selectedStartTime: input.selectedRange.startTime,
      selectedBlockCount: input.selectedRange.blockCount,
      meetingName: input.meetingName,
      purpose: "",
      meetings: input.meetings,
      sessions: input.sessions,
      adminBlocks: input.adminBlocks,
    });
    if (!change.validation.canSave || change.session === undefined) {
      return { status: "error", message: change.validation.reasons.join(", ") || "신청을 저장할 수 없습니다." };
    }
    return { status: "ok", meeting: change.meeting, sessions: [change.session] };
  }

  const startTime = input.selectedRange.startTime;
  const endTime = addBlocks(startTime, input.selectedRange.blockCount);
  const result = await submitReservationApplication(input.authenticatedUser.id, input.meetingName, [
    {
      space_id: input.selectedSpace.id,
      date: input.selectedDate,
      start_time: startTime,
      end_time: endTime,
      block_count: input.selectedRange.blockCount,
      session_index: 1,
    },
  ]);

  if (result.status === "error") {
    return { status: "error", message: result.message };
  }
  return { status: "ok", meeting: result.meeting, sessions: result.sessions };
}

function buildSubmittedSummary(
  input: UserReservationFlowProps,
  outcome: Extract<SubmitOutcome, { readonly status: "ok" }>,
): SubmittedReservationSummary {
  const firstSession = outcome.sessions[0];
  const meetingName = outcome.meeting?.meetingName ?? input.meetingName.trim();
  if (firstSession === undefined) {
    return {
      meetingName,
      applicantName: input.authenticatedUser.name,
      spaceName: input.selectedSpace.name,
      date: input.selectedDate,
      timeRange: input.selectedRange?.label ?? "선택 시간 없음",
      status: "requested",
    };
  }
  const space = input.spaces.find((item) => item.id === firstSession.spaceId);
  return {
    meetingName,
    applicantName: input.authenticatedUser.name,
    spaceName: space?.name ?? input.selectedSpace.name,
    date: firstSession.date,
    timeRange: `${firstSession.startTime}-${firstSession.endTime}`,
    status: firstSession.status,
  };
}
