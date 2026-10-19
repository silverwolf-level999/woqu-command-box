import { getDb } from "../config/database.js";

class NotificationRepository {
  async list(userId) {
    const db = getDb();
    const visibility = `(s.is_public = 1 OR s.user_id = ?)`;
    const params = [userId, userId];
    const [notifications, unread] = await Promise.all([
      db.all(
        `SELECT n.id, n.type, n.snippet_id, n.comment_id, n.read_at,
          ${db.dialect.utcString("n.created_at")} AS created_at,
          s.title AS snippet_title, actor.username AS actor_username,
          SUBSTR(c.content, 1, 160) AS comment_preview
         FROM notifications n
         JOIN snippets s ON s.id = n.snippet_id AND s.expiry_date IS NULL
         JOIN snippet_comments c ON c.id = n.comment_id
         JOIN users actor ON actor.id = n.actor_user_id
         WHERE n.recipient_user_id = ? AND ${visibility}
         ORDER BY n.created_at DESC, n.id DESC LIMIT 50`,
        params
      ),
      db.get(
        `SELECT COUNT(*) AS count FROM notifications n
         JOIN snippets s ON s.id = n.snippet_id AND s.expiry_date IS NULL
         WHERE n.recipient_user_id = ? AND n.read_at IS NULL AND ${visibility}`,
        params
      ),
    ]);
    return { data: notifications, unread: unread?.count || 0 };
  }

  async markRead(userId, notificationId = null) {
    const db = getDb();
    const visibility = `(s.is_public = 1 OR s.user_id = ?)`;
    const params = [userId, userId];
    const whereId = notificationId === null ? "" : " AND id = ?";
    if (notificationId !== null) params.push(db.dialect.id(notificationId));
    const result = await db.run(
      `UPDATE notifications SET read_at = ${db.dialect.nowUtc}
       WHERE recipient_user_id = ? AND read_at IS NULL
         AND EXISTS (
           SELECT 1 FROM snippets s
           WHERE s.id = notifications.snippet_id AND s.expiry_date IS NULL AND ${visibility}
         )${whereId}`,
      params
    );
    return result.changes;
  }
}

export default new NotificationRepository();
