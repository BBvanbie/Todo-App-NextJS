import * as React from "react";
import type { Todo } from "./model";

type TaskCalendarPanelProps = {
  todos: Todo[];
  compact?: boolean;
  disableScroll?: boolean;
};

type DateParts = { year: number; month: number; day: number };
type DayCell = { date: Date; key: number; inMonth: boolean; isToday: boolean };
type Segment = { todo: Todo; colStart: number; colEnd: number; lane: number; overdue: boolean };

const DAY_NAMES = ["日", "月", "火", "水", "木", "金", "土"] as const;
const MAX_LANES_NO_SCROLL = 3;

function toTokyoParts(value: string | Date): DateParts {
  const date = typeof value === "string" ? new Date(value) : value;
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  return {
    year: Number(parts.find((p) => p.type === "year")?.value ?? "1970"),
    month: Number(parts.find((p) => p.type === "month")?.value ?? "1"),
    day: Number(parts.find((p) => p.type === "day")?.value ?? "1"),
  };
}

function keyFromParts(parts: DateParts) {
  return parts.year * 10000 + parts.month * 100 + parts.day;
}

function partsFromDate(date: Date): DateParts {
  return { year: date.getFullYear(), month: date.getMonth() + 1, day: date.getDate() };
}

function monthLabel(year: number, month: number) {
  return `${year}年${month}月`;
}

function shiftMonth(year: number, month: number, offset: number) {
  const shifted = new Date(year, month - 1 + offset, 1);
  return { year: shifted.getFullYear(), month: shifted.getMonth() + 1 };
}

function getMonthCells(year: number, month: number): DayCell[] {
  const firstOfMonth = new Date(year, month - 1, 1, 12, 0, 0, 0);
  const start = new Date(firstOfMonth);
  start.setDate(start.getDate() - start.getDay());

  const cells: DayCell[] = [];
  const todayKey = keyFromParts(toTokyoParts(new Date()));
  for (let i = 0; i < 42; i += 1) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const p = partsFromDate(d);
    const key = keyFromParts(p);
    cells.push({
      date: d,
      key,
      inMonth: p.month === month,
      isToday: key === todayKey,
    });
  }
  return cells;
}

function getBarTone(todo: Todo, overdue: boolean) {
  if (todo.completed) return "from-[#88dfbc] to-[#34b27b]";
  if (overdue) return "from-[#ff9eb1] to-[#e84467]";
  if (todo.priority === "HIGH") return "from-[#ffd18a] to-[#ff9d2f]";
  if (todo.priority === "MEDIUM") return "from-[#8fc8ff] to-[#3f82d8]";
  return "from-[#c5cfff] to-[#7b8eeb]";
}

function sliceWeekSegments(week: DayCell[], todos: Todo[]): Segment[] {
  const weekStartKey = week[0].key;
  const weekEndKey = week[6].key;
  const todayKey = keyFromParts(toTokyoParts(new Date()));

  const raw: Array<Omit<Segment, "lane">> = [];
  for (const todo of todos) {
    const created = keyFromParts(toTokyoParts(todo.createdAt));
    const due = keyFromParts(toTokyoParts(todo.dueAt));
    if (due < weekStartKey || created > weekEndKey) continue;

    let colStart = 0;
    let colEnd = 6;
    for (let i = 0; i < 7; i += 1) {
      if (week[i].key >= created) {
        colStart = i;
        break;
      }
    }
    for (let i = 6; i >= 0; i -= 1) {
      if (week[i].key <= due) {
        colEnd = i;
        break;
      }
    }
    if (colEnd < colStart) continue;

    raw.push({
      todo,
      colStart,
      colEnd,
      overdue: !todo.completed && due < todayKey,
    });
  }

  raw.sort((a, b) => {
    if (a.colStart !== b.colStart) return a.colStart - b.colStart;
    return b.colEnd - a.colEnd;
  });

  const laneEnds: number[] = [];
  return raw.map((seg) => {
    let lane = laneEnds.findIndex((endCol) => seg.colStart > endCol);
    if (lane < 0) {
      lane = laneEnds.length;
      laneEnds.push(seg.colEnd);
    } else {
      laneEnds[lane] = seg.colEnd;
    }
    return { ...seg, lane };
  });
}

