import React, { useState } from 'react';
import {
  LayoutDashboard,
  FileText,
  CheckSquare,
  Calendar,
  MoreHorizontal,
  Plus,
  Clock,
  AlertTriangle,
  FolderOpen,
  Settings,
  Bell,
  X
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

export default function BottomNav() {
  const { activeTab, setActiveTab, stats, unreadNotifsCount, openNewNoteModal, openNewTaskModal } = useApp();
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showAddMenu, setShowAddMenu] = useState(false);

  const mainTabs = [
    { id: 'dashboard', label: 'Home', icon: LayoutDashboard },
    { id: 'notes', label: 'Notes', icon: FileText, count: stats.totalNotes },
    { id: 'tasks', label: 'Tasks', icon: CheckSquare, count: stats.pendingTasks },
    { id: 'calendar', label: 'Calendar', icon: Calendar }
  ];

  const moreTabs = [
    { id: 'upcoming', label: 'Upcoming Deadlines', icon: Clock, count: stats.upcomingDeadlines },
    { id: 'overdue', label: 'Overdue Tasks', icon: AlertTriangle, count: stats.overdueTasks, highlight: 'red' },
    { id: 'notifications', label: 'Notifications', icon: Bell, count: unreadNotifsCount },
    { id: 'categories', label: 'Categories', icon: FolderOpen },
    { id: 'settings', label: 'Settings', icon: Settings }
  ];

  return (
    <>
      {/* Mobile Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#0f172a]/95 backdrop-blur-lg border-t border-slate-200/80 dark:border-slate-800/80 px-2 py-1.5 flex items-center justify-around">
        {mainTabs.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                setShowMoreMenu(false);
              }}
              className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all relative ${
                isActive ? 'text-blue-600 dark:text-blue-400 font-semibold' : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              <Icon className="w-5 h-5 mb-0.5" />
              <span className="text-[10px]">{item.label}</span>
              {item.count !== undefined && item.count > 0 && (
                <span className="absolute top-0 right-1 w-2 h-2 rounded-full bg-blue-500" />
              )}
            </button>
          );
        })}

        {/* Center Quick Add Mobile Button */}
        <button
          onClick={() => setShowAddMenu(!showAddMenu)}
          className="w-11 h-11 -mt-5 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center shadow-lg shadow-blue-500/30 active:scale-95 transition-all"
        >
          <Plus className="w-6 h-6" />
        </button>

        {/* More tab button */}
        <button
          onClick={() => setShowMoreMenu(!showMoreMenu)}
          className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all ${
            showMoreMenu || ['upcoming', 'completed', 'overdue', 'notifications', 'categories', 'settings'].includes(activeTab)
              ? 'text-blue-600 dark:text-blue-400 font-semibold'
              : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          <MoreHorizontal className="w-5 h-5 mb-0.5" />
          <span className="text-[10px]">More</span>
        </button>
      </nav>

      {/* Quick Add Floating Bottom Sheet */}
      {showAddMenu && (
        <div className="md:hidden fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end justify-center">
          <div className="w-full bg-white dark:bg-[#151d2a] rounded-t-3xl p-6 border-t border-slate-200 dark:border-slate-800 animate-fade-in">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-900 dark:text-white">Quick Add</h3>
              <button onClick={() => setShowAddMenu(false)} className="p-1 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-2">
              <button
                onClick={() => {
                  setShowAddMenu(false);
                  openNewNoteModal();
                }}
                className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/40 text-left"
              >
                <FileText className="w-6 h-6 text-blue-600 mb-2" />
                <h4 className="font-semibold text-sm text-slate-800 dark:text-slate-100">New Note</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">Capture ideas & documents</p>
              </button>

              <button
                onClick={() => {
                  setShowAddMenu(false);
                  openNewTaskModal();
                }}
                className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/40 text-left"
              >
                <CheckSquare className="w-6 h-6 text-emerald-600 mb-2" />
                <h4 className="font-semibold text-sm text-slate-800 dark:text-slate-100">New Task</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">Set deadline & reminders</p>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* More Navigation Drawer */}
      {showMoreMenu && (
        <div className="md:hidden fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end justify-center">
          <div className="w-full bg-white dark:bg-[#151d2a] rounded-t-3xl p-6 border-t border-slate-200 dark:border-slate-800 animate-fade-in max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-900 dark:text-white">All Sections</h3>
              <button onClick={() => setShowMoreMenu(false)} className="p-1 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-1">
              {moreTabs.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id);
                      setShowMoreMenu(false);
                    }}
                    className={`w-full flex items-center justify-between p-3 rounded-xl text-sm ${
                      isActive
                        ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 font-semibold'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="w-5 h-5 text-slate-400" />
                      <span>{item.label}</span>
                    </div>
                    {item.count > 0 && (
                      <span className={`px-2 py-0.5 text-xs rounded-full ${
                        item.highlight === 'red' ? 'bg-red-500 text-white font-bold' : 'bg-slate-100 dark:bg-slate-800'
                      }`}>
                        {item.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
