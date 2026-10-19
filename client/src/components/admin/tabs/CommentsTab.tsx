import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { adminApi } from '../../../utils/api/admin';
import { useToast } from '../../../hooks/useToast';
import Modal from '../../common/modals/Modal';
import { ConfirmationModal } from '../../common/modals/ConfirmationModal';
import { AdminTable, FilterInput, Pagination, ResultsCount, type TableColumn } from '../common';

interface AdminComment {
  id: number;
  snippet_id: number;
  user_id: number;
  content: string;
  created_at: string;
  snippet_title: string;
  is_public: boolean | number;
  author: string;
}

export const CommentsTab: React.FC = () => {
  const { t } = useTranslation();
  const { t: translate } = useTranslation('components/admin/tabs/comments');
  const { addToast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [offset, setOffset] = useState(0);
  const [editingComment, setEditingComment] = useState<AdminComment | null>(null);
  const [editContent, setEditContent] = useState('');
  const [deletingCommentId, setDeletingCommentId] = useState<number | null>(null);
  const limit = 50;

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'comments', offset, search],
    queryFn: () => adminApi.getComments({ offset, limit, search }),
  });

  const invalidateComments = () => queryClient.invalidateQueries({ queryKey: ['admin', 'comments'] });
  const updateMutation = useMutation({
    mutationFn: () => adminApi.updateComment(editingComment!.id, editContent.trim()),
    onSuccess: () => {
      addToast(translate('success.update'), 'success');
      setEditingComment(null);
      invalidateComments();
    },
    onError: () => addToast(translate('error.update'), 'error'),
  });
  const deleteMutation = useMutation({
    mutationFn: (id: number) => adminApi.deleteComment(id),
    onSuccess: () => {
      addToast(translate('success.delete'), 'success');
      setDeletingCommentId(null);
      invalidateComments();
    },
    onError: () => addToast(translate('error.delete'), 'error'),
  });

  const comments: AdminComment[] = data?.comments || [];
  const total = data?.total || 0;
  const columns: TableColumn<AdminComment>[] = [
    {
      key: 'snippet',
      label: translate('columns.snippet'),
      render: (comment) => (
        <div className="max-w-xs">
          <div className="truncate font-medium text-light-text dark:text-dark-text">{comment.snippet_title || `#${comment.snippet_id}`}</div>
          <div className="text-xs text-light-text-secondary dark:text-dark-text-secondary">#{comment.snippet_id} · {comment.is_public ? translate('visibility.public') : translate('visibility.private')}</div>
        </div>
      ),
    },
    {
      key: 'author',
      label: translate('columns.author'),
      render: (comment) => <span className="whitespace-nowrap">{comment.author} · #{comment.user_id}</span>,
    },
    {
      key: 'content',
      label: translate('columns.content'),
      render: (comment) => <p className="max-w-xl whitespace-pre-wrap break-words">{comment.content}</p>,
    },
    {
      key: 'created',
      label: translate('columns.created'),
      render: (comment) => <time className="whitespace-nowrap">{new Date(comment.created_at).toLocaleString()}</time>,
    },
    {
      key: 'actions',
      label: translate('columns.actions'),
      render: (comment) => (
        <div className="flex items-center gap-2">
          <button
            title={translate('actions.edit')}
            onClick={() => { setEditingComment(comment); setEditContent(comment.content); }}
            className="rounded p-1 text-light-text-secondary hover:bg-light-hover dark:text-dark-text-secondary dark:hover:bg-dark-hover"
          ><Pencil size={16} /></button>
          <button
            title={translate('actions.delete')}
            onClick={() => setDeletingCommentId(comment.id)}
            className="rounded p-1 text-red-600 hover:bg-light-hover dark:text-red-400 dark:hover:bg-dark-hover"
          ><Trash2 size={16} /></button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <FilterInput
        value={search}
        onChange={(value) => { setSearch(value); setOffset(0); }}
        placeholder={translate('search')}
        showSearchIcon
      />
      <ResultsCount offset={offset} limit={limit} total={total} entityName={translate('entityName', { count: total })} />
      <AdminTable
        columns={columns}
        data={comments}
        isLoading={isLoading}
        emptyMessage={translate('empty')}
        loadingMessage={translate('loading')}
        getRowKey={(comment) => comment.id}
      />
      <Pagination
        offset={offset}
        limit={limit}
        total={total}
        onPrevious={() => setOffset(Math.max(0, offset - limit))}
        onNext={() => setOffset(offset + limit)}
      />

      <Modal
        isOpen={editingComment !== null}
        onClose={() => setEditingComment(null)}
        title={translate('editTitle')}
      >
        <div className="space-y-3">
          <textarea
            value={editContent}
            onChange={(event) => setEditContent(event.target.value)}
            maxLength={5000}
            rows={6}
            className="w-full rounded-md border border-light-border bg-light-bg p-3 text-sm text-light-text dark:border-dark-border dark:bg-dark-bg dark:text-dark-text"
          />
          <div className="flex justify-end gap-2">
            <button onClick={() => setEditingComment(null)} className="rounded-md border border-light-border px-3 py-2 text-sm dark:border-dark-border">{t('action.cancel')}</button>
            <button
              onClick={() => updateMutation.mutate()}
              disabled={!editContent.trim() || updateMutation.isPending}
              className="rounded-md bg-light-primary px-3 py-2 text-sm text-white disabled:opacity-50"
            >{t('action.save')}</button>
          </div>
        </div>
      </Modal>

      <ConfirmationModal
        isOpen={deletingCommentId !== null}
        onClose={() => setDeletingCommentId(null)}
        onConfirm={() => deletingCommentId !== null && deleteMutation.mutate(deletingCommentId)}
        title={translate('deleteTitle')}
        message={translate('deleteMessage')}
        confirmLabel={t('action.delete')}
        cancelLabel={t('action.cancel')}
        variant="danger"
      />
    </div>
  );
};