export function TaskCalendarPanel({ todos, compact = false, disableScroll = false }: TaskCalendarPanelProps) {
  const now = toTokyoParts(new Date());
  const [cursor, setCursor] = React.useState(() => ({ year: now.year, month: now.month }));
  const cells = React.useMemo(() => getMonthCells(cursor.year, cursor.month), [cursor.month, cursor.year]);
  const weeks = React.useMemo(() => {
    const rows: DayCell[][] = [];
    for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
    return rows;
  }, [cells]);
  const weekSegments = React.useMemo(() => weeks.map((w) => sliceWeekSegments(w, todos)), [weeks, todos]);

  return (
    <section className="glass-card h-full rounded-2xl border border-[#d1e1f1] bg-white/88 p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.16em] text-[#577ca6]">Schedule Calendar</p>
          <h3 className="text-base font-semibold text-[#17355f]">期間カレンダー</h3>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setCursor((prev) => shiftMonth(prev.year, prev.month, -1))}
            className="rounded-md border border-[#cad9ea] bg-white px-2 py-1 text-xs text-[#2f5889]"
            aria-label="前月"
          >
            ←
          </button>
          <span className="min-w-[96px] text-center text-xs font-semibold text-[#355b86]">
            {monthLabel(cursor.year, cursor.month)}
          </span>
          <button
            type="button"
            onClick={() => setCursor((prev) => shiftMonth(prev.year, prev.month, 1))}
            className="rounded-md border border-[#cad9ea] bg-white px-2 py-1 text-xs text-[#2f5889]"
            aria-label="翌月"
          >
            →
          </button>
        </div>
      </div>

      <div className="mb-3 flex flex-wrap gap-1.5 text-[11px]">
        <span className="rounded-full bg-[#e8f3ff] px-2 py-0.5 text-[#2a5f98]">進行中/通常</span>
        <span className="rounded-full bg-[#fff3e1] px-2 py-0.5 text-[#9a5d0f]">高優先</span>
        <span className="rounded-full bg-[#ffe9ee] px-2 py-0.5 text-[#b11f45]">期限超過</span>
        <span className="rounded-full bg-[#e8f8ef] px-2 py-0.5 text-[#1f7b52]">完了</span>
      </div>

      <div className={`rounded-xl border border-[#dbe7f4] bg-[#fbfdff] ${compact ? "h-[calc(100%-6.2rem)]" : "h-[calc(100%-6rem)]"}`}>
        <div className="grid h-full grid-rows-[auto_1fr]">
          <div className="grid grid-cols-7 border-b border-[#e6eef8] bg-[#f4f8fd]">
            {DAY_NAMES.map((label, idx) => (
              <div
                key={label}
                className={`px-2 py-1.5 text-center text-[11px] font-semibold ${
                  idx === 0 ? "text-[#ba3755]" : idx === 6 ? "text-[#3d5e88]" : "text-[#4b6f95]"
                }`}
              >
                {label}
              </div>
            ))}
          </div>

          <div className={disableScroll ? "overflow-hidden" : compact ? "overflow-y-auto" : "overflow-y-auto"}>
            {weeks.map((week, weekIndex) => {
              const segments = weekSegments[weekIndex];
              const laneCount = Math.max(1, ...segments.map((s) => s.lane + 1));
              const visibleLaneCount = disableScroll ? Math.min(laneCount, MAX_LANES_NO_SCROLL) : laneCount;
              const visible = disableScroll
                ? segments.filter((s) => s.lane < MAX_LANES_NO_SCROLL)
                : segments;
              const hiddenCount = disableScroll
                ? segments.filter((s) => s.lane >= MAX_LANES_NO_SCROLL).length
                : 0;

              return (
                <div key={week[0].key} className="border-b border-[#e9f0f8] last:border-b-0">
                  <div className="grid grid-cols-7">
                    {week.map((cell, idx) => (
                      <div
                        key={cell.key}
                        className={`min-h-10 border-r border-[#edf3fa] px-2 py-1 last:border-r-0 ${
                          cell.inMonth ? "bg-white/65" : "bg-[#f7f9fd]"
                        }`}
                      >
                        <span
                          className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-semibold ${
                            cell.isToday
                              ? "bg-[#2f7fd6] text-white"
                              : cell.inMonth
                                ? idx === 0
                                  ? "text-[#c24663]"
                                  : "text-[#4d7096]"
                                : "text-[#9eb2c8]"
                          }`}
                        >
                          {cell.date.getDate()}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="relative px-1 pb-1">
                    <div style={{ height: visibleLaneCount * 16 + 2 }} />
                    {visible.map((seg) => (
                      <div
                        key={`${seg.todo.id}-${seg.lane}-${seg.colStart}-${seg.colEnd}`}
                        className={`absolute rounded-full bg-gradient-to-r px-2 text-[10px] font-semibold text-white shadow-[0_8px_16px_-12px_#1e3554] ${getBarTone(seg.todo, seg.overdue)}`}
                        style={{
                          left: `calc(${(100 / 7) * seg.colStart}% + 4px)`,
                          width: `calc(${(100 / 7) * (seg.colEnd - seg.colStart + 1)}% - 8px)`,
                          top: seg.lane * 16 + 2,
                          height: 14,
                          lineHeight: "14px",
                        }}
                        title={`${seg.todo.title} (${new Intl.DateTimeFormat("ja-JP").format(new Date(seg.todo.createdAt))} - ${new Intl.DateTimeFormat("ja-JP").format(new Date(seg.todo.dueAt))})`}
                      >
                        <span className="block truncate">{seg.todo.title}</span>
                      </div>
                    ))}
                    {hiddenCount > 0 && (
                      <span className="absolute right-2 top-0 rounded-full bg-[#eef4fb] px-1.5 py-0.5 text-[10px] text-[#52739a]">
                        +{hiddenCount}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

