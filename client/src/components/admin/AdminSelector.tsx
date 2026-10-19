import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, Users, FileCode, Key, Share2, Tags, MessageSquare } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ROUTES } from '../../constants/routes';

interface AdminSelectorProps {
  selected: 'dashboard' | 'users' | 'snippets' | 'api-keys' | 'shares' | 'categories' | 'comments';
}

const AdminSelector: React.FC<AdminSelectorProps> = ({ selected }) => {
  const navigate = useNavigate();
  const { t: translate } = useTranslation('components/admin/selector');

  const options = [
    { value: 'dashboard' as const, label: translate('dashboard'), icon: Home, route: ROUTES.ADMIN_DASHBOARD },
    { value: 'users' as const, label: translate('users'), icon: Users, route: ROUTES.ADMIN_USERS },
    { value: 'snippets' as const, label: translate('snippets'), icon: FileCode, route: ROUTES.ADMIN_SNIPPETS },
    { value: 'api-keys' as const, label: translate('apiKeys'), icon: Key, route: ROUTES.ADMIN_API_KEYS },
    { value: 'shares' as const, label: translate('shares'), icon: Share2, route: ROUTES.ADMIN_SHARES },
    { value: 'categories' as const, label: translate('categories'), icon: Tags, route: ROUTES.ADMIN_CATEGORIES },
    { value: 'comments' as const, label: translate('comments'), icon: MessageSquare, route: ROUTES.ADMIN_COMMENTS },
  ];

  return (
    <div className="flex items-center gap-3 text-sm text-light-text dark:text-dark-text">
      <div
        className="flex gap-0.5 rounded-lg bg-light-surface px-0.5 py-0.5 dark:bg-dark-surface min-w-[720px]"
        role="group"
      >
        {options.map(({ value, label, icon: Icon, route }) => (
          <button
            key={value}
            type="button"
            onClick={() => navigate(route)}
            className={`
              flex flex-1 items-center justify-center gap-1.5 px-3 py-0.5 rounded-md transition-all duration-200
              ${selected === value
                ? 'bg-light-hover dark:bg-dark-hover'
                : 'hover:bg-light-hover/50 dark:hover:bg-dark-hover/50'
              }
            `}
          >
            <Icon
              className={`
                stroke-[2] transition-colors duration-200
                ${selected === value ? 'text-light-primary dark:text-dark-primary' : 'text-light-text/50 dark:text-dark-text/50'}
              `}
              size={14}
            />
            <span className="text-xs font-medium">{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default AdminSelector;
