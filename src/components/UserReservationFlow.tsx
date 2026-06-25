import { useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import { EligibilityPanel } from "./EligibilityPanel";
import { MeetingForm } from "./MeetingForm";
import { MyMeetings } from "./MyMeetings";
import { SpaceLanding } from "./SpaceLanding";
import { TimeBlockSelector } from "./TimeBlockSelector";
import { CalendarView } from "./CalendarView";
import {
  prepareReservationCreate,
  prepareSessionUpdate,
} from "../lib/mockReservationActions";
import type {
  AdminBlock,
  EligibilityResult,
  Meeting,
  ParticipantUser,
  ReservationSession,
  SaveValidationResult,
  Space,
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
  readonly onLogout: () => void;
};

export function UserReservationFlow(props: UserReservationFlowProps) {
  const [isReservationOpen, setIsReservationOpen] = useState(false);
  const openReservation = (spaceId: string): void => {
    props.onSelectSpace(spaceId);
    props.onChangeSelectedBlockTimes([]);
    setIsReservationOpen(true);
  };

  return (
    <div className="grid gap-8">
      <UserHero {...props} />
      <div className="grid gap-8 xl:grid-cols-[minmax(0,1.35fr)_minmax(340px,0.65fr)]">
        <div className="grid gap-8">
          <StepFrame title="공간 선택" description="카드를 누르면 예약 창이 열립니다.">
            <SpaceLanding spaces={props.spaces} selectedSpaceId={props.selectedSpace.id} onSelectSpace={openReservation} />
          </StepFrame>
        </div>
        <aside className="grid content-start gap-5 xl:sticky xl:top-6">
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
            onCancelSession={(sessionId) => props.setSessions((current) => current.map((session) => session.id === sessionId ? { ...session, status: "cancelled" } : session))}
          />
        </aside>
      </div>
      {isReservationOpen && (
        <ReservationDialog
          {...props}
          onClose={() => setIsReservationOpen(false)}
          onSaved={() => setIsReservationOpen(false)}
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

function ReservationDialog(props: UserReservationFlowProps & { readonly onClose: () => void; readonly onSaved: () => void }) {
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
          <aside className="grid content-start gap-4">
            <MeetingForm
              selectedUser={props.authenticatedUser}
              eligibility={props.eligibility}
              saveValidation={props.saveValidation}
              meetingName={props.meetingName}
              selectedRange={props.selectedRange}
              onMeetingNameChange={props.onMeetingNameChange}
              onSubmit={() => {
                const saved = saveReservation(props);
                if (saved) {
                  props.onSaved();
                }
              }}
            />
          </aside>
        </div>
      </div>
    </div>
  );
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

function saveReservation(input: UserReservationFlowProps): boolean {
  if (input.selectedRange === undefined) {
    return false;
  }
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
    return false;
  }
  if (change.meeting !== undefined) {
    const meeting = change.meeting;
    input.setMeetings((current) => [meeting, ...current]);
  }
  const session = change.session;
  input.setSessions((current) => [session, ...current]);
  return true;
}
