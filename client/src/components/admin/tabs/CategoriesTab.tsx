import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, Save, Trash2, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { adminApi } from '../../../utils/api/admin';
import { useToast } from '../../../hooks/useToast';
import { CATEGORY_COLORS, CATEGORY_COLOR_SWATCHES } from '../../categories/CategoryTag';
import { ConfirmationModal } from '../../common/modals/ConfirmationModal';

interface CategoryRow {
  id: number;
  name: string;
  color: string;
  snippet_count: number;
}

export const CategoriesTab: React.FC = () => {
  const { t } = useTranslation('components/categories');
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(CATEGORY_COLORS[0]);
  const [editing, setEditing] = useState<CategoryRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CategoryRow | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'categories'],
    queryFn: adminApi.getCategories,
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['admin', 'categories'] });
    queryClient.invalidateQueries({ queryKey: ['snippets'] });
  };
  const createMutation = useMutation({
    mutationFn: () => adminApi.createCategory(newName, newColor),
    onSuccess: () => {
      setNewName('');
      addToast(t('categoryManagement.created'), 'success');
      refresh();
    },
    onError: (error: any) => addToast(error.message || t('categoryManagement.saveFailed'), 'error'),
  });
  const updateMutation = useMutation({
    mutationFn: () => {
      if (!editing) throw new Error('No category selected');
      return adminApi.updateCategory(editing.id, editing.name, editing.color);
    },
    onSuccess: () => {
      setEditing(null);
      addToast(t('categoryManagement.updated'), 'success');
      refresh();
    },
    onError: (error: any) => addToast(error.message || t('categoryManagement.saveFailed'), 'error'),
  });
  const deleteMutation = useMutation({
    mutationFn: (id: number) => adminApi.deleteCategory(id),
    onSuccess: () => {
      setDeleteTarget(null);
      addToast(t('categoryManagement.deleted'), 'success');
      refresh();
    },
    onError: (error: any) => addToast(error.message || t('categoryManagement.deleteFailed'), 'error'),
  });

  const categories: CategoryRow[] = data?.categories || [];
  const colorLabel = (color: string) => t(`categoryManagement.colors.${color}`);
  const colorOptions = (value: string, onChange: (color: string) => void) => (
    <div className="flex items-center gap-2">
      {CATEGORY_COLORS.map((color) => (
        <button
          key={color}
          type="button"
          aria-label={colorLabel(color)}
          title={colorLabel(color)}
          onClick={() => onChange(color)}
          className={`w-6 h-6 rounded-full ${CATEGORY_COLOR_SWATCHES[color]} ring-offset-2 ring-offset-light-bg dark:ring-offset-dark-bg ${value === color ? 'ring-2 ring-light-primary dark:ring-dark-primary' : ''}`}
        />
      ))}
    </div>
  );

  return (
    <section className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-light-text dark:text-dark-text">{t('categoryManagement.title')}</h1>
        <p className="mt-1 text-sm text-light-text-secondary dark:text-dark-text-secondary">{t('categoryManagement.description')}</p>
      </div>

      <form
        className="flex flex-wrap items-center gap-3 rounded-lg border border-light-border dark:border-dark-border bg-light-surface dark:bg-dark-surface p-4"
        onSubmit={(event) => { event.preventDefault(); if (newName.trim()) createMutation.mutate(); }}
      >
        <input
          value={newName}
          onChange={(event) => setNewName(event.target.value)}
          maxLength={50}
          placeholder={t('categoryManagement.namePlaceholder')}
          className="min-w-48 flex-1 rounded-md border border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-bg px-3 py-2 text-sm text-light-text dark:text-dark-text"
        />
        {colorOptions(newColor, setNewColor)}
        <button disabled={!newName.trim() || createMutation.isPending} className="inline-flex items-center gap-2 rounded-md bg-light-primary dark:bg-dark-primary px-3 py-2 text-sm text-white disabled:opacity-50">
          <Plus size={16} />{t('categoryManagement.add')}
        </button>
      </form>

      <div className="overflow-hidden rounded-lg border border-light-border dark:border-dark-border">
        <div className="grid grid-cols-[1fr_12rem_8rem_6rem] gap-3 bg-light-surface dark:bg-dark-surface px-4 py-3 text-xs font-medium text-light-text-secondary dark:text-dark-text-secondary">
          <span>{t('categoryManagement.name')}</span><span>{t('categoryManagement.color')}</span><span>{t('categoryManagement.usage')}</span><span>{t('categoryManagement.actions')}</span>
        </div>
        {isLoading ? <div className="p-6 text-center text-sm text-light-text-secondary">{t('categoryManagement.loading')}</div> : categories.length === 0 ? <div className="p-6 text-center text-sm text-light-text-secondary">{t('categoryManagement.empty')}</div> : categories.map((category) => (
          <div key={category.id} className="grid grid-cols-[1fr_12rem_8rem_6rem] items-center gap-3 border-t border-light-border dark:border-dark-border px-4 py-3 text-sm">
            {editing?.id === category.id ? (
              <input value={editing.name} onChange={(event) => setEditing({ ...editing, name: event.target.value })} maxLength={50} className="min-w-0 rounded border border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-bg px-2 py-1 text-light-text dark:text-dark-text" />
            ) : <span className="font-medium text-light-text dark:text-dark-text">{category.name}</span>}
            {editing?.id === category.id ? colorOptions(editing.color, (color) => setEditing({ ...editing, color })) : <span className="inline-flex items-center gap-2 text-light-text-secondary dark:text-dark-text-secondary"><span className={`h-3 w-3 rounded-full ${CATEGORY_COLOR_SWATCHES[category.color] || 'bg-slate-400'}`} />{category.color ? colorLabel(category.color) : t('categoryManagement.automatic')}</span>}
            <span className="text-light-text-secondary dark:text-dark-text-secondary">{category.snippet_count}</span>
            <div className="flex items-center gap-2">
              {editing?.id === category.id ? <>
                <button type="button" disabled={!editing.name.trim() || updateMutation.isPending} title={t('categoryManagement.save')} onClick={() => updateMutation.mutate()} className="text-green-600 disabled:opacity-40"><Save size={16} /></button>
                <button type="button" title={t('categoryManagement.cancel')} onClick={() => setEditing(null)} className="text-light-text-secondary"><X size={16} /></button>
              </> : <>
                <button type="button" title={t('categoryManagement.edit')} onClick={() => setEditing(category)} className="text-light-text-secondary hover:text-light-primary"><Pencil size={16} /></button>
                <button type="button" title={t('categoryManagement.delete')} onClick={() => setDeleteTarget(category)} className="text-red-500 hover:text-red-600"><Trash2 size={16} /></button>
              </>}
            </div>
          </div>
        ))}
      </div>

      <ConfirmationModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        title={t('categoryManagement.deleteTitle')}
        message={t('categoryManagement.deleteMessage', { name: deleteTarget?.name, count: deleteTarget?.snippet_count })}
        confirmLabel={t('categoryManagement.delete')}
      />
    </section>
  );
};
