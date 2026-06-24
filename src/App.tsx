import { useMemo, useState } from "react";
import { AdminPage } from "./components/AdminPage";
import { CalendarView } from "./components/CalendarView";
import { MeetingForm } from "./components/MeetingForm";
import { MyMeetings } from "./components/MyMeetings";
import { PublicReservationList } from "./components/PublicReservationList";
import { SpaceDetail } from "./components/SpaceDetail";
import { SpaceLanding } from "./components/SpaceLanding";
import { TimeBlockSelector } from "./components/TimeBlockSelector";
import { initialAdminBlocks } from "./data/mockAdminBlocks";
import { initialMeetings } from "./data/mockMeetings";
import { initialSessions } from "./data/mockSessions";
import { initialSpaces } from "./data/spaces";
import { initialUsers } from "./data/mockUsers";
import {
  buildEligibility,
  prepareReservationCreate,
  prepareSessionUpdate,
  validateCurrentSelection,
} from "./lib/mockReservationActions";
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
  const saveValidation = useMemo(
    () => validateCurrentSelection({
      selectedUser,
      selectedSpace,
      selectedDate,
      selectedStartTime,
      meetingName,
      purpose,
      meetings,
      sessions,
      adminBlocks,
    }),
    [selectedUser, selectedSpace, selectedDate, selectedStartTime, meetingName, purpose, meetings, sessions, adminBlocks],
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
              기획안, 예산안, 홍보물, 관리자 최종 승인을 모두 충족한 참여자만 예약할 수 있는 mock 기반 운영 규칙 보강 구현입니다.
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
                saveValidation={saveValidation}
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
                  adminBlocks,
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
                adminBlocks={adminBlocks}
                user={selectedUser}
                onUpdateSession={(sessionId, values) => {
                  const result = prepareSessionUpdate({
                    sessionId,
                    values,
                    selectedUser,
                    meetings,
                    sessions,
                    adminBlocks,
                  });
                  if (result.validation.canSave) {
                    setSessions(result.sessions);
                  }
                  return result.validation;
                }}
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
  readonly adminBlocks: readonly AdminBlock[];
  readonly setMeetings: React.Dispatch<React.SetStateAction<readonly Meeting[]>>;
  readonly setSessions: React.Dispatch<React.SetStateAction<readonly ReservationSession[]>>;
};

function saveReservation(input: SaveReservationInput): void {
  const change = prepareReservationCreate(input);
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
