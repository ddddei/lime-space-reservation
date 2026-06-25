import { useState } from "react";
import type { AdminBlock, Space } from "../types/reservation";

type AdminBlockFormProps = {
  readonly spaces: readonly Space[];
  readonly adminBlocks: readonly AdminBlock[];
  readonly readOnly: boolean;
  readonly onAddBlock: (block: AdminBlock) => void;
};

const defaultVisibleCount = 6;

export function AdminBlockForm({ spaces, adminBlocks, readOnly, onAddBlock }: AdminBlockFormProps) {
  const firstSpace = spaces[0];
  const [showAllBlocks, setShowAllBlocks] = useState(false);
  const [spaceId, setSpaceId] = useState(firstSpace?.id ?? "");
  const [date, setDate] = useState("2026-06-30");
  const [startTime, setStartTime] = useState("16:00");
  const [endTime, setEndTime] = useState("18:00");
  const [reason, setReason] = useState("공간 정비");
  const sortedBlocks = [...adminBlocks].sort((first, second) =>
    `${second.date} ${second.startTime}`.localeCompare(`${first.date} ${first.startTime}`),
  );
  const visibleBlocks = showAllBlocks ? sortedBlocks : sortedBlocks.slice(0, defaultVisibleCount);

  return (
    <section className="min-w-0 rounded-lg border border-[#DDE8D6] bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-[#172014]">관리자 차단 일정</h2>
          <p className="mt-1 text-xs font-semibold text-[#819078]">
            전체 {adminBlocks.length}건 중 {visibleBlocks.length}건 표시
          </p>
        </div>
        {adminBlocks.length > defaultVisibleCount && (
          <button
            type="button"
            onClick={() => setShowAllBlocks((current) => !current)}
            className="rounded-lg border border-[#DDE8D6] px-3 py-2 text-xs font-extrabold text-[#5B6856] hover:border-[#77B82A]"
          >
            {showAllBlocks ? "접기" : "더보기"}
          </button>
        )}
      </div>
      {readOnly ? (
        <p className="mt-3 rounded-lg border border-[#DDE8D6] bg-[#F7FBF4] px-3 py-2 text-xs font-semibold text-[#5B6856]">
          Supabase 차단 일정은 읽기 전용입니다. 저장/차단 해제는 다음 작업에서 처리합니다.
        </p>
      ) : (
        <>
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
        </>
      )}
      <div className="mt-3 grid gap-2">
        {visibleBlocks.map((block) => {
          const space = spaces.find((item) => item.id === block.spaceId);
          return (
            <div key={block.id} className="rounded-lg border border-[#F4E1B8] bg-[#FFF6E3] px-3 py-2 text-sm text-[#B76E00]">
              <span className="font-extrabold">{block.spaceName ?? space?.name ?? "공간 없음"}</span>
              <span className="mx-2 text-[#D79A31]">·</span>
              <span>{block.date}</span>
              <span className="mx-2 text-[#D79A31]">·</span>
              <span>{block.startTime}-{block.endTime}</span>
              <span className="mx-2 text-[#D79A31]">·</span>
              <span>{block.reason}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
