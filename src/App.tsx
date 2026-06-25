import { useEffect, useMemo, useState } from "react";
import { AdminLogin } from "./components/AdminLogin";
import { AdminPage } from "./components/AdminPage";
import { AdminSummary } from "./components/AdminSummary";
import { ParticipantLogin } from "./components/ParticipantLogin";
import { UserReservationFlow } from "./components/UserReservationFlow";
import { initialAdminBlocks } from "./data/mockAdminBlocks";
import { initialMeetings } from "./data/mockMeetings";
import { initialSessions } from "./data/mockSessions";
import { initialSpaces } from "./data/spaces";
import { initialUsers } from "./data/mockUsers";
import {
  buildEligibility,
  validateCurrentSelection,
} from "./lib/mockReservationActions";
import { fetchReservationReadModel } from "./lib/supabaseReservationApi";
import { getSelectedTimeRange } from "./lib/timeSelection";
import type { Admin, AdminBlock, Meeting, ParticipantUser, ReservationSession, Space } from "./types/reservation";

type AppMode = "user" | "admin";

export function App() {
  const [mode, setMode] = useState<AppMode>("user");
  const [spaces, setSpaces] = useState<readonly Space[]>(initialSpaces);
  const [users, setUsers] = useState<readonly ParticipantUser[]>(initialUsers);
  const [meetings, setMeetings] = useState<readonly Meeting[]>(initialMeetings);
  const [sessions, setSessions] = useState<readonly ReservationSession[]>(initialSessions);
  const [adminBlocks, setAdminBlocks] = useState<readonly AdminBlock[]>(initialAdminBlocks);
  const [authenticatedUser, setAuthenticatedUser] = useState<ParticipantUser | undefined>();
  const [authenticatedAdmin, setAuthenticatedAdmin] = useState<Admin | undefined>();
  const [selectedSpaceId, setSelectedSpaceId] = useState(getInitialPublicSpaceId(initialSpaces));
  const [selectedDate, setSelectedDate] = useState("2026-07-01");
  const [selectedBlockTimes, setSelectedBlockTimes] = useState<readonly string[]>(["10:00", "10:30"]);
  const [meetingName, setMeetingName] = useState("새 생활 모임");

  useEffect(() => {
    let isCurrent = true;
    void fetchReservationReadModel().then((model) => {
      if (!isCurrent || model === undefined) {
        return;
      }
      setSpaces(model.spaces);
      setAdminBlocks(model.adminBlocks);
      setSelectedSpaceId(getInitialPublicSpaceId(model.spaces));
    });
    return () => {
      isCurrent = false;
    };
  }, []);

  const selectedSpace = spaces.find((space) => space.id === selectedSpaceId) ?? spaces.find((space) => space.isActive && space.isPublicVisible) ?? spaces[0];
  const selectedRange = useMemo(() => getSelectedTimeRange(selectedBlockTimes), [selectedBlockTimes]);
  const eligibility = useMemo(
    () => authenticatedUser === undefined
      ? undefined
      : buildEligibility(authenticatedUser, meetings, sessions, selectedDate, selectedSpaceId, selectedRange?.blockCount ?? 2),
    [authenticatedUser, meetings, sessions, selectedDate, selectedSpaceId, selectedRange],
  );
  const saveValidation = useMemo(
    () => authenticatedUser === undefined
      ? undefined
      : selectedRange === undefined
        ? { canSave: false, reasons: ["시간을 선택해 주세요."] }
      : validateCurrentSelection({
          selectedUser: authenticatedUser,
          selectedSpace,
          selectedDate,
          selectedStartTime: selectedRange.startTime,
          selectedBlockCount: selectedRange.blockCount,
          meetingName,
          purpose: "",
          meetings,
          sessions,
          adminBlocks,
        }),
    [authenticatedUser, selectedSpace, selectedDate, selectedRange, meetingName, meetings, sessions, adminBlocks],
  );

  if (selectedSpace === undefined) {
    return <main className="p-6 text-[#172014]">초기 데이터를 확인해주세요.</main>;
  }

  return (
    <main className="min-h-[100dvh] bg-[#F7FBF4] text-[#172014]">
      <header className="border-b border-[#DDE8D6] bg-white backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-extrabold text-[#5F9820]">라임 공간 예약</p>
            <h1 className="text-3xl font-extrabold leading-tight md:text-4xl">생활밀착형 제휴공간 예약</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[#5B6856]">
              승인된 호스트만 제휴공간을 예약할 수 있습니다.
            </p>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => setMode("user")} className={tabClass(mode === "user")}>사용자 화면</button>
            <button type="button" onClick={() => setMode("admin")} className={tabClass(mode === "admin")}>관리자 모드</button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-8">
        {mode === "user" && authenticatedUser === undefined ? (
          <ParticipantLogin onAuthenticated={setAuthenticatedUser} />
        ) : mode === "user" && eligibility !== undefined && saveValidation !== undefined && authenticatedUser !== undefined ? (
          <UserReservationFlow
            authenticatedUser={authenticatedUser}
            eligibility={eligibility}
            saveValidation={saveValidation}
            selectedSpace={selectedSpace}
            selectedDate={selectedDate}
            selectedBlockTimes={selectedBlockTimes}
            selectedRange={selectedRange}
            meetingName={meetingName}
            meetings={meetings}
            sessions={sessions}
            spaces={spaces}
            adminBlocks={adminBlocks}
            setMeetings={setMeetings}
            setSessions={setSessions}
            onSelectSpace={setSelectedSpaceId}
            onSelectDate={setSelectedDate}
            onChangeSelectedBlockTimes={setSelectedBlockTimes}
            onMeetingNameChange={setMeetingName}
            onLogout={() => setAuthenticatedUser(undefined)}
          />
        ) : authenticatedAdmin === undefined ? (
          <AdminLogin onAuthenticated={setAuthenticatedAdmin} />
        ) : (
          <div className="grid gap-4">
            <AdminSummary admin={authenticatedAdmin} onLogout={() => setAuthenticatedAdmin(undefined)} />
            <AdminPage
              users={users}
              meetings={meetings}
              sessions={sessions}
              spaces={spaces}
              adminBlocks={adminBlocks}
              onUpdateUser={(updatedUser) => setUsers((current) => current.map((user) => user.id === updatedUser.id ? updatedUser : user))}
              onUpdateSpace={(updatedSpace) => setSpaces((current) => current.map((space) => space.id === updatedSpace.id ? updatedSpace : space))}
              onAddSpace={(space) => setSpaces((current) => [...current, space])}
              onDeleteSession={(sessionId) => setSessions((current) => current.map((session) => session.id === sessionId ? { ...session, status: "cancelled" } : session))}
              onAddBlock={(block) => setAdminBlocks((current) => [block, ...current])}
            />
          </div>
        )}
      </div>
    </main>
  );
}

const tabClass = (active: boolean): string =>
  `rounded-full px-4 py-2 text-sm font-extrabold transition ${
    active ? "bg-[#77B82A] text-white" : "border border-[#DDE8D6] bg-white text-[#5B6856] hover:border-[#77B82A]"
  }`;

const getInitialPublicSpaceId = (spaces: readonly Space[]): string =>
  spaces.find((space) => space.isActive && space.isPublicVisible)?.id ?? spaces[0]?.id ?? "";
