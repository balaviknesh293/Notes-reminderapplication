import React, { useState } from 'react';
import {
  LayoutDashboard,
  FileText,
  CheckSquare,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Bell,
  FolderOpen,
  Settings,
  ChevronLeft,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

export default function Sidebar() {
  const { activeTab, setActiveTab, stats, unreadNotifsCount } = useApp();
  const [collapsed, setCollapsed] = useState(false);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'notes', label: 'My Notes', icon: FileText, count: stats.totalNotes },
    { id: 'tasks', label: 'My Tasks', icon: CheckSquare, count: stats.pendingTasks },
    { id: 'calendar', label: 'Calendar', icon: Calendar },
    { id: 'upcoming', label: 'Upcoming Deadlines', icon: Clock, count: stats.upcomingDeadlines, highlight: 'amber' },
    { id: 'completed', label: 'Completed Tasks', icon: CheckCircle2, count: stats.completedTasks },
    { id: 'overdue', label: 'Overdue Tasks', icon: AlertTriangle, count: stats.overdueTasks, highlight: 'red' },
    { id: 'notifications', label: 'Notifications', icon: Bell, count: unreadNotifsCount, highlight: 'blue' },
    { id: 'categories', label: 'Categories', icon: FolderOpen },
    { id: 'settings', label: 'Settings', icon: Settings }
  ];

  return (
    <aside
      className={`hidden md:flex flex-col border-r border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#0f172a] transition-all duration-200 ease-in-out select-none relative z-20 ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-slate-200/80 dark:border-slate-800/80">
        <div className={`flex items-center gap-3 overflow-hidden ${collapsed ? 'justify-center w-full' : ''}`}>
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 flex-shrink-0">
            <Sparkles className="w-5 h-5 text-blue-100" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <h1 className="text-base font-bold tracking-tight text-slate-900 dark:text-white leading-none">
                NoteAlert
              </h1>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium mt-1 truncate">
                Smart Notes & Deadlines
              </p>
            </div>
          )}
        </div>

        {!collapsed && (
          <button
            onClick={() => setCollapsed(true)}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Collapse sidebar"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Navigation List */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          let badgeColor = 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300';
          if (item.highlight === 'red' && item.count > 0) {
            badgeColor = 'bg-red-500 text-white font-semibold animate-pulse';
          } else if (item.highlight === 'amber' && item.count > 0) {
            badgeColor = 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 font-semibold';
          } else if (item.highlight === 'blue' && item.count > 0) {
            badgeColor = 'bg-blue-600 text-white font-semibold';
          }

          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              title={collapsed ? item.label : undefined}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                isActive
                  ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white'
              } ${collapsed ? 'justify-center px-0' : ''}`}
            >
              <Icon
                className={`w-4 h-4 flex-shrink-0 ${
                  isActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-slate-400'
                }`}
              />

              {!collapsed && (
                <>
                  <span className="flex-1 text-left truncate">{item.label}</span>
                  {item.count !== undefined && item.count > 0 && (
                    <span className={`px-2 py-0.5 text-xs rounded-full ${badgeColor}`}>
                      {item.count}
                    </span>
                  )}
                </>
              )}
            </button>
          );
        })}
      </nav>

      {/* Expand Button if Collapsed */}
      {collapsed && (
        <div className="p-3 border-t border-slate-200/80 dark:border-slate-800/80 flex justify-center">
          <button
            onClick={() => setCollapsed(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Expand sidebar"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Footer Storage Badge */}
      {!collapsed && (
        <div className="p-3 mx-3 mb-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200/60 dark:border-slate-800/60 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center justify-between mb-1">
            <span className="font-semibold text-slate-700 dark:text-slate-300">Storage</span>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">Excel XLSX</span>
          </div>
          <p className="text-[11px] leading-tight text-slate-400">
            Auto-synced & backed up
          </p>
        </div>
      )}
    </aside>
  );
}
