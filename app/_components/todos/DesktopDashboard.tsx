import Link from "next/link";
import { useState } from "react";
import {
  DUE_FILTER_LABEL,
  PRIORITY_LABEL,
  STATUS_LABEL,
  categoryLabel,
  formatDate,
  getCardTone,
  getDueStatus,
  type AppNotification,
  type DueFilter,
  type SelectableAssignee,
  type SelectableCategory,
  type SelectablePriority,
  type SelectableStatus,
  type Todo,
} from "./model";
import { NotificationPanel } from "./NotificationPanel";
import { TaskCalendarPanel } from "./TaskCalendarPanel";

type DesktopDashboardProps = {
  loading: boolean;
  error: string | null;
  isAdmin: boolean;
  notifications: AppNotification[];
  notificationOpen: boolean;
  unreadCount: number;
  onToggleNotification: () => void;
  onMarkRead: (id: number) => void;
  onMarkAllRead: () => void;
  onLogout: () => void;
  userDisplayName: string;
  dashboardStats: { total: number; pending: number; completed: number; dueSoon: number; overdue: number };
  search: string;
  filterCategory: SelectableCategory;
  filterPriority: SelectablePriority;
  filterAssignee: SelectableAssignee;
  filterStatus: SelectableStatus;
  filterDue: DueFilter;
  categoryOptions: string[];
  categoryLabelMap: Record<string, string>;
  onSearchChange: (value: string) => void;
  onFilterCategoryChange: (value: SelectableCategory) => void;
  onFilterPriorityChange: (value: SelectablePriority) => void;
  onFilterAssigneeChange: (value: SelectableAssignee) => void;
  onFilterStatusChange: (value: SelectableStatus) => void;
  onFilterDueChange: (value: DueFilter) => void;
  pendingTodos: Todo[];
  completedTodos: Todo[];
  calendarTodos: Todo[];
  selectedIds: Set<number>;
  onToggleSelect: (id: number) => void;
  onToggleSelectPendingAll: (checked: boolean) => void;
  onToggleSelectCompletedAll: (checked: boolean) => void;
  onToggle: (todo: Todo) => void;
  onEdit: (todo: Todo) => void;
  onOpenEditHistory: (todo: Todo) => void;
  onDelete: (todo: Todo) => void;
  selectedCount: number;
  bulkPending: boolean;
  canBulkComplete: boolean;
  canBulkReopen: boolean;
  onBulkComplete: () => void;
  onBulkReopen: () => void;
  onBulkDelete: () => void;
  onClearSelected: () => void;
  sidebarCollapsed: boolean;
  onToggleSidebar: () => void;
};

const T = {
  menu: "\u30e1\u30cb\u30e5\u30fc",
  dashboard: "\u30c0\u30c3\u30b7\u30e5\u30dc\u30fc\u30c9",
  categories: "\u30ab\u30c6\u30b4\u30ea\u7ba1\u7406",
  calendar: "\u30ab\u30ec\u30f3\u30c0\u30fc",
  history: "\u5c65\u6b74",
  admin: "\u7ba1\u7406\u8005",
  logout: "\u30ed\u30b0\u30a2\u30a6\u30c8",
  title: "Todo\u30b3\u30f3\u30c8\u30ed\u30fc\u30eb\u30bb\u30f3\u30bf\u30fc",
  notify: "\u901a\u77e5",
  total: "\u7dcf\u30bf\u30b9\u30af",
  pending: "\u672a\u5b8c\u4e86",
  done: "\u5b8c\u4e86",
  dueSoon: "7\u65e5\u4ee5\u5185",
  overdue: "\u671f\u9650\u5207\u308c",
  filters: "\u691c\u7d22\u30fb\u7d5e\u308a\u8fbc\u307f",
  close: "\u9589\u3058\u308b",
  open: "\u958b\u304f",
  search: "\u30bf\u30a4\u30c8\u30eb\u30fb\u30e1\u30e2\u691c\u7d22",
  allCategory: "\u30ab\u30c6\u30b4\u30ea: \u3059\u3079\u3066",
  allPriority: "\u512a\u5148\u5ea6: \u3059\u3079\u3066",
  allAssignee: "\u62c5\u5f53: \u3059\u3079\u3066",
  self: "\u81ea\u5206",
  unset: "\u672a\u8a2d\u5b9a",
  allStatus: "\u72b6\u614b: \u3059\u3079\u3066",
  due: "\u671f\u9650",
  pendingTasks: "\u672a\u5b8c\u4e86\u30bf\u30b9\u30af",
  completedTasks: "\u5b8c\u4e86\u30bf\u30b9\u30af",
  allSelect: "\u5168\u9078\u629e",
  loading: "\u8aad\u307f\u8fbc\u307f\u4e2d...",
  noData: "\u30c7\u30fc\u30bf\u306a\u3057",
  warning: "\u8b66\u544a",
  caution: "\u6ce8\u610f",
  priority: "\u512a\u5148\u5ea6",
  status: "\u72b6\u614b",
  assignee: "\u62c5\u5f53",
  complete: "\u5b8c\u4e86",
  edit: "\u7de8\u96c6",
  reopen: "\u623b\u3059",
  del: "\u524a\u9664",
  doneAt: "\u5b8c\u4e86\u65e5",
  selected: "\u4ef6\u3092\u9078\u629e\u4e2d",
  clear: "\u89e3\u9664",
  create: "\u65b0\u898f\u4f5c\u6210",
  jpNameSuffix: "\u3055\u3093",
};

