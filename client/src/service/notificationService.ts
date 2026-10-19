import { apiClient } from "../utils/api/apiClient";

export interface NotificationItem {
  id: number;
  type: "comment" | "reply";
  snippet_id: number;
  comment_id: number;
  read_at: string | null;
  created_at: string;
  snippet_title: string;
  actor_username: string;
  comment_preview: string;
}

export const notificationService = {
  list: () => apiClient.get<{ data: NotificationItem[]; unread: number }>("/api/notifications"),
  markRead: (id: number) => apiClient.patch(`/api/notifications/${id}/read`, {}),
  markAllRead: () => apiClient.patch("/api/notifications/read-all", {}),
};
