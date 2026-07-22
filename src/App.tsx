import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminLogin } from "./components/AdminLogin";
import { AdminPage } from "./components/AdminPage";
import { AdminSummary } from "./components/AdminSummary";
import { ParticipantLogin } from "./components/ParticipantLogin";
import { UserReservationFlow, type SessionActionResult } from "./components/UserReservationFlow";
import { initialAdminBlocks } from "./data/mockAdminBlocks";
import { initialMeetings } from "./data/mockMeetings";
import { initialSessions } from "./data/mockSessions";
import { LEVEL_MAX_BLOCKS } from "./data/settings";
import { initialSpaces } from "./data/spaces";
import { initialUsers } from "./data/mockUsers";
import {
  buildEligibility,
  validateCurrentSelection,
} from "./lib/mockReservationActions";
import {
  canUseMockFallback,
  cancelReservationSession,
  createAdminParticipant,
  deactivateAdminBlock,
  deactivateAdminParticipant,
  fetchAdminReadModel,
  fetchParticipantReservationReadModel,
  fetchReservationReadModel,
  saveAdminBlock,
  saveAdminSpace,
  updateParticipantLevel,
  updateParticipantReservationApproval,
  type AdminBlockMutationInput,
  type AdminSpaceMutationInput,
} from "./lib/supabaseReservationApi";
import type { CreateParticipantFormInput } from "./components/AdminUserChecklist";
import { getSelectedTimeRange } from "./lib/timeSelection";
import type { Admin, AdminApplication, AdminBlock, Meeting, ParticipantUser, ReservationSession, Space, UserLevel } from "./types/reservation";

type AppMode = "user" | "admin";
type ParticipantReservationSnapshot = {
  readonly meetings: readonly Meeting[];
  readonly sessions: readonly ReservationSession[];
};

const participantSessionKey = "lime-space-reservation.participant-session";
const participantReservationsKeyPrefix = "lime-space-reservation.participant-reservations.";
const adminSessionKey = "lime-space-reservation.admin-session";
const modeSessionKey = "lime-space-reservation.mode";

