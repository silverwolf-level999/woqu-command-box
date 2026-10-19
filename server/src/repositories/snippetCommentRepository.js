import { getDb } from "../config/database.js";
import { isAdmin } from "../middleware/adminAuth.js";

class SnippetCommentRepository {
  async getVisibleSnippet(snippetId, user = null, allowAdmin = false, db = getDb()) {
    const snippet = await db.get(
      "SELECT id, user_id, is_public FROM snippets WHERE id = ? AND expiry_date IS NULL",
      [db.dialect.id(snippetId)]
    );
    if (!snippet || (!snippet.is_public && snippet.user_id !== user?.id && !(allowAdmin && isAdmin(user?.username)))) return null;
    return snippet;
  }

  async list(snippetId, user) {
    const db = getDb();
    const snippet = await this.getVisibleSnippet(snippetId, user, true);
    if (!snippet) return null;
    const comments = await db.all(
      `SELECT c.id, c.snippet_id, c.user_id, c.parent_comment_id, c.content,
        ${db.dialect.utcString("c.created_at")} AS created_at,
        ${db.dialect.utcString("c.updated_at")} AS updated_at, u.username,
        parent_user.username AS reply_to_username
       FROM snippet_comments c JOIN users u ON u.id = c.user_id
       LEFT JOIN snippet_comments parent ON parent.id = c.parent_comment_id
       LEFT JOIN users parent_user ON parent_user.id = parent.user_id
       WHERE c.snippet_id = ? ORDER BY c.created_at ASC, c.id ASC`,
      [db.dialect.id(snippetId)]
    );
    const admin = isAdmin(user?.username);
    const byId = new Map(comments.map((comment) => [comment.id, comment]));
    return comments.map((comment) => {
      let root = comment;
      const visited = new Set([comment.id]);
      while (root.parent_comment_id && byId.has(root.parent_comment_id) && !visited.has(root.parent_comment_id)) {
        root = byId.get(root.parent_comment_id);
        visited.add(root.id);
      }
      return {
        ...comment,
        root_comment_id: root.id,
        can_manage: admin || comment.user_id === user?.id,
      };
    });
  }

  async create(snippetId, user, content, parentCommentId = null) {
    const db = getDb();
    const inserted = await db.transaction(async (tx) => {
      const snippet = await this.getVisibleSnippet(snippetId, user, false, tx);
      if (!snippet) return null;
      let parent = null;
      if (parentCommentId !== null) {
        parent = await tx.get(
          "SELECT id, snippet_id, user_id FROM snippet_comments WHERE id = ?",
          [db.dialect.id(parentCommentId)]
        );
        if (!parent || String(parent.snippet_id) !== String(snippetId)) return null;
      }

      const comment = await tx.get(
        `INSERT INTO snippet_comments (snippet_id, user_id, parent_comment_id, content)
         VALUES (?, ?, ?, ?) RETURNING id`,
        [db.dialect.id(snippetId), user.id, parent?.id ?? null, content]
      );
      const recipientId = parent ? parent.user_id : snippet.user_id;
      if (recipientId && recipientId !== user.id) {
        await tx.run(
          `INSERT INTO notifications (recipient_user_id, actor_user_id, snippet_id, comment_id, type)
           VALUES (?, ?, ?, ?, ?)`,
          [recipientId, user.id, snippet.id, comment.id, parent ? "reply" : "comment"]
        );
      }
      return comment;
    });
    if (!inserted) return null;
    const comments = await this.list(snippetId, user);
    return comments?.find((comment) => String(comment.id) === String(inserted.id)) || null;
  }

  async getById(commentId, user) {
    const db = getDb();
    const comment = await db.get(
      `SELECT c.id, c.snippet_id, c.user_id, c.parent_comment_id, c.content,
        ${db.dialect.utcString("c.created_at")} AS created_at,
        ${db.dialect.utcString("c.updated_at")} AS updated_at, u.username,
        parent_user.username AS reply_to_username
       FROM snippet_comments c JOIN users u ON u.id = c.user_id
       LEFT JOIN snippet_comments parent ON parent.id = c.parent_comment_id
       LEFT JOIN users parent_user ON parent_user.id = parent.user_id
       WHERE c.id = ?`,
      [db.dialect.id(commentId)]
    );
    if (!comment || !(await this.getVisibleSnippet(comment.snippet_id, user, true))) return null;
    let rootCommentId = comment.id;
    let parentId = comment.parent_comment_id;
    const visited = new Set([comment.id]);
    while (parentId && !visited.has(parentId)) {
      const parent = await db.get(
        "SELECT id, parent_comment_id FROM snippet_comments WHERE id = ?",
        [db.dialect.id(parentId)]
      );
      if (!parent) break;
      rootCommentId = parent.id;
      visited.add(parent.id);
      parentId = parent.parent_comment_id;
    }
    return {
      ...comment,
      root_comment_id: rootCommentId,
      can_manage: isAdmin(user?.username) || comment.user_id === user?.id,
    };
  }

  async update(snippetId, commentId, user, content) {
    const db = getDb();
    const comment = await db.get(
      "SELECT id, snippet_id, user_id FROM snippet_comments WHERE id = ?",
      [db.dialect.id(commentId)]
    );
    if (!comment || String(comment.snippet_id) !== String(snippetId) || !(comment.user_id === user.id || isAdmin(user.username))) return null;
    if (!(await this.getVisibleSnippet(comment.snippet_id, user, true))) return null;
    const result = await db.run(
      `UPDATE snippet_comments SET content = ?, updated_at = ${db.dialect.nowUtc} WHERE id = ?`,
      [content, db.dialect.id(commentId)]
    );
    return result.changes ? this.getById(commentId, user) : null;
  }

  async delete(snippetId, commentId, user) {
    const db = getDb();
    const comment = await db.get(
      "SELECT id, snippet_id, user_id FROM snippet_comments WHERE id = ?",
      [db.dialect.id(commentId)]
    );
    if (!comment || String(comment.snippet_id) !== String(snippetId) || !(comment.user_id === user.id || isAdmin(user.username))) return false;
    if (!(await this.getVisibleSnippet(comment.snippet_id, user, true))) return false;
    const result = await db.run("DELETE FROM snippet_comments WHERE id = ?", [db.dialect.id(commentId)]);
    return result.changes > 0;
  }
}

export default new SnippetCommentRepository();
