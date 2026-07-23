import { useState } from "react";
import { HelpCircle, LogOut } from "lucide-react";
import { getAdminRoleLabel } from "../lib/displayLabels";
import { ADMIN_HELP_SECTIONS } from "../data/helpContent";
import { HelpModal } from "./HelpModal";
import type { Admin, AdminApplication, AdminBlock, ParticipantUser } from "../types/reservation";

type AdminSummaryProps = {
  readonly admin: Admin;
  readonly users: readonly ParticipantUser[];
  readonly applications: readonly AdminApplication[];
  readonly adminBlocks: readonly AdminBlock[];
  readonly onLogout: () => void;
};

export function AdminSummary({ admin, users, applications, adminBlocks, onLogout }: AdminSummaryProps) {
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const activeApplications = applications.filter((application) => application.sessionStatus !== "cancelled");
  const activeBlocks = adminBlocks.filter((block) => block.isActive);
  return (
    <section className="ui-card min-w-0 rounded-2xl p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-extrabold text-[#5F9820]">관리자 로그인 완료</p>
          <h2 className="mt-1 text-xl font-extrabold text-[#172014]">{admin.name}</h2>
          <p className="mt-1 text-sm text-[#5B6856]">권한 {getAdminRoleLabel(admin.role)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setIsHelpOpen(true)}
            className="ui-button ui-button-ghost"
          >
            <HelpCircle size={16} strokeWidth={2.3} />
            도움말
          </button>
          <button
            type="button"
            onClick={onLogout}
            className="ui-button ui-button-ghost"
          >
            <LogOut size={16} strokeWidth={2.3} />
            관리자 로그아웃
          </button>
        </div>
      </div>
      {isHelpOpen && (
        <HelpModal
          title="관리자 운영 가이드 요약"
          description="화면 구성과 참가자·공간·차단 일정 관리 방법을 섹션별로 요약합니다."
          sections={ADMIN_HELP_SECTIONS}
          onClose={() => setIsHelpOpen(false)}
        />
      )}
      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryMetric label="전체 신청" value={`${activeApplications.length}건`} />
        <SummaryMetric label="활성 차단 일정" value={`${activeBlocks.length}건`} />
        <SummaryMetric label="참가자" value={`${users.length}명`} />
        <SummaryMetric label="로그인 상태" value={admin.phone.trim().length > 0 ? "유지됨" : "확인 필요"} />
      </div>
      <p className="mt-3 rounded-lg bg-[#F7FBF4] px-3 py-2 text-xs font-semibold text-[#5B6856]">
        신청 내역 초기화는 관리자 화면에서 제공하지 않습니다. 운영 초기화가 필요하면 담당자 확인 후 별도 절차로 진행하세요.
      </p>
    </section>
  );
}

function SummaryMetric(props: { readonly label: string; readonly value: string }) {
  return (
    <div className="rounded-lg bg-[#F7FBF4] px-3 py-2">
      <p className="text-xs font-bold text-[#819078]">{props.label}</p>
      <p className="mt-1 text-lg font-black text-[#172014]">{props.value}</p>
    </div>
  );
}
