import { AdminBlockForm } from "./AdminBlockForm";
import { AdminReservationTable } from "./AdminReservationTable";
import { AdminUserChecklist } from "./AdminUserChecklist";
import { SpaceAdminEditor } from "./SpaceAdminEditor";
import type { AdminBlock, Meeting, ParticipantUser, ReservationSession, Space } from "../types/reservation";

type AdminPageProps = {
  readonly users: readonly ParticipantUser[];
  readonly meetings: readonly Meeting[];
  readonly sessions: readonly ReservationSession[];
  readonly spaces: readonly Space[];
  readonly adminBlocks: readonly AdminBlock[];
  readonly onUpdateUser: (user: ParticipantUser) => void;
  readonly onUpdateSpace: (space: Space) => void;
  readonly onAddSpace: (space: Space) => void;
  readonly onDeleteSession: (sessionId: string) => void;
  readonly onAddBlock: (block: AdminBlock) => void;
};

export function AdminPage(props: AdminPageProps) {
  return (
    <div className="grid gap-4">
      <AdminUserChecklist
        users={props.users}
        meetings={props.meetings}
        sessions={props.sessions}
        onUpdateUser={props.onUpdateUser}
      />
      <AdminReservationTable
        meetings={props.meetings}
        sessions={props.sessions}
        spaces={props.spaces}
        onDeleteSession={props.onDeleteSession}
      />
      <AdminBlockForm spaces={props.spaces} adminBlocks={props.adminBlocks} onAddBlock={props.onAddBlock} />
      <SpaceAdminEditor spaces={props.spaces} onUpdateSpace={props.onUpdateSpace} onAddSpace={props.onAddSpace} />
    </div>
  );
}