const KPI_ACCENT = [
  "border-t-[#1992ff]",
  "border-t-[#00a67d]",
  "border-t-[#6c6eff]",
  "border-t-[#ff9f43]",
  "border-t-[#ff5f78]",
] as const;

export function DesktopDashboard(props: DesktopDashboardProps) {
  const {
    loading,
    error,
    isAdmin,
    notifications,
    notificationOpen,
    unreadCount,
    onToggleNotification,
    onMarkRead,
    onMarkAllRead,
    onLogout,
    userDisplayName,
    dashboardStats,
    search,
    filterCategory,
    filterPriority,
    filterAssignee,
    filterStatus,
    filterDue,
    categoryOptions,
    categoryLabelMap,
    onSearchChange,
    onFilterCategoryChange,
    onFilterPriorityChange,
    onFilterAssigneeChange,
    onFilterStatusChange,
    onFilterDueChange,
    pendingTodos,
    completedTodos,
    calendarTodos,
    selectedIds,
    onToggleSelect,
    onToggleSelectPendingAll,
    onToggleSelectCompletedAll,
    onToggle,
    onEdit,
    onOpenEditHistory,
    onDelete,
    selectedCount,
    bulkPending,
    canBulkComplete,
    canBulkReopen,
    onBulkComplete,
    onBulkReopen,
    onBulkDelete,
    onClearSelected,
    sidebarCollapsed,
    onToggleSidebar,
  } = props;

  const [filterPinnedOpen, setFilterPinnedOpen] = useState(false);
  const [filterHoverOpen, setFilterHoverOpen] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const filterOpen = filterPinnedOpen || filterHoverOpen;
  const pendingAllSelected = pendingTodos.length > 0 && pendingTodos.every((todo) => selectedIds.has(todo.id));
  const completedAllSelected = completedTodos.length > 0 && completedTodos.every((todo) => selectedIds.has(todo.id));

  return (
    <div className="relative hidden md:flex md:min-h-screen md:overflow-y-auto xl:h-screen xl:overflow-hidden">
      <aside
        onMouseLeave={() => setMenuVisible(false)}
        className={`fixed inset-y-0 left-0 top-0 z-30 h-screen border-r border-[#173956] bg-[linear-gradient(180deg,#0a243f_0%,#0f3458_45%,#14466d_100%)] text-white transition-all duration-200 ${
          sidebarCollapsed ? "w-[82px] lg:w-[86px]" : "w-[208px] lg:w-[236px] xl:w-[268px]"
        } ${menuVisible ? "translate-x-0 opacity-100" : "-translate-x-full opacity-0 pointer-events-none"}`}
      >
        <div className="flex h-16 items-center justify-between border-b border-white/10 px-4">
          <button type="button" onClick={onToggleSidebar} className="rounded-lg border border-white/25 bg-white/5 px-2 py-1 text-xs">
            {sidebarCollapsed ? ">" : "<"}
          </button>
          {!sidebarCollapsed && <p className="text-sm font-semibold tracking-[0.1em] text-[#d5ebff]">{T.menu}</p>}
        </div>
        <div className="space-y-2 p-3">
          <Link href="/" className="block rounded-lg bg-white/12 px-3 py-2 text-sm text-[#eaf5ff]">{T.dashboard}</Link>
          <Link href="/categories" className="block rounded-lg border border-white/20 px-3 py-2 text-sm text-[#d6e8fa]">{T.categories}</Link>
          <Link href="/calendar" className="block rounded-lg border border-white/20 px-3 py-2 text-sm text-[#d6e8fa]">{T.calendar}</Link>
          <Link href="/history" className="block rounded-lg border border-white/20 px-3 py-2 text-sm text-[#d6e8fa]">{T.history}</Link>
          {isAdmin && <Link href="/admin" className="block rounded-lg border border-white/20 px-3 py-2 text-sm text-[#d6e8fa]">{T.admin}</Link>}
        </div>
        <div className="absolute bottom-3 left-3 right-3">
          <button type="button" onClick={onLogout} className="w-full rounded-lg border border-white/20 bg-white/8 px-3 py-2 text-sm text-[#e7f3ff]">{T.logout}</button>
        </div>
      </aside>

      <div className="relative flex flex-1 flex-col bg-[linear-gradient(180deg,#edf6ff_0%,#f4f9ff_46%,#f8fbff_100%)] md:overflow-visible xl:overflow-hidden">
        <header className="z-20 shrink-0 border-b border-[#cfe0f2] bg-white/80 backdrop-blur">
          <div className="mx-auto flex h-16 w-full items-center justify-between px-6">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setMenuVisible((prev) => !prev)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#b8d1ea] bg-white text-[#1f4f86]"
                aria-label={T.menu}
              >
                ☰
              </button>
              <div>
                <p className="text-[11px] uppercase tracking-[0.22em] text-[#6081a3]">{T.dashboard}</p>
                <h1 className="text-lg font-semibold text-[#14355d]">{T.title}</h1>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-full border border-[#cfe0f2] bg-white px-3 py-1 text-xs font-semibold text-[#305983]">{userDisplayName}{T.jpNameSuffix}</span>
              <button type="button" onClick={onToggleNotification} className="relative rounded-xl border border-[#b8d1ea] bg-white px-3 py-1.5 text-sm text-[#1f4f86] shadow-[0_8px_22px_-16px_#1f4f86]">
                {T.notify}
                {unreadCount > 0 && <span className="absolute -right-2 -top-2 inline-flex min-w-5 items-center justify-center rounded-full bg-[#ff4b71] px-1.5 py-0.5 text-[10px] font-bold text-white">{unreadCount}</span>}
              </button>
            </div>
          </div>
        </header>

        <main className="mx-auto flex w-full flex-1 flex-col px-4 py-4 md:overflow-visible xl:h-full xl:overflow-hidden lg:px-6 lg:py-6">
          <section className="shrink-0">
            <div className="grid grid-cols-2 gap-2 md:grid-cols-5 lg:gap-3">
              {[
                { label: T.total, value: dashboardStats.total },
                { label: T.pending, value: dashboardStats.pending },
                { label: T.done, value: dashboardStats.completed },
                { label: T.dueSoon, value: dashboardStats.dueSoon },
                { label: T.overdue, value: dashboardStats.overdue },
              ].map((item, idx) => (
                <article key={item.label} className={`rounded-2xl border border-[#d5e3f3] border-t-[3px] bg-white px-3 py-2 md:px-4 md:py-2.5 shadow-[0_10px_24px_-22px_#163a66] ${KPI_ACCENT[idx]}`}>
                  <p className="text-[11px] text-[#5f7d9d]">{item.label}</p>
                  <p className="mt-0.5 text-lg font-bold leading-tight text-[#17355f] md:text-xl lg:text-2xl xl:text-[26px]">{item.value}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="mt-3 shrink-0 rounded-2xl border border-[#d5e3f3] bg-white p-3 shadow-[0_16px_36px_-30px_#17355f] lg:mt-4 lg:p-4" onMouseEnter={() => setFilterHoverOpen(true)} onMouseLeave={() => setFilterHoverOpen(false)}>
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold tracking-[0.12em] text-[#4d6c90]">{T.filters}</p>
              <button type="button" onClick={() => setFilterPinnedOpen((prev) => !prev)} className="rounded-lg border border-[#c9d9ea] bg-[#f7fbff] px-3 py-1 text-xs font-semibold text-[#2f5682]" aria-expanded={filterOpen} aria-controls="desktop-search-filter-panel">
                {filterOpen ? T.close : T.open}
              </button>
            </div>
            <div id="desktop-search-filter-panel" className={`grid overflow-hidden transition-all duration-300 ${filterOpen ? "mt-3 max-h-[260px] opacity-100" : "mt-0 max-h-0 opacity-0"}`}>
              <div className="grid grid-cols-2 gap-2 lg:grid-cols-3 xl:grid-cols-6">
                <input value={search} onChange={(event) => onSearchChange(event.target.value)} placeholder={T.search} className="rounded-xl border border-[#cbd9ea] bg-[#fbfdff] px-3 py-2 text-sm" />
                <select value={filterCategory} onChange={(event) => onFilterCategoryChange(event.target.value as SelectableCategory)} className="rounded-xl border border-[#cbd9ea] bg-[#fbfdff] px-3 py-2 text-sm"><option value="ALL">{T.allCategory}</option>{categoryOptions.map((v) => <option key={v} value={v}>{categoryLabel(v, categoryLabelMap)}</option>)}</select>
                <select value={filterPriority} onChange={(event) => onFilterPriorityChange(event.target.value as SelectablePriority)} className="rounded-xl border border-[#cbd9ea] bg-[#fbfdff] px-3 py-2 text-sm"><option value="ALL">{T.allPriority}</option>{Object.entries(PRIORITY_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
                <select value={filterAssignee} onChange={(event) => onFilterAssigneeChange(event.target.value as SelectableAssignee)} className="rounded-xl border border-[#cbd9ea] bg-[#fbfdff] px-3 py-2 text-sm"><option value="ALL">{T.allAssignee}</option><option value="SELF">{T.self}</option><option value="UNASSIGNED">{T.unset}</option></select>
                <select value={filterStatus} onChange={(event) => onFilterStatusChange(event.target.value as SelectableStatus)} className="rounded-xl border border-[#cbd9ea] bg-[#fbfdff] px-3 py-2 text-sm"><option value="ALL">{T.allStatus}</option>{Object.entries(STATUS_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
                <select value={filterDue} onChange={(event) => onFilterDueChange(event.target.value as DueFilter)} className="rounded-xl border border-[#cbd9ea] bg-[#fbfdff] px-3 py-2 text-sm">{Object.entries(DUE_FILTER_LABEL).map(([v, l]) => <option key={v} value={v}>{T.due}: {l}</option>)}</select>
              </div>
            </div>
          </section>

          <section className="mt-3 grid grid-cols-1 gap-3 lg:mt-4 lg:gap-4 xl:min-h-0 xl:flex-1 xl:grid-cols-2">
            <div className="col-span-1 grid min-h-0 gap-3 lg:grid-cols-2 lg:gap-4 xl:grid-cols-1 xl:grid-rows-2">
              <div className="flex min-h-0 flex-col rounded-2xl border border-[#d5e3f3] bg-white shadow-[0_16px_36px_-30px_#17355f]">
                <div className="flex items-center justify-between border-b border-[#e8f0f8] px-4 py-3"><h2 className="text-sm font-semibold text-[#17355f]">{T.pendingTasks}</h2><label className="inline-flex items-center gap-1 text-xs text-[#47688f]"><input type="checkbox" checked={pendingAllSelected} onChange={(e) => onToggleSelectPendingAll(e.target.checked)} />{T.allSelect}</label></div>
                <div className="min-h-0 flex-1 overflow-auto">
                  {loading ? <p className="p-4 text-sm text-[#5d7898]">{T.loading}</p> : pendingTodos.length === 0 ? <p className="p-4 text-sm text-[#5d7898]">{T.noData}</p> : (
                    <>
                      <ul className="space-y-1.5 p-2 xl:hidden">
                        {pendingTodos.map((todo) => {
                          const dueStatus = getDueStatus(todo.dueAt);
                          return (
                            <li key={todo.id} className={`rounded-xl border p-2.5 ${getCardTone(dueStatus)}`}>
                              <div className="flex items-start gap-2">
                                <input type="checkbox" checked={selectedIds.has(todo.id)} onChange={() => onToggleSelect(todo.id)} className="mt-0.5" />
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-start justify-between gap-2">
                                    <p className="truncate text-[13px] font-semibold text-[#163960]">{todo.title}</p>
                                    {dueStatus === "danger" && <span className="rounded-full bg-[#ffe4e9] px-2 py-0.5 text-[10px] font-semibold text-[#9f2230]">{T.warning}</span>}
                                    {dueStatus === "warning" && <span className="rounded-full bg-[#fff2dd] px-2 py-0.5 text-[10px] font-semibold text-[#8d5a2d]">{T.caution}</span>}
                                  </div>
                                  <div className="mt-1 flex flex-wrap gap-1 text-[10px] text-[#3d5f87]">
                                    <span className="rounded-md bg-[#edf4fb] px-2 py-0.5">{T.due}: {formatDate(todo.dueAt)}</span>
                                    <span className="rounded-md bg-[#eaf4ff] px-2 py-0.5">{categoryLabel(todo.category, categoryLabelMap)}</span>
                                    <span className="rounded-md bg-[#f4ecff] px-2 py-0.5">{T.priority}: {PRIORITY_LABEL[todo.priority]}</span>
                                    <span className="rounded-md bg-[#eef7ef] px-2 py-0.5">{T.status}: {STATUS_LABEL[todo.status]}</span>
                                    <span className="rounded-md bg-[#fff5ea] px-2 py-0.5">{T.assignee}: {todo.assigneeUserId ? T.self : T.unset}</span>
                                  </div>
                                </div>
                              </div>
                              <div className="mt-1.5 flex flex-wrap justify-end gap-1">
                                <button type="button" onClick={() => onToggle(todo)} className="rounded-md border border-[#7fb2df] bg-[#edf7ff] px-2 py-1 text-xs text-[#1f4f86]">{T.complete}</button>
                                <button type="button" onClick={() => onEdit(todo)} className="rounded-md border border-[#c9d8ea] bg-white px-2 py-1 text-xs text-[#2d527d]">{T.edit}</button>
                                <button type="button" onClick={() => onOpenEditHistory(todo)} className="rounded-md border border-[#c9d8ea] bg-white px-2 py-1 text-xs text-[#2d527d]">{T.history}</button>
                              </div>
                            </li>
                          );
                        })}
                      </ul>

                      <table className="hidden w-full text-sm xl:table">
                        <thead className="bg-[#f6fbff] text-xs text-[#5d7898]"><tr><th className="px-2 py-2 text-left" /><th className="px-2 py-2 text-left">タイトル</th><th className="px-2 py-2 text-left">カテゴリ</th><th className="px-2 py-2 text-left">{T.due}</th><th className="px-2 py-2 text-left">{T.priority}</th><th className="px-2 py-2 text-left">{T.status}</th><th className="px-2 py-2 text-left">{T.assignee}</th><th className="px-2 py-2 text-left">操作</th></tr></thead>
                        <tbody>
                          {pendingTodos.map((todo) => {
                            const dueStatus = getDueStatus(todo.dueAt);
                            const rowTone = dueStatus === "danger" ? "bg-[#fff7f9] hover:bg-[#ffeef2]" : dueStatus === "warning" ? "bg-[#fffaf1] hover:bg-[#fff2db]" : "hover:bg-[#f9fcff]";
                            return (
                              <tr key={todo.id} className={`border-t border-[#eef4fb] ${rowTone}`}>
                                <td className="px-2 py-2"><input type="checkbox" checked={selectedIds.has(todo.id)} onChange={() => onToggleSelect(todo.id)} /></td>
                                <td className="px-2 py-2 font-medium text-[#163960]">{todo.title}</td>
                                <td className="px-2 py-2 text-[#3d5f87]">{categoryLabel(todo.category, categoryLabelMap)}</td>
                                <td className="px-2 py-2 text-[#3d5f87]">{formatDate(todo.dueAt)}</td>
                                <td className="px-2 py-2 text-[#4f3f7c]">{PRIORITY_LABEL[todo.priority]}</td>
                                <td className="px-2 py-2 text-[#2f6d3f]">{STATUS_LABEL[todo.status]}</td>
                                <td className="px-2 py-2 text-[#3d5f87]">{todo.assigneeUserId ? T.self : T.unset}</td>
                                <td className="px-2 py-2"><div className="flex gap-1"><button type="button" onClick={() => onToggle(todo)} className="rounded-md border border-[#7fb2df] bg-[#edf7ff] px-2 py-1 text-xs text-[#1f4f86]">{T.complete}</button><button type="button" onClick={() => onEdit(todo)} className="rounded-md border border-[#c9d8ea] bg-white px-2 py-1 text-xs text-[#2d527d]">{T.edit}</button><button type="button" onClick={() => onOpenEditHistory(todo)} className="rounded-md border border-[#c9d8ea] bg-white px-2 py-1 text-xs text-[#2d527d]">{T.history}</button></div></td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </>
                  )}
                </div>
              </div>

              <div className="flex min-h-0 flex-col rounded-2xl border border-[#d5e3f3] bg-white shadow-[0_16px_36px_-30px_#17355f]">
                <div className="flex items-center justify-between border-b border-[#e8f0f8] px-4 py-3"><h2 className="text-sm font-semibold text-[#1b4f40]">{T.completedTasks}</h2><label className="inline-flex items-center gap-1 text-xs text-[#3e6d5f]"><input type="checkbox" checked={completedAllSelected} onChange={(e) => onToggleSelectCompletedAll(e.target.checked)} />{T.allSelect}</label></div>
                <div className="min-h-0 flex-1 overflow-auto">
                  {completedTodos.length === 0 ? <p className="p-4 text-sm text-[#5d7898]">{T.noData}</p> : (
                    <>
                      <ul className="space-y-1.5 p-2 xl:hidden">
                        {completedTodos.map((todo) => (
                          <li key={todo.id} className="rounded-xl border border-[#dbe8f5] bg-[#fbfdff] p-2.5">
                            <div className="flex items-start gap-2"><input type="checkbox" checked={selectedIds.has(todo.id)} onChange={() => onToggleSelect(todo.id)} className="mt-0.5" />
                              <div className="min-w-0 flex-1"><p className="truncate text-[13px] font-semibold text-[#3f5f55] line-through">{todo.title}</p>
                                <div className="mt-1 flex flex-wrap gap-1 text-[10px] text-[#467564]"><span className="rounded-md bg-[#ecf7f2] px-2 py-0.5">{T.doneAt}: {formatDate(todo.completedAt ?? todo.updatedAt)}</span><span className="rounded-md bg-[#f4ecff] px-2 py-0.5">{T.priority}: {PRIORITY_LABEL[todo.priority]}</span><span className="rounded-md bg-[#eef7ef] px-2 py-0.5">{T.status}: {STATUS_LABEL[todo.status]}</span></div>
                              </div>
                            </div>
                            <div className="mt-1.5 flex flex-wrap justify-end gap-1"><button type="button" onClick={() => onToggle(todo)} className="rounded-md border border-[#7ac8ad] bg-[#eefbf5] px-2 py-1 text-xs text-[#1d7a5f]">{T.reopen}</button><button type="button" onClick={() => onDelete(todo)} className="rounded-md border border-[#efb7c0] bg-[#fff4f6] px-2 py-1 text-xs text-[#9e2740]">{T.del}</button></div>
                          </li>
                        ))}
                      </ul>

                      <table className="hidden w-full text-sm xl:table">
                        <thead className="bg-[#f6fbff] text-xs text-[#5d7898]"><tr><th className="px-2 py-2 text-left" /><th className="px-2 py-2 text-left">タイトル</th><th className="px-2 py-2 text-left">{T.doneAt}</th><th className="px-2 py-2 text-left">{T.priority}</th><th className="px-2 py-2 text-left">{T.status}</th><th className="px-2 py-2 text-left">操作</th></tr></thead>
                        <tbody>
                          {completedTodos.map((todo) => (
                            <tr key={todo.id} className="border-t border-[#eef4fb] hover:bg-[#f9fcff]">
                              <td className="px-2 py-2"><input type="checkbox" checked={selectedIds.has(todo.id)} onChange={() => onToggleSelect(todo.id)} /></td>
                              <td className="px-2 py-2 text-[#4a6a60] line-through">{todo.title}</td>
                              <td className="px-2 py-2 text-[#467564]">{formatDate(todo.completedAt ?? todo.updatedAt)}</td>
                              <td className="px-2 py-2 text-[#4f3f7c]">{PRIORITY_LABEL[todo.priority]}</td>
                              <td className="px-2 py-2 text-[#2f6d3f]">{STATUS_LABEL[todo.status]}</td>
                              <td className="px-2 py-2"><div className="flex gap-1"><button type="button" onClick={() => onToggle(todo)} className="rounded-md border border-[#7ac8ad] bg-[#eefbf5] px-2 py-1 text-xs text-[#1d7a5f]">{T.reopen}</button><button type="button" onClick={() => onDelete(todo)} className="rounded-md border border-[#efb7c0] bg-[#fff4f6] px-2 py-1 text-xs text-[#9e2740]">{T.del}</button></div></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="col-span-1 min-h-0 overflow-hidden"><TaskCalendarPanel todos={calendarTodos} compact disableScroll /></div>
          </section>

          {selectedCount > 0 && (
            <section className="mt-3 rounded-2xl border border-[#d5e3f3] bg-white p-3 shadow-[0_16px_36px_-30px_#17355f] lg:mt-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-[#17355f]">{selectedCount}{T.selected}</p>
                <div className="flex flex-wrap items-center gap-2">
                  <button type="button" disabled={bulkPending || !canBulkComplete} onClick={onBulkComplete} className="rounded-md border border-[#7fb2df] bg-[#edf7ff] px-3 py-1.5 text-xs text-[#1f4f86] disabled:opacity-50">{T.complete}</button>
                  <button type="button" disabled={bulkPending || !canBulkReopen} onClick={onBulkReopen} className="rounded-md border border-[#7ac8ad] bg-[#eefbf5] px-3 py-1.5 text-xs text-[#1e6c57] disabled:opacity-50">{T.reopen}</button>
                  <button type="button" disabled={bulkPending} onClick={onBulkDelete} className="rounded-md border border-[#efb7c0] bg-[#fff4f6] px-3 py-1.5 text-xs text-[#9e2740] disabled:opacity-50">{T.del}</button>
                  <button type="button" disabled={bulkPending} onClick={onClearSelected} className="rounded-md border border-[#c9d8ea] bg-white px-3 py-1.5 text-xs text-[#335a87] disabled:opacity-50">{T.clear}</button>
                </div>
              </div>
            </section>
          )}

          {error && <p className="mt-4 rounded-xl border border-[#ffd4dc] bg-[#fff4f6] px-4 py-3 text-sm text-[#a31f2b]">{error}</p>}
          <footer className="mt-4 shrink-0 border-t border-[#d8e6f4] pt-3 text-xs text-[#6683a2] lg:mt-6">Next-App-Todos ダッシュボード | Updated 2026</footer>
        </main>

        {notificationOpen && <div className="fixed right-6 top-20 z-40 w-[420px]"><NotificationPanel notifications={notifications} onMarkRead={onMarkRead} onMarkAllRead={onMarkAllRead} /></div>}
        <Link href="/tasks/new" className="fixed bottom-6 right-6 z-40 inline-flex items-center gap-2 rounded-full border border-[#9ac0e5] bg-[linear-gradient(135deg,#1d5da8_0%,#256ab8_100%)] px-4 py-2 text-sm font-semibold text-white shadow-[0_16px_36px_-24px_#12355d] transition-transform duration-200 hover:-translate-y-0.5" aria-label={T.create}><span className="text-lg leading-none">+</span>{T.create}</Link>
      </div>
    </div>
  );
}
