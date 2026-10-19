import React from 'react';

export type CategoryTagVariant = 'removable' | 'clickable';

interface CategoryTagProps {
  category: string;
  onClick: (e: React.MouseEvent, category: string) => void;
  variant: CategoryTagVariant;
  color?: string;
  className?: string;
}

const colorSchemes: Record<string, string> = {
  blue: 'bg-blue-500/20 dark:bg-blue-500/30 text-blue-700 dark:text-blue-200 hover:bg-blue-500/30 dark:hover:bg-blue-500/40',
  emerald: 'bg-emerald-500/20 dark:bg-emerald-500/30 text-emerald-700 dark:text-emerald-200 hover:bg-emerald-500/30 dark:hover:bg-emerald-500/40',
  purple: 'bg-purple-500/20 dark:bg-purple-500/30 text-purple-700 dark:text-purple-200 hover:bg-purple-500/30 dark:hover:bg-purple-500/40',
  amber: 'bg-amber-500/20 dark:bg-amber-500/30 text-amber-700 dark:text-amber-200 hover:bg-amber-500/30 dark:hover:bg-amber-500/40',
  rose: 'bg-rose-500/20 dark:bg-rose-500/30 text-rose-700 dark:text-rose-200 hover:bg-rose-500/30 dark:hover:bg-rose-500/40',
  cyan: 'bg-cyan-500/20 dark:bg-cyan-500/30 text-cyan-700 dark:text-cyan-200 hover:bg-cyan-500/30 dark:hover:bg-cyan-500/40',
  indigo: 'bg-indigo-500/20 dark:bg-indigo-500/30 text-indigo-700 dark:text-indigo-200 hover:bg-indigo-500/30 dark:hover:bg-indigo-500/40',
  teal: 'bg-teal-500/20 dark:bg-teal-500/30 text-teal-700 dark:text-teal-200 hover:bg-teal-500/30 dark:hover:bg-teal-500/40',
};

export const CATEGORY_COLORS = Object.keys(colorSchemes);
export const CATEGORY_COLOR_SWATCHES: Record<string, string> = {
  blue: 'bg-blue-500', emerald: 'bg-emerald-500', purple: 'bg-purple-500', amber: 'bg-amber-500',
  rose: 'bg-rose-500', cyan: 'bg-cyan-500', indigo: 'bg-indigo-500', teal: 'bg-teal-500',
};

const CategoryTag: React.FC<CategoryTagProps> = ({
  category,
  onClick,
  variant,
  color,
  className = '',
}) => {
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClick(e, category);
  };

  const hash = category.split('').reduce((acc, char, i) => char.charCodeAt(0) + ((acc << 5) - acc) + i, 0);
  const fallbackColor = CATEGORY_COLORS[Math.abs(hash) % CATEGORY_COLORS.length];
  const tagColor = colorSchemes[color || fallbackColor];

  if (variant === 'removable') {
    return (
      <button onClick={handleClick} className={`flex items-center gap-1 px-2 py-1 rounded-md text-sm transition-colors group ${tagColor} ${className}`} type="button">
        <span>{category}</span>
        <span className="opacity-70 group-hover:opacity-100">×</span>
      </button>
    );
  }

  return (
    <button onClick={handleClick} className={`px-2 py-0.5 rounded-full text-xs font-medium transition-colors duration-200 ${tagColor} ${className}`} type="button">
      {category}
    </button>
  );
};

export default CategoryTag;
