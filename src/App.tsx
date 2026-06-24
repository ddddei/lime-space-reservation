import { useMemo, useState } from "react";
import { AdminPage } from "./components/AdminPage";
import { CalendarView } from "./components/CalendarView";
import { MeetingForm } from "./components/MeetingForm";
import { MyMeetings } from "./components/MyMeetings";
import { PublicReservationList } from "./components/PublicReservationList";
import { SpaceDetail } from "./components/SpaceDetail";
import { SpaceLanding } from "./components/SpaceLanding";
import { TimeBlockSelector } from "./components/TimeBlockSelector";
import { DEFAULT_RESERVATION_BLOCKS } from "./data/settings";
import { initialAdminBlocks } from "./data/mockAdminBlocks";
import { initialMeetings } from "./data/mockMeetings";
import { initialSessions } from "./data/mockSessions";
import { initialSpaces } from "./data/spaces";
import { initialUsers } from "./data/mockUsers";
import { addBlocks } from "./lib/date";
import { getEligibility } from "./lib/reservationRules";
import type { AdminBlock, EligibilityResult, Meeting, ParticipantUser, ReservationSession, Space } from "./types/reservation";

type AppMode = "user" | "admin";

export function App() {
  const [mode, setMode] = useState<AppMode>("user");
  const [spaces, setSpaces] = useState<readonly Space[]>(initialSpaces);
  const [users, setUsers] = useState<readonly ParticipantUser[]>(initialUsers);
  const [meetings, setMeetings] = useState<readonly Meeting[]>(initialMeetings);
  const [sessions, setSessions] = useState<readonly ReservationSession[]>(initialSessions);
  const [adminBlocks, setAdminBlocks] = useState<readonly AdminBlock[]>(initialAdminBlocks);
  const [selectedUserId, setSelectedUserId] = useState(initialUsers[0]?.id ?? "");
  const [selectedSpaceId, setSelectedSpaceId] = useState(initialSpaces[0]?.id ?? "");
  const [selectedDate, setSelectedDate] = useState("2026-06-27");
  const [selectedStartTime, setSelectedStartTime] = useState("09:00");
  const [meetingName, setMeetingName] = useState("새 생활 모임");
  const [purpose, setPurpose] = useState("생활 주제 활동을 함께 기획하고 실행합니다.");

  const selectedSpace = spaces.find((space) => space.id === selectedSpaceId) ?? spaces[0];
  const selectedUser = users.find((user) => user.id === selectedUserId) ?? users[0];
  const eligibility = useMemo(
    () => buildEligibility(selectedUser, meetings, sessions, selectedDate, selectedSpaceId),
    [selectedUser, meetings, sessions, selectedDate, selectedSpaceId],
  );

  if (selectedSpace === undefined || selectedUser === undefined) {
    return <main className="p-6 text-[#172014]">초기 mock data를 확인해주세요.</main>;
  }

  return (
    <main className="min-h-[100dvh] bg-[#F7FBF4] text-[#172014]">
      <header className="border-b border-[#DDE8D6] bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-5 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-extrabold text-[#5F9820]">Lime Space Reservation</p>
            <h1 className="text-3xl font-extrabold leading-tight md:text-4xl">청년동 공간 및 생활지향형 공간 예약</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[#5B6856]">
              기획안, 예산안, 홍보물, 관리자 최종 승인을 모두 충족한 참여자만 예약할 수 있는 mock 기반 1차 구현입니다.
            </p>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => setMode("user")} className={tabClass(mode === "user")}>사용자 화면</button>
            <button type="button" onClick={() => setMode("admin")} className={tabClass(mode === "admin")}>관리자 모드</button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-5 px-4 py-5">
        {mode === "user" ? (
          <div className="grid gap-5 lg:grid-cols-[1.35fr_0.9fr]">
            <div className="grid gap-5">
              <div className="rounded-lg border border-[#DDE8D6] bg-white p-4">
                <label className="grid gap-1 text-sm font-bold text-[#172014]">
                  신청자 선택
                  <select
                    value={selectedUserId}
                    onChange={(event) => setSelectedUserId(event.target.value)}
                    className="rounded-lg border border-[#DDE8D6] bg-white px-3 py-2 font-medium"
                  >
                    {users.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.name} / Level {user.level} / {user.phoneLast4}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <SpaceLanding spaces={spaces} selectedSpaceId={selectedSpace.id} onSelectSpace={setSelectedSpaceId} />
              <SpaceDetail space={selectedSpace} />
              <CalendarView selectedDate={selectedDate} onSelectDate={setSelectedDate} />
              <TimeBlockSelector
                spaceId={selectedSpace.id}
                date={selectedDate}
                selectedStartTime={selectedStartTime}
                sessions={sessions}
                adminBlocks={adminBlocks}
                onSelectStartTime={setSelectedStartTime}
              />
            </div>
            <aside className="grid content-start gap-5">
              <EligibilityPanel eligibility={eligibility} user={selectedUser} />
              <MeetingForm
                selectedUser={selectedUser}
                eligibility={eligibility}
                meetingName={meetingName}
                purpose={purpose}
                selectedStartTime={selectedStartTime}
                onMeetingNameChange={setMeetingName}
                onPurposeChange={setPurpose}
                onSubmit={() => saveReservation({
                  selectedUser,
                  selectedSpace,
                  selectedDate,
                  selectedStartTime,
                  meetingName,
                  purpose,
                  meetings,
                  sessions,
                  setMeetings,
                  setSessions,
                })}
              />
              <PublicReservationList meetings={meetings} sessions={sessions} spaces={spaces} />
              <MyMeetings
                userId={selectedUser.id}
                meetings={meetings}
                sessions={sessions}
                spaces={spaces}
                onCancelSession={(sessionId) => setSessions((current) => current.map((session) => session.id === sessionId ? { ...session, status: "cancelled" } : session))}
              />
            </aside>
          </div>
        ) : (
          <AdminPage
            users={users}
            meetings={meetings}
            sessions={sessions}
            spaces={spaces}
            adminBlocks={adminBlocks}
            onUpdateUser={(updatedUser) => setUsers((current) => current.map((user) => user.id === updatedUser.id ? updatedUser : user))}
            onUpdateSpace={(updatedSpace) => setSpaces((current) => current.map((space) => space.id === updatedSpace.id ? updatedSpace : space))}
            onDeleteSession={(sessionId) => setSessions((current) => current.map((session) => session.id === sessionId ? { ...session, status: "cancelled" } : session))}
            onAddBlock={(block) => setAdminBlocks((current) => [block, ...current])}
          />
        )}
      </div>
    </main>
  );
}

