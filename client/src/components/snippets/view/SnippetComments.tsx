import React, { useCallback, useEffect, useState } from "react";
import { MessageSquare, Pencil, Send, Trash2, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { ROUTES } from "../../../constants/routes";
import { useAuth } from "../../../hooks/useAuth";
import { SnippetComment, snippetCommentService } from "../../../service/snippetCommentService";

interface SnippetCommentsProps {
  snippetId: string;
  isPublicView: boolean;
  canComment?: boolean;
}

export const SnippetComments: React.FC<SnippetCommentsProps> = ({ snippetId, isPublicView, canComment: allowComment = true }) => {
  const { t } = useTranslation("components/snippets/view/all");
  const { isAuthenticated, authConfig } = useAuth();
  const navigate = useNavigate();
  const [comments, setComments] = useState<SnippetComment[]>([]);
  const [content, setContent] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingContent, setEditingContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const loadComments = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await snippetCommentService.list(snippetId, isPublicView);
      setComments(result.data);
    } catch (loadError: any) {
      setError(loadError?.status === 404 ? t("comments.unavailable") : t("comments.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [snippetId, isPublicView, t]);

  useEffect(() => {
    loadComments();
  }, [loadComments]);

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!content.trim() || saving) return;
    setSaving(true);
    setError("");
    try {
      const comment = await snippetCommentService.create(snippetId, isPublicView, content.trim());
      setComments((current) => [...current, comment]);
      setContent("");
    } catch (saveError: any) {
      setError(saveError?.status === 401 ? t("comments.loginRequired") : t("comments.saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (commentId: number) => {
    if (!editingContent.trim() || saving) return;
    setSaving(true);
    setError("");
    try {
      const updated = await snippetCommentService.update(snippetId, isPublicView, commentId, editingContent.trim());
      setComments((current) => current.map((comment) => comment.id === commentId ? updated : comment));
      setEditingId(null);
    } catch {
      setError(t("comments.saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (commentId: number) => {
    if (!window.confirm(t("comments.confirmDelete"))) return;
    setError("");
    try {
      await snippetCommentService.delete(snippetId, isPublicView, commentId);
      setComments((current) => current.filter((comment) => comment.id !== commentId));
    } catch {
      setError(t("comments.deleteFailed"));
    }
  };

  const canComment = allowComment && isAuthenticated && !authConfig?.disableAccounts;

  return (
    <section className="mt-6 border-t border-light-border pt-5 dark:border-dark-border">
      <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-light-text dark:text-dark-text">
        <MessageSquare size={18} />
        {t("comments.title", { count: comments.length })}
      </h3>

      {error && <p role="alert" className="mb-3 text-sm text-red-600 dark:text-red-400">{error}</p>}
      {loading ? (
        <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">{t("comments.loading")}</p>
      ) : comments.length === 0 ? (
        <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">{t("comments.empty")}</p>
      ) : (
        <div className="space-y-4">
          {comments.map((comment) => (
            <article key={comment.id} className="rounded-lg bg-light-hover/40 p-3 dark:bg-dark-hover/40">
              <div className="mb-2 flex items-center justify-between gap-3 text-xs text-light-text-secondary dark:text-dark-text-secondary">
                <span className="font-medium text-light-text dark:text-dark-text">{comment.username}</span>
                <time dateTime={comment.updated_at}>{new Date(comment.updated_at).toLocaleString()}</time>
              </div>
              {editingId === comment.id ? (
                <div>
                  <textarea
                    value={editingContent}
                    onChange={(event) => setEditingContent(event.target.value)}
                    maxLength={5000}
                    rows={3}
                    className="w-full rounded-md border border-light-border bg-light-bg p-2 text-sm text-light-text dark:border-dark-border dark:bg-dark-bg dark:text-dark-text"
                  />
                  <div className="mt-2 flex justify-end gap-2">
                    <button onClick={() => setEditingId(null)} className="rounded px-2 py-1 text-sm text-light-text-secondary hover:bg-light-hover dark:text-dark-text-secondary dark:hover:bg-dark-hover"><X size={15} /></button>
                    <button onClick={() => handleUpdate(comment.id)} disabled={saving || !editingContent.trim()} className="rounded bg-light-primary px-3 py-1 text-sm text-white disabled:opacity-50">{t("comments.save")}</button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="whitespace-pre-wrap break-words text-sm text-light-text dark:text-dark-text">{comment.content}</p>
                  {comment.can_manage && (
                    <div className="mt-2 flex justify-end gap-1">
                      <button
                        aria-label={t("comments.edit")}
                        onClick={() => { setEditingId(comment.id); setEditingContent(comment.content); }}
                        className="rounded p-1.5 text-light-text-secondary hover:bg-light-hover dark:text-dark-text-secondary dark:hover:bg-dark-hover"
                      ><Pencil size={14} /></button>
                      <button
                        aria-label={t("comments.delete")}
                        onClick={() => handleDelete(comment.id)}
                        className="rounded p-1.5 text-red-600 hover:bg-light-hover dark:text-red-400 dark:hover:bg-dark-hover"
                      ><Trash2 size={14} /></button>
                    </div>
                  )}
                </>
              )}
            </article>
          ))}
        </div>
      )}

      {canComment ? (
        <form onSubmit={handleCreate} className="mt-4">
          <textarea
            value={content}
            onChange={(event) => setContent(event.target.value)}
            placeholder={t("comments.placeholder")}
            maxLength={5000}
            rows={3}
            className="w-full rounded-md border border-light-border bg-light-bg p-2 text-sm text-light-text placeholder:text-light-text-secondary/70 dark:border-dark-border dark:bg-dark-bg dark:text-dark-text"
          />
          <div className="mt-2 flex items-center justify-between">
            <span className="text-xs text-light-text-secondary dark:text-dark-text-secondary">{t("comments.characterCount", { count: content.length })}</span>
            <button type="submit" disabled={saving || !content.trim()} className="inline-flex items-center gap-1 rounded-md bg-light-primary px-3 py-1.5 text-sm text-white disabled:opacity-50">
              <Send size={14} />{t("comments.submit")}
            </button>
          </div>
        </form>
      ) : allowComment && !authConfig?.disableAccounts ? (
        <button onClick={() => navigate(ROUTES.LOGIN)} className="mt-4 rounded-md bg-light-primary/10 px-3 py-2 text-sm text-light-primary hover:bg-light-primary/20 dark:bg-dark-primary/10 dark:text-dark-primary">
          {t("comments.signInToComment")}
        </button>
      ) : null}
    </section>
  );
};

export default SnippetComments;
