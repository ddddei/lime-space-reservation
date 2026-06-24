import type { Dispatch, ReactNode, SetStateAction } from "react";
import { EligibilityPanel } from "./EligibilityPanel";
import { MeetingForm } from "./MeetingForm";
import { MyMeetings } from "./MyMeetings";
import { PublicReservationList } from "./PublicReservationList";
import { SpaceDetail } from "./SpaceDetail";
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
  readonly purpose: string;
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
  readonly onPurposeChange: (value: string) => void;
  readonly onLogout: () => void;
};

export function UserReservationFlow(props: UserReservationFlowProps) {
  return (
    <div className="grid gap-8">
      <UserHero {...props} />
      <div className="grid gap-8 xl:grid-cols-[minmax(0,1.45fr)_minmax(360px,0.7fr)]">
        <div className="grid gap-8">
          <StepFrame step="STEP 1" title="공간 고르기" description="오늘의 모임에 맞는 장면을 선택하세요.">
            <SpaceLanding spaces={props.spaces} selectedSpaceId={props.selectedSpace.id} onSelectSpace={props.onSelectSpace} />
          </StepFrame>
          <SpaceDetail space={props.selectedSpace} />
          <StepFrame step="STEP 2" title="날짜 고르기" description="예약 흐름은 선택한 공간 기준으로 계산됩니다.">
            <CalendarView
              selectedDate={props.selectedDate}
              selectedSpace={props.selectedSpace}
              sessions={props.sessions}
              adminBlocks={props.adminBlocks}
              onSelectDate={props.onSelectDate}
            />
          </StepFrame>
          <StepFrame step="STEP 3" title="시간 고르기" description="1시간 슬롯을 연속으로 선택할 수 있습니다.">
            <TimeBlockSelector
              spaceId={props.selectedSpace.id}
              date={props.selectedDate}
              selectedBlockTimes={props.selectedBlockTimes}
              sessions={props.sessions}
              adminBlocks={props.adminBlocks}
              operatingHours={props.selectedSpace.operatingHours}
              onChangeSelectedBlockTimes={props.onChangeSelectedBlockTimes}
            />
          </StepFrame>
          <StepFrame step="STEP 4" title="모임 신청" description="모임의 이름과 목적만 간단히 남겨 주세요.">
            <MeetingForm
              selectedUser={props.authenticatedUser}
              eligibility={props.eligibility}
              saveValidation={props.saveValidation}
              meetingName={props.meetingName}
              purpose={props.purpose}
              selectedRange={props.selectedRange}
              onMeetingNameChange={props.onMeetingNameChange}
              onPurposeChange={props.onPurposeChange}
              onSubmit={() => saveReservation(props)}
            />
          </StepFrame>
        </div>
        <aside className="grid content-start gap-5 xl:sticky xl:top-6">
          <EligibilityPanel eligibility={props.eligibility} user={props.authenticatedUser} />
          <PublicReservationList
            meetings={props.meetings}
            sessions={props.sessions}
            spaces={props.spaces}
            selectedSpaceId={props.selectedSpace.id}
            selectedDate={props.selectedDate}
          />
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
    </div>
  );
}

function UserHero(props: UserReservationFlowProps) {
  return (
    <section className="overflow-hidden rounded-[32px] border border-[#DDE8D6] bg-white p-6 md:p-8">
      <div className="grid gap-6 lg:grid-cols-[1fr_360px] lg:items-end">
        <div>
          <p className="text-sm font-extrabold text-[#5F9820]">Life IS Meaningful Encounters</p>
          <h2 className="mt-3 max-w-3xl text-4xl font-black leading-[1.05] text-[#172014] md:text-6xl">
            생활지향형 제휴공간 예약
          </h2>
          <p className="mt-5 max-w-2xl text-base leading-7 text-[#5B6856] md:text-lg">
            승인된 호스트만 제휴공간을 예약할 수 있습니다. 공간을 고르고, 날짜와 시간을 잇고, 모임을 시작하세요.
          </p>
        </div>
        <div className="rounded-[24px] border border-[#DDE8D6] bg-[#F7FBF4] p-5">
          <p className="text-xs font-black text-[#5F9820]">현재 호스트</p>
          <h3 className="mt-2 text-2xl font-black text-[#172014]">{props.authenticatedUser.name}</h3>
          <p className="mt-2 text-sm text-[#5B6856]">
            Level {props.authenticatedUser.level} · 끝자리 {props.authenticatedUser.phoneLast4}
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

function StepFrame(props: { readonly step: string; readonly title: string; readonly description: string; readonly children: ReactNode }) {
  return (
    <section className="grid gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-black text-[#5F9820]">{props.step}</p>
          <h2 className="mt-1 text-2xl font-black text-[#172014] md:text-3xl">{props.title}</h2>
        </div>
        <p className="max-w-sm text-sm leading-6 text-[#5B6856]">{props.description}</p>
      </div>
      {props.children}
    </section>
  );
}

function saveReservation(input: UserReservationFlowProps): void {
  if (input.selectedRange === undefined) {
    return;
  }
  const change = prepareReservationCreate({
    selectedUser: input.authenticatedUser,
    selectedSpace: input.selectedSpace,
    selectedDate: input.selectedDate,
    selectedStartTime: input.selectedRange.startTime,
    selectedBlockCount: input.selectedRange.blockCount,
    meetingName: input.meetingName,
    purpose: input.purpose,
    meetings: input.meetings,
    sessions: input.sessions,
    adminBlocks: input.adminBlocks,
  });
  if (!change.validation.canSave || change.session === undefined) {
    return;
  }
  if (change.meeting !== undefined) {
    const meeting = change.meeting;
    input.setMeetings((current) => [meeting, ...current]);
  }
  const session = change.session;
  input.setSessions((current) => [session, ...current]);
}
