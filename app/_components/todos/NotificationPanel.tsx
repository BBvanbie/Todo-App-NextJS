import { formatDate, type AppNotification } from "./model";

type NotificationPanelProps = {
  notifications: AppNotification[];
  onMarkRead: (id: number) => void;
  onMarkAllRead: () => void;
};

export function NotificationPanel({ notifications, onMarkRead, onMarkAllRead }: NotificationPanelProps) {
  return (
    <div className="mt-5 rounded-2xl border border-[#cedded] bg-white/95 p-4 shadow-[0_20px_45px_-35px_#12355d]">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[#17355f]">通知一覧</h3>
        <button
          type="button"
          onClick={onMarkAllRead}
          className="rounded-lg border border-[#c9d7e7] bg-white px-2.5 py-1.5 text-xs text-[#204975]"
        >
          すべて既読
        </button>
      </div>

      {notifications.length === 0 ? (
        <p className="text-xs text-muted">通知はありません。</p>
      ) : (
        <ul className="space-y-2">
          {notifications.map((notification) => (
            <li
              key={notification.id}
              className={`rounded-xl border px-3 py-2.5 transition ${
                notification.readAt ? "border-[#dde7f3] bg-[#f8fbff]" : "border-[#ffd2d9] bg-[#fff4f6]"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm text-[#17355f]">{notification.message}</p>
                  <p className="mt-1 text-xs text-[#5c7392]">
                    作成: {formatDate(notification.createdAt)} / 期限: {formatDate(notification.todo.dueAt)}
                  </p>
                </div>
                {!notification.readAt && (
                  <button
                    type="button"
                    onClick={() => onMarkRead(notification.id)}
                    className="rounded-lg border border-[#c9d7e7] bg-white px-2.5 py-1 text-xs text-[#204975]"
                  >
                    既読
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
