import { RESERVATION_APPROVAL_GUIDE_MESSAGE } from "../lib/permissions";
import type { SelectedTimeRange } from "../lib/timeSelection";
import type { EligibilityResult, ParticipantUser, SaveValidationResult } from "../types/reservation";

type MeetingFormProps = {
  readonly selectedUser: ParticipantUser;
  readonly eligibility: EligibilityResult;
  readonly saveValidation: SaveValidationResult;
  readonly meetingName: string;
  readonly selectedRange?: SelectedTimeRange;
  readonly isSubmitting: boolean;
  readonly submitError?: string;
  readonly onMeetingNameChange: (value: string) => void;
  readonly onSubmit: () => void;
};

export function MeetingForm(props: MeetingFormProps) {
  return (
    <section className="rounded-[24px] border border-[#DDE8D6] bg-white p-4">
      <div className="mb-4">
        <h2 className="text-xl font-black text-[#172014]">모임명 입력</h2>
        <p className="mt-1 text-sm text-[#5B6856]">신청자는 로그인 정보로 자동 처리됩니다.</p>
      </div>
      <div className="grid gap-3">
        <label className="grid gap-1 text-sm font-bold text-[#172014]">
          신청자
          <span className="rounded-lg border border-[#DDE8D6] bg-[#F7FBF4] px-3 py-2 font-medium text-[#172014]">
            {props.selectedUser.name} · 끝자리 {props.selectedUser.phoneLast4}
          </span>
        </label>
        <label className="grid gap-1 text-sm font-bold text-[#172014]">
          모임명
          <input
            value={props.meetingName}
            onChange={(event) => props.onMeetingNameChange(event.target.value)}
            className="rounded-lg border border-[#DDE8D6] px-3 py-2 font-medium outline-none focus:border-[#77B82A] focus:ring-2 focus:ring-[#77B82A]/20"
          />
          <span className="text-xs font-medium text-[#819078]">
            테스트 신청은 모임명에 "테스트_삭제예정"을 포함해 실제 신청과 구분해 주세요.
          </span>
        </label>
      </div>
      <div className="mt-4 rounded-[18px] bg-[#F7FBF4] p-4 text-sm text-[#5B6856]">
        선택 시간{" "}
        <strong className="block pt-1 text-lg text-[#172014]">
          {props.selectedRange === undefined ? "시간을 선택해 주세요." : props.selectedRange.label}
        </strong>
      </div>
      {!props.eligibility.canReserve && (
        <div className="mt-3 rounded-lg border border-[#F1C5C2] bg-[#FCEBEA] p-3 text-sm text-[#C9443E]">
          <p className="font-bold">예약 조건이 부족합니다.</p>
          <ul className="mt-2 list-inside list-disc">
            {props.eligibility.missingRequirements.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      )}
      {!props.selectedUser.hasAdminApproval && (
        <div className="mt-3 rounded-lg border border-[#FBDFAE] bg-[#FFF6E3] px-3 py-2 text-sm font-bold text-[#B76E00]">
          {RESERVATION_APPROVAL_GUIDE_MESSAGE}
        </div>
      )}
      <button
        type="button"
        disabled={
          !props.selectedUser.hasAdminApproval ||
          !props.saveValidation.canSave ||
          props.meetingName.trim().length === 0 ||
          props.isSubmitting
        }
        onClick={props.onSubmit}
        aria-busy={props.isSubmitting}
        className="mt-4 w-full rounded-lg bg-[#77B82A] px-4 py-3 text-sm font-extrabold text-white transition hover:bg-[#5F9820] focus:outline-none focus:ring-2 focus:ring-[#77B82A]/30 disabled:cursor-not-allowed disabled:bg-[#B9C9AE]"
      >
        {props.isSubmitting ? "신청 중..." : "모임공간 신청하기"}
      </button>
      {props.submitError !== undefined && (
        <div className="mt-3 rounded-lg border border-[#F1C5C2] bg-[#FCEBEA] p-3 text-sm text-[#C9443E]">
          <p className="font-bold">신청 실패</p>
          <p className="mt-1">{props.submitError}</p>
        </div>
      )}
      {!props.saveValidation.canSave && (
        <div className="mt-3 rounded-lg border border-[#F1C5C2] bg-[#FCEBEA] p-3 text-sm text-[#C9443E]">
          <p className="font-bold">저장할 수 없는 이유</p>
          <ul className="mt-2 list-inside list-disc">
            {props.saveValidation.reasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
