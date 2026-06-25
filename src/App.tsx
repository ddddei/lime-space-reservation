import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminLogin } from "./components/AdminLogin";
import { AdminPage } from "./components/AdminPage";
import { AdminSummary } from "./components/AdminSummary";
import { ParticipantLogin } from "./components/ParticipantLogin";
import { UserReservationFlow, type SessionActionResult } from "./components/UserReservationFlow";
import { initialAdminBlocks } from "./data/mockAdminBlocks";
import { initialMeetings } from "./data/mockMeetings";
import { initialSessions } from "./data/mockSessions";
import { initialSpaces } from "./data/spaces";
import { initialUsers } from "./data/mockUsers";
import {
  buildEligibility,
  validateCurrentSelection,
} from "./lib/mockReservationActions";
import {
  canUseMockFallback,
  cancelReservationSession,
  fetchAdminReadModel,
  fetchReservationReadModel,
  updateParticipantReservationApproval,
} from "./lib/supabaseReservationApi";
import { getSelectedTimeRange } from "./lib/timeSelection";
import type { Admin, AdminApplication, AdminBlock, Meeting, ParticipantUser, ReservationSession, Space } from "./types/reservation";

type AppMode = "user" | "admin";

export function App() {
  const [mode, setMode] = useState<AppMode>("user");
  const allowMockFallback = canUseMockFallback();
  const [publicSpaces, setPublicSpaces] = useState<readonly Space[]>(allowMockFallback ? getPublicSpaces(initialSpaces) : []);
  const [adminSpaces, setAdminSpaces] = useState<readonly Space[]>(allowMockFallback ? initialSpaces : []);
  const [adminUsers, setAdminUsers] = useState<readonly ParticipantUser[]>(allowMockFallback ? initialUsers : []);
  const [meetings, setMeetings] = useState<readonly Meeting[]>(allowMockFallback ? initialMeetings : []);
  const [sessions, setSessions] = useState<readonly ReservationSession[]>(allowMockFallback ? initialSessions : []);
  const [publicAdminBlocks, setPublicAdminBlocks] = useState<readonly AdminBlock[]>(allowMockFallback ? initialAdminBlocks : []);
  const [adminBlocks, setAdminBlocks] = useState<readonly AdminBlock[]>(allowMockFallback ? initialAdminBlocks : []);
  const [adminApplications, setAdminApplications] = useState<readonly AdminApplication[]>([]);
  const [isRefreshingAdminApplications, setIsRefreshingAdminApplications] = useState(false);
  const [refreshAdminApplicationsError, setRefreshAdminApplicationsError] = useState<string | undefined>();
  const [authenticatedUser, setAuthenticatedUser] = useState<ParticipantUser | undefined>();
  const [authenticatedAdmin, setAuthenticatedAdmin] = useState<Admin | undefined>();
  const [selectedSpaceId, setSelectedSpaceId] = useState(getInitialPublicSpaceId(allowMockFallback ? initialSpaces : []));
  const [selectedDate, setSelectedDate] = useState("2026-07-01");
  const [selectedBlockTimes, setSelectedBlockTimes] = useState<readonly string[]>(["10:00", "10:30"]);
  const [meetingName, setMeetingName] = useState("새 생활 모임");

  useEffect(() => {
    let isCurrent = true;
    void fetchReservationReadModel().then((model) => {
      if (!isCurrent || model === undefined) {
        return;
      }
      setPublicSpaces(model.spaces);
      setPublicAdminBlocks(model.adminBlocks);
      setSelectedSpaceId(getInitialPublicSpaceId(model.spaces));
    });
    return () => {
      isCurrent = false;
    };
  }, []);

  const refreshAdminReadModel = useCallback(async (): Promise<boolean> => {
    if (authenticatedAdmin === undefined) {
      return false;
    }
    setIsRefreshingAdminApplications(true);
    setRefreshAdminApplicationsError(undefined);
    const model = await fetchAdminReadModel({ name: authenticatedAdmin.name, phone: authenticatedAdmin.phone });
    setIsRefreshingAdminApplications(false);
    if (model === undefined) {
      setRefreshAdminApplicationsError("관리자 신청 목록을 불러올 수 없습니다.");
      return false;
    }
    setAdminUsers(model.participants);
    setAdminSpaces(model.spaces);
    setAdminApplications(model.applications);
    setAdminBlocks(model.adminBlocks);
    return true;
  }, [authenticatedAdmin]);

  useEffect(() => {
    if (authenticatedAdmin === undefined) {
      return;
    }
    let isCurrent = true;
    void fetchAdminReadModel({ name: authenticatedAdmin.name, phone: authenticatedAdmin.phone }).then((model) => {
      if (!isCurrent || model === undefined) {
        return;
      }
      setAdminUsers(model.participants);
      setAdminSpaces(model.spaces);
      setAdminApplications(model.applications);
      setAdminBlocks(model.adminBlocks);
    });
    return () => {
      isCurrent = false;
    };
  }, [authenticatedAdmin]);

  const handleToggleApproval = async (user: ParticipantUser, nextValue: boolean): Promise<boolean> => {
    if (allowMockFallback) {
      setAdminUsers((current) => current.map((item) => (item.id === user.id ? { ...item, hasAdminApproval: nextValue } : item)));
      return true;
    }
    if (authenticatedAdmin === undefined) {
      return false;
    }
    const result = await updateParticipantReservationApproval(
      { name: authenticatedAdmin.name, phone: authenticatedAdmin.phone },
      user.id,
      nextValue,
    );
    if (result.status !== "ok") {
      return false;
    }
    setAdminUsers((current) => current.map((item) => (item.id === user.id ? result.user : item)));
    return true;
  };

  const markSessionCancelled = (sessionId: string, meeting?: Meeting): void => {
    const existingSession = sessions.find((session) => session.id === sessionId);
    setSessions((current) => current.map((session) => session.id === sessionId ? { ...session, status: "cancelled" } : session));
    if (meeting !== undefined) {
      setMeetings((current) => current.map((item) => item.id === meeting.id ? meeting : item));
      return;
    }
    if (existingSession === undefined) {
      return;
    }
    const remainingActiveSessionCount = sessions.filter(
      (session) => session.meetingId === existingSession.meetingId && session.id !== sessionId && session.status !== "cancelled",
    ).length;
    if (remainingActiveSessionCount === 0) {
      setMeetings((current) => current.map((item) => item.id === existingSession.meetingId ? { ...item, status: "rejected" } : item));
    }
  };

  const handleUserCancelSession = async (sessionId: string): Promise<SessionActionResult> => {
    if (allowMockFallback) {
      markSessionCancelled(sessionId);
      return { status: "ok" };
    }
    if (authenticatedUser === undefined) {
      return { status: "error", message: "참여자 정보를 확인할 수 없습니다." };
    }
    const result = await cancelReservationSession(sessionId, {
      kind: "participant",
      participantId: authenticatedUser.id,
    });
    if (result.status === "error") {
      return result;
    }
    markSessionCancelled(sessionId, result.meeting);
    return { status: "ok" };
  };

  const handleAdminCancelSession = async (sessionId: string): Promise<SessionActionResult> => {
    if (allowMockFallback) {
      markSessionCancelled(sessionId);
      return { status: "ok" };
    }
    if (authenticatedAdmin === undefined) {
      return { status: "error", message: "관리자 정보를 확인할 수 없습니다." };
    }
    const result = await cancelReservationSession(sessionId, {
      kind: "admin",
      credentials: { name: authenticatedAdmin.name, phone: authenticatedAdmin.phone },
    });
    if (result.status === "error") {
      return result;
    }
    await refreshAdminReadModel();
    return { status: "ok" };
  };

  const selectedSpace = publicSpaces.find((space) => space.id === selectedSpaceId) ?? publicSpaces[0];
  const effectiveAdminApplications = allowMockFallback
    ? buildMockAdminApplications(meetings, sessions, adminSpaces)
    : adminApplications;
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
      : selectedSpace === undefined
        ? { canSave: false, reasons: ["예약 가능한 공간이 없습니다."] }
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
          adminBlocks: publicAdminBlocks,
        }),
    [authenticatedUser, selectedSpace, selectedDate, selectedRange, meetingName, meetings, sessions, publicAdminBlocks],
  );

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
        ) : mode === "user" && selectedSpace !== undefined && eligibility !== undefined && saveValidation !== undefined && authenticatedUser !== undefined ? (
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
            spaces={publicSpaces}
            adminBlocks={publicAdminBlocks}
            setMeetings={setMeetings}
            setSessions={setSessions}
            onSelectSpace={setSelectedSpaceId}
            onSelectDate={setSelectedDate}
            onChangeSelectedBlockTimes={setSelectedBlockTimes}
            onMeetingNameChange={setMeetingName}
            onCancelSession={handleUserCancelSession}
            onLogout={() => setAuthenticatedUser(undefined)}
          />
        ) : mode === "user" ? (
          <section className="rounded-lg border border-[#DDE8D6] bg-white p-6 text-sm font-semibold text-[#5B6856]">
            표시할 수 있는 생활지향형 제휴공간이 없습니다.
          </section>
        ) : authenticatedAdmin === undefined ? (
          <AdminLogin onAuthenticated={setAuthenticatedAdmin} />
        ) : (
          <div className="grid gap-4">
            <AdminSummary admin={authenticatedAdmin} onLogout={() => {
              setAuthenticatedAdmin(undefined);
              setAdminApplications([]);
              setRefreshAdminApplicationsError(undefined);
              if (!allowMockFallback) {
                setAdminUsers([]);
                setAdminSpaces([]);
                setAdminBlocks([]);
              }
            }} />
            <AdminPage
              users={adminUsers}
              applications={effectiveAdminApplications}
              spaces={adminSpaces}
              adminBlocks={adminBlocks}
              readOnly={!allowMockFallback}
              isRefreshingApplications={isRefreshingAdminApplications}
              refreshApplicationsError={refreshAdminApplicationsError}
              onUpdateUser={(updatedUser) => setAdminUsers((current) => current.map((user) => user.id === updatedUser.id ? updatedUser : user))}
              onToggleApproval={handleToggleApproval}
              onUpdateSpace={(updatedSpace) => setAdminSpaces((current) => current.map((space) => space.id === updatedSpace.id ? updatedSpace : space))}
              onAddSpace={(space) => setAdminSpaces((current) => [...current, space])}
              onRefreshApplications={() => {
                void refreshAdminReadModel();
              }}
              onCancelSession={handleAdminCancelSession}
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
  getPublicSpaces(spaces)[0]?.id ?? "";

const getPublicSpaces = (spaces: readonly Space[]): readonly Space[] =>
  spaces
    .filter((space) => space.category === "lifestyle" && space.isActive && space.isPublicVisible)
    .sort((first, second) => first.sortOrder - second.sortOrder);

const buildMockAdminApplications = (
  meetings: readonly Meeting[],
  sessions: readonly ReservationSession[],
  spaces: readonly Space[],
): readonly AdminApplication[] =>
  sessions.map((session) => {
    const meeting = meetings.find((item) => item.id === session.meetingId);
    const space = spaces.find((item) => item.id === session.spaceId);
    return {
      meetingId: session.meetingId,
      sessionId: session.id,
      applicantParticipantId: meeting?.applicantUserId ?? "",
      applicantName: meeting?.applicantName ?? "신청자 없음",
      phoneLast4: meeting?.phoneLast4 ?? "",
      level: meeting?.level ?? 2,
      meetingName: meeting?.meetingName ?? "모임 없음",
      purpose: meeting?.purpose ?? "",
      meetingStatus: meeting?.status ?? "draft",
      sessionIndex: session.sessionIndex,
      spaceId: session.spaceId,
      spaceName: space?.name ?? "공간 없음",
      date: session.date,
      startTime: session.startTime,
      endTime: session.endTime,
      blockCount: session.blockCount,
      sessionStatus: session.status,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
    };
  });
