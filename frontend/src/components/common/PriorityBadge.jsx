import React from 'react';

export default function PriorityBadge({ priority, size = 'sm' }) {
  const p = (priority || 'Medium').toLowerCase();

  const configs = {
    critical: {
      label: 'Critical',
      bg: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-900/50',
      dot: 'bg-red-500'
    },
    high: {
      label: 'High',
      bg: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-400 dark:border-orange-900/50',
      dot: 'bg-orange-500'
    },
    medium: {
      label: 'Medium',
      bg: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900/50',
      dot: 'bg-amber-500'
    },
    low: {
      label: 'Low',
      bg: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/50',
      dot: 'bg-emerald-500'
    }
  };

  const current = configs[p] || configs.medium;
  const sizeClasses = size === 'xs' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs';

  return (
    <span className={`inline-flex items-center gap-1.5 font-medium rounded-full border ${current.bg} ${sizeClasses}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${current.dot}`} />
      {current.label}
    </span>
  );
}
