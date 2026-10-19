import { getDb } from "../config/database.js";
import { isAdmin } from "../middleware/adminAuth.js";

class SnippetCommentRepository {
  async getVisibleSnippet(snippetId, user = null, allowAdmin = false) {
    const db = getDb();
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
      `SELECT c.id, c.snippet_id, c.user_id, c.content,
        ${db.dialect.utcString("c.created_at")} AS created_at,
        ${db.dialect.utcString("c.updated_at")} AS updated_at, u.username
       FROM snippet_comments c JOIN users u ON u.id = c.user_id
       WHERE c.snippet_id = ? ORDER BY c.created_at ASC, c.id ASC`,
      [db.dialect.id(snippetId)]
    );
    const admin = isAdmin(user?.username);
    return comments.map((comment) => ({
      ...comment,
      can_manage: admin || comment.user_id === user?.id,
    }));
  }

  async create(snippetId, user, content) {
    const db = getDb();
    const snippet = await this.getVisibleSnippet(snippetId, user);
    if (!snippet) return null;
    const inserted = await db.get(
      "INSERT INTO snippet_comments (snippet_id, user_id, content) VALUES (?, ?, ?) RETURNING id",
      [db.dialect.id(snippetId), user.id, content]
    );
    return this.getById(inserted.id, user);
  }

  async getById(commentId, user) {
    const db = getDb();
    const comment = await db.get(
      `SELECT c.id, c.snippet_id, c.user_id, c.content,
        ${db.dialect.utcString("c.created_at")} AS created_at,
        ${db.dialect.utcString("c.updated_at")} AS updated_at, u.username
       FROM snippet_comments c JOIN users u ON u.id = c.user_id WHERE c.id = ?`,
      [db.dialect.id(commentId)]
    );
    if (!comment || !(await this.getVisibleSnippet(comment.snippet_id, user, true))) return null;
    return {
      ...comment,
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
