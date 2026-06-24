import type { Space } from "../types/reservation";

type SpaceAdminEditorProps = {
  readonly spaces: readonly Space[];
  readonly onUpdateSpace: (space: Space) => void;
};

export function SpaceAdminEditor({ spaces, onUpdateSpace }: SpaceAdminEditorProps) {
  return (
    <section className="rounded-lg border border-[#DDE8D6] bg-white p-4">
      <h2 className="text-lg font-bold text-[#172014]">공간 정보 관리</h2>
      <div className="mt-3 grid gap-3">
        {spaces.map((space) => (
          <article key={space.id} className="grid gap-3 rounded-lg border border-[#EBF2E7] p-3 md:grid-cols-[1fr_120px_120px]">
            <label className="grid gap-1 text-sm font-bold text-[#172014]">
              공간명
              <input
                value={space.name}
                onChange={(event) => onUpdateSpace({ ...space, name: event.target.value })}
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
            <label className="flex items-end gap-2 text-sm font-bold text-[#172014]">
              <input
                type="checkbox"
                checked={space.isActive}
                onChange={() => onUpdateSpace({ ...space, isActive: !space.isActive })}
                className="h-4 w-4 accent-[#77B82A]"
              />
              활성
            </label>
            <label className="grid gap-1 text-sm font-bold text-[#172014] md:col-span-3">
              설명
              <textarea
                value={space.description}
                onChange={(event) => onUpdateSpace({ ...space, description: event.target.value })}
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

function updateCapacity(space: Space, value: string, onUpdateSpace: (space: Space) => void): void {
  const capacity = Number(value);
  if (Number.isFinite(capacity) && capacity > 0) {
    onUpdateSpace({ ...space, capacity });
  }
}