export function App() {
  const [mode, setMode] = useState<AppMode>(() => readStoredMode() ?? (readStoredAdmin() === undefined ? "user" : "admin"));
  const allowMockFallback = canUseMockFallback();
  const [publicSpaces, setPublicSpaces] = useState<readonly Space[]>(allowMockFallback ? getPublicSpaces(initialSpaces) : []);
  const [adminSpaces, setAdminSpaces] = useState<readonly Space[]>(allowMockFallback ? initialSpaces : []);
  const [adminUsers, setAdminUsers] = useState<readonly ParticipantUser[]>(allowMockFallback ? initialUsers : []);
  const [meetings, setMeetings] = useState<readonly Meeting[]>(allowMockFallback ? initialMeetings : []);
  const [sessions, setSessions] = useState<readonly ReservationSession[]>(allowMockFallback ? initialSessions : []);
  const [publicActiveSessions, setPublicActiveSessions] = useState<readonly ReservationSession[]>(allowMockFallback ? initialSessions.filter((session) => session.status !== "cancelled") : []);
  const [publicAdminBlocks, setPublicAdminBlocks] = useState<readonly AdminBlock[]>(allowMockFallback ? initialAdminBlocks : []);
  const [adminBlocks, setAdminBlocks] = useState<readonly AdminBlock[]>(allowMockFallback ? initialAdminBlocks : []);
  const [adminApplications, setAdminApplications] = useState<readonly AdminApplication[]>([]);
  const [isRefreshingAdminApplications, setIsRefreshingAdminApplications] = useState(false);
  const [refreshAdminApplicationsError, setRefreshAdminApplicationsError] = useState<string | undefined>();
  const [isRefreshingParticipantReservations, setIsRefreshingParticipantReservations] = useState(false);
  const [refreshParticipantReservationsError, setRefreshParticipantReservationsError] = useState<string | undefined>();
  const [authenticatedUser, setAuthenticatedUser] = useState<ParticipantUser | undefined>(() => readStoredParticipantUser());
  const [authenticatedAdmin, setAuthenticatedAdmin] = useState<Admin | undefined>(() => readStoredAdmin());
  const [selectedSpaceId, setSelectedSpaceId] = useState(getInitialPublicSpaceId(allowMockFallback ? initialSpaces : []));
  const [selectedDate, setSelectedDate] = useState("2026-07-01");
  const [selectedBlockTimes, setSelectedBlockTimes] = useState<readonly string[]>(["10:00", "10:30"]);
  const [meetingName, setMeetingName] = useState("새 생활 모임");

  const refreshReservationReadModel = useCallback(async (): Promise<boolean> => {
    const model = await fetchReservationReadModel();
    if (model === undefined) {
      return false;
    }
    setPublicSpaces(model.spaces);
    setPublicAdminBlocks(model.adminBlocks);
    setPublicActiveSessions(model.activeSessions);
    setSelectedSpaceId((current) => model.spaces.some((space) => space.id === current) ? current : getInitialPublicSpaceId(model.spaces));
    return true;
  }, []);

  const refreshParticipantReservations = useCallback(async (participantId: string): Promise<boolean> => {
    if (allowMockFallback) {
      return true;
    }
    setIsRefreshingParticipantReservations(true);
    setRefreshParticipantReservationsError(undefined);
    const model = await fetchParticipantReservationReadModel(participantId);
    setIsRefreshingParticipantReservations(false);
    if (model === undefined) {
      setRefreshParticipantReservationsError("내 신청 목록을 다시 불러올 수 없습니다.");
      return false;
    }
    applyParticipantReservationSnapshot(model, setMeetings, setSessions);
    writeStoredParticipantReservations(participantId, model);
    return true;
  }, [allowMockFallback]);

  useEffect(() => {
    let isCurrent = true;
    void fetchReservationReadModel().then((model) => {
      if (!isCurrent || model === undefined) {
        return;
      }
      setPublicSpaces(model.spaces);
      setPublicAdminBlocks(model.adminBlocks);
      setPublicActiveSessions(model.activeSessions);
      setSelectedSpaceId((current) => model.spaces.some((space) => space.id === current) ? current : getInitialPublicSpaceId(model.spaces));
    });
    return () => {
      isCurrent = false;
    };
  }, []);

  useEffect(() => {
    if (authenticatedUser === undefined) {
      return;
    }
    let isCurrent = true;
    const cachedReservations = readStoredParticipantReservations(authenticatedUser.id);
    queueMicrotask(() => {
      if (!isCurrent) {
        return;
      }
      applyParticipantReservationSnapshot(cachedReservations, setMeetings, setSessions);
    });
    void fetchParticipantReservationReadModel(authenticatedUser.id).then((model) => {
      if (!isCurrent || model === undefined) {
        return;
      }
      applyParticipantReservationSnapshot(model, setMeetings, setSessions);
      writeStoredParticipantReservations(authenticatedUser.id, model);
    });
    return () => {
      isCurrent = false;
    };
  }, [authenticatedUser]);

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

  const handleParticipantAuthenticated = useCallback((user: ParticipantUser): void => {
    setAuthenticatedUser(user);
    setMeetings(allowMockFallback ? initialMeetings : []);
    setSessions(allowMockFallback ? initialSessions : []);
    setRefreshParticipantReservationsError(undefined);
    setMode("user");
    writeStoredMode("user");
    writeStoredParticipantUser(user);
  }, [allowMockFallback]);

  const handleParticipantLogout = useCallback((): void => {
    setAuthenticatedUser(undefined);
    removeStoredParticipantUser();
    setRefreshParticipantReservationsError(undefined);
  }, []);

  const handleAdminAuthenticated = useCallback((admin: Admin): void => {
    setAuthenticatedAdmin(admin);
    setMode("admin");
    writeStoredMode("admin");
    writeStoredAdmin(admin);
  }, []);

  const handleAdminLogout = useCallback((): void => {
    setAuthenticatedAdmin(undefined);
    removeStoredAdmin();
    setAdminApplications([]);
    setRefreshAdminApplicationsError(undefined);
    if (!allowMockFallback) {
      setAdminUsers([]);
      setAdminSpaces([]);
      setAdminBlocks([]);
    }
  }, [allowMockFallback]);

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

  const handleUpdateParticipantLevel = async (user: ParticipantUser, nextLevel: UserLevel): Promise<boolean> => {
    if (allowMockFallback) {
      setAdminUsers((current) => current.map((item) => (
        item.id === user.id ? { ...item, level: nextLevel, maxBlocks: LEVEL_MAX_BLOCKS[nextLevel] } : item
      )));
      return true;
    }
    if (authenticatedAdmin === undefined) {
      return false;
    }
    const result = await updateParticipantLevel(
      { name: authenticatedAdmin.name, phone: authenticatedAdmin.phone },
      user.id,
      nextLevel,
    );
    if (result.status !== "ok") {
      return false;
    }
    setAdminUsers((current) => current.map((item) => (item.id === user.id ? result.user : item)));
    void refreshAdminReadModel();
    return true;
  };

  const handleCreateParticipant = async (
    input: CreateParticipantFormInput,
  ): Promise<{ readonly status: "ok" } | { readonly status: "error"; readonly message: string }> => {
    if (allowMockFallback) {
      return { status: "error", message: "Mock 모드에서는 참가자를 추가할 수 없습니다." };
    }
    if (authenticatedAdmin === undefined) {
      return { status: "error", message: "관리자 정보를 확인할 수 없습니다." };
    }
    const result = await createAdminParticipant({ name: authenticatedAdmin.name, phone: authenticatedAdmin.phone }, input);
    if (result.status !== "ok") {
      return { status: "error", message: result.message };
    }
    setAdminUsers((current) => {
      const exists = current.some((item) => item.id === result.user.id);
      return exists ? current.map((item) => (item.id === result.user.id ? result.user : item)) : [...current, result.user];
    });
    void refreshAdminReadModel();
    return { status: "ok" };
  };

  const handleDeactivateParticipant = async (
    user: ParticipantUser,
  ): Promise<{ readonly status: "ok" } | { readonly status: "error"; readonly message: string }> => {
    if (allowMockFallback) {
      return { status: "error", message: "Mock 모드에서는 참가자를 비활성화할 수 없습니다." };
    }
    if (authenticatedAdmin === undefined) {
      return { status: "error", message: "관리자 정보를 확인할 수 없습니다." };
    }
    const result = await deactivateAdminParticipant({ name: authenticatedAdmin.name, phone: authenticatedAdmin.phone }, user.id);
    if (result.status !== "ok") {
      return { status: "error", message: result.message };
    }
    setAdminUsers((current) => current.map((item) => (item.id === result.user.id ? result.user : item)));
    void refreshAdminReadModel();
    return { status: "ok" };
  };

  const handleReactivateParticipant = async (
    user: ParticipantUser,
  ): Promise<{ readonly status: "ok" } | { readonly status: "error"; readonly message: string }> => {
    if (allowMockFallback) {
      return { status: "error", message: "Mock 모드에서는 참가자를 재활성화할 수 없습니다." };
    }
    if (authenticatedAdmin === undefined) {
      return { status: "error", message: "관리자 정보를 확인할 수 없습니다." };
    }
    const result = await createAdminParticipant(
      { name: authenticatedAdmin.name, phone: authenticatedAdmin.phone },
      { name: user.name, phone: user.phone, level: user.level, memo: user.memo },
    );
    if (result.status !== "ok") {
      return { status: "error", message: result.message };
    }
    setAdminUsers((current) => current.map((item) => (item.id === result.user.id ? result.user : item)));
    void refreshAdminReadModel();
    return { status: "ok" };
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
    setMeetings((current) => result.meeting === undefined ? current : current.map((item) => item.id === result.meeting?.id ? result.meeting : item));
    setSessions((current) => mergeSessions(current.map((session) => session.id === sessionId ? { ...session, status: "cancelled" } : session), result.sessions));
    markStoredParticipantSessionCancelled(authenticatedUser.id, sessionId, result.meeting, result.sessions);
    await Promise.all([
      refreshParticipantReservations(authenticatedUser.id),
      refreshReservationReadModel(),
    ]);
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
    markSessionCancelled(sessionId, result.meeting);
    if (authenticatedUser !== undefined) {
      markStoredParticipantSessionCancelled(authenticatedUser.id, sessionId, result.meeting, result.sessions);
    }
    await Promise.all([
      refreshAdminReadModel(),
      refreshReservationReadModel(),
      authenticatedUser === undefined ? Promise.resolve(false) : refreshParticipantReservations(authenticatedUser.id),
    ]);
    return { status: "ok" };
  };

  const handleSaveAdminBlock = async (input: AdminBlockMutationInput): Promise<SessionActionResult> => {
    if (allowMockFallback) {
      const block = buildMockAdminBlock(input, adminSpaces);
      setAdminBlocks((current) => mergeAdminBlock(current, block));
      setPublicAdminBlocks((current) => mergeAdminBlock(current, block));
      return { status: "ok" };
    }
    if (authenticatedAdmin === undefined || authenticatedAdmin.phone.trim().length === 0) {
      return { status: "error", message: "관리자 정보를 확인할 수 없습니다." };
    }
    const result = await saveAdminBlock({ name: authenticatedAdmin.name, phone: authenticatedAdmin.phone }, input);
    if (result.status === "error") {
      return { status: "error", message: result.message };
    }
    setAdminBlocks((current) => mergeAdminBlock(current, result.block));
    setPublicAdminBlocks((current) => mergeAdminBlock(current, result.block));
    await Promise.all([refreshAdminReadModel(), refreshReservationReadModel()]);
    return { status: "ok" };
  };

  const handleDeactivateAdminBlock = async (block: AdminBlock): Promise<SessionActionResult> => {
    if (allowMockFallback) {
      setAdminBlocks((current) => current.filter((item) => item.id !== block.id));
      setPublicAdminBlocks((current) => current.filter((item) => item.id !== block.id));
      return { status: "ok" };
    }
    if (authenticatedAdmin === undefined || authenticatedAdmin.phone.trim().length === 0) {
      return { status: "error", message: "관리자 정보를 확인할 수 없습니다." };
    }
    const result = await deactivateAdminBlock({ name: authenticatedAdmin.name, phone: authenticatedAdmin.phone }, block.id);
    if (result.status === "error") {
      return { status: "error", message: result.message };
    }
    setAdminBlocks((current) => current.filter((item) => item.id !== block.id));
    setPublicAdminBlocks((current) => current.filter((item) => item.id !== block.id));
    await Promise.all([refreshAdminReadModel(), refreshReservationReadModel()]);
    return { status: "ok" };
  };

  const handleSaveAdminSpace = async (space: AdminSpaceMutationInput): Promise<SessionActionResult> => {
    if (allowMockFallback) {
      setAdminSpaces((current) => current.map((item) => item.id === space.id ? { ...item, ...space } : item));
      setPublicSpaces((current) => getPublicSpaces(current.map((item) => item.id === space.id ? { ...item, ...space } : item)));
      return { status: "ok" };
    }
    if (authenticatedAdmin === undefined) {
      return { status: "error", message: "관리자 정보를 확인할 수 없습니다." };
    }
    const result = await saveAdminSpace({ name: authenticatedAdmin.name, phone: authenticatedAdmin.phone }, space);
    if (result.status === "error") {
      return { status: "error", message: result.message };
    }
    setAdminSpaces((current) => current.map((item) => item.id === result.space.id ? result.space : item));
    await Promise.all([refreshAdminReadModel(), refreshReservationReadModel()]);
    return { status: "ok" };
  };

  const selectedSpace = publicSpaces.find((space) => space.id === selectedSpaceId) ?? publicSpaces[0];
  const effectiveSessions = useMemo(
    () => allowMockFallback ? sessions : mergeSessions(publicActiveSessions, sessions),
    [allowMockFallback, publicActiveSessions, sessions],
  );
  const effectiveAdminApplications = allowMockFallback
    ? buildMockAdminApplications(meetings, sessions, adminSpaces)
    : adminApplications;
  const effectiveRefreshAdminApplicationsError = refreshAdminApplicationsError;
  const canShowAdminModeButton = authenticatedUser === undefined || authenticatedAdmin !== undefined || mode === "admin";
  const selectedRange = useMemo(() => getSelectedTimeRange(selectedBlockTimes), [selectedBlockTimes]);
  const eligibility = useMemo(
    () => authenticatedUser === undefined
      ? undefined
      : buildEligibility(authenticatedUser, meetings, effectiveSessions, selectedDate, selectedSpaceId, selectedRange?.blockCount ?? 2),
    [authenticatedUser, meetings, effectiveSessions, selectedDate, selectedSpaceId, selectedRange],
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
          sessions: effectiveSessions,
          adminBlocks: publicAdminBlocks,
        }),
    [authenticatedUser, selectedSpace, selectedDate, selectedRange, meetingName, meetings, effectiveSessions, publicAdminBlocks],
  );

  return (
    <main className="min-h-[100dvh] bg-[#F7FBF4] text-[#172014]">
      <header className="app-header">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-extrabold text-[#5F9820]">라임 공간 예약</p>
            <h1 className="text-2xl font-extrabold leading-tight md:text-3xl">생활밀착형 제휴공간 예약</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[#5B6856]">
              승인된 호스트만 제휴공간을 예약할 수 있습니다.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setMode("user");
                writeStoredMode("user");
              }}
              className={tabClass(mode === "user")}
            >
              사용자 화면
            </button>
            {canShowAdminModeButton && (
              <button
                type="button"
                onClick={() => {
                  setMode("admin");
                  writeStoredMode("admin");
                }}
                className={tabClass(mode === "admin")}
              >
                관리자 모드
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-8">
        {mode === "user" && authenticatedUser === undefined ? (
          <ParticipantLogin onAuthenticated={handleParticipantAuthenticated} />
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
            sessions={effectiveSessions}
            spaces={publicSpaces}
            adminBlocks={publicAdminBlocks}
            setMeetings={setMeetings}
            setSessions={setSessions}
            onSelectSpace={setSelectedSpaceId}
            onSelectDate={setSelectedDate}
            onChangeSelectedBlockTimes={setSelectedBlockTimes}
            onMeetingNameChange={setMeetingName}
            onCancelSession={handleUserCancelSession}
            isRefreshingReservations={isRefreshingParticipantReservations}
            refreshReservationsError={refreshParticipantReservationsError}
            onRefreshReservations={() => Promise.all([
              refreshParticipantReservations(authenticatedUser.id),
              refreshReservationReadModel(),
            ]).then((results) => results.every(Boolean))}
            onRememberSubmittedReservation={(meeting, submittedSessions) => {
              rememberStoredParticipantReservation(authenticatedUser.id, meeting, submittedSessions);
            }}
            onLogout={handleParticipantLogout}
          />
        ) : mode === "user" ? (
          <section className="ui-card rounded-2xl p-6 text-sm font-semibold text-[#5B6856]">
            표시할 수 있는 생활지향형 제휴공간이 없습니다.
          </section>
        ) : authenticatedAdmin === undefined ? (
          <AdminLogin onAuthenticated={handleAdminAuthenticated} />
        ) : (
          <div className="grid min-w-0 gap-4">
            <AdminSummary
              admin={authenticatedAdmin}
              users={adminUsers}
              applications={effectiveAdminApplications}
              adminBlocks={adminBlocks}
              onLogout={handleAdminLogout}
            />
            <AdminPage
              users={adminUsers}
              applications={effectiveAdminApplications}
              spaces={adminSpaces}
              adminBlocks={adminBlocks}
              isRefreshingApplications={isRefreshingAdminApplications}
              refreshApplicationsError={effectiveRefreshAdminApplicationsError}
              onToggleApproval={handleToggleApproval}
              onUpdateLevel={handleUpdateParticipantLevel}
              canManageParticipants={!allowMockFallback}
              onCreateParticipant={handleCreateParticipant}
              onDeactivateParticipant={handleDeactivateParticipant}
              onReactivateParticipant={handleReactivateParticipant}
              onSaveSpace={handleSaveAdminSpace}
              onAddSpace={(space) => setAdminSpaces((current) => [...current, space])}
              onRefreshApplications={() => {
                void refreshAdminReadModel();
              }}
              onCancelSession={handleAdminCancelSession}
              canManageAdminBlocks={authenticatedAdmin.phone.trim().length > 0}
              onSaveBlock={handleSaveAdminBlock}
              onDeactivateBlock={handleDeactivateAdminBlock}
            />
          </div>
        )}
      </div>
    </main>
  );
}

const tabClass = (active: boolean): string =>
  `ui-button rounded-full px-4 py-2 text-sm ${
    active ? "ui-button-primary" : "ui-button-ghost"
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

const applyParticipantReservationSnapshot = (
  snapshot: ParticipantReservationSnapshot,
  setMeetings: (value: readonly Meeting[]) => void,
  setSessions: (value: readonly ReservationSession[]) => void,
): void => {
  setMeetings([...snapshot.meetings].sort(compareMeetings));
  setSessions([...snapshot.sessions].sort(compareSessions));
};

const mergeMeetings = (
  primary: readonly Meeting[],
  secondary: readonly Meeting[],
): readonly Meeting[] => {
  const meetingsById = new Map<string, Meeting>();
  for (const meeting of primary) {
    meetingsById.set(meeting.id, meeting);
  }
  for (const meeting of secondary) {
    meetingsById.set(meeting.id, meeting);
  }
  return [...meetingsById.values()].sort(compareMeetings);
};

const mergeSessions = (
  primary: readonly ReservationSession[],
  secondary: readonly ReservationSession[],
): readonly ReservationSession[] => {
  const sessionsById = new Map<string, ReservationSession>();
  for (const session of primary) {
    sessionsById.set(session.id, session);
  }
  for (const session of secondary) {
    sessionsById.set(session.id, session);
  }
  return [...sessionsById.values()].sort(compareSessions);
};

const mergeAdminBlock = (
  current: readonly AdminBlock[],
  block: AdminBlock,
): readonly AdminBlock[] => {
  const blocksById = new Map<string, AdminBlock>();
  for (const item of current) {
    blocksById.set(item.id, item);
  }
  if (block.isActive) {
    blocksById.set(block.id, block);
  } else {
    blocksById.delete(block.id);
  }
  return [...blocksById.values()].sort(compareAdminBlocks);
};

const buildMockAdminBlock = (
  input: AdminBlockMutationInput,
  spaces: readonly Space[],
): AdminBlock => {
  const space = spaces.find((item) => item.id === input.spaceId);
  return {
    id: input.id ?? `block-${Date.now()}`,
    spaceId: input.spaceId,
    spaceName: space?.name,
    date: input.date,
    startTime: input.startTime,
    endTime: input.endTime,
    reason: input.reason,
    createdBy: "관리자",
    isActive: true,
    createdAt: new Date().toISOString(),
  };
};

const compareMeetings = (first: Meeting, second: Meeting): number =>
  second.updatedAt.localeCompare(first.updatedAt);

const compareSessions = (first: ReservationSession, second: ReservationSession): number => {
  if (first.date !== second.date) {
    return first.date.localeCompare(second.date);
  }
  if (first.startTime !== second.startTime) {
    return first.startTime.localeCompare(second.startTime);
  }
  return first.sessionIndex - second.sessionIndex;
};

const compareAdminBlocks = (first: AdminBlock, second: AdminBlock): number => {
  if (first.date !== second.date) {
    return second.date.localeCompare(first.date);
  }
  return second.startTime.localeCompare(first.startTime);
};

const readStoredParticipantUser = (): ParticipantUser | undefined => {
  const record = readStoredRecord(participantSessionKey);
  if (record === undefined) {
    return undefined;
  }
  const level = toUserLevel(record.level);
  const id = toStringValue(record.id);
  const name = toStringValue(record.name);
  const phoneLast4 = toStringValue(record.phoneLast4);
  if (id.length === 0 || name.length === 0 || phoneLast4.length === 0 || level === undefined) {
    removeStoredParticipantUser();
    return undefined;
  }
  return {
    id,
    name,
    phone: "",
    phoneLast4,
    level,
    hasPlan: record.hasPlan === true,
    hasBudget: record.hasBudget === true,
    hasPromotion: record.hasPromotion === true,
    hasAdminApproval: record.hasAdminApproval === true,
    maxBlocks: toNumberValue(record.maxBlocks) ?? 0,
    memo: toStringValue(record.memo),
    isActive: record.isActive === true,
    createdAt: toOptionalStringValue(record.createdAt),
    updatedAt: toOptionalStringValue(record.updatedAt),
  };
};

const writeStoredParticipantUser = (user: ParticipantUser): void => {
  writeStoredRecord(participantSessionKey, { ...user, phone: "" });
};

const removeStoredParticipantUser = (): void => {
  getSessionStorage()?.removeItem(participantSessionKey);
};

const participantReservationsKey = (participantId: string): string =>
  `${participantReservationsKeyPrefix}${participantId}`;

const readStoredParticipantReservations = (participantId: string): {
  readonly meetings: readonly Meeting[];
  readonly sessions: readonly ReservationSession[];
} => {
  const record = readStoredRecord(participantReservationsKey(participantId));
  if (record === undefined) {
    return { meetings: [], sessions: [] };
  }
  return {
    meetings: readStoredArray(record.meetings, isStoredMeeting),
    sessions: readStoredArray(record.sessions, isStoredReservationSession),
  };
};

const writeStoredParticipantReservations = (
  participantId: string,
  value: { readonly meetings: readonly Meeting[]; readonly sessions: readonly ReservationSession[] },
): void => {
  writeStoredRecord(participantReservationsKey(participantId), {
    meetings: value.meetings,
    sessions: value.sessions,
  });
};

const rememberStoredParticipantReservation = (
  participantId: string,
  meeting: Meeting | undefined,
  sessions: readonly ReservationSession[],
): void => {
  const current = readStoredParticipantReservations(participantId);
  writeStoredParticipantReservations(participantId, {
    meetings: meeting === undefined ? current.meetings : mergeMeetings(current.meetings, [meeting]),
    sessions: mergeSessions(current.sessions, sessions),
  });
};

const markStoredParticipantSessionCancelled = (
  participantId: string,
  sessionId: string,
  meeting: Meeting | undefined,
  sessions: readonly ReservationSession[],
): void => {
  const current = readStoredParticipantReservations(participantId);
  const nextSessions = mergeSessions(
    current.sessions.map((session) => session.id === sessionId ? { ...session, status: "cancelled" } : session),
    sessions,
  );
  writeStoredParticipantReservations(participantId, {
    meetings: meeting === undefined ? current.meetings : mergeMeetings(current.meetings, [meeting]),
    sessions: nextSessions,
  });
};

const readStoredAdmin = (): Admin | undefined => {
  const record = readStoredRecord(adminSessionKey);
  if (record === undefined) {
    return undefined;
  }
  const id = toStringValue(record.id);
  const name = toStringValue(record.name);
  const phoneLast4 = toStringValue(record.phoneLast4);
  const phone = toStringValue(record.phone);
  const role = toStringValue(record.role);
  if (id.length === 0 || name.length === 0 || phoneLast4.length === 0 || phone.length === 0 || role.length === 0) {
    removeStoredAdmin();
    return undefined;
  }
  return {
    id,
    name,
    phone,
    phoneLast4,
    role,
    isActive: record.isActive === true,
  };
};

const writeStoredAdmin = (admin: Admin): void => {
  writeStoredRecord(adminSessionKey, admin);
};

const removeStoredAdmin = (): void => {
  getSessionStorage()?.removeItem(adminSessionKey);
};

const readStoredMode = (): AppMode | undefined => {
  const value = getSessionStorage()?.getItem(modeSessionKey);
  return value === "user" || value === "admin" ? value : undefined;
};

const writeStoredMode = (mode: AppMode): void => {
  getSessionStorage()?.setItem(modeSessionKey, mode);
};

const readStoredRecord = (key: string): Record<string, unknown> | undefined => {
  const raw = getSessionStorage()?.getItem(key);
  if (raw === undefined || raw === null) {
    return undefined;
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    return isRecord(parsed) ? parsed : undefined;
  } catch {
    getSessionStorage()?.removeItem(key);
    return undefined;
  }
};

const writeStoredRecord = (key: string, value: Record<string, unknown>): void => {
  getSessionStorage()?.setItem(key, JSON.stringify(value));
};

const readStoredArray = <Item,>(
  value: unknown,
  predicate: (item: unknown) => item is Item,
): readonly Item[] => {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter(predicate);
};

const getSessionStorage = (): Storage | undefined => {
  if (typeof window === "undefined") {
    return undefined;
  }
  return window.sessionStorage;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const toStringValue = (value: unknown): string =>
  typeof value === "string" ? value : "";

const toOptionalStringValue = (value: unknown): string | undefined =>
  typeof value === "string" && value.length > 0 ? value : undefined;

const toNumberValue = (value: unknown): number | undefined =>
  typeof value === "number" && Number.isFinite(value) ? value : undefined;

const toUserLevel = (value: unknown): ParticipantUser["level"] | undefined =>
  value === 1 || value === 2 ? value : undefined;

const isStoredMeeting = (value: unknown): value is Meeting => {
  if (!isRecord(value)) {
    return false;
  }
  return toStringValue(value.id).length > 0
    && toStringValue(value.applicantUserId).length > 0
    && toStringValue(value.applicantName).length > 0
    && toStringValue(value.meetingName).length > 0
    && isMeetingStatus(value.status)
    && toStringValue(value.createdAt).length > 0
    && toStringValue(value.updatedAt).length > 0;
};

const isStoredReservationSession = (value: unknown): value is ReservationSession => {
  if (!isRecord(value)) {
    return false;
  }
  return toStringValue(value.id).length > 0
    && toStringValue(value.meetingId).length > 0
    && toNumberValue(value.sessionIndex) !== undefined
    && toStringValue(value.spaceId).length > 0
    && toStringValue(value.date).length > 0
    && toStringValue(value.startTime).length > 0
    && toStringValue(value.endTime).length > 0
    && toNumberValue(value.blockCount) !== undefined
    && isSessionStatus(value.status)
    && toStringValue(value.createdAt).length > 0
    && toStringValue(value.updatedAt).length > 0;
};

const isMeetingStatus = (value: unknown): value is Meeting["status"] =>
  value === "draft" || value === "submitted" || value === "approved" || value === "rejected" || value === "cancelled";

const isSessionStatus = (value: unknown): value is ReservationSession["status"] =>
  value === "requested" || value === "confirmed" || value === "cancelled";
