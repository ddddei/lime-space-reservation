import { useState } from "react";
import type { AdminBlock, Space } from "../types/reservation";

type AdminBlockFormProps = {
  readonly spaces: readonly Space[];
  readonly adminBlocks: readonly AdminBlock[];
  readonly onAddBlock: (block: AdminBlock) => void;
};

export function AdminBlockForm({ spaces, adminBlocks, onAddBlock }: AdminBlockFormProps) {
  const firstSpace = spaces[0];
  const [spaceId, setSpaceId] = useState(firstSpace?.id ?? "");
  const [date, setDate] = useState("2026-06-30");
  const [startTime, setStartTime] = useState("16:00");
  const [endTime, setEndTime] = useState("18:00");
  const [reason, setReason] = useState("공간 정비");
  return (
    <section className="rounded-lg border border-[#DDE8D6] bg-white p-4">
      <h2 className="text-lg font-bold text-[#172014]">관리자 차단 일정 등록</h2>
      <div className="mt-3 grid gap-3 md:grid-cols-5">
        <select value={spaceId} onChange={(event) => setSpaceId(event.target.value)} className="rounded-lg border border-[#DDE8D6] px-3 py-2">
          {spaces.map((space) => (
            <option key={space.id} value={space.id}>{space.name}</option>
          ))}
        </select>
        <input type="date" value={date} onChange={(event) => setDate(event.target.value)} className="rounded-lg border border-[#DDE8D6] px-3 py-2" />
        <input type="time" value={startTime} onChange={(event) => setStartTime(event.target.value)} className="rounded-lg border border-[#DDE8D6] px-3 py-2" />
        <input type="time" value={endTime} onChange={(event) => setEndTime(event.target.value)} className="rounded-lg border border-[#DDE8D6] px-3 py-2" />
        <button
          type="button"
          onClick={() => onAddBlock({
            id: `block-${Date.now()}`,
            spaceId,
            date,
            startTime,
            endTime,
            reason,
            createdBy: "관리자",
            isActive: true,
            createdAt: new Date().toISOString(),
          })}
          className="rounded-lg bg-[#172014] px-3 py-2 text-sm font-bold text-white hover:bg-[#2F3B2A]"
        >
          차단 등록
        </button>
      </div>
      <label className="mt-3 grid gap-1 text-sm font-bold text-[#172014]">
        차단 사유
        <input value={reason} onChange={(event) => setReason(event.target.value)} className="rounded-lg border border-[#DDE8D6] px-3 py-2 font-medium" />
      </label>
      <div className="mt-3 grid gap-2">
        {adminBlocks.map((block) => {
          const space = spaces.find((item) => item.id === block.spaceId);
          return (
            <div key={block.id} className="rounded-lg bg-[#FFF6E3] p-2 text-sm text-[#B76E00]">
              {space?.name ?? "공간 없음"} · {block.date} {block.startTime}-{block.endTime} · {block.reason}
            </div>
          );
        })}
      </div>
    </section>
  );
}
