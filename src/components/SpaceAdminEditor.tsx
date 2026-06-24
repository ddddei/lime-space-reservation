import { SpaceCreateForm } from "./SpaceCreateForm";
import type { Space } from "../types/reservation";

type SpaceAdminEditorProps = {
  readonly spaces: readonly Space[];
  readonly onUpdateSpace: (space: Space) => void;
  readonly onAddSpace: (space: Space) => void;
};

export function SpaceAdminEditor({ spaces, onUpdateSpace, onAddSpace }: SpaceAdminEditorProps) {
  const nextSortOrder = Math.max(0, ...spaces.map((space) => space.sortOrder)) + 1;
  return (
    <section className="rounded-lg border border-[#DDE8D6] bg-white p-4">
      <h2 className="text-lg font-bold text-[#172014]">공간 정보 관리</h2>
      <div className="mt-3">
        <SpaceCreateForm nextSortOrder={nextSortOrder} onAddSpace={onAddSpace} />
      </div>
      <div className="mt-3 grid gap-3">
        {spaces.map((space) => (
          <article key={space.id} className="grid gap-3 rounded-lg border border-[#EBF2E7] p-3 md:grid-cols-[1fr_160px_120px]">
            <label className="grid gap-1 text-sm font-bold text-[#172014]">
              공간명
              <input
                value={space.name}
                onChange={(event) => onUpdateSpace({ ...space, name: event.target.value })}
                className="rounded-lg border border-[#DDE8D6] px-3 py-2 font-medium"
              />
            </label>
            <label className="grid gap-1 text-sm font-bold text-[#172014]">
              상위 공간명
              <input
                value={space.parentSpaceName ?? ""}
                onChange={(event) => onUpdateSpace({ ...space, parentSpaceName: event.target.value || undefined })}
                className="rounded-lg border border-[#DDE8D6] px-3 py-2 font-medium"
              />
            </label>
            <label className="grid gap-1 text-sm font-bold text-[#172014]">
              정원
              <input
                type="number"
                value={space.capacity}
                onChange={(event) => updateCapacity(space, event.target.value, onUpdateSpace)}
                className="rounded-lg border border-[#DDE8D6] px-3 py-2 font-medium"
              />
            </label>
            <div className="flex flex-wrap items-end gap-3 text-sm font-bold text-[#172014] md:col-span-3">
              <Checkbox label="활성" checked={space.isActive} onChange={(checked) => onUpdateSpace({ ...space, isActive: checked })} />
              <Checkbox label="사용자 노출" checked={space.isPublicVisible} onChange={(checked) => onUpdateSpace({ ...space, isPublicVisible: checked })} />
              <Checkbox label="관리자 허용 필요" checked={space.requiresAdminUnlock === true} onChange={(checked) => onUpdateSpace({ ...space, requiresAdminUnlock: checked })} />
              <button
                type="button"
                onClick={() => onUpdateSpace({ ...space, isActive: false })}
                className="rounded-lg border border-[#F1C5C2] px-3 py-2 text-xs font-extrabold text-[#C9443E]"
              >
                비활성 처리
              </button>
            </div>
            <label className="grid gap-1 text-sm font-bold text-[#172014] md:col-span-3">
              설명
              <textarea
                value={space.description}
                onChange={(event) => onUpdateSpace({ ...space, description: event.target.value })}
                rows={2}
                className="rounded-lg border border-[#DDE8D6] px-3 py-2 font-medium"
              />
            </label>
            <label className="grid gap-1 text-sm font-bold text-[#172014] md:col-span-3">
              관리자 메모
              <textarea
                value={space.adminMemo ?? ""}
                onChange={(event) => onUpdateSpace({ ...space, adminMemo: event.target.value || undefined })}
                rows={2}
                className="rounded-lg border border-[#DDE8D6] px-3 py-2 font-medium"
              />
            </label>
          </article>
        ))}
      </div>
    </section>
  );
}

function Checkbox(props: { readonly label: string; readonly checked: boolean; readonly onChange: (value: boolean) => void }) {
  return (
    <label className="flex items-center gap-2">
      <input type="checkbox" checked={props.checked} onChange={(event) => props.onChange(event.target.checked)} className="h-4 w-4 accent-[#77B82A]" />
      {props.label}
    </label>
  );
}

function updateCapacity(space: Space, value: string, onUpdateSpace: (space: Space) => void): void {
  const capacity = Number(value);
  if (Number.isFinite(capacity) && capacity > 0) {
    onUpdateSpace({ ...space, capacity });
  }
}
