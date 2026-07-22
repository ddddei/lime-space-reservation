import { AdminBlockForm, type AdminBlockFormInput } from "./AdminBlockForm";
import { AdminReservationTable } from "./AdminReservationTable";
import { AdminUserChecklist, type CreateParticipantFormInput } from "./AdminUserChecklist";
import { SpaceAdminEditor } from "./SpaceAdminEditor";
import type { AdminApplication, AdminBlock, ParticipantUser, Space, UserLevel } from "../types/reservation";

type ParticipantMutationResult =
  | { readonly status: "ok" }
  | { readonly status: "error"; readonly message: string };

type AdminPageProps = {
  readonly users: readonly ParticipantUser[];
  readonly applications: readonly AdminApplication[];
  readonly spaces: readonly Space[];
  readonly adminBlocks: readonly AdminBlock[];
  readonly isRefreshingApplications: boolean;
  readonly refreshApplicationsError?: string;
  readonly onToggleApproval: (user: ParticipantUser, nextValue: boolean) => Promise<boolean>;
  readonly onUpdateLevel: (user: ParticipantUser, nextLevel: UserLevel) => Promise<boolean>;
  readonly canManageParticipants: boolean;
  readonly onCreateParticipant: (input: CreateParticipantFormInput) => Promise<ParticipantMutationResult>;
  readonly onDeactivateParticipant: (user: ParticipantUser) => Promise<ParticipantMutationResult>;
  readonly onReactivateParticipant: (user: ParticipantUser) => Promise<ParticipantMutationResult>;
  readonly onSaveSpace: (space: Space) => Promise<{ readonly status: "ok" } | { readonly status: "error"; readonly message: string }>;
  readonly onAddSpace: (space: Space) => void;
  readonly onRefreshApplications: () => void;
  readonly onCancelSession: (sessionId: string) => Promise<{ readonly status: "ok" } | { readonly status: "error"; readonly message: string }>;
  readonly canManageAdminBlocks: boolean;
  readonly onSaveBlock: (block: AdminBlockFormInput) => Promise<{ readonly status: "ok" } | { readonly status: "error"; readonly message: string }>;
  readonly onDeactivateBlock: (block: AdminBlock) => Promise<{ readonly status: "ok" } | { readonly status: "error"; readonly message: string }>;
};

export function AdminPage(props: AdminPageProps) {
  return (
    <div className="grid min-w-0 gap-4">
      <AdminUserChecklist
        users={props.users}
        applications={props.applications}
        readOnly={false}
        canManageParticipants={props.canManageParticipants}
        onToggleApproval={props.onToggleApproval}
        onUpdateLevel={props.onUpdateLevel}
        onCreateParticipant={props.onCreateParticipant}
        onDeactivateParticipant={props.onDeactivateParticipant}
        onReactivateParticipant={props.onReactivateParticipant}
      />
      <AdminReservationTable
        applications={props.applications}
        spaces={props.spaces}
        isRefreshing={props.isRefreshingApplications}
        refreshError={props.refreshApplicationsError}
        onRefresh={props.onRefreshApplications}
        onCancelSession={props.onCancelSession}
      />
      <AdminBlockForm
        spaces={props.spaces}
        adminBlocks={props.adminBlocks}
        canManage={props.canManageAdminBlocks}
        onSaveBlock={props.onSaveBlock}
        onDeactivateBlock={props.onDeactivateBlock}
      />
      <SpaceAdminEditor spaces={props.spaces} onSaveSpace={props.onSaveSpace} onAddSpace={props.onAddSpace} />
    </div>
  );
}
