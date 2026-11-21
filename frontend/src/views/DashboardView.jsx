import React, { useState, useEffect } from 'react';
import {
  FileText,
  CheckSquare,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Calendar as CalendarIcon,
  ArrowRight,
  Pin,
  ExternalLink
} from 'lucide-react';
import { api } from '../services/api';
import { useApp } from '../context/AppContext';
import PriorityBadge from '../components/common/PriorityBadge';
import { playCompletionSound } from '../services/soundEffects';
import confetti from 'canvas-confetti';

export default function DashboardView() {
  const {
    stats,
    setActiveTab,
    openNewNoteModal,
    openNewTaskModal,
    openEditNoteModal,
    openEditTaskModal,
    refreshGlobalData
  } = useApp();

  const [dashboardData, setDashboardData] = useState({
    todayTasks: [],
    upcomingDeadlines: [],
    overdueList: [],
    recentNotes: []
  });
  const [loading, setLoading] = useState(true);

  const fetchDashboard = async () => {
    try {
      const res = await api.get('/api/dashboard/stats');
      if (res.ok && res.data.success) {
        setDashboardData({
          todayTasks: res.data.todayTasks || [],
          upcomingDeadlines: res.data.upcomingDeadlines || [],
          overdueList: res.data.overdueList || [],
          recentNotes: res.data.recentNotes || []
        });
      }
    } catch (err) {
      console.warn('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const handleToggleTaskStatus = async (task, e) => {
    e.stopPropagation();
    const newStatus = task.status === 'Completed' ? 'Pending' : 'Completed';
    try {
      if (newStatus === 'Completed') {
        playCompletionSound();
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.7 }
        });
      }
      await api.patch(`/api/tasks/${task.taskId}/status`, { status: newStatus });
      fetchDashboard();
      refreshGlobalData();
    } catch (err) {
      console.warn('Task status update error:', err);
    }
  };

  const statCards = [
    { label: 'Total Notes', count: stats.totalNotes, icon: FileText, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-950/40', tab: 'notes' },
    { label: 'Total Tasks', count: stats.totalTasks, icon: CheckSquare, color: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-50 dark:bg-indigo-950/40', tab: 'tasks' },
    { label: 'Pending Tasks', count: stats.pendingTasks, icon: Clock, color: 'text-slate-600 dark:text-slate-300', bg: 'bg-slate-100 dark:bg-slate-800', tab: 'tasks' },
    { label: 'Completed', count: stats.completedTasks, icon: CheckCircle2, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/40', tab: 'completed' },
    { label: 'Upcoming (7d)', count: stats.upcomingDeadlines, icon: CalendarIcon, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/40', tab: 'upcoming' },
    { label: 'Overdue Tasks', count: stats.overdueTasks, icon: AlertTriangle, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-950/40', tab: 'overdue' }
  ];

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto">
      {/* Welcome Banner & Quick Actions */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <span className="inline-block px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30 text-xs font-semibold uppercase tracking-wider mb-2">
            Overview & Reminders
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Stay on top of your deadlines.
          </h2>
          <p className="text-blue-100/80 text-sm mt-1.5 leading-relaxed">
            All your notes, reminders, and deadlines are safely synchronized in your personal Excel storage.
          </p>
          <div className="flex flex-wrap items-center gap-3 mt-5">
            <button
              onClick={() => openNewNoteModal()}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-slate-900 text-xs sm:text-sm font-semibold hover:bg-blue-50 transition-all shadow-md active:scale-95"
            >
              <Plus className="w-4 h-4 text-blue-600" />
              Create Note
            </button>
            <button
              onClick={() => openNewTaskModal()}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600/90 text-white text-xs sm:text-sm font-semibold hover:bg-blue-600 border border-blue-400/40 transition-all shadow-md active:scale-95"
            >
              <Plus className="w-4 h-4" />
              Add Deadline Task
            </button>
          </div>
        </div>
      </div>

      {/* 6 Key Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {statCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div
              key={idx}
              onClick={() => setActiveTab(card.tab)}
              className="cursor-pointer p-4 rounded-2xl bg-white dark:bg-[#131c2d] border border-slate-200/80 dark:border-slate-800/80 hover:border-blue-400 dark:hover:border-blue-600 transition-all shadow-sm hover:shadow-md group"
            >
              <div className="flex items-center justify-between mb-2">
                <div className={`w-8 h-8 rounded-xl ${card.bg} ${card.color} flex items-center justify-center`}>
                  <Icon className="w-4 h-4" />
                </div>
                <span className="text-xs text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
                  <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                {card.count}
              </p>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                {card.label}
              </p>
            </div>
          );
        })}
      </div>

      {/* Overdue Alert Banner if any overdue tasks */}
      {dashboardData.overdueList.length > 0 && (
        <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/60 rounded-2xl p-4 sm:p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
              <AlertTriangle className="w-5 h-5 text-red-500 animate-pulse" />
              <h3 className="font-bold text-sm sm:text-base">
                Attention Required: {dashboardData.overdueList.length} Overdue Task(s)
              </h3>
            </div>
            <button
              onClick={() => setActiveTab('overdue')}
              className="text-xs font-semibold text-red-600 dark:text-red-400 hover:underline"
            >
              View All Overdue &rarr;
            </button>
          </div>
          <div className="divide-y divide-red-100 dark:divide-red-900/40">
            {dashboardData.overdueList.map((task) => (
              <div
                key={task.taskId}
                onClick={() => openEditTaskModal(task)}
                className="py-2.5 flex items-center justify-between gap-3 cursor-pointer hover:bg-red-100/40 dark:hover:bg-red-900/20 px-2 rounded-lg transition-colors"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <button
                    onClick={(e) => handleToggleTaskStatus(task, e)}
                    className="w-4 h-4 rounded border-2 border-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 flex-shrink-0"
                  />
                  <span className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">
                    {task.taskTitle}
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-xs font-medium text-red-600 dark:text-red-400">
                    Was due: {task.deadlineDate} {task.deadlineTime}
                  </span>
                  <PriorityBadge priority={task.priority} size="xs" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main 2-Column Section: Today's Tasks & Upcoming Deadlines */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Tasks */}
        <div className="bg-white dark:bg-[#131c2d] border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-blue-600" />
              <h3 className="font-semibold text-sm text-slate-800 dark:text-slate-100">
                Today's Schedule & Tasks
              </h3>
            </div>
            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 font-medium">
              {dashboardData.todayTasks.length} tasks
            </span>
          </div>

          <div className="mt-3 space-y-2">
            {dashboardData.todayTasks.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                No tasks scheduled for today. Take a break or add a new task!
              </div>
            ) : (
              dashboardData.todayTasks.map((task) => (
                <div
                  key={task.taskId}
                  onClick={() => openEditTaskModal(task)}
                  className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-3 cursor-pointer ${
                    task.status === 'Completed'
                      ? 'bg-slate-50 dark:bg-slate-900/30 border-slate-200 dark:border-slate-800 opacity-60'
                      : 'bg-white dark:bg-[#172236] border-slate-200/80 dark:border-slate-800 hover:border-blue-400'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <button
                      onClick={(e) => handleToggleTaskStatus(task, e)}
                      className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                        task.status === 'Completed'
                          ? 'bg-emerald-500 border-emerald-500 text-white'
                          : 'border-slate-300 dark:border-slate-600 hover:border-blue-500'
                      }`}
                    >
                      {task.status === 'Completed' && <CheckCircle2 className="w-3.5 h-3.5" />}
                    </button>
                    <span
                      className={`text-xs sm:text-sm font-medium truncate ${
                        task.status === 'Completed'
                          ? 'line-through text-slate-400 dark:text-slate-500'
                          : 'text-slate-800 dark:text-slate-200'
                      }`}
                    >
                      {task.taskTitle}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs text-slate-400 flex items-center gap-1 font-mono">
                      <Clock className="w-3 h-3" />
                      {task.deadlineTime || '12:00'}
                    </span>
                    <PriorityBadge priority={task.priority} size="xs" />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Upcoming Deadlines (Next 7 Days) */}
        <div className="bg-white dark:bg-[#131c2d] border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-500" />
              <h3 className="font-semibold text-sm text-slate-800 dark:text-slate-100">
                Upcoming Deadlines (Next 7 Days)
              </h3>
            </div>
            <button
              onClick={() => setActiveTab('upcoming')}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium"
            >
              View All
            </button>
          </div>

          <div className="mt-3 space-y-2">
            {dashboardData.upcomingDeadlines.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                No upcoming deadlines in the next 7 days.
              </div>
            ) : (
              dashboardData.upcomingDeadlines.map((task) => (
                <div
                  key={task.taskId}
                  onClick={() => openEditTaskModal(task)}
                  className="p-3 rounded-xl bg-white dark:bg-[#172236] border border-slate-200/80 dark:border-slate-800 hover:border-amber-400 dark:hover:border-amber-500 transition-all flex items-center justify-between gap-3 cursor-pointer"
                >
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">
                      {task.taskTitle}
                    </p>
                    <span className="text-[11px] text-slate-400 mt-0.5 inline-block">
                      Due: {task.deadlineDate} at {task.deadlineTime}
                    </span>
                  </div>
                  <PriorityBadge priority={task.priority} size="xs" />
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Recent Notes Preview Grid */}
      <div className="bg-white dark:bg-[#131c2d] border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-blue-600" />
            <h3 className="font-semibold text-sm text-slate-800 dark:text-slate-100">
              Recent Notes
            </h3>
          </div>
          <button
            onClick={() => setActiveTab('notes')}
            className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium"
          >
            All Notes ({stats.totalNotes}) &rarr;
          </button>
        </div>

        {dashboardData.recentNotes.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-xs">
            You don't have any notes yet. Click "+ Create Note" to write your first note!
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {dashboardData.recentNotes.map((note) => (
              <div
                key={note.noteId}
                onClick={() => openEditNoteModal(note)}
                className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200/70 dark:border-slate-800/70 hover:border-blue-400 dark:hover:border-blue-500 cursor-pointer transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-1 mb-1.5">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400 bg-blue-100/60 dark:bg-blue-950/60 px-2 py-0.5 rounded-full">
                      {note.category || 'General'}
                    </span>
                    {note.pinned && <Pin className="w-3 h-3 text-blue-500 fill-current" />}
                  </div>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 line-clamp-1">
                    {note.noteTitle}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-3 font-normal">
                    {note.noteDescription || 'No description...'}
                  </p>
                </div>
                <span className="text-[10px] text-slate-400 mt-3 pt-2 border-t border-slate-200/40 dark:border-slate-800/40">
                  {new Date(note.updatedDate).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
