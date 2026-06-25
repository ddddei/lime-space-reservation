import { AdminBlockForm } from "./AdminBlockForm";
import { AdminReservationTable } from "./AdminReservationTable";
import { AdminUserChecklist } from "./AdminUserChecklist";
import { SpaceAdminEditor } from "./SpaceAdminEditor";
import type { AdminApplication, AdminBlock, ParticipantUser, Space } from "../types/reservation";

type AdminPageProps = {
  readonly users: readonly ParticipantUser[];
  readonly applications: readonly AdminApplication[];
  readonly spaces: readonly Space[];
  readonly adminBlocks: readonly AdminBlock[];
  readonly readOnly: boolean;
  readonly onUpdateUser: (user: ParticipantUser) => void;
  readonly onToggleApproval: (user: ParticipantUser, nextValue: boolean) => Promise<boolean>;
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
        applications={props.applications}
        readOnly={props.readOnly}
        onUpdateUser={props.onUpdateUser}
        onToggleApproval={props.onToggleApproval}
      />
      <AdminReservationTable
        applications={props.applications}
        spaces={props.spaces}
        readOnly={props.readOnly}
        onDeleteSession={props.onDeleteSession}
      />
      <AdminBlockForm spaces={props.spaces} adminBlocks={props.adminBlocks} readOnly={props.readOnly} onAddBlock={props.onAddBlock} />
      <SpaceAdminEditor spaces={props.spaces} readOnly={props.readOnly} onUpdateSpace={props.onUpdateSpace} onAddSpace={props.onAddSpace} />
    </div>
  );
}
