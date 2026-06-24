import type { SelectedTimeRange } from "../lib/timeSelection";
import type { EligibilityResult, ParticipantUser, SaveValidationResult } from "../types/reservation";

type MeetingFormProps = {
  readonly selectedUser: ParticipantUser;
  readonly eligibility: EligibilityResult;
  readonly saveValidation: SaveValidationResult;
  readonly meetingName: string;
  readonly purpose: string;
  readonly selectedRange?: SelectedTimeRange;
  readonly onMeetingNameChange: (value: string) => void;
  readonly onPurposeChange: (value: string) => void;
  readonly onSubmit: () => void;
};

export function MeetingForm(props: MeetingFormProps) {
  return (
    <section className="rounded-lg border border-[#DDE8D6] bg-white p-4">
      <div className="mb-4">
        <h2 className="text-lg font-bold text-[#172014]">모임 신청 폼</h2>
        <p className="text-sm text-[#5B6856]">한 회차는 하나의 신청 세션으로 저장되고, 한 모임은 최대 6회차까지 준비되어 있습니다.</p>
      </div>
      <div className="grid gap-3">
        <label className="grid gap-1 text-sm font-bold text-[#172014]">
          신청자
          <select className="rounded-lg border border-[#DDE8D6] bg-white px-3 py-2 font-medium" value={props.selectedUser.id} disabled>
            <option>{props.selectedUser.name} / Level {props.selectedUser.level}</option>
          </select>
        </label>
        <label className="grid gap-1 text-sm font-bold text-[#172014]">
          모임명
          <input
            value={props.meetingName}
            onChange={(event) => props.onMeetingNameChange(event.target.value)}
            className="rounded-lg border border-[#DDE8D6] px-3 py-2 font-medium outline-none focus:border-[#77B82A] focus:ring-2 focus:ring-[#77B82A]/20"
          />
        </label>
        <label className="grid gap-1 text-sm font-bold text-[#172014]">
          목적
          <textarea
            value={props.purpose}
            onChange={(event) => props.onPurposeChange(event.target.value)}
            rows={3}
            className="rounded-lg border border-[#DDE8D6] px-3 py-2 font-medium outline-none focus:border-[#77B82A] focus:ring-2 focus:ring-[#77B82A]/20"
          />
        </label>
      </div>
      <div className="mt-4 rounded-lg bg-[#F7FBF4] p-3 text-sm text-[#5B6856]">
        예약 요청 시간:{" "}
        <strong className="text-[#172014]">
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
      <button
        type="button"
        disabled={!props.saveValidation.canSave || props.meetingName.trim().length === 0}
        onClick={props.onSubmit}
        className="mt-4 w-full rounded-lg bg-[#77B82A] px-4 py-3 text-sm font-extrabold text-white transition hover:bg-[#5F9820] focus:outline-none focus:ring-2 focus:ring-[#77B82A]/30 disabled:cursor-not-allowed disabled:bg-[#B9C9AE]"
      >
        회차 신청 저장
      </button>
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
