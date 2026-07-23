import {
  allDaysOfWeek,
  customEndTimeOptions,
  customStartTimeOptions,
  isCustomOperatingHoursRangeInvalid,
  weekdayLabels,
} from "../lib/operatingHoursSummary";

type OperatingHoursCustomFieldsProps = {
  readonly startTime: string;
  readonly endTime: string;
  readonly closedDays: ReadonlySet<number>;
  readonly onStartTimeChange: (value: string) => void;
  readonly onEndTimeChange: (value: string) => void;
  readonly onToggleClosedDay: (dayOfWeek: number) => void;
  readonly warningMessage?: string;
};

/**
 * "직접 설정" 운영시간 UI(시작/종료 시각 select + 휴무 요일 체크).
 * 요일마다 다른 시간을 줄 수는 없고 공통 시간 + 휴무 요일 조합만 표현한다.
 * SpaceCreateForm(신규 공간)과 SpaceAdminEditor(기존 공간 수정)가 함께 사용한다.
 */
export function OperatingHoursCustomFields(props: OperatingHoursCustomFieldsProps) {
  const isInvalid = isCustomOperatingHoursRangeInvalid(props.startTime, props.endTime);

  return (
    <div className="mt-2 grid gap-2 rounded-lg border border-[#DDE8D6] bg-white p-3">
      {props.warningMessage !== undefined && (
        <p className="text-xs font-bold text-[#B76E00]">{props.warningMessage}</p>
      )}
      <div className="flex flex-wrap items-end gap-3">
        <label className="grid gap-1 text-sm font-bold text-[#172014]">
          시작 시각
          <select
            value={props.startTime}
            onChange={(event) => props.onStartTimeChange(event.target.value)}
            className="rounded-lg border border-[#DDE8D6] px-3 py-2 font-medium"
          >
            {customStartTimeOptions.map((time) => (
              <option key={time} value={time}>
                {time}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm font-bold text-[#172014]">
          종료 시각
          <select
            value={props.endTime}
            onChange={(event) => props.onEndTimeChange(event.target.value)}
            className="rounded-lg border border-[#DDE8D6] px-3 py-2 font-medium"
          >
            {customEndTimeOptions.map((time) => (
              <option key={time} value={time}>
                {time}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="flex flex-wrap gap-3 text-sm font-medium text-[#172014]">
        {allDaysOfWeek.map((dayOfWeek) => (
          <label key={dayOfWeek} className="flex items-center gap-1">
            <input
              type="checkbox"
              checked={props.closedDays.has(dayOfWeek)}
              onChange={() => props.onToggleClosedDay(dayOfWeek)}
              className="h-4 w-4 accent-[#77B82A]"
            />
            {weekdayLabels[dayOfWeek]} 휴무
          </label>
        ))}
      </div>
      {isInvalid && (
        <p className="text-xs font-bold text-[#C9443E]">종료 시각은 시작 시각보다 늦어야 합니다.</p>
      )}
      <p className="text-xs font-medium text-[#4B5945]">
        참고: 00:00~24:00로 설정해도 참가자 화면에는 09~22시로 제한되어 보입니다.
      </p>
    </div>
  );
}
