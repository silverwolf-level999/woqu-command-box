import React, { useEffect, useRef, useState } from "react";
import { Bell, CheckCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { notificationService, NotificationItem } from "../../../service/notificationService";

export const NotificationCenter: React.FC = () => {
  const { t } = useTranslation("components/snippets/view/all");
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const load = async () => {
    setLoading(true);
    try {
      const result = await notificationService.list();
      setItems(result.data);
      setUnread(result.unread);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load().catch(() => {});
    const interval = window.setInterval(() => load().catch(() => {}), 60000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, []);

  const handleOpen = async () => {
    const nextOpen = !open;
    setOpen(nextOpen);
    if (nextOpen) await load().catch(() => {});
  };

  const handleSelect = async (item: NotificationItem) => {
    if (!item.read_at) {
      await notificationService.markRead(item.id).catch(() => {});
      setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, read_at: new Date().toISOString() } : entry));
      setUnread((current) => Math.max(0, current - 1));
    }
    setOpen(false);
    navigate(`/snippets/${item.snippet_id}#comment-${item.comment_id}`);
  };

  const handleMarkAllRead = async () => {
    await notificationService.markAllRead();
    setItems((current) => current.map((item) => ({ ...item, read_at: item.read_at || new Date().toISOString() })));
    setUnread(0);
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={handleOpen}
        aria-label={t("notifications.title")}
        aria-expanded={open}
        className="relative rounded-md p-2 text-light-text-secondary hover:bg-light-hover dark:text-dark-text-secondary dark:hover:bg-dark-hover"
      >
        <Bell size={19} />
        {unread > 0 && <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-red-600 px-1 text-center text-xs leading-5 text-white">{unread > 99 ? "99+" : unread}</span>}
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-lg border border-light-border bg-light-surface shadow-xl dark:border-dark-border dark:bg-dark-surface">
          <div className="flex items-center justify-between border-b border-light-border px-4 py-3 dark:border-dark-border">
            <h2 className="font-semibold text-light-text dark:text-dark-text">{t("notifications.title")}</h2>
            <button type="button" disabled={!unread} onClick={handleMarkAllRead} className="inline-flex items-center gap-1 text-xs text-light-primary disabled:opacity-50 dark:text-dark-primary">
              <CheckCheck size={14} />{t("notifications.markAllRead")}
            </button>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {loading && items.length === 0 ? (
              <p className="p-4 text-sm text-light-text-secondary dark:text-dark-text-secondary">{t("notifications.loading")}</p>
            ) : items.length === 0 ? (
              <p className="p-4 text-sm text-light-text-secondary dark:text-dark-text-secondary">{t("notifications.empty")}</p>
            ) : items.map((item) => (
              <button key={item.id} type="button" onClick={() => handleSelect(item)} className={`block w-full border-b border-light-border px-4 py-3 text-left hover:bg-light-hover dark:border-dark-border dark:hover:bg-dark-hover ${item.read_at ? "opacity-70" : ""}`}>
                <span className="block text-sm font-medium text-light-text dark:text-dark-text">
                  {t(item.type === "reply" ? "notifications.reply" : "notifications.comment", { username: item.actor_username, title: item.snippet_title })}
                </span>
                <span className="mt-1 block truncate text-xs text-light-text-secondary dark:text-dark-text-secondary">{item.comment_preview}</span>
                <time className="mt-1 block text-xs text-light-text-secondary dark:text-dark-text-secondary">{new Date(item.created_at).toLocaleString()}</time>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationCenter;