const tabClass = (active: boolean): string =>
  `rounded-lg px-4 py-2 text-sm font-extrabold transition ${
    active ? "bg-[#77B82A] text-white" : "border border-[#DDE8D6] bg-white text-[#5B6856] hover:border-[#77B82A]"
  }`;

function EligibilityPanel({ eligibility, user }: { readonly eligibility: EligibilityResult; readonly user: ParticipantUser }) {
  return (
    <section className="rounded-lg border border-[#DDE8D6] bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-[#172014]">예약 가능 여부</h2>
          <p className="text-sm text-[#5B6856]">{user.name} · Level {user.level}</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-sm font-extrabold ${eligibility.canReserve ? "bg-[#E8F5DE] text-[#178A46]" : "bg-[#FCEBEA] text-[#C9443E]"}`}>
          {eligibility.canReserve ? "예약 가능" : "예약 불가"}
        </span>
      </div>
      <div className="mt-3 rounded-lg bg-[#F7FBF4] p-3 text-sm text-[#5B6856]">
        사용 블록 {eligibility.usedBlocks} / 최대 {user.maxBlocks}, 잔여 {eligibility.remainingBlocks}
      </div>
      {eligibility.missingRequirements.length > 0 && (
        <ul className="mt-3 grid gap-2 text-sm text-[#C9443E]">
          {eligibility.missingRequirements.map((requirement) => (
            <li key={requirement} className="rounded-lg bg-[#FCEBEA] px-3 py-2">{requirement} 필요</li>
          ))}
        </ul>
      )}
    </section>
  );
}

type SaveReservationInput = {
  readonly selectedUser: ParticipantUser;
  readonly selectedSpace: Space;
  readonly selectedDate: string;
  readonly selectedStartTime: string;
  readonly meetingName: string;
  readonly purpose: string;
  readonly meetings: readonly Meeting[];
  readonly sessions: readonly ReservationSession[];
  readonly setMeetings: React.Dispatch<React.SetStateAction<readonly Meeting[]>>;
  readonly setSessions: React.Dispatch<React.SetStateAction<readonly ReservationSession[]>>;
};

function saveReservation(input: SaveReservationInput): void {
  const now = new Date().toISOString();
  const existingMeeting = input.meetings.find(
    (meeting) => meeting.applicantUserId === input.selectedUser.id && meeting.meetingName === input.meetingName,
  );
  const meetingId = existingMeeting?.id ?? `meeting-${Date.now()}`;
  const currentSessions = input.sessions.filter((session) => session.meetingId === meetingId && session.status !== "cancelled");
  const nextSessionIndex = currentSessions.length + 1;
  const endTime = addBlocks(input.selectedStartTime, DEFAULT_RESERVATION_BLOCKS);

  if (existingMeeting === undefined) {
    input.setMeetings((current) => [
      {
        id: meetingId,
        applicantUserId: input.selectedUser.id,
        applicantName: input.selectedUser.name,
        phoneLast4: input.selectedUser.phoneLast4,
        level: input.selectedUser.level,
        meetingName: input.meetingName,
        purpose: input.purpose,
        status: "submitted",
        createdAt: now,
        updatedAt: now,
      },
      ...current,
    ]);
  }

  input.setSessions((current) => [
    {
      id: `session-${Date.now()}`,
      meetingId,
      sessionIndex: nextSessionIndex,
      spaceId: input.selectedSpace.id,
      date: input.selectedDate,
      startTime: input.selectedStartTime,
      endTime,
      blockCount: DEFAULT_RESERVATION_BLOCKS,
      status: "requested",
      createdAt: now,
      updatedAt: now,
    },
    ...current,
  ]);
}

function buildEligibility(
  user: ParticipantUser,
  meetings: readonly Meeting[],
  sessions: readonly ReservationSession[],
  selectedDate: string,
  selectedSpaceId: string,
): EligibilityResult {
  const base = getEligibility(user, { meetings, sessions });
  const userMeetingIds = meetings.filter((meeting) => meeting.applicantUserId === user.id).map((meeting) => meeting.id);
  const hasDifferentSpaceOnDate = sessions.some(
    (session) =>
      userMeetingIds.includes(session.meetingId) &&
      session.date === selectedDate &&
      session.spaceId !== selectedSpaceId &&
      session.status !== "cancelled",
  );
  const missingRequirements = hasDifferentSpaceOnDate ? [...base.missingRequirements, "하루에는 하나의 공간만 예약 가능"] : base.missingRequirements;
  return {
    ...base,
    canReserve: base.canReserve && !hasDifferentSpaceOnDate,
    missingRequirements,
  };
}
